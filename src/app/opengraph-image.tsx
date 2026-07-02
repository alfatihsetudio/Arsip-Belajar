import { ImageResponse } from 'next/og';
import { ShareCard, shareCardSize } from '@/lib/og/share-card';
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/site';

export const alt = SITE_NAME;
export const size = shareCardSize;
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <ShareCard
        title={SITE_NAME}
        subtitle={SITE_DESCRIPTION}
        kindLabel="Website"
      />
    ),
    size
  );
}
