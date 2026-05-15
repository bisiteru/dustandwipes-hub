// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Modal shell
//  Phase 3 extraction. Backdrop + outer panel + close button.
//  Closes when clicking the backdrop or pressing the X button.
// ─────────────────────────────────────────────────────────────────────────────

import React, { ReactNode } from "react";
import { X } from "lucide-react";

interface ModalWrapProps {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean; // max-w-2xl
  xl?: boolean;   // max-w-4xl (takes precedence over wide)
}

export function ModalWrap({ title, children, onClose, wide = false, xl = false }: ModalWrapProps) {
  const maxW = xl ? "max-w-4xl" : wide ? "max-w-2xl" : "max-w-lg";
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full max-h-[92vh] flex flex-col ${maxW}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-800">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400">
            <X size={16}/>
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
