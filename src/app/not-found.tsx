import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-6xl font-bold text-[#1A56DB] mb-4">404</p>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Page not found</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">
          The page you are looking for does not exist or you do not have permission to view it.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center px-4 py-2 bg-[#1A56DB] text-white rounded-lg hover:bg-[#1044A5] transition-colors text-sm font-medium"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
