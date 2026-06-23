"use client";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn-primary no-print">
      Print this poster
    </button>
  );
}
