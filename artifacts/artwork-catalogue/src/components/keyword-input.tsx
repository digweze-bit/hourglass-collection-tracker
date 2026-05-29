import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { useListArtworkKeywords } from "@workspace/api-client-react";

interface KeywordInputProps {
  value: string;
  onChange: (value: string) => void;
}

function parseKeywords(raw: string): string[] {
  return raw
    .split(",")
    .map(k => k.trim())
    .filter(Boolean);
}

export function KeywordInput({ value, onChange }: KeywordInputProps) {
  const { data: existingKeywords = [] } = useListArtworkKeywords();
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const keywords = parseKeywords(value);

  const suggestions = inputValue.trim().length > 0
    ? existingKeywords.filter(kw =>
        kw.toLowerCase().includes(inputValue.trim().toLowerCase()) &&
        !keywords.map(k => k.toLowerCase()).includes(kw.toLowerCase())
      ).slice(0, 8)
    : [];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function addKeyword(kw: string) {
    const trimmed = kw.trim();
    if (!trimmed) return;
    if (keywords.map(k => k.toLowerCase()).includes(trimmed.toLowerCase())) {
      setInputValue("");
      return;
    }
    const next = [...keywords, trimmed];
    onChange(next.join(", "));
    setInputValue("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  }

  function removeKeyword(kw: string) {
    onChange(keywords.filter(k => k !== kw).join(", "));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addKeyword(inputValue);
    } else if (e.key === "Backspace" && inputValue === "" && keywords.length > 0) {
      removeKeyword(keywords[keywords.length - 1]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className="min-h-10 border border-input bg-background px-3 py-2 flex flex-wrap gap-1.5 cursor-text focus-within:ring-1 focus-within:ring-ring"
        onClick={() => inputRef.current?.focus()}
      >
        {keywords.map(kw => (
          <span
            key={kw}
            className="inline-flex items-center gap-1 text-xs border border-border bg-muted/30 px-2 py-0.5"
          >
            {kw}
            <button
              type="button"
              onClick={() => removeKeyword(kw)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label={`Remove ${kw}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={inputValue}
          onChange={e => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          placeholder={keywords.length === 0 ? "Type a keyword and press Enter or comma…" : ""}
          className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          aria-label="Add keyword"
        />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 border border-border bg-background shadow-md mt-0.5 max-h-48 overflow-y-auto">
          {suggestions.map(kw => (
            <button
              key={kw}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
              onMouseDown={e => { e.preventDefault(); addKeyword(kw); }}
            >
              {kw}
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-1.5">
        Press Enter or comma to add. Use descriptive terms — style, movement, geography, period, material.
      </p>
    </div>
  );
}
