'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const API_BASE = 'https://api.coingecko.com/api/v3';
const API_KEY = process.env.NEXT_PUBLIC_COINGECKO_API_KEY;
const PRICE_POLL_INTERVAL = 60000; // 60 seconds - matches cache/update frequency for public API
const OHLC_POLL_INTERVAL = 60000; // 60 seconds - matches cache/update frequency for onchain OHLCV
const TRADES_POLL_INTERVAL = 60000; // 60 seconds - matches cache/update frequency for onchain trades
const RATE_LIMIT_PAUSE = 60000; // 60 seconds pause on 429

interface CoinGeckoSimplePriceResponse {
  [coinId: string]: {
    usd: number;
    usd_24h_change?: number;
    usd_market_cap?: number;
    usd_24h_vol?: number;
    last_updated_at?: number;
  };
}

// Onchain trades response from /onchain/networks/{network}/pools/{pool_address}/trades
interface OnchainTradesResponse {
  data: {
    id: string;
    type: string;
    attributes: {
      block_number: number;
      tx_hash: string;
      tx_from_address: string;
      from_token_amount: string;
      to_token_amount: string;
      price_from_in_usd: string;
      price_to_in_usd: string;
      block_timestamp: string;
      kind: 'buy' | 'sell';
      volume_in_usd: string;
    };
  }[];
}

// Onchain OHLCV response from /onchain/networks/{network}/pools/{pool_address}/ohlcv/{timeframe}
interface OnchainOHLCVResponse {
  data: {
    id: string;
    type: string;
    attributes: {
      ohlcv_list: [number, number, number, number, number, number][]; // [timestamp, open, high, low, close, volume]
    };
  };
  meta: {
    base: { address: string; name: string; symbol: string };
    quote: { address: string; name: string; symbol: string };
  };
}

/**
 * Transforms CoinGecko REST API response to match the WebSocket ExtendedPriceData format
 */
const transformPriceData = (
  coinId: string,
  data: CoinGeckoSimplePriceResponse
): ExtendedPriceData | null => {
  const coinData = data[coinId];
  if (!coinData) return null;

  return {
    usd: coinData.usd ?? 0,
    coin: coinId,
    price: coinData.usd,
    change24h: coinData.usd_24h_change,
    marketCap: coinData.usd_market_cap,
    volume24h: coinData.usd_24h_vol,
    timestamp: coinData.last_updated_at ? coinData.last_updated_at * 1000 : Date.now(),
  };
};

/**
 * Transforms onchain trades data to Trade format
 * Uses real DEX trade data from the onchain API
 */
const transformOnchainTrades = (data: OnchainTradesResponse): Trade[] => {
  return data.data.slice(0, 7).map((trade) => ({
    price: parseFloat(trade.attributes.price_from_in_usd),
    value: parseFloat(trade.attributes.volume_in_usd),
    timestamp: new Date(trade.attributes.block_timestamp).getTime(),
    type: trade.attributes.kind, // 'buy' or 'sell' from actual trade data
    amount: parseFloat(trade.attributes.from_token_amount),
  }));
};

/**
 * Parses poolId format "network_poolAddress" or "network:poolAddress"
 * Returns { network, poolAddress } or null if invalid
 */
const parsePoolId = (poolId: string): { network: string; poolAddress: string } | null => {
  if (!poolId) return null;

  // Handle both formats: "eth_0x123..." and "eth:0x123..."
  const separator = poolId.includes(':') ? ':' : '_';
  const parts = poolId.split(separator);

  if (parts.length !== 2) return null;

  const [network, poolAddress] = parts;
  if (!network || !poolAddress) return null;

  return { network, poolAddress };
};

/**
 * Maps liveInterval to timeframe and aggregate for OHLCV API
 * '1s' -> minute with aggregate 1 (closest available)
 * '1m' -> minute with aggregate 1
 */
const getOHLCVTimeframeParams = (
  liveInterval?: '1s' | '1m'
): { timeframe: string; aggregate: string } => {
  // Demo API doesn't support second-level granularity, use minute as minimum
  return {
    timeframe: 'minute',
    aggregate: '1',
  };
};

/**
 * useSimulatedWebSocket - A polling-based hook that simulates WebSocket behavior
 * using the CoinGecko Demo API (Free Tier).
 *
 * Uses these endpoints:
 * - /simple/price - For real-time price data (60s cache)
 * - /onchain/networks/{network}/pools/{pool_address}/ohlcv/{timeframe} - For OHLCV candle data (60s cache)
 * - /onchain/networks/{network}/pools/{pool_address}/trades - For real DEX trade data (60s cache)
 *
 * Maintains the exact same interface as useCoinGeckoWebSocket for drop-in replacement.
 */
