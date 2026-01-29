import DataTable from '@/components/DataTable';


export const CoinOverviewFallback = () => {
  return (
    <div id="coin-overview-fallback">
      <div className="header pt-2">
        <div className="header-image skeleton animate-pulse" />
        <div className="info">
          <div className="header-line-sm skeleton animate-pulse rounded" />
          <div className="header-line-lg skeleton animate-pulse rounded" />
        </div>
      </div>
      <div className="flex gap-2 mb-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="period-button-skeleton skeleton animate-pulse" />
        ))}
      </div>
      <div className="chart">
        <div className="chart-skeleton skeleton animate-pulse" />
      </div>
    </div>
  );
};

const skeletonColumns: DataTableColumn<number>[] = [
  {
    header: 'Name',
    cellClassName: 'name-cell',
    cell: () => (
      <div className="name-link">
        <div className="name-image skeleton animate-pulse" />
        <div className="name-line skeleton animate-pulse rounded" />
      </div>
    ),
  },
  {
    header: '24 change',
    cellClassName: 'change-cell',
    cell: () => (
      <div className="price-change">
        <div className="change-icon skeleton animate-pulse" />
        <div className="change-line skeleton animate-pulse rounded" />
      </div>
    ),
  },
  {
    header: 'Price',
    cellClassName: 'price-cell',
    cell: () => <div className="price-line skeleton animate-pulse rounded" />,
  },
];

const trendingSkeletonData = [1, 2, 3, 4, 5, 6];

export const TrendingCoinsFallback = () => {
  return (
    <div id="trending-coins-fallback">
      <h4>Trending Coins</h4>
      <DataTable
        columns={skeletonColumns}
        data={trendingSkeletonData}
        rowKey={(_, index) => index}
        tableClassName="trending-coins-table"
        headerCellClassName="py-3!"
        bodyCellClassName="py-2!"
      />
    </div>
  );
};

const categoriesSkeletonColumns: DataTableColumn<number>[] = [
  {
    header: 'Category',
    cellClassName: 'category-cell',
    cell: () => <div className="category-skeleton skeleton animate-pulse rounded" />,
  },
  {
    header: 'Top Gainers',
    cellClassName: 'top-gainers-cell',
    cell: () => (
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="coin-skeleton skeleton animate-pulse" />
        ))}
      </div>
    ),
  },
  {
    header: '24h Change',
    cellClassName: 'change-header-cell',
    cell: () => (
      <div className="change-cell">
        <div className="value-skeleton-sm skeleton animate-pulse rounded" />
        <div className="change-icon skeleton animate-pulse" />
      </div>
    ),
  },
  {
    header: 'Market Cap',
    cellClassName: 'market-cap-cell',
    cell: () => <div className="value-skeleton-lg skeleton animate-pulse rounded" />,
  },
  {
    header: '24h Volume',
    cellClassName: 'volume-cell',
    cell: () => <div className="value-skeleton-md skeleton animate-pulse rounded" />,
  },
];

const categoriesSkeletonData = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const CategoriesFallback = () => {
  return (
    <div id="categories-fallback">
      <h4>Top Categories</h4>
      <DataTable
        columns={categoriesSkeletonColumns}
        data={categoriesSkeletonData}
        rowKey={(_, index) => index}
        tableClassName="mt-3"
      />
    </div>
  );
};
