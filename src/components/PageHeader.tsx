"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

function HomeButton() {
  return (
    <Link
      href="/"
      className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm transition-all active:scale-[0.95]"
      aria-label="Back to home"
      title="Home"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        className="text-baby-500"
        aria-hidden
      >
        <path
          d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  /** Shown left of the menu button (e.g. home link on activity log) */
  leadingAction?: React.ReactNode;
  /** Icon buttons shown on the right (e.g. home: log + manual entry) */
  actions?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, leadingAction, actions }: PageHeaderProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const resolvedLeadingAction =
    leadingAction ?? (pathname !== "/" ? <HomeButton /> : null);

  return (
    <>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <header className="mb-6 flex items-start gap-2">
        {resolvedLeadingAction ? (
          <div className="mt-1 shrink-0">{resolvedLeadingAction}</div>
        ) : null}
        <button
          onClick={() => setSidebarOpen(true)}
          className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm transition-all active:scale-[0.95]"
          aria-label="Open menu"
        >
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none" className="text-baby-500">
            <path d="M1 1h16M1 7h16M1 13h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <div className="min-w-0 flex-1 px-1 text-center">
          <h1 className="text-2xl font-bold text-baby-600">{title}</h1>
          {subtitle && <div className="mt-1">{subtitle}</div>}
        </div>
        {actions ? (
          <div className="mt-1 flex shrink-0 items-center gap-1">{actions}</div>
        ) : (
          <div className="mt-1 h-9 w-9 shrink-0" aria-hidden />
        )}
      </header>
    </>
  );
}