export const useSimulatedWebSocket = ({
  coinId,
  poolId,
  liveInterval,
}: UseCoinGeckoWebSocketProps): UseCoinGeckoWebSocketReturn => {
  const [price, setPrice] = useState<ExtendedPriceData | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [ohlcv, setOhlcv] = useState<OHLCData | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Refs for polling intervals
  const pricePollingRef = useRef<NodeJS.Timeout | null>(null);
  const ohlcPollingRef = useRef<NodeJS.Timeout | null>(null);
  const tradesPollingRef = useRef<NodeJS.Timeout | null>(null);

  // Refs for tracking state without causing re-renders
  const rateLimitedRef = useRef(false);
  const isConnectedRef = useRef(false);
  const mountedRef = useRef(true);

  // Track previous values to detect actual changes
  const prevCoinIdRef = useRef<string | null>(null);
  const prevPoolIdRef = useRef<string | null>(null);

  const getHeaders = useCallback(() => {
    const headers: HeadersInit = {
      Accept: 'application/json',
    };
    if (API_KEY) {
      headers['x-cg-demo-api-key'] = API_KEY;
    }
    return headers;
  }, []);

  /**
   * Fetches price data from /simple/price endpoint
   * Cache: 60 seconds for Public API
   */
  const fetchPriceData = useCallback(async () => {
    if (rateLimitedRef.current || !coinId || !mountedRef.current) return;

    try {
      const params = new URLSearchParams({
        ids: coinId,
        vs_currencies: 'usd',
        include_24hr_change: 'true',
        include_market_cap: 'true',
        include_24hr_vol: 'true',
        include_last_updated_at: 'true',
      });

      const response = await fetch(`${API_BASE}/simple/price?${params.toString()}`, {
        headers: getHeaders(),
      }).catch((error) => {
        console.warn('[useSimulatedWebSocket] Price fetch network error:', error instanceof Error ? error.message : 'Unknown error');
        return null;
      });

      if (!response) return;
      if (!mountedRef.current) return;

      if (response.status === 429) {
        console.warn('[useSimulatedWebSocket] Rate limited on price. Pausing...');
        rateLimitedRef.current = true;
        setTimeout(() => {
          rateLimitedRef.current = false;
        }, RATE_LIMIT_PAUSE);
        return;
      }

      if (!response.ok) {
        console.warn(`[useSimulatedWebSocket] Price HTTP ${response.status}: ${response.statusText}`);
        return;
      }

      const data: CoinGeckoSimplePriceResponse = await response.json();

      if (!mountedRef.current) return;

      const transformedPrice = transformPriceData(coinId, data);

      if (transformedPrice) {
        setPrice(transformedPrice);
        if (!isConnectedRef.current) {
          isConnectedRef.current = true;
          setIsConnected(true);
        }
      }
    } catch (error) {
      if (!mountedRef.current) return;
      console.warn('[useSimulatedWebSocket] Price parse error:', error instanceof Error ? error.message : 'Unknown error');
    }
  }, [coinId, getHeaders]);

  /**
   * Fetches OHLCV data from /onchain/networks/{network}/pools/{pool_address}/ohlcv/{timeframe} endpoint
   * Cache: 60 seconds
   * Returns the latest candle to simulate live OHLCV updates
   */
  const fetchOHLCData = useCallback(async () => {
    if (rateLimitedRef.current || !poolId || !mountedRef.current) return;

    const poolInfo = parsePoolId(poolId);
    if (!poolInfo) {
      console.warn('[useSimulatedWebSocket] Invalid poolId format:', poolId);
      return;
    }

    const { network, poolAddress } = poolInfo;
    const { timeframe, aggregate } = getOHLCVTimeframeParams(liveInterval);

    try {
      const params = new URLSearchParams({
        aggregate,
        currency: 'usd',
        limit: '1', // Only get the latest candle
      });

      const url = `${API_BASE}/onchain/networks/${network}/pools/${poolAddress}/ohlcv/${timeframe}?${params.toString()}`;
      
      const response = await fetch(url, {
        headers: getHeaders(),
      }).catch((error) => {
        console.warn('[useSimulatedWebSocket] OHLCV fetch network error:', error instanceof Error ? error.message : 'Unknown error');
        return null;
      });

      if (!response) return;
      if (!mountedRef.current) return;

      if (response.status === 429) {
        console.warn('[useSimulatedWebSocket] Rate limited on OHLCV. Pausing...');
        rateLimitedRef.current = true;
        setTimeout(() => {
          rateLimitedRef.current = false;
        }, RATE_LIMIT_PAUSE);
        return;
      }

      if (!response.ok) {
        console.warn(`[useSimulatedWebSocket] OHLCV HTTP ${response.status}: ${response.statusText}`);
        return;
      }

      const data: OnchainOHLCVResponse = await response.json();

      if (!mountedRef.current) return;

      // Get the latest candle from ohlcv_list
      const ohlcvList = data?.data?.attributes?.ohlcv_list;
      if (ohlcvList && ohlcvList.length > 0) {
        const latestCandle = ohlcvList[0]; // [timestamp, open, high, low, close, volume]
        // Convert to OHLCData format: [timestamp, open, high, low, close] (without volume)
        const candle: OHLCData = [
          latestCandle[0] * 1000, // Convert seconds to milliseconds
          latestCandle[1], // open
          latestCandle[2], // high
          latestCandle[3], // low
          latestCandle[4], // close
        ];
        setOhlcv(candle);
      }
    } catch (error) {
      if (!mountedRef.current) return;
      console.warn('[useSimulatedWebSocket] OHLCV parse error:', error instanceof Error ? error.message : 'Unknown error');
      // OHLCV is optional - gracefully handle missing/invalid data
    }
  }, [poolId, liveInterval, getHeaders]);

  /**
   * Fetches trades data from /onchain/networks/{network}/pools/{pool_address}/trades endpoint
   * Cache: 60 seconds
   * Returns real DEX trade data
   */
  const fetchTradesData = useCallback(async () => {
    if (rateLimitedRef.current || !poolId || !mountedRef.current) return;

    const poolInfo = parsePoolId(poolId);
    if (!poolInfo) {
      console.warn('[useSimulatedWebSocket] Invalid poolId format:', poolId);
      return;
    }

    const { network, poolAddress } = poolInfo;

    try {
      const params = new URLSearchParams({
        trade_volume_in_usd_greater_than: '0',
      });

      const url = `${API_BASE}/onchain/networks/${network}/pools/${poolAddress}/trades?${params.toString()}`;
      const response = await fetch(url, {
        headers: getHeaders(),
      });

      if (!mountedRef.current) return;

      if (response.status === 429) {
        console.warn('[useSimulatedWebSocket] Rate limited on trades. Pausing...');
        rateLimitedRef.current = true;
        setTimeout(() => {
          rateLimitedRef.current = false;
        }, RATE_LIMIT_PAUSE);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: OnchainTradesResponse = await response.json();

      if (!mountedRef.current) return;

      if (data?.data && data.data.length > 0) {
        const transformedTrades = transformOnchainTrades(data);
        setTrades(transformedTrades);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.warn('[useSimulatedWebSocket] Trades fetch error:', error instanceof Error ? error.message : 'Unknown error');
      // Don't treat fetch errors as critical - trades are optional
    }
  }, [poolId, getHeaders]);

  // Cleanup intervals helper
  const clearAllIntervals = useCallback(() => {
    if (pricePollingRef.current) {
      clearInterval(pricePollingRef.current);
      pricePollingRef.current = null;
    }
    if (ohlcPollingRef.current) {
      clearInterval(ohlcPollingRef.current);
      ohlcPollingRef.current = null;
    }
    if (tradesPollingRef.current) {
      clearInterval(tradesPollingRef.current);
      tradesPollingRef.current = null;
    }
  }, []);

  // Effect to handle coinId/poolId changes - only reset when actually changed
  useEffect(() => {
    const coinIdChanged = prevCoinIdRef.current !== coinId;
    const poolIdChanged = prevPoolIdRef.current !== poolId;

    // Only reset state if the IDs actually changed (not on every render)
    if (coinIdChanged || poolIdChanged) {
      // Reset state only when IDs change
      setPrice(null);
      setTrades([]);
      setOhlcv(null);
      setIsConnected(false);
      isConnectedRef.current = false;

      // Update refs
      prevCoinIdRef.current = coinId;
      prevPoolIdRef.current = poolId;
    }
  }, [coinId, poolId]);

  // Main effect for setting up polling
  useEffect(() => {
    mountedRef.current = true;

    // Clear existing intervals
    clearAllIntervals();

    // Perform initial fetches
    fetchPriceData();

    // Only fetch OHLC and trades data if poolId is provided (mimicking WebSocket behavior)
    if (poolId) {
      fetchOHLCData();
      fetchTradesData();
    }

    // Set up polling intervals based on API cache times
    pricePollingRef.current = setInterval(fetchPriceData, PRICE_POLL_INTERVAL);

    if (poolId) {
      ohlcPollingRef.current = setInterval(fetchOHLCData, OHLC_POLL_INTERVAL);
      tradesPollingRef.current = setInterval(fetchTradesData, TRADES_POLL_INTERVAL);
    }

    // Cleanup
    return () => {
      mountedRef.current = false;
      clearAllIntervals();
    };
  }, [coinId, poolId, liveInterval, fetchPriceData, fetchOHLCData, fetchTradesData, clearAllIntervals]);

  return {
    price,
    trades,
    ohlcv,
    isConnected,
  };
};

export default useSimulatedWebSocket;