"use client";

import { useSidebar } from "~/app/_components/sidebar-provider";

export function MobileMenuButton() {
  const { toggle } = useSidebar();

  return (
    <button
      className="md:hidden rounded p-2 text-gray-400 transition hover:bg-[#141414] hover:text-gray-300"
      onClick={toggle}
      aria-label="Toggle menu"
    >
      <svg
        className="h-6 w-6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
}

