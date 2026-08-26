import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, table, payload, match } = body;
    
    // Very basic and unsafe SQL generator for migration purposes
    if (action === 'select') {
      const q = `SELECT ${payload || '*'} FROM ${table} WHERE user_id = $1 ${match ? `AND id = '${match.id}'` : ''}`;
      const { rows } = await query(q, [userId]);
      return NextResponse.json({ data: rows });
    }
    
    if (action === 'insert') {
      const keys = Object.keys(payload);
      const vals = Object.values(payload);
      const placeholders = keys.map((_, i) => `$${i + 2}`).join(',');
      const q = `INSERT INTO ${table} (user_id, ${keys.join(',')}) VALUES ($1, ${placeholders}) RETURNING *`;
      const { rows } = await query(q, [userId, ...vals]);
      return NextResponse.json({ data: rows });
    }

    // Add update/delete later
    return NextResponse.json({ error: 'Action not supported' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
