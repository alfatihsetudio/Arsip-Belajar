import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: originalNoteId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { folderId } = await req.json();

    if (folderId) {
      // Verify the user owns the target folder
      const { data: folderCheck } = await supabase.from('folders').select('id').eq('id', folderId).eq('user_id', user.id).single();
      if (!folderCheck) {
        return NextResponse.json({ error: 'Folder access denied' }, { status: 403 });
      }
    }

    // 1. Fetch original note
    const { data: note, error: noteError } = await supabase
      .from('notes')
      .select('title, transcribed_text, visibility, allowed_emails, folders(visibility, allowed_emails)')
      .eq('id', originalNoteId)
      .single();

    if (noteError || !note) {
      return NextResponse.json({ error: 'Catatan asli tidak ditemukan' }, { status: 404 });
    }

    // Check if user is allowed to access original note (to prevent unauthorized duplication)
    let visibility = note.visibility || 'private';
    let allowedEmails = note.allowed_emails || [];
    
    // Check inheritance for duplication auth
    if (visibility === 'private' && note.folders) {
      const parentFolder: any = note.folders;
      if (parentFolder.visibility !== 'private') {
        visibility = parentFolder.visibility;
        allowedEmails = parentFolder.allowed_emails || [];
      }
    }

    let accessGranted = true;
    if (visibility === 'private') {
      accessGranted = false; // Even if it's private, wait, if the owner is duplicating their own note it's allowed.
      // But usually duplication is for others. The owner can duplicate too.
    } else if (visibility === 'restricted') {
      if (!allowedEmails.includes(user.email || '')) {
        accessGranted = false;
      }
    }

    // Wait, let's verify if the user is the owner
    const { data: originalNoteOwnerCheck } = await supabase.from('notes').select('user_id').eq('id', originalNoteId).single();
    if (originalNoteOwnerCheck?.user_id !== user.id && !accessGranted) {
      return NextResponse.json({ error: 'Anda tidak memiliki izin untuk menduplikasi catatan ini' }, { status: 403 });
    }

    // 2. Duplicate Note
    const newNoteTitle = note.title + ' (Salinan)';
    const { data: newNote, error: insertNoteError } = await supabase
      .from('notes')
      .insert({
        user_id: user.id,
        title: newNoteTitle,
        transcribed_text: note.transcribed_text,
        folder_id: folderId || null,
        visibility: 'private', // Reset visibility for duplicated note
        allowed_emails: []
      })
      .select()
      .single();

    if (insertNoteError || !newNote) {
      throw insertNoteError;
    }

    // 3. Duplicate Media
    const { data: mediaFiles } = await supabase.from('note_media').select('*').eq('note_id', originalNoteId);
    if (mediaFiles && mediaFiles.length > 0) {
      const mediaInserts = mediaFiles.map(media => ({
        note_id: newNote.id,
        media_url: media.media_url,
        media_type: media.media_type,
        order_index: media.order_index
      }));
      await supabase.from('note_media').insert(mediaInserts);
    }

    // 4. Duplicate Tags
    const { data: noteTags } = await supabase.from('note_tags').select('tag_id').eq('note_id', originalNoteId);
    if (noteTags && noteTags.length > 0) {
      // First we need to get the tag names of the original note
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
        
        // Create missing tags
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
        
        // Link all tags to the new note
        const finalTagLinks = tagNames.map(name => ({
          note_id: newNote.id,
          tag_id: existingTagsMap.get(name)
        })).filter(link => link.tag_id);
        
        if (finalTagLinks.length > 0) {
          await supabase.from('note_tags').insert(finalTagLinks);
        }
      }
    }

    return NextResponse.json({ success: true, newNoteId: newNote.id });

  } catch (error: any) {
    console.error('Duplication error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
