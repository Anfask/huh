"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Error({
  error,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
}) {
  const router = useRouter();
  useEffect(() => {
    console.error("Error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-full p-6">
      <div className="text-center max-w-md w-full space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">Something Went Wrong</h1>
          <p className="text-gray-600 dark:text-gray-400">
            We encountered an unexpected error
          </p>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => {
              window.location.reload();
            }}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>

          <button
            onClick={() => {
              router.replace("/");
            }}
            className="px-6 py-2 border border-gray-300 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    </div>
  );
}
