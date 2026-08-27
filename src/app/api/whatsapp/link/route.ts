import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import pool from '@/lib/db';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { phoneNumber } = await req.json();
    if (!phoneNumber) return NextResponse.json({ error: 'Nomor WhatsApp wajib diisi' }, { status: 400 });

    // Generate random token
    const token = `ARSIP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // Update profiles
    await pool.query(
      `UPDATE public.profiles 
       SET whatsapp_number = $1, wa_verify_token = $2, wa_status = 'pending'
       WHERE id = $3`,
      [phoneNumber, token, userId]
    );

    return NextResponse.json({ success: true, token });
  } catch (error: any) {
    console.error('Error linking WA:', error);
    // Handle unique constraint error for whatsapp_number
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Nomor WhatsApp ini sudah digunakan oleh akun lain' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await pool.query(
      `UPDATE public.profiles 
       SET whatsapp_number = NULL, wa_verify_token = NULL, wa_status = 'unlinked'
       WHERE id = $1`,
      [userId]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error unlinking WA:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan pada server' }, { status: 500 });
  }
}
