'use client';

import MainLayout from '@/components/MainLayout';

const tableHeaders = [
  'Purchase Order ID',
  'Destination Name',
  'Destination Type',
  'Invoice Number',
  'Vendor Name',
  'Invoice Date',
  'Invoice Time',
  'Stock In',
  'Fulfillment Status',
];

const tableData = [
  {
    'Purchase Order ID': '#PO-2024-001',
    'Destination Name': 'Main Store',
    'Destination Type': 'Store',
    'Invoice Number': 'INV-2024-500',
    'Vendor Name': 'Abc Suppliers',
    'Invoice Date': '12 May 2024',
    'Invoice Time': '10:30 AM',
    'Stock In': '45',
    'Fulfillment Status': 'Completed',
  },
  {
    'Purchase Order ID': '#PO-2024-002',
    'Destination Name': 'Outlet 1',
    'Destination Type': 'Outlet',
    'Invoice Number': 'INV-2024-501',
    'Vendor Name': 'XYZ Suppliers',
    'Invoice Date': '11 May 2024',
    'Invoice Time': '02:15 PM',
    'Stock In': '32',
    'Fulfillment Status': 'Processing',
  },
  {
    'Purchase Order ID': '#PO-2024-003',
    'Destination Name': 'Main Store',
    'Destination Type': 'Store',
    'Invoice Number': 'INV-2024-502',
    'Vendor Name': 'Global Trading',
    'Invoice Date': '10 May 2024',
    'Invoice Time': '09:45 AM',
    'Stock In': '58',
    'Fulfillment Status': 'Completed',
  },
];

export default function PurchaseOrdersPage() {
  return (
    <MainLayout>
      <div className="flex items-center gap-2 text-[12px] text-gray-500 mb-4">
        <span className="text-blue-600">Purchase</span>
        <i className="ti ti-chevron-right text-[11px] text-gray-400" />
        <span className="font-semibold text-gray-900">Purchase Orders</span>
      </div>

      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-[28px] font-semibold text-gray-900 leading-tight">Purchase Order</h1>
          <p className="text-[12.5px] text-gray-400 mt-1">Purchase Order Description</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-300 text-[13px] font-medium text-blue-600 hover:bg-blue-50 transition-colors">
            <i className="ti ti-file-document text-[16px]" />
            Create PO Using Requisition
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-[13px] font-medium text-white hover:bg-blue-700 transition-colors">
            <i className="ti ti-plus text-[16px]" />
            Create Purchase Order
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-[12px] font-medium text-gray-600">Date Range:</label>
            <input type="text" value="11 May 2026 - 11 May 2026" className="px-3 py-2 border border-gray-200 rounded-lg text-[12px] bg-white" readOnly />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[12px] font-medium text-gray-600">Destination:</label>
            <select className="px-3 py-2 border border-gray-200 rounded-lg text-[12px] bg-white">
              <option>ALL</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[12px] font-medium text-gray-600">Payment Status:</label>
            <select className="px-3 py-2 border border-gray-200 rounded-lg text-[12px] bg-white">
              <option>All</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[12px] font-medium text-gray-600">Vendor:</label>
            <select className="px-3 py-2 border border-gray-200 rounded-lg text-[12px] bg-white">
              <option>ALL</option>
            </select>
          </div>
          <button className="px-4 py-2 rounded-lg bg-blue-600 text-[12px] font-medium text-white hover:bg-blue-700 transition-colors">
            Apply
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2 flex-1 min-w-[260px] max-w-[340px] bg-gray-50 rounded-lg px-3 py-2">
            <i className="ti ti-search text-gray-400 text-[16px]" />
            <input
              type="text"
              placeholder="Search"
              className="flex-1 bg-transparent text-[13px] text-gray-700 outline-none placeholder:text-gray-400"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="border-b border-gray-100">
                {tableHeaders.map((header) => (
                  <th key={header} className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 tracking-wide uppercase">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.length > 0 ? (
                tableData.map((row, rowIdx) => (
                  <tr key={rowIdx} className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors">
                    {tableHeaders.map((header, colIdx) => (
                      <td key={colIdx} className="px-4 py-3 text-[13px] text-gray-700">
                        {row[header] || '-'}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={tableHeaders.length} className="px-4 py-14 text-center text-[14px] text-blue-700 font-medium">
                    No Records Found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-100 text-[12px] text-gray-400">
          <select className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-[12px] text-gray-600">
            <option>10</option>
            <option>20</option>
            <option>50</option>
          </select>
          <span>Showing 1 to 3 of 3 Results</span>
        </div>
      </div>
    </MainLayout>
  );
}
