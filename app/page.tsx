import Categories from '@/components/home/Categories';
import Coinoverview from '@/components/home/Coinoverview';
import TrendingCoins from '@/components/home/TrendingCoins';
import { CategoriesFallback, CoinOverviewFallback, TrendingCoinsFallback } from '@/components/home/fallback';
import React, { Suspense } from 'react'


async function page() {
  return (
    <main className='main-container'>
      <section className='home-grid'>
        <Suspense fallback={<CoinOverviewFallback />}>
          <Coinoverview />
        </Suspense>

        <Suspense fallback={<TrendingCoinsFallback />}>
          <TrendingCoins />
        </Suspense>
      </section>

      <section className='w-full mt-7 space-y-4'>
        <Suspense fallback={<CategoriesFallback />}>
          <Categories />
        </Suspense>
      </section>
    </main>
  )
}

export default page