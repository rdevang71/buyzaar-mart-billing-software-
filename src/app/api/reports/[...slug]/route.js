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
  return Object.fromEntries(searchParams.entries());
}

export async function GET(request, context) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;

    const roleCheck = requireRole(auth.user, 'super_admin', 'admin', 'manager');
    if (roleCheck.error) return roleCheck.error;

    const params = await context.params;
    const reportKey = normalizeReportKey(params.slug);
    const definition = getReportDefinition(reportKey);
    if (!definition) return notFoundError('Report not found');

    const { searchParams } = new URL(request.url);
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
