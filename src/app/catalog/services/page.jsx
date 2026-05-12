import CatalogListPage from '@/components/CatalogListPage';

const rows = [
  { id: 1, sno: 1, name: 'AC Repair',        group: 'Repair Services',   price: '₹500', duration: '2 hrs' },
  { id: 2, sno: 2, name: 'Home Deep Clean',  group: 'Cleaning Services', price: '₹1200', duration: '4 hrs' },
  { id: 3, sno: 3, name: 'Hair Cut',         group: 'Salon Services',    price: '₹200', duration: '30 min' },
];

const columns = [
  { key: 'sno',      label: 'S. No.',         sortable: true },
  { key: 'name',     label: 'Service Name',   sortable: true },
  { key: 'group',    label: 'Service Group',  sortable: true },
  { key: 'price',    label: 'Price',          sortable: true },
  { key: 'duration', label: 'Duration',       sortable: true },
];

export default function ServicesPage() {
  return (
    <CatalogListPage
      breadcrumbs={[
        { label: 'Catalog', href: '/catalog' },
        { label: 'Product', href: '/catalog/products' },
        { label: 'Services' },
      ]}
      title="Services"
      description="Manage all services offered at your store."
      createLabel="Create Service"
      columns={columns}
      rows={rows}
    />
  );
}