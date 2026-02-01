'use server'

import qs from 'query-string';

const BASE_URL = process.env.COINGECKO_BASE_URL;
const API_KEY = process.env.COINGECKO_API_KEY;

if(!BASE_URL) throw new Error('Could not get base url');
if(!API_KEY) throw new Error('Could not get api key');


export async function fetcher<T>(
    endpoint: string,
    params?: QueryParams,
    revalidate = 60,
): Promise<T> { 
    const url = qs.stringifyUrl({
        url: `${BASE_URL}/${endpoint}`,
        query: params,
    }, { skipEmptyString: true, skipNull: true});

    const response = await fetch(url, {
        headers: {
            'x-cg-demo-api-key' : API_KEY,
            'Content-Type': "application/json",
        } as Record<string, string>,
        next: { revalidate}
    });

    if(!response.ok) {
        const errorBody: CoinGeckoErrorBody = await response.json().catch(() => ({}));

        throw new Error(`API Error: ${response.status}: ${errorBody.error || response.statusText} `);
    }

    return response.json();
}

export async function getPools(
  id: string,
  network?: string | null,
  contractAddress?: string | null
): Promise<PoolData> {
  const fallback: PoolData = {
    id: "",
    address: "",
    name: "",
    network: "",
  };

  if (network && contractAddress) {
    try{
      const poolData = await fetcher<{ data: PoolData[] }>(
        `/onchain/networks/${network}/tokens/${contractAddress}/pools`
      );
  
      return poolData.data?.[0] ?? fallback;
    } catch(error) {
      console.log(error);
      return fallback;
    }
  }

  try {
    const poolData = await fetcher<{ data: PoolData[] }>(
      "/onchain/search/pools",
      { query: id }
    );

    return poolData.data?.[0] ?? fallback;
  } catch (error) {
    return fallback;
  }
}

export async function searchCoins(query: string): Promise<SearchCoin[]> {
  try {
    // Step 1: Search for coins by name/symbol
    const searchData = await fetcher<{ coins: any[] }>(
      'search',
      { query }
    );
    
    const coinIds = (searchData.coins || []).slice(0, 10).map((coin: any) => coin.id);
    
    if (coinIds.length === 0) return [];
    
    // Step 2: Fetch market data for the found coins
    const marketData = await fetcher<any[]>(
      'coins/markets',
      {
        vs_currency: 'usd',
        ids: coinIds.join(','),
        order: 'market_cap_desc',
        per_page: 250,
        page: 1,
        sparkline: false,
      }
    );
    
    // Step 3: Merge search data with market data
    const coinMap = new Map(
      (marketData || []).map((coin: any) => [
        coin.id,
        {
          price_change_percentage_24h: coin.price_change_percentage_24h || 0,
          thumb: coin.image,
        },
      ])
    );
    
    return (searchData.coins || [])
      .slice(0, 10)
      .map((coin: any) => {
        const marketInfo = coinMap.get(coin.id);
        return {
          id: coin.id,
          name: coin.name,
          symbol: coin.symbol,
          thumb: coin.thumb,
          data: {
            price_change_percentage_24h: marketInfo?.price_change_percentage_24h || 0,
          },
        } as SearchCoin;
      });
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

export async function getTrendingCoins(): Promise<TrendingCoin[]> {
  try {
    const data = await fetcher<{ coins: any[] }>(
      'search/trending'
    );
    
    // Map the API response to TrendingCoin format
    return (data.coins || []).map((coin: any) => {
      const itemData = coin.item || coin;
      return {
        item: {
          id: itemData.id,
          name: itemData.name,
          symbol: itemData.symbol,
          thumb: itemData.thumb,
          data: {
            price_change_percentage_24h: {
              usd: itemData.data?.price_change_percentage_24h?.usd || 0,
            },
          },
        },
      } as TrendingCoin;
    });
  } catch (error) {
    console.error('Trending coins error:', error);
    return [];
  }
}