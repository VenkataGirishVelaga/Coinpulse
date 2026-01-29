import { fetcher } from '@/lib/coingecko.actions'
import { cn, formatCurrency, formatPercentage } from '@/lib/utils';
import { TrendingDown, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import React from 'react'
import DataTable from '../DataTable';

const TrendingCoins = async () => {
    const trendingCoinsResponse = await fetcher<{coins: TrendingCoin[]}>('/search/trending', undefined, 300);
    const trendingCoinsData = trendingCoinsResponse.coins;

    const columns: Array<{
      header: string;
      cellClassName?: string;
      cell: (row: TrendingCoin, rowIndex?: number) => React.ReactNode;
    }> = [
  {
    header: 'Name',
    cellClassName: 'name-cell',
    cell: (coin) => {
        const item = coin.item;

        return (
          <Link href={`/coins/${item.id}`}>
            <Image src={item.large} alt={item.name} width={32} height={36}/>
            <p>{item.name}</p>
          </Link>
        )
    },
  },
  {
      header: '24h Change',
      cellClassName: 'name-cell',
      cell: (coin) => {
        const item = coin.item;
        const isTrendingUP = item.data.price_change_percentage_24h.usd > 0;

        return (
          <div className={cn('price-change', isTrendingUP ? 'text-green-500' : 'text-red-500')}>
              <p className='flex'>
                { isTrendingUP ? (
                  <TrendingUp width={16} height={16}/>
                ) :
                  <TrendingDown width={16} height={16} />
                }
                {formatPercentage(item.data.price_change_percentage_24h.usd)}
              </p>
          </div>
        )
      }
    },
  { header: 'Price', cellClassName: 'price-cell', cell: (coin) => formatCurrency(coin.item.data.price)},
]
  return (
    <div id="trending-coins">
        <h4> Trending Coins</h4>
        <div id="trending-coins">
            <DataTable
              data={trendingCoinsData.slice(0, 6)}
              columns={columns}
              rowKey={(row, _index) => row.item.id}
               tableClassName="trending-coins-table"
               headerCellClassName="py-3!"
               bodyCellClassName="py-2! "
               />
        </div>
        
    </div>
        
  )
}

export default TrendingCoins

function foramtCurrency(price: number): React.ReactNode {
  throw new Error('Function not implemented.');
}
