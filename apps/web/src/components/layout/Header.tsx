import Link from "next/link";

interface HeaderProps {
  unreadCount?: number;
}

export default function Header({ unreadCount = 0 }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-navy h-14 flex items-center justify-between px-4 max-w-[430px] mx-auto">
      <Link href="/" className="no-underline">
        <span
          className="text-gold text-xl font-semibold tracking-wide"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          KANEMIEL
        </span>
      </Link>

      <Link href="/notifications" className="relative p-2">
        {/* Bell icon (SVG) */}
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-danger text-white text-[10px] font-bold px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Link>
    </header>
  );
}
