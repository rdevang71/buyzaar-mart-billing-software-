import { NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/api-protection';
import { errorResponse, notFoundError, successResponse } from '@/lib/api-response';
import {
  createReportWorkbookBuffer,
  getReportDefinition,
  getReportRows,
  normalizeReportKey,
} from '@/lib/reportsService';

function filtersFromSearchParams(searchParams) {
  const filters = Object.fromEntries(searchParams.entries());
  delete filters.export;
  delete filters.columns;
  return filters;
}

function columnsFromSearchParams(searchParams) {
  const raw = searchParams.get('columns');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed
      .filter((column) => column?.key && column?.label)
      .map((column) => ({ key: String(column.key), label: String(column.label) }));
  } catch {
    return null;
  }
}

export async function GET(request, context) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const roleCheck = requireRole(auth.user, 'super_admin', 'admin', 'manager');
    if (roleCheck.error) return roleCheck.error;

    const params = await context.params;
    const reportKey = normalizeReportKey(params.slug);
    const { searchParams } = new URL(request.url);
    const columns = columnsFromSearchParams(searchParams);
    const baseDefinition = getReportDefinition(reportKey);
    const definition = columns ? { ...baseDefinition, columns } : baseDefinition;
    if (!definition) return notFoundError('Report not found');

    const rows = await getReportRows(reportKey, filtersFromSearchParams(searchParams), auth.user);

    if (searchParams.get('export') === 'xlsx') {
      const buffer = createReportWorkbookBuffer(definition, rows);
      const filename = `${reportKey.replace(/[^\w-]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    return successResponse({
      report: {
        key: reportKey,
        title: definition.title,
        columns: definition.columns,
      },
      rows,
      total: rows.length,
    });
  } catch (err) {
    console.error('[report route]', err);
    return errorResponse('Unable to load report');
  }
}
