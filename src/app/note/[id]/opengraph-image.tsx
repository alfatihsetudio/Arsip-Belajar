import { ImageResponse } from 'next/og';
import { createClient } from '@/lib/supabase/server';
import { ShareCard, shareCardSize } from '@/lib/og/share-card';
import { getSharePreviewImageSrc } from '@/lib/og/share-image';

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

  const { data: note } = await supabase
    .from('notes')
    .select('title')
    .eq('id', id)
    .single();

  const title = note?.title?.trim() || 'Catatan';

  return new ImageResponse(
    (
      <ShareCard
        title={title}
        subtitle="Catatan yang dibagikan dari Arsip Belajar"
        kindLabel="Catatan"
        imageSrc={imageSrc}
        brandLogoSrc={imageSrc}
      />
    ),
    size
  );
}
