import { ImageResponse } from 'next/og';
import pool from '@/lib/db';
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
  const imageSrc = await getSharePreviewImageSrc();

  const folderRes = await pool.query('SELECT name FROM public.folders WHERE id = $1 LIMIT 1', [id]);
  const folder = folderRes.rows[0];

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
