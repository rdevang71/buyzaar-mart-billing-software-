import MainLayout from '@/components/MainLayout';
import Link from 'next/link';

export default function InventoryShell({
  title,
  subtitle,
  breadcrumb,
  actions = [],
  searchPlaceholder,
  filters = [],
  stats = [],
  insights = [],
  cards = [],
  tableHeaders = [],
  tableData = [],
  searchValue,
  onSearchChange,
  onDownload,
  emptyMessage = 'No Records Found',
  showTable = true,
}) {
  const renderActionElement = (item, className, content) => {
    if (item.href) {
      return (
        <Link href={item.href} className={className}>
          {content}
        </Link>
      );
    }

    return (
      <button type="button" onClick={item.onClick} className={className}>
        {content}
      </button>
    );
  };

  return (
    <MainLayout>
      <div className="flex items-center gap-2 text-[12px] text-gray-500 mb-4">
        {breadcrumb.map((item, index) => (
          <span key={item.label} className="flex items-center gap-2">
            <span className={index === breadcrumb.length - 1 ? 'font-semibold text-gray-900' : 'text-blue-600'}>
              {item.label}
            </span>
            {index < breadcrumb.length - 1 && <i className="ti ti-chevron-right text-[11px] text-gray-400" />}
          </span>
        ))}
      </div>

      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-[28px] font-semibold text-gray-900 leading-tight">{title}</h1>
          <p className="text-[12.5px] text-gray-400 mt-1">{subtitle}</p>
        </div>

        {actions.length > 0 && (
          <div className="flex items-center gap-3 flex-shrink-0">
            {actions.map((action, index) => (
              <button
                key={action.label}
                type={action.type || 'button'}
                onClick={action.onClick}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                  index === actions.length - 1 && action.primary
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'border border-blue-300 text-blue-600 hover:bg-blue-50'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {stats.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-gray-200 p-4 min-h-[98px] flex flex-col justify-between shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <p className="text-[12px] font-medium tracking-wide text-gray-400 uppercase">{stat.label}</p>
              {stat.value ? (
                <div className="text-[28px] font-semibold text-blue-600 leading-none">{stat.value}</div>
              ) : (
                <div className="w-8 h-1 rounded-full bg-blue-600/80" />
              )}
              <p className="text-[12.5px] text-gray-400">{stat.note}</p>
            </div>
          ))}
        </div>
      )}

      {insights.length > 0 && (
        <>
          <div className="inline-flex items-center rounded-full bg-orange-50 px-3 py-1 text-[12px] font-semibold text-orange-500 mb-2">
            AI INSIGHTS
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
            {insights.map((insight) => (
              <div key={insight.title} className="bg-[#fff7ef] border border-orange-300 rounded-xl p-4 min-h-[130px]">
                <h3 className="text-[13px] font-semibold text-orange-900">{insight.title}</h3>
                <p className="text-[12px] text-orange-900/85 mt-2 leading-5">{insight.text}</p>
                {renderActionElement(
                  insight,
                  'mt-4 inline-flex items-center px-4 py-2 rounded-md bg-black text-white text-[12px] font-semibold',
                  insight.button
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {cards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          {cards.map((card) => (
            <div key={card.title} className="bg-white rounded-xl border border-gray-200 min-h-[78px] shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              {renderActionElement(
                card,
                'w-full h-full p-4 flex items-center justify-between text-left hover:bg-blue-50/50 rounded-xl transition-colors',
                <>
                  <span>
                    <span className="text-[13px] font-semibold text-gray-900 block">{card.title}</span>
                    <span className="text-[12px] text-gray-400 mt-1 block">{card.text}</span>
                  </span>
                  <i className="ti ti-chevron-right text-gray-400 text-[16px]" />
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {showTable && tableHeaders.length > 0 && (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 justify-between flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[260px] max-w-[340px] bg-gray-50 rounded-lg px-3 py-2">
            <i className="ti ti-search text-gray-400 text-[16px]" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={typeof onSearchChange === 'function' ? (searchValue || '') : undefined}
              onChange={typeof onSearchChange === 'function' ? (e) => onSearchChange(e.target.value) : undefined}
              className="flex-1 bg-transparent text-[13px] text-gray-700 outline-none placeholder:text-gray-400"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap ml-auto">
            {Array.isArray(filters) ? filters.map((filter) => (
              <button key={filter} type="button" className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-[12.5px] text-gray-600 hover:bg-gray-50 transition-colors">
                <i className="ti ti-filter text-[14px] text-blue-500" />
                {filter}
                <i className="ti ti-chevron-down text-[11px]" />
              </button>
            )) : filters}
            <button type="button" onClick={onDownload} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
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
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-100 text-[12px] text-gray-400">
          <select className="border border-gray-200 rounded-lg px-3 py-2 bg-white text-[12px] text-gray-600">
            <option>10</option>
          </select>
          <span>Showing {tableData.length ? `1 to ${tableData.length}` : '0 to 0'} of {tableData.length} Results</span>
        </div>
      </div>
      )}
    </MainLayout>
  );
}
