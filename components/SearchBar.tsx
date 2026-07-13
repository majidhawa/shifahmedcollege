"use client";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({
  value,
  onChange,
}: SearchBarProps) {
  return (
    <div className="relative w-full">

      <svg
        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search downloads..."
        className="w-full rounded-xl border border-slate-200 bg-white py-4 pl-12 pr-4 outline-none transition focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
      />

    </div>
  );
}