// ─────────────────────────────────────────────────────────────────────────────
//  Dust & Wipes Operations Hub — Confirmation modal hook
//  Phase 3 extraction.
//
//  Usage:
//    const [confirm, confirmEl] = useConfirm();
//    // ...
//    confirm("Delete this record?", () => actuallyDelete());
//    // Render confirmEl somewhere in the tree (typically right after the
//    // outer wrapper div) so the modal can portal into the DOM.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { O, RED } from "../../lib/constants";

interface ConfirmModalProps {
  msg: string;
  onYes: () => void;
  onNo: () => void;
}

function ConfirmModal({ msg, onYes, onNo }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle size={20} style={{ color: O }}/>
          <p className="font-semibold text-gray-800">{msg}</p>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onNo}
            className="px-5 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={onYes}
            className="px-5 py-2 rounded-xl text-white text-sm font-bold"
            style={{ background: RED }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

type ConfirmFn = (msg: string, onYes: () => void) => void;

/**
 * Returns a tuple of `[confirm, confirmEl]`:
 *  - `confirm(msg, onYes)` opens the modal; calls onYes on confirmation.
 *  - `confirmEl` is the React element that must be rendered for the modal
 *    to appear in the DOM.
 */
export function useConfirm(): [ConfirmFn, ReactNode] {
  const [state, setState] = useState<{ msg: string; onYes: () => void } | null>(null);
  const confirm: ConfirmFn = (msg, onYes) => setState({ msg, onYes });
  const el = state
    ? <ConfirmModal msg={state.msg}
        onYes={() => { state.onYes(); setState(null); }}
        onNo={() => setState(null)}/>
    : null;
  return [confirm, el];
}
