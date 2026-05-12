import CatalogListPage from '@/components/CatalogListPage';

const columns = [
  { key: 'sno', label: 'S. No.', sortable: true },
  { key: 'customer', label: 'Customer', sortable: true },
  { key: 'total_orders', label: 'Total Orders', sortable: true },
  { key: 'total_sales', label: 'Total Sales', sortable: true },
  { key: 'total_discount', label: 'Total Discount', sortable: true },
  { key: 'net_sales', label: 'Net Sales', sortable: true },
];

export default function CustomersSalesReportPage() {
  return (
    <CatalogListPage
      breadcrumbs={[
        { label: 'Customer', href: '/customer/dashboard' },
        { label: 'Customers Sales Report' },
      ]}
      title="Customers Sales Report"
      description="Customer-wise sales report"
      createLabel="Create Customers Sales Report"
      columns={columns}
      rows={[]}
    />
  );
}