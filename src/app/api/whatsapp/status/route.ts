import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const res = await pool.query(
      `SELECT wa_status, whatsapp_number FROM public.profiles WHERE id = $1 LIMIT 1`,
      [userId]
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ status: 'unlinked' });
    }

    return NextResponse.json({
      status: res.rows[0].wa_status,
      number: res.rows[0].whatsapp_number,
    });
  } catch (error) {
    console.error('Error fetching WA status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
