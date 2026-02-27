"use client";

import { useEffect } from "react";

interface SuccessOverlayProps {
  show: boolean;
  message: string;
  onClose: () => void;
}

export default function SuccessOverlay({
  show,
  message,
  onClose,
}: SuccessOverlayProps) {
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(() => {
      onClose();
    }, 1800);
    return () => clearTimeout(timer);
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-navy/80">
      <div className="flex flex-col items-center gap-4 animate-fade-in">
        {/* Gold checkmark circle */}
        <div className="w-20 h-20 rounded-full bg-gold flex items-center justify-center animate-scale-in">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <p className="text-white text-lg font-bold text-center px-8">
          {message}
        </p>
      </div>
    </div>
  );
}
