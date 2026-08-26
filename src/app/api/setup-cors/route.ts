import { NextResponse } from 'next/server';
import { s3, R2_BUCKET } from '@/lib/s3';
import { PutBucketCorsCommand } from '@aws-sdk/client-s3';

export async function GET() {
  try {
    const command = new PutBucketCorsCommand({
      Bucket: R2_BUCKET,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
            AllowedOrigins: ['*'], // In production, replace with your actual domains
            ExposeHeaders: ['ETag'],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    });

    await s3.send(command);
    return NextResponse.json({ success: true, message: 'CORS configured for R2 bucket' });
  } catch (error: any) {
    console.error('Failed to configure CORS:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
