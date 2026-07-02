import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const SHARE_IMAGE_CANDIDATES = [
  { fileName: 'logo.jpg', mimeType: 'image/jpeg' },
  { fileName: 'share-preview.jpg', mimeType: 'image/jpeg' },
  { fileName: 'share-preview.jpeg', mimeType: 'image/jpeg' },
  { fileName: 'share-preview.png', mimeType: 'image/png' },
  { fileName: 'share-preview.gif', mimeType: 'image/gif' },
] as const;

export async function getSharePreviewImageSrc() {
  for (const candidate of SHARE_IMAGE_CANDIDATES) {
    try {
      const data = await readFile(join(process.cwd(), 'public', candidate.fileName), 'base64');
      return `data:${candidate.mimeType};base64,${data}`;
    } catch {
      // Try next supported filename.
    }
  }

  return null;
}
