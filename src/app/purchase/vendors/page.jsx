'use client';

import MainLayout from '@/components/MainLayout';

const tableHeaders = [
  'S. No.',
  'Vendor Name',
  'Mobile Number',
  'Email Address',
  'Address',
  'Actions',
];

const tableData = [
  {
    'S. No.': '1',
    'Vendor Name': 'Abc',
    'Mobile Number': '9410225039',
    'Email Address': 'pathakmansi608@gmail.com',
    'Address': 'Moradabad City, Uttar Pradesh, India. 244001',
    'Actions': 'View',
  },
  {
    'S. No.': '2',
    'Vendor Name': 'XYZ Suppliers',
    'Mobile Number': '9876543210',
    'Email Address': 'contact@xyzsuppliers.com',
    'Address': 'Delhi, India. 110001',
    'Actions': 'View',
  },
  {
    'S. No.': '3',
    'Vendor Name': 'Global Trading Co',
    'Mobile Number': '9123456789',
    'Email Address': 'sales@globaltrading.com',
    'Address': 'Mumbai, Maharashtra, India. 400001',
    'Actions': 'View',
  },
  {
    'S. No.': '4',
    'Vendor Name': 'Premium Goods Ltd',
    'Mobile Number': '9876543211',
    'Email Address': 'info@premiumgoods.com',
    'Address': 'Bangalore, Karnataka, India. 560001',
    'Actions': 'View',
  },
];

export default function VendorsPage() {
  return (
    <MainLayout>
      <div className="flex items-center gap-2 text-[12px] text-gray-500 mb-4">
        <span className="text-blue-600">Purchase</span>
        <i className="ti ti-chevron-right text-[11px] text-gray-400" />
        <span className="font-semibold text-gray-900">Vendors</span>
      </div>

      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-[28px] font-semibold text-gray-900 leading-tight">Vendors</h1>
          <p className="text-[12.5px] text-gray-400 mt-1">Descriptive Text Need Help?</p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-[13px] font-medium text-white hover:bg-blue-700 transition-colors flex-shrink-0">
          <i className="ti ti-plus text-[16px]" />
          Create Vendor
        </button>
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
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <i className="ti ti-download text-gray-500 text-[16px]" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px]">
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
              {tableData.map((row, rowIdx) => (
                <tr key={rowIdx} className="border-b border-gray-100 hover:bg-blue-50/50 transition-colors">
                  {tableHeaders.map((header, colIdx) => (
                    <td key={colIdx} className="px-4 py-3 text-[13px] text-gray-700">
                      {row[header] || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-100 text-[12px] text-gray-400">
          <select className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-[12px] text-gray-600">
            <option>10</option>
            <option>20</option>
            <option>50</option>
          </select>
          <span>Showing 1 to 1 of 1 Results</span>
        </div>
      </div>
    </MainLayout>
  );
}
