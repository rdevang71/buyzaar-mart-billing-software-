import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function DELETE(request, { params }) {
  try {
    const resolvedParams = await params;
    const employeeId = Number(resolvedParams?.id);

    if (!Number.isFinite(employeeId)) {
      return NextResponse.json({ error: 'Invalid employee id' }, { status: 400 });
    }

    // Delete from employees table
    const res = await query(
      `DELETE FROM employees WHERE id = $1 RETURNING id`,
      [employeeId]
    );

    if (!res.rows.length) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, message: 'Employee deleted successfully', id: employeeId },
      { status: 200 }
    );
  } catch (err) {
    console.error('[employee staff DELETE]', err.message);
    return NextResponse.json(
      { error: err.message || 'Failed to delete employee' },
      { status: 500 }
    );
  }
}