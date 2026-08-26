import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import pool from '@/lib/db';
import { getUploadPresignedUrl, deleteS3Object } from '@/lib/s3';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { type } = body;

    if (type === 'storage_upload') {
      let { bucket, path, contentType } = body;
      if (path && typeof path === 'string') {
        if (path.startsWith('mock/')) {
          path = `${userId}/${path.substring(5)}`;
        } else if (!path.startsWith(`${userId}/`)) {
          path = `${userId}/${path.replace(/^\/+/, '')}`;
        }
      }
      const url = await getUploadPresignedUrl(path, contentType || 'application/octet-stream');
      return NextResponse.json({ data: { signedUrl: url, path } });
    }

    if (type === 'storage_remove') {
      const { bucket, paths } = body;
      for (let p of paths) {
        if (typeof p === 'string') {
          try {
            if (p.startsWith('http')) {
              const urlObj = new URL(p);
              p = urlObj.pathname.replace(/^\/+/, '');
              if (p.includes('media/')) {
                p = p.split('media/')[1];
              }
            }
          } catch (e) {}
          await deleteS3Object(p);
        }
      }
      return NextResponse.json({ data: { success: true } });
    }

    // Database operations
    const { table, action, payload, filters } = body;
    if (!table || !action) return NextResponse.json({ error: 'Invalid DB payload' }, { status: 400 });

    // Build WHERE clause from filters [{col, val}]
    // Auto-inject user_id check if the table has it (except for profiles where it's 'id')
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (filters && Array.isArray(filters)) {
      for (const f of filters) {
        // Abaikan filter user_id dari client (karena sering menggunakan 'mock')
        if (f.col === 'user_id' || (table === 'profiles' && f.col === 'id')) continue;

        if (f.op === 'in' && Array.isArray(f.val)) {
          const inParams = f.val.map((_: any) => `$${paramIndex++}`);
          conditions.push(`${f.col} IN (${inParams.join(', ')})`);
          values.push(...f.val);
        } else {
          conditions.push(`${f.col} = $${paramIndex++}`);
          values.push(f.val);
        }
      }
    }

    // Auto RLS enforcing for shim
    if (table === 'profiles') {
      conditions.push(`id = $${paramIndex}`);
      values.push(userId);
      paramIndex++;
    } else if (table !== 'note_media' && table !== 'ai_chat_messages' && table !== 'note_tags') {
      conditions.push(`user_id = $${paramIndex}`);
      values.push(userId);
      paramIndex++;
    } else {
      // Untuk tabel tanpa user_id (seperti note_media), HARUS ada filter dari client
      // untuk mencegah full-table deletion/update oleh user jahat.
      if (conditions.length === 0) {
        return NextResponse.json({ error: 'Unconstrained query on dependent table is not allowed' }, { status: 403 });
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    if (action === 'select') {
      const query = `SELECT * FROM public.${table} ${whereClause}`;
      const res = await pool.query(query, values);
      return NextResponse.json({ data: res.rows, error: null });
    }

    if (action === 'delete') {
      const query = `DELETE FROM public.${table} ${whereClause} RETURNING *`;
      const res = await pool.query(query, values);
      return NextResponse.json({ data: res.rows, error: null });
    }

    if (action === 'update') {
      const setClauses = [];
      if (payload.user_id) payload.user_id = userId; // Override mock
      for (const key of Object.keys(payload)) {
        let val = payload[key];
        if (key === 'allowed_emails' && Array.isArray(val)) {
          val = JSON.stringify(val);
        }
        setClauses.push(`${key} = $${paramIndex}`);
        values.push(val);
        paramIndex++;
      }
      const query = `UPDATE public.${table} SET ${setClauses.join(', ')} ${whereClause} RETURNING *`;
      const res = await pool.query(query, values);
      return NextResponse.json({ data: res.rows, error: null });
    }

    if (action === 'insert') {
      // payload can be array or object
      const items = Array.isArray(payload) ? payload : [payload];
      if (items.length === 0) return NextResponse.json({ data: [] });

      // Override mock user_id or inject if missing
      for (const item of items) {
        if (table !== 'note_media' && table !== 'ai_chat_messages' && table !== 'note_tags') {
           item.user_id = userId;
        }
      }

      const cols = Object.keys(items[0]);
      const insertValues: any[] = [];
      let insertIndex = 1;
      
      const valStrings = [];
      for (const item of items) {
        const itemVals = [];
        for (const col of cols) {
          itemVals.push(`$${insertIndex++}`);
          let val = item[col];
          if (col === 'allowed_emails' && Array.isArray(val)) {
            val = JSON.stringify(val);
          }
          insertValues.push(val);
        }
        valStrings.push(`(${itemVals.join(', ')})`);
      }

      const query = `INSERT INTO public.${table} (${cols.join(', ')}) VALUES ${valStrings.join(', ')} RETURNING *`;
      const res = await pool.query(query, insertValues);
      return NextResponse.json({ data: Array.isArray(payload) ? res.rows : res.rows[0], error: null });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

  } catch (err: any) {
    console.error('[db-shim]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
