
"use client"
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Item {
  icon: string;
  label: string;
  href: string;
  visible: string[];
}

interface Props {
  role: string | undefined;
  menuItems: {
    title: string;
    items: Item[];
  }[];
}

export const MenuClient = ({ role, menuItems }: Props) => {
  const pathname = usePathname();

  const isActive = (item: Item, role: string) => {
    if (item.label === "Home") {
      return pathname === `/${role}`;
    }
    return pathname === item.href;
  };

  return (
    <div className="mt-4 text-sm">
      {menuItems.map((i) => (
        <div className="flex flex-col gap-2" key={i.title}>
          <span className="hidden lg:block text-gray-400 font-light my-4">
            {i.title}
          </span>
          {i.items.map((item) => {
            if (item.visible.includes(role as string)) {
              const href = item.label === "Home" ? `/${role}` : item.href;
              const active = isActive(item, role as string);

              return (
                <Link
                  href={href}
                  key={item.label}
                  className={`
                    group flex items-center justify-center gap-3 lg:p-2  p-0.5  rounded-lg transition-all duration-200
                    sm:justify-start 
                    ${
                      active
                        ? "sm:border-l-4 bg-blue-700/10 sm:border-blue-700 sm:rounded-none "
                        : "text-slate-700 hover:bg-blue-100 hover:text-blue-700 rounded-none"
                    }
                  `}
                >
                  <Image
                    src={item.icon}
                    alt=""
                    width={20}
                    height={20}
                    className={`
                      transition-all duration-200
                      ${
                        active
                          ? "drop-shadow-sm"
                          : "opacity-70 group-hover:opacity-100 group-hover:brightness-75"
                      }
                    `}
                  />
                  <span className={`
                    hidden sm:block font-medium transition-all duration-200 
                    ${
                      active
                        ? "text-blue-800 font-semibold drop-shadow-sm"
                        : "group-hover:font-semibold"
                    }
                  `}>
                    {item.label}
                  </span>
                </Link>
              );
            }
          })}
        </div>
      ))}
    </div>
  );
};