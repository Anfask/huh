"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface AnnouncementBadgeProps {
  unseenCount: number;
}

export default function AnnouncementBadge({
  unseenCount: initialCount,
}: AnnouncementBadgeProps) {
  const [unseenCount, setUnseenCount] = useState(initialCount);
  const router = useRouter();

  const handleClick = () => {
    setUnseenCount(0);
    router.push("/list/announcements");
  };

  return (
    <button
      onClick={handleClick}
      className="bg-white rounded-full w-7 h-7 flex items-center justify-center cursor-pointer relative"
    >
      <Image
        src="/announcement.png"
        alt="Announcements"
        width={20}
        height={20}
      />
      {unseenCount > 0 && (
        <div className="absolute -top-3 -right-3 w-5 h-5 flex items-center justify-center bg-blue-800 text-white rounded-full text-xs">
          {unseenCount > 99 ? "99+" : unseenCount}
        </div>
      )}
    </button>
  );
}
