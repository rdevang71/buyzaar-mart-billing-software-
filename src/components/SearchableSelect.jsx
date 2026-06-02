"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export default function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = "Select",
  searchPlaceholder = "Search...",
  className = "",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const normalizedOptions = useMemo(
    () =>
      options.map((option) =>
        typeof option === "string"
          ? { value: option, label: option }
          : {
              value: String(option.value ?? option.id ?? ""),
              label: String(option.label ?? option.name ?? ""),
              disabled: option.disabled,
            },
      ),
    [options],
  );

  const selected = normalizedOptions.find(
    (option) => String(option.value) === String(value),
  );

  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return normalizedOptions;
    return normalizedOptions.filter((option) =>
      option.label.toLowerCase().includes(needle),
    );
  }, [normalizedOptions, query]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    if (open) window.setTimeout(() => inputRef.current?.focus(), 0);
    else setQuery("");
  }, [open]);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-left text-sm text-gray-800 outline-none transition focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
      >
        <span className={selected ? "truncate" : "truncate text-gray-400"}>
          {selected?.label || placeholder}
        </span>
        <svg className={`h-4 w-4 shrink-0 text-gray-400 transition ${open ? "rotate-180" : ""}`} viewBox="0 0 16 16" fill="none">
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 p-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <div className="max-h-60 overflow-auto py-1">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-blue-50"
            >
              {placeholder}
            </button>
            {filteredOptions.length ? (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={option.disabled}
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-gray-300 ${
                    String(option.value) === String(value)
                      ? "bg-blue-50 font-semibold text-blue-700"
                      : "text-gray-700"
                  }`}
                >
                  {option.label}
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-xs text-gray-400">
                No matching options
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
