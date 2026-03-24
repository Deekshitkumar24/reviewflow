'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="text-6xl font-bold text-red-500 mb-4">500</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-gray-500 mb-6 text-sm">
            An unexpected error occurred. If this persists, please contact your administrator.
          </p>
          <button
            onClick={reset}
            className="inline-flex items-center px-4 py-2 bg-[#1A56DB] text-white rounded-lg hover:bg-[#1044A5] transition-colors text-sm font-medium"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
