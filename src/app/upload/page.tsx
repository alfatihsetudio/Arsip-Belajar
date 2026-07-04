import { redirect } from 'next/navigation';

// Redirect legacy /upload route to the new dashboard upload page
export default function LegacyUploadPage() {
  redirect('/dashboard/upload');
}
