import DataTable from '@/components/DataTable';
import React from 'react';

export const CoinOverviewFallback = () => {
  return (
    <div id="coin-overview-fallback">
      <div className="header">
        <div className="header-image bg-dark-400 animate-pulse" />
        <div className="info">
          <div className="header-line-sm bg-dark-400 animate-pulse rounded" />
          <div className="header-line-lg bg-dark-400 animate-pulse rounded" />
        </div>
      </div>
      <div className="flex gap-2 mb-4 px-2">
        <div className="period-button-skeleton bg-dark-400 animate-pulse rounded" />
        <div className="period-button-skeleton bg-dark-400 animate-pulse rounded" />
        <div className="period-button-skeleton bg-dark-400 animate-pulse rounded" />
      </div>
      <div className="chart">
        <div className="chart-skeleton bg-dark-400 animate-pulse" />
      </div>
    </div>
  );
};

export const TrendingCoinsFallback = () => {
  const skeletonColumns: Array<{
    header: string;
    cellClassName?: string;
    cell: (row: any, rowIndex?: number) => React.ReactNode;
  }> = [
    {
      header: 'Name',
      cellClassName: 'name-cell',
      cell: () => (
        <div className="name-link">
          <div className="name-image bg-dark-400 animate-pulse rounded-full" />
          <div className="name-line bg-dark-400 animate-pulse rounded" />
        </div>
      ),
    },
    {
      header: '24h Change',
      cellClassName: 'name-cell',
      cell: () => <div className="h-4 w-16 bg-dark-400 animate-pulse rounded" />,
    },
    {
      header: 'Price',
      cellClassName: 'price-cell',
      cell: () => <div className="h-4 w-24 bg-dark-400 animate-pulse rounded" />,
    },
  ];

  const skeletonData = Array.from({ length: 6 }, (_, i) => ({ id: `skeleton-${i}` }));

  return (
    <div id="trending-coins-fallback">
      <h4>Trending Coins</h4>
      <DataTable
        data={skeletonData}
        columns={skeletonColumns}
        rowKey={(_, index) => `skeleton-row-${index}`}
        tableClassName="trending-coins-table"
        headerCellClassName="py-3!"
        bodyCellClassName="py-2!"
      />
    </div>
  );
};
