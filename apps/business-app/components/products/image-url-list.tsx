"use client";

/**
 * Manages an array of image URL strings.
 *
 * Add: paste/type a URL + click "Add" (or press Enter).
 * Remove: click the × button next to each URL.
 *
 * // TODO(I22): Replace plain URL text inputs with a file-upload widget
 * backed by POST /uploads once I22 is implemented.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowUpIcon, ArrowDownIcon, XIcon } from "lucide-react";

interface ImageUrlListProps {
  value: string[];
  onChange: (urls: string[]) => void;
  error?: string;
}

export function ImageUrlList({ value, onChange, error }: ImageUrlListProps) {
  const [draft, setDraft] = useState("");

  function addUrl() {
    const trimmed = draft.trim();
    if (!trimmed || value.includes(trimmed)) {
      setDraft("");
      return;
    }
    onChange([...value, trimmed]);
    setDraft("");
  }

  function removeUrl(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function moveUp(index: number) {
    if (index === 0) return;
    const next = [...value];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  }

  function moveDown(index: number) {
    if (index === value.length - 1) return;
    const next = [...value];
    [next[index + 1], next[index]] = [next[index], next[index + 1]];
    onChange(next);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addUrl();
    }
  }

  return (
    <div className="space-y-2">
      {/* URL list */}
      {value.length > 0 && (
        <ul className="space-y-1.5">
          {value.map((url, index) => (
            <li key={index} className="flex items-center gap-1">
              <Input
                value={url}
                readOnly
                className="flex-1 text-xs"
                placeholder="https://..."
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => moveUp(index)}
                disabled={index === 0}
                aria-label={`Move image ${index + 1} up`}
              >
                <ArrowUpIcon />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => moveDown(index)}
                disabled={index === value.length - 1}
                aria-label={`Move image ${index + 1} down`}
              >
                <ArrowDownIcon />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => removeUrl(index)}
                aria-label={`Remove image ${index + 1}`}
              >
                <XIcon />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {/* Add input */}
      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter image URL (e.g. https://example.com/image.jpg)"
          className="flex-1 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addUrl}
          disabled={!draft.trim()}
        >
          Add
        </Button>
      </div>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}