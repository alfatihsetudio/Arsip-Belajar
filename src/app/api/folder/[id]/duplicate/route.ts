import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: originalFolderId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch original folder
    const { data: folder, error: folderError } = await supabase
      .from('folders')
      .select('*')
      .eq('id', originalFolderId)
      .single();

    if (folderError || !folder) {
      return NextResponse.json({ error: 'Folder asli tidak ditemukan' }, { status: 404 });
    }

    // Verify access
    const isOwner = folder.user_id === user.id;
    const visibility = folder.visibility || 'private';
    const allowedEmails = folder.allowed_emails || [];

    let accessGranted = isOwner;
    if (visibility === 'public') {
      accessGranted = true;
    } else if (visibility === 'restricted') {
      if (allowedEmails.includes(user.email || '')) {
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
    const { data: newFolder, error: insertFolderError } = await supabase
      .from('folders')
      .insert({
        user_id: user.id,
        name: newFolderName,
        visibility: 'private',
        allowed_emails: []
      })
      .select()
      .single();

    if (insertFolderError || !newFolder) {
      throw insertFolderError;
    }

    // 4. Fetch all notes inside the original folder
    const { data: originalNotes } = await supabase
      .from('notes')
      .select('*')
      .eq('folder_id', originalFolderId);

    if (originalNotes && originalNotes.length > 0) {
      for (const note of originalNotes) {
        // A. Duplicate note
        const { data: newNote, error: insertNoteError } = await supabase
          .from('notes')
          .insert({
            user_id: user.id,
            title: note.title, // Keep same title inside duplicated folder
            transcribed_text: note.transcribed_text,
            folder_id: newFolder.id,
            visibility: 'private',
            allowed_emails: []
          })
          .select()
          .single();

        if (insertNoteError || !newNote) {
          continue; // Skip note on error to prevent total failure
        }

        // B. Duplicate Media
        const { data: mediaFiles } = await supabase.from('note_media').select('*').eq('note_id', note.id);
        if (mediaFiles && mediaFiles.length > 0) {
          const mediaInserts = mediaFiles.map(media => ({
            note_id: newNote.id,
            media_url: media.media_url,
            media_type: media.media_type,
            order_index: media.order_index
          }));
          await supabase.from('note_media').insert(mediaInserts);
        }

        // C. Duplicate Tags
        const { data: noteTags } = await supabase.from('note_tags').select('tag_id').eq('note_id', note.id);
        if (noteTags && noteTags.length > 0) {
          const tagIds = noteTags.map(nt => nt.tag_id);
          const { data: tags } = await supabase.from('tags').select('name').in('id', tagIds);
          
          if (tags && tags.length > 0) {
            const tagNames = tags.map(t => t.name);
            
            // Find existing tags for the current user
            const { data: existingUserTags } = await supabase
              .from('tags')
              .select('id, name')
              .eq('user_id', user.id)
              .in('name', tagNames);
              
            const existingTagsMap = new Map((existingUserTags || []).map(t => [t.name, t.id]));
            const tagsToCreate = tagNames.filter(name => !existingTagsMap.has(name));
            
            if (tagsToCreate.length > 0) {
              const newTagsData = tagsToCreate.map(name => ({
                name: name,
                user_id: user.id
              }));
              const { data: newlyCreatedTags } = await supabase.from('tags').insert(newTagsData).select('id, name');
              if (newlyCreatedTags) {
                newlyCreatedTags.forEach(t => existingTagsMap.set(t.name, t.id));
              }
            }
            
            const finalTagLinks = tagNames.map(name => ({
              note_id: newNote.id,
              tag_id: existingTagsMap.get(name)
            })).filter(link => link.tag_id);
            
            if (finalTagLinks.length > 0) {
              await supabase.from('note_tags').insert(finalTagLinks);
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
