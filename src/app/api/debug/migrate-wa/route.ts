import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    await pool.query(`
      ALTER TABLE public.profiles 
      ADD COLUMN IF NOT EXISTS whatsapp_number TEXT UNIQUE,
      ADD COLUMN IF NOT EXISTS wa_verify_token TEXT,
      ADD COLUMN IF NOT EXISTS wa_status TEXT DEFAULT 'unlinked' CHECK (wa_status IN ('unlinked', 'pending', 'verified'));
    `);

    return NextResponse.json({ message: 'Migration for WhatsApp columns successful!' });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
