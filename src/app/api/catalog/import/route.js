import { query } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';

export async function POST(request) {
  try {
    const body = await request.json();
    const { type, rows } = body; // type: 'categories' | 'sub-categories'

    if (!rows?.length) return errorResponse('No data to import');

    let inserted = 0;
    let skipped  = 0;
    const errors = [];

    for (const row of rows) {
      try {
        if (type === 'categories') {
          if (!row.name?.trim()) { skipped++; continue; }
          await query(
            `INSERT INTO categories (name, description, sort_sequence, is_active)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT DO NOTHING`,
            [row.name.trim(), row.description || null, row.sort_sequence ?? 0, row.is_active ?? true]
          );
          inserted++;
        } else if (type === 'sub-categories') {
          if (!row.name?.trim()) { skipped++; continue; }
          // Find category by name if provided
          let category_id = null;
          if (row.category_name) {
            const cat = await query(
              `SELECT id FROM categories WHERE name ILIKE $1 LIMIT 1`,
              [row.category_name.trim()]
            );
            if (cat.rows.length) category_id = cat.rows[0].id;
          }
          await query(
            `INSERT INTO sub_categories (name, description, category_id, sort_sequence, is_active)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT DO NOTHING`,
            [row.name.trim(), row.description || null, category_id, row.sort_sequence ?? 0, row.is_active ?? true]
          );
          inserted++;
        }
      } catch (err) {
        errors.push({ row: row.name, error: err.message });
        skipped++;
      }
    }

    return successResponse({ inserted, skipped, errors }, `${inserted} records imported successfully`);
  } catch (err) {
    return errorResponse(err.message);
  }
}
