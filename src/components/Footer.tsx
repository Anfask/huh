import Image from "next/image";
import Link from "next/link";

const Footer = () => {
  return (
    <footer className="w-full border-t mt-8 py-4 px-6 flex flex-col md:flex-row items-center justify-between text-xs text-gray-600 bg-white">
      <p className="mb-2 md:mb-0 text-center">
        © {new Date().getFullYear()} YES INDIA FOUNDATION. All rights reserved.
      </p>
      <div className="flex items-center gap-2">
        <span>Powered by</span>
        <Link 
          href="https://cyberduce.online" 
          target="_blank" 
          rel="noopener noreferrer"
          className="cursor-pointer hover:opacity-80 transition-opacity"
        >
          <Image
            src="/cyber.png" // Make sure this file exists in /public
            alt="Cyberduce Logo"
            width={80}
            height={20}
          />
        </Link>
      </div>
    </footer>
  );
};

export default Footer;