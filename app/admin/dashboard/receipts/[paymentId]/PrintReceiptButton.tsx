'use client';

import { Printer } from 'lucide-react';

export default function PrintReceiptButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-xl bg-brand-green px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-dark"
    >
      <Printer className="h-4 w-4" />
      Print / Save PDF
    </button>
  );
}