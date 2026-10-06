import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { s3, R2_BUCKET } from '@/lib/s3';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    if (!path || path.length === 0) {
      return new NextResponse('Path is required', { status: 400 });
    }

    const key = path.map(decodeURIComponent).join('/');

    const command = new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    });

    const response = await s3.send(command);

    if (!response.Body) {
      return new NextResponse('Media not found', { status: 404 });
    }

    const contentType = response.ContentType || 'image/jpeg';
    const body = response.Body as any;

    return new NextResponse(body.transformToWebStream(), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    if (error.name === 'NoSuchKey') {
      return new NextResponse('Not found', { status: 404 });
    }
    console.error('[API /api/media] Error fetching media:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
