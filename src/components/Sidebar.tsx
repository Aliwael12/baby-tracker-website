"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  { href: "/", icon: "🏠", label: "Home" },
  { href: "/analytics", icon: "📊", label: "Analytics" },
  { href: "/history", icon: "📅", label: "History" },
];

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      {/* Sidebar panel */}
      <nav
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-baby-100 px-5 py-4">
          <span className="text-lg font-bold text-baby-600">Touti&apos;s Tracker</span>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors active:bg-baby-50"
          >
            ✕
          </button>
        </div>

        {/* Nav links */}
        <div className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-baby-100 text-baby-600"
                    : "text-gray-600 active:bg-baby-50"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <div className="border-t border-baby-100 px-5 py-4">
          <p className="text-xs text-gray-400">Baby Tracker v1.0</p>
        </div>
      </nav>
    </>
  );
}
