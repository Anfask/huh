import Link from "next/link";

// app/not-found.tsx
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold">404 - Student Not Found</h1>
      <p className="mt-4 text-lg">
        The student you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link href="/list/students" className="mt-6 text-blue-600 hover:underline">
        Back to Students List
      </Link>
    </div>
  );
}