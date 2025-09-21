import React from "react";

type Props = {
  children: React.ReactNode;
  onClick?: () => void;
};

export default function GlassButton({ children, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="px-6 py-3 rounded-xl border border-white/20 
                 bg-white/10 backdrop-blur-md text-white font-medium 
                 shadow-lg hover:bg-white/20 transition"
    >
      {children}
    </button>
  );
}
