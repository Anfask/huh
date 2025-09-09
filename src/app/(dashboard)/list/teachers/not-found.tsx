import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold">404 - Teacher Not Found</h1>
      <p className="mt-4 text-lg">
        The teacher you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link href="/list/teachers" className="mt-6 text-blue-600 hover:underline">
        Back to Teachers List
      </Link>
    </div>
  );
}