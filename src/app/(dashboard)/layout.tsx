import Menu from "@/components/Menu";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-screen flex">
      {/* LEFT */}
      <div className="w-[14%] md:w-[8%] lg:w-[16%] xl:w-[14%] p-4 overflow-scroll scrollbar-hide">
        <Link
          href="/"
          className="flex items-center justify-center lg:justify-start gap-2"
        >
          <Image src="/yeslogo.png" alt="logo" width={32} height={32} />
          <span className="hidden lg:block font-bold">Dashboard</span>
        </Link>
        <Menu />
      </div>
      {/* RIGHT */}
      <div className="w-[86%] md:w-[92%] lg:w-[84%] xl:w-[86%] bg-[#F7F8FA] overflow-scroll scrollbar-hide flex flex-col">
        <Suspense fallback={<div className="min-h-screen w-full flex items-center justify-center bg-white">
          <div className="relative z-20 flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-4 border-t-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
          </div>
        </div>}>
          <Navbar />
        </Suspense>
        {children}
        <Footer />
      </div>
    </div>
  );
}
