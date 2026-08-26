import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import pool from '@/lib/db';
import { parseNoteContent } from '@/lib/utils/flashcardHelper';

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clerkUser = await currentUser();

    // Fetch all notes with media
    const notesRes = await pool.query(
      `SELECT n.id, n.title, n.transcribed_text, n.created_at,
         COALESCE(json_agg(json_build_object('media_url', nm.media_url, 'media_type', nm.media_type)) FILTER (WHERE nm.id IS NOT NULL), '[]') AS note_media
       FROM public.notes n
       LEFT JOIN public.note_media nm ON nm.note_id = n.id
       WHERE n.user_id = $1
       GROUP BY n.id
       ORDER BY n.created_at DESC`,
      [userId]
    );
    const notes = notesRes.rows;

    // Fetch all folders
    const foldersRes = await pool.query(
      'SELECT id, name, created_at FROM public.folders WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    const folders = foldersRes.rows;

    const userName = clerkUser?.fullName || clerkUser?.emailAddresses?.[0]?.emailAddress || 'Pengguna';
    const exportDate = new Date().toLocaleDateString('id-ID', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    // Build HTML
    const noteCards = (notes || []).map((note, idx) => {
      const { textContent, summary, flashcards } = parseNoteContent(note.transcribed_text || '');
      const createdAt = new Date(note.created_at).toLocaleDateString('id-ID', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });

      const images = (note.note_media || [])
        .filter((m: any) => m.media_type === 'image')
        .map((m: any) => `<img src="${m.media_url}" alt="Gambar catatan" style="max-width:100%;border-radius:8px;margin-top:12px;border:1px solid #e5e7eb;" />`)
        .join('');

      const fcHtml = flashcards.length > 0
        ? `<div style="margin-top:16px;">
            <p style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">Flashcards (${flashcards.length})</p>
            ${flashcards.map((fc, i) => `
              <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:8px;background:#f9fafb;">
                <p style="font-size:13px;font-weight:600;color:#111827;">Q${i + 1}: ${fc.q}</p>
                <p style="font-size:13px;color:#374151;margin-top:6px;padding-left:12px;border-left:3px solid #6366f1;">${fc.a}</p>
              </div>`).join('')}
           </div>`
        : '';

      const summaryHtml = summary
        ? `<div style="margin-top:16px;background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:14px;">
            <p style="font-size:12px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px;">📝 Ringkasan AI</p>
            <p style="font-size:13px;color:#374151;white-space:pre-wrap;line-height:1.7;">${summary.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
           </div>`
        : '';

      return `
        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:20px;break-inside:avoid;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
            <h2 style="font-size:16px;font-weight:700;color:#111827;margin:0;">${(idx + 1)}. ${note.title || 'Catatan Tanpa Judul'}</h2>
            <span style="font-size:11px;color:#9ca3af;">${createdAt}</span>
          </div>
          ${images}
          ${textContent
            ? `<div style="margin-top:${images ? '12px' : '0'};">
                <p style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;">Isi Catatan</p>
                <p style="font-size:13px;color:#374151;white-space:pre-wrap;line-height:1.8;padding:14px;background:#f9fafb;border-radius:8px;border:1px solid #f3f4f6;">${textContent.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
               </div>`
            : '<p style="font-size:13px;color:#9ca3af;font-style:italic;">Catatan ini belum memiliki teks.</p>'}
          ${summaryHtml}
          ${fcHtml}
        </div>`;
    }).join('');

    const folderRows = (folders || []).map(f => {
      const name = f.name?.startsWith('{') ? (() => { try { return JSON.parse(f.name).name || f.name; } catch { return f.name; } })() : (f.name || 'Folder');
      const createdAt = new Date(f.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
      return `<tr>
        <td style="padding:8px 12px;font-size:13px;color:#111827;">📁 ${name}</td>
        <td style="padding:8px 12px;font-size:13px;color:#6b7280;">${createdAt}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ekspor Arsip Belajar — ${userName}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f3f4f6; color: #111827; margin: 0; padding: 24px; }
    .container { max-width: 800px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; border-radius: 16px; padding: 28px 32px; margin-bottom: 28px; }
    .header h1 { font-size: 24px; font-weight: 800; margin: 0 0 6px; }
    .header p { font-size: 13px; opacity: 0.85; margin: 0; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 28px; }
    .stat { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; text-align: center; }
    .stat-number { font-size: 26px; font-weight: 800; color: #6366f1; }
    .stat-label { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .section-title { font-size: 18px; font-weight: 800; color: #111827; margin: 0 0 16px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb; }
    table { width: 100%; border-collapse: collapse; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; margin-bottom: 28px; }
    thead { background: #f9fafb; }
    th { padding: 10px 12px; font-size: 12px; font-weight: 700; color: #6b7280; text-align: left; text-transform: uppercase; letter-spacing: .05em; }
    tr:nth-child(even) td { background: #f9fafb; }
    .footer { text-align: center; font-size: 12px; color: #9ca3af; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
    @media print { body { background: #fff; padding: 0; } .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📚 Arsip Belajar — Ekspor Data</h1>
      <p>Pemilik: <strong>${userName}</strong> &nbsp;|&nbsp; Diekspor pada: ${exportDate}</p>
    </div>

    <div class="stats">
      <div class="stat">
        <div class="stat-number">${(notes || []).length}</div>
        <div class="stat-label">Total Catatan</div>
      </div>
      <div class="stat">
        <div class="stat-number">${(folders || []).length}</div>
        <div class="stat-label">Total Folder</div>
      </div>
      <div class="stat">
        <div class="stat-number">${(notes || []).filter(n => { try { return parseNoteContent(n.transcribed_text || '').flashcards.length > 0; } catch { return false; } }).length}</div>
        <div class="stat-label">Catatan dengan Flashcard</div>
      </div>
    </div>

    ${(folders || []).length > 0 ? `
    <h2 class="section-title">📁 Daftar Folder (${(folders || []).length})</h2>
    <table>
      <thead><tr><th>Nama Folder</th><th>Dibuat</th></tr></thead>
      <tbody>${folderRows}</tbody>
    </table>` : ''}

    <h2 class="section-title">📄 Catatan (${(notes || []).length})</h2>
    ${noteCards || '<p style="color:#9ca3af;font-style:italic;">Belum ada catatan.</p>'}

    <div class="footer">
      <p>File ini dibuat otomatis oleh <strong>Arsip Belajar</strong>. Buka di browser untuk tampilan terbaik.</p>
    </div>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="arsip-belajar-export-${Date.now()}.html"`,
      },
    });

  } catch (err: any) {
    console.error('Export error:', err);
    return NextResponse.json({ error: 'Gagal mengekspor data.' }, { status: 500 });
  }
}
