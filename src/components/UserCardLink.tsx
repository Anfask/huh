"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";

const UserCardLink = ({ href }: { href: string }) => {
  const router = useRouter();

  return (
    <Image
      src="/more.png"
      alt="More"
      width={20}
      height={20}
      className="cursor-pointer"
      onClick={() => router.push(href)}
    />
  );
};

export default UserCardLink;
