"use client";

import { useEffect, useState } from "react";

interface ToastProps {
  message: string;
  show: boolean;
}

export default function Toast({ message, show }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
    setVisible(false);
  }, [show]);

  if (!visible) return null;

  return (
    <div className="fixed top-14 left-0 right-0 z-[150] flex justify-center max-w-[430px] mx-auto px-4 animate-slide-down">
      <div className="w-full bg-gold text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg text-center">
        {message}
      </div>
    </div>
  );
}
