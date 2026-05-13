import ReportsListPage from '@/components/ReportListPage';

const filters = [
  {
    "key": "date_range",
    "label": "Date Range",
    "type": "date-range"
  },
  {
    "key": "region",
    "label": "Select Region",
    "type": "text"
  },
  {
    "key": "store",
    "label": "Store",
    "type": "select",
    "options": [
      "All Stores"
    ]
  }
];

const columns = [
  {
    "key": "store",
    "label": "Store"
  },
  {
    "key": "date",
    "label": "Date"
  },
  {
    "key": "orders",
    "label": "Orders"
  },
  {
    "key": "sales",
    "label": "Sales"
  },
  {
    "key": "discount",
    "label": "Discount"
  },
  {
    "key": "net_bill",
    "label": "Net Bill"
  },
  {
    "key": "taxes",
    "label": "Taxes"
  },
  {
    "key": "gross_bill",
    "label": "Gross Bill"
  }
];

export default function DailySalesDsrPage() {
  return (
    <ReportsListPage
      breadcrumbs={[
        { label: 'Reports Dashboard', href: '/reports' },
        { label: 'Pinned' },
        { label: 'Daily Sales (DSR)' },
      ]}
      title="Daily Sales (DSR)"
      description="Daily sales report for today"
      filters={filters}
      columns={columns}
      actionButtons={[]}
    />
  );
}