import { ImageResponse } from 'next/og';
import { ShareCard, shareCardSize } from '@/lib/og/share-card';
import { getSharePreviewImageSrc } from '@/lib/og/share-image';
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/site';

export const alt = SITE_NAME;
export const size = shareCardSize;
export const contentType = 'image/png';
export const runtime = 'nodejs';

export default async function Image() {
  const imageSrc = await getSharePreviewImageSrc();

  return new ImageResponse(
    (
      <ShareCard
        title={SITE_NAME}
        subtitle={SITE_DESCRIPTION}
        kindLabel="Website"
        imageSrc={imageSrc}
        brandLogoSrc={imageSrc}
      />
    ),
    size
  );
}
