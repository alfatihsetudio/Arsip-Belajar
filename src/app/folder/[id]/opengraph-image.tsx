import { ImageResponse } from 'next/og';
import { createClient } from '@/lib/supabase/server';
import { ShareCard, shareCardSize } from '@/lib/og/share-card';
import { getSharePreviewImageSrc } from '@/lib/og/share-image';
import { parseFolderInfo } from '@/lib/site';

export const alt = 'Arsip Belajar share preview';
export const size = shareCardSize;
export const contentType = 'image/png';
export const runtime = 'nodejs';

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const imageSrc = await getSharePreviewImageSrc();

  const { data: folder } = await supabase
    .from('folders')
    .select('name')
    .eq('id', id)
    .single();

  const folderInfo = parseFolderInfo(folder?.name || 'Folder');

  return new ImageResponse(
    (
      <ShareCard
        title={folderInfo.displayName}
        subtitle={folderInfo.description || 'Folder yang dibagikan dari Arsip Belajar'}
        kindLabel="Folder"
        imageSrc={imageSrc}
        brandLogoSrc={imageSrc}
      />
    ),
    size
  );
}
