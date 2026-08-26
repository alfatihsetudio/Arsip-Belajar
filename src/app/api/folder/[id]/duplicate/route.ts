import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import pool from '@/lib/db';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: originalFolderId } = await params;
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clerkUser = await currentUser();
    const userEmail = clerkUser?.emailAddresses?.[0]?.emailAddress || '';

    // 1. Fetch original folder
    const folderRes = await pool.query(
      'SELECT * FROM public.folders WHERE id = $1 LIMIT 1',
      [originalFolderId]
    );

    if (folderRes.rows.length === 0) {
      return NextResponse.json({ error: 'Folder asli tidak ditemukan' }, { status: 404 });
    }

    const folder = folderRes.rows[0];

    // Verify access
    const isOwner = folder.user_id === userId;
    const visibility = folder.visibility || 'private';
    const allowedEmails = folder.allowed_emails || [];

    let accessGranted = isOwner;
    if (visibility === 'public') {
      accessGranted = true;
    } else if (visibility === 'restricted') {
      if (allowedEmails.includes(userEmail)) {
        accessGranted = true;
      }
    }

    if (!accessGranted) {
      return NextResponse.json({ error: 'Anda tidak memiliki izin untuk menduplikasi folder ini' }, { status: 403 });
    }

    // 2. Determine new folder name
    let newFolderName = folder.name || 'Folder Tanpa Nama';
    if (folder.name && folder.name.startsWith('{')) {
      try {
        const parsed = JSON.parse(folder.name);
        parsed.name = (parsed.name || 'Folder') + ' (Salinan)';
        newFolderName = JSON.stringify(parsed);
      } catch (e) {
        newFolderName = folder.name + ' (Salinan)';
      }
    } else {
      newFolderName = (folder.name || 'Folder') + ' (Salinan)';
    }

    // 3. Create duplicated folder
    const newFolderRes = await pool.query(
      `INSERT INTO public.folders (user_id, name, visibility, allowed_emails)
       VALUES ($1, $2, 'private', '{}')
       RETURNING id`,
      [userId, newFolderName]
    );
    const newFolder = newFolderRes.rows[0];

    // 4. Fetch all notes inside the original folder
    const originalNotesRes = await pool.query(
      'SELECT * FROM public.notes WHERE folder_id = $1',
      [originalFolderId]
    );
    const originalNotes = originalNotesRes.rows;

    if (originalNotes && originalNotes.length > 0) {
      for (const note of originalNotes) {
        // A. Duplicate note
        const newNoteRes = await pool.query(
          `INSERT INTO public.notes (user_id, title, transcribed_text, folder_id, visibility, allowed_emails)
           VALUES ($1, $2, $3, $4, 'private', '{}')
           RETURNING id`,
          [userId, note.title, note.transcribed_text, newFolder.id]
        );
        const newNote = newNoteRes.rows[0];

        // B. Duplicate Media
        const mediaRes = await pool.query(
          'SELECT media_url, media_type, order_index FROM public.note_media WHERE note_id = $1',
          [note.id]
        );
        if (mediaRes.rows.length > 0) {
          for (const media of mediaRes.rows) {
            await pool.query(
              'INSERT INTO public.note_media (note_id, media_url, media_type, order_index) VALUES ($1, $2, $3, $4)',
              [newNote.id, media.media_url, media.media_type, media.order_index]
            );
          }
        }

        // C. Duplicate Tags
        const noteTagsRes = await pool.query(
          `SELECT t.name FROM public.note_tags nt
           JOIN public.tags t ON t.id = nt.tag_id
           WHERE nt.note_id = $1`,
          [note.id]
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
      }
    }

    return NextResponse.json({ success: true, newFolderId: newFolder.id });

  } catch (error: any) {
    console.error('Folder duplication error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
