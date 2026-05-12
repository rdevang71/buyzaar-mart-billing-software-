'use client';

import MainLayout from '@/components/MainLayout';

const tableHeaders = [
  'Invoice ID',
  'Vendor Name',
  'Invoice Number',
  'Amount Due',
  'Amount Paid',
  'Amount Left',
  'Invoice Creation Date',
  'Invoice Due Date',
  'Invoice Status',
  'View Payment Details',
];

const tableData = [
  {
    'Invoice ID': '#INV-001',
    'Vendor Name': 'Abc Suppliers',
    'Invoice Number': 'INV-2024-600',
    'Amount Due': '₹45,000',
    'Amount Paid': '₹45,000',
    'Amount Left': '₹0',
    'Invoice Creation Date': '12 May 2024',
    'Invoice Due Date': '26 May 2024',
    'Invoice Status': 'Paid',
    'View Payment Details': 'View',
  },
  {
    'Invoice ID': '#INV-002',
    'Vendor Name': 'XYZ Suppliers',
    'Invoice Number': 'INV-2024-601',
    'Amount Due': '₹32,500',
    'Amount Paid': '₹16,250',
    'Amount Left': '₹16,250',
    'Invoice Creation Date': '11 May 2024',
    'Invoice Due Date': '25 May 2024',
    'Invoice Status': 'Partial',
    'View Payment Details': 'View',
  },
  {
    'Invoice ID': '#INV-003',
    'Vendor Name': 'Global Trading',
    'Invoice Number': 'INV-2024-602',
    'Amount Due': '₹58,000',
    'Amount Paid': '₹0',
    'Amount Left': '₹58,000',
    'Invoice Creation Date': '10 May 2024',
    'Invoice Due Date': '24 May 2024',
    'Invoice Status': 'Pending',
    'View Payment Details': 'View',
  },
  {
    'Invoice ID': '#INV-004',
    'Vendor Name': 'Premium Goods',
    'Invoice Number': 'INV-2024-603',
    'Amount Due': '₹22,500',
    'Amount Paid': '₹22,500',
    'Amount Left': '₹0',
    'Invoice Creation Date': '09 May 2024',
    'Invoice Due Date': '23 May 2024',
    'Invoice Status': 'Paid',
    'View Payment Details': 'View',
  },
];

export default function InvoiceSettlementPage() {
  return (
    <MainLayout>
      <div className="flex items-center gap-2 text-[12px] text-gray-500 mb-4">
        <span className="text-blue-600">Purchase</span>
        <i className="ti ti-chevron-right text-[11px] text-gray-400" />
        <span className="font-semibold text-gray-900">Invoice Settlement</span>
      </div>

      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-[28px] font-semibold text-gray-900 leading-tight">Vendor Invoice Credit Settlement</h1>
          <p className="text-[12.5px] text-gray-400 mt-1">Detail report for the vendor invoice credit settlement according to vendor and invoice status. Need Help?</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-[12px] font-medium text-gray-600">Vendor:</label>
            <select className="px-3 py-2 border border-gray-200 rounded-lg text-[12px] bg-white">
              <option>ALL</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[12px] font-medium text-gray-600">Invoice Status:</label>
            <select className="px-3 py-2 border border-gray-200 rounded-lg text-[12px] bg-white">
              <option>All</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 justify-between flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[260px] max-w-[340px] bg-gray-50 rounded-lg px-3 py-2">
            <i className="ti ti-search text-gray-400 text-[16px]" />
            <input
              type="text"
              placeholder="Search"
              className="flex-1 bg-transparent text-[13px] text-gray-700 outline-none placeholder:text-gray-400"
            />
          </div>
          <button className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <i className="ti ti-download text-gray-500 text-[16px]" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px]">
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
          <span>Showing 1 to 4 of 4 Results</span>
        </div>
      </div>
    </MainLayout>
  );
}
