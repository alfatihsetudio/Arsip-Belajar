import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import pool from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: originalNoteId } = await params;
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clerkUser = await currentUser();
    const userEmail = clerkUser?.emailAddresses?.[0]?.emailAddress || '';

    const { folderId } = await req.json();

    if (folderId) {
      // Verify the user owns the target folder
      const folderCheck = await pool.query(
        'SELECT id FROM public.folders WHERE id = $1 AND user_id = $2 LIMIT 1',
        [folderId, userId]
      );
      if (folderCheck.rows.length === 0) {
        return NextResponse.json({ error: 'Folder access denied' }, { status: 403 });
      }
    }

    // 1. Fetch original note
    const noteRes = await pool.query(
      `SELECT n.title, n.transcribed_text, n.visibility, n.allowed_emails, n.user_id,
              f.visibility AS folder_visibility, f.allowed_emails AS folder_allowed_emails
       FROM public.notes n
       LEFT JOIN public.folders f ON f.id = n.folder_id
       WHERE n.id = $1 LIMIT 1`,
      [originalNoteId]
    );

    if (noteRes.rows.length === 0) {
      return NextResponse.json({ error: 'Catatan asli tidak ditemukan' }, { status: 404 });
    }

    const note = noteRes.rows[0];

    // Check if user is allowed to access original note
    let visibility = note.visibility || 'private';
    let allowedEmails = note.allowed_emails || [];
    
    if (visibility === 'private' && note.folder_visibility && note.folder_visibility !== 'private') {
      visibility = note.folder_visibility;
      allowedEmails = note.folder_allowed_emails || [];
    }

    let accessGranted = note.user_id === userId;
    if (visibility === 'public') {
      accessGranted = true;
    } else if (visibility === 'restricted') {
      if (allowedEmails.includes(userEmail)) {
        accessGranted = true;
      }
    }

    if (!accessGranted) {
      return NextResponse.json({ error: 'Anda tidak memiliki izin untuk menduplikasi catatan ini' }, { status: 403 });
    }

    // 2. Duplicate Note
    const newNoteTitle = note.title + ' (Salinan)';
    const newNoteRes = await pool.query(
      `INSERT INTO public.notes (user_id, title, transcribed_text, folder_id, visibility, allowed_emails)
       VALUES ($1, $2, $3, $4, 'private', '{}')
       RETURNING id`,
      [userId, newNoteTitle, note.transcribed_text, folderId || null]
    );
    const newNote = newNoteRes.rows[0];

    // 3. Duplicate Media
    const mediaRes = await pool.query(
      'SELECT media_url, media_type, order_index FROM public.note_media WHERE note_id = $1',
      [originalNoteId]
    );
    if (mediaRes.rows.length > 0) {
      for (const media of mediaRes.rows) {
        await pool.query(
          'INSERT INTO public.note_media (note_id, media_url, media_type, order_index) VALUES ($1, $2, $3, $4)',
          [newNote.id, media.media_url, media.media_type, media.order_index]
        );
      }
    }

    // 4. Duplicate Tags
    const noteTagsRes = await pool.query(
      `SELECT t.name FROM public.note_tags nt
       JOIN public.tags t ON t.id = nt.tag_id
       WHERE nt.note_id = $1`,
      [originalNoteId]
    );

    if (noteTagsRes.rows.length > 0) {
      for (const tagRow of noteTagsRes.rows) {
        const tagName = tagRow.name.trim().toLowerCase();
        if (!tagName) continue;

        let tagId: string | null = null;
        const tagCheck = await pool.query(
          'SELECT id FROM public.tags WHERE name = $1 AND user_id = $2 LIMIT 1',
          [tagName, userId]
        );

        if (tagCheck.rows.length > 0) {
          tagId = tagCheck.rows[0].id;
        } else {
          const newTagRes = await pool.query(
            'INSERT INTO public.tags (name, user_id) VALUES ($1, $2) RETURNING id',
            [tagName, userId]
          );
          tagId = newTagRes.rows[0]?.id;
        }

        if (tagId) {
          await pool.query(
            'INSERT INTO public.note_tags (note_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [newNote.id, tagId]
          );
        }
      }
    }

    return NextResponse.json({ success: true, newNoteId: newNote.id });

  } catch (error: any) {
    console.error('Duplication error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
