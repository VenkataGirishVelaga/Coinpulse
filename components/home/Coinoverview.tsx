import { fetcher } from '@/lib/coingecko.actions';
import { cn, formatCurrency } from '@/lib/utils';
import { TrendingDown, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import React from 'react'
import { CoinOverviewFallback } from './fallback';
import CandlestickChart from '../CandlestickChart';

const Coinoverview = async () => {
    try{
      const [coin, coinOHLCData] = await Promise.all([
        fetcher<CoinDetailsData>(`coins/bitcoin`, {
          dex_pair_format: 'symbol'
        }),
        fetcher<OHLCData[]>(`coins/bitcoin/ohlc`, {
          vs_currency: 'usd',
          days: 1,
          precision: 'full'
        })
      ]);

      return (
        <div id='coin-overview'>
          <CandlestickChart data={coinOHLCData} coinId='bitcoin' >
            <div className='header pt-2'>
              <Image src={coin.image.large} alt={coin.name} width={56} height={56} />
              <div className='info'>
                <p>{coin.name} / {coin.symbol.toLocaleUpperCase()}</p>
                <h1>{formatCurrency (coin.market_data.current_price.usd)}</h1>
              </div>
            </div>
          </CandlestickChart>
        </div>
      );
    } catch (error) {
      console.error('Error fetching coin data:', error);
      return <CoinOverviewFallback />;
    }
    


    
}

export default Coinoverview