"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { FontChoice, TextBlock } from "@/lib/pdf/edit-types";
import {
  FONT_LIBRARY,
  FONT_CATEGORIES,
  FontDefinition,
  lazyLoadFontFace,
} from "@/lib/pdf/fonts";

interface FontFamilyPickerProps {
  currentFamily: string;
  currentCategory?: FontChoice;
  fontSize?: number;
  isBold?: boolean;
  isItalic?: boolean;
  disabled?: boolean;
  documentBlocks?: TextBlock[];
  onSelectFont: (font: { family: string; category: FontChoice }) => Promise<void> | void;
}

export function FontFamilyPicker({
  currentFamily,
  currentCategory,
  fontSize = 12,
  isBold = false,
  isItalic = false,
  disabled = false,
  documentBlocks = [],
  onSelectFont,
}: FontFamilyPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>([
    "Calibri",
    "Arial",
    "Roboto",
  ]);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [popoverCoords, setPopoverCoords] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Compute fixed position for the portal popover relative to the trigger button
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = 280;
    const dropdownHeight = 360;
    const margin = 4;

    let left = rect.left;
    if (left + dropdownWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - dropdownWidth - 8);
    }

    let top = rect.bottom + margin;
    if (top + dropdownHeight > window.innerHeight - 8 && rect.top > dropdownHeight + margin) {
      top = rect.top - dropdownHeight - margin;
    }

    setPopoverCoords({ top, left });
  }, []);

  // Update position on scroll or resize while open
  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener("scroll", handleScrollOrResize, { capture: true, passive: true });
    window.addEventListener("resize", handleScrollOrResize, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, { capture: true });
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Extract unique fonts present in the document
  const documentFonts = useMemo(() => {
    const families = new Set<string>();
    for (const b of documentBlocks) {
      if (b.fontFamily) families.add(b.fontFamily);
      if (b.detection?.normalizedFamily) families.add(b.detection.normalizedFamily);
      if (b.runs) {
        for (const r of b.runs) {
          if (r.fontFamily) families.add(r.fontFamily);
        }
      }
    }
    return Array.from(families);
  }, [documentBlocks]);

  // Active font definition
  const activeFont = useMemo(() => {
    const cf = currentFamily?.toLowerCase() || "";
    return (
      FONT_LIBRARY.find(
        (f) =>
          f.family.toLowerCase() === cf ||
          f.displayName.toLowerCase() === cf ||
          (currentCategory && f.fontCategory === currentCategory)
      ) || {
        id: "custom",
        family: currentFamily || "Arial",
        displayName: currentFamily || "Arial",
        category: "Sans-serif" as const,
        fontCategory: currentCategory || ("sans-serif" as FontChoice),
        fallbackStack: currentFamily || "sans-serif",
        previewFamily: currentFamily || "sans-serif",
        files: { regular: "arial.woff" },
      }
    );
  }, [currentFamily, currentCategory]);

  // Filtered fonts based on search
  const filteredFonts = useMemo(() => {
    if (!search.trim()) return FONT_LIBRARY;
    const q = search.toLowerCase();
    return FONT_LIBRARY.filter(
      (f) =>
        f.displayName.toLowerCase().includes(q) ||
        f.family.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q) ||
        (f.note && f.note.toLowerCase().includes(q))
    );
  }, [search]);

  // Flat list of selectable items for keyboard navigation
  const flatSelectableList = useMemo(() => {
    if (search.trim()) {
      return filteredFonts;
    }

    const list: FontDefinition[] = [];
    // Document fonts
    for (const fName of documentFonts.slice(0, 4)) {
      const match = FONT_LIBRARY.find(
        (f) =>
          f.family.toLowerCase() === fName.toLowerCase() ||
          f.displayName.toLowerCase() === fName.toLowerCase()
      );
      if (match && !list.some((item) => item.id === match.id)) {
        list.push(match);
      }
    }
    // Recently used
    for (const rName of recentlyUsed) {
      const match = FONT_LIBRARY.find(
        (f) =>
          f.family.toLowerCase() === rName.toLowerCase() ||
          f.displayName.toLowerCase() === rName.toLowerCase()
      );
      if (match && !list.some((item) => item.id === match.id)) {
        list.push(match);
      }
    }
    // Categorized fonts
    for (const cat of FONT_CATEGORIES) {
      const inCat = FONT_LIBRARY.filter((f) => f.category === cat);
      for (const f of inCat) {
        if (!list.some((item) => item.id === f.id)) {
          list.push(f);
        }
      }
    }
    return list;
  }, [search, filteredFonts, documentFonts, recentlyUsed]);

  // Handle font selection with lazy preloading
  const handleSelect = async (font: FontDefinition) => {
    setIsOpen(false);
    setSearch("");
    setHighlightedIndex(-1);

    // Update recently used list
    setRecentlyUsed((prev) => {
      const next = [font.displayName, ...prev.filter((f) => f !== font.displayName && f !== font.family)];
      return next.slice(0, 5);
    });

    // Lazy load the applied face before applying to eliminate layout pop
    try {
      await lazyLoadFontFace(font, isBold, isItalic);
      if (typeof document !== "undefined" && document.fonts) {
        const weight = isBold ? "700" : "400";
        const style = isItalic ? "italic" : "normal";
        await document.fonts.load(`${weight} ${style} ${fontSize}px "${font.family}"`);
      }
    } catch {
      // ignore
    }

    await onSelectFont({ family: font.family, category: font.fontCategory });
  };

  // Keyboard navigation inside popover (ArrowUp, ArrowDown, Enter)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % Math.max(1, flatSelectableList.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev <= 0 ? flatSelectableList.length - 1 : prev - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < flatSelectableList.length) {
        handleSelect(flatSelectableList[highlightedIndex]);
      } else if (flatSelectableList.length > 0) {
        handleSelect(flatSelectableList[0]);
      }
    }
  };

  return (
    <>
      {/* Trigger Button inside toolbar */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onMouseDown={(e) => {
          // Prevent focus stealing from contentEditable!
          e.preventDefault();
        }}
        onClick={() => {
          setIsOpen((prev) => !prev);
          setSearch("");
          setHighlightedIndex(-1);
        }}
        className="flex min-h-[34px] items-center justify-between gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-800 shadow-2xs hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700/60"
        title="Choose Font Family"
      >
        <span
          className="max-w-[130px] truncate"
          style={{ fontFamily: activeFont.previewFamily }}
        >
          {activeFont.displayName}
        </span>
        <svg
          className="h-3 w-3 shrink-0 text-zinc-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Popover Rendered via Portal to document.body */}
      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            onMouseDown={(e) => {
              // Crucial: prevent clearing active text selection in contentEditable, but allow search input to focus!
              if ((e.target as HTMLElement).tagName !== "INPUT") {
                e.preventDefault();
              }
            }}
            style={{
              position: "fixed",
              left: `${popoverCoords.left}px`,
              top: `${popoverCoords.top}px`,
              width: "280px",
              maxHeight: "360px",
              zIndex: 99999,
            }}
            className="flex flex-col rounded-xl border border-zinc-200 bg-white shadow-2xl overflow-hidden select-none dark:border-zinc-700 dark:bg-zinc-900"
          >
            {/* Search Input (Autofocus at top) */}
            <div className="border-b border-zinc-200 p-2 dark:border-zinc-800">
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setHighlightedIndex(-1);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search font..."
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-900 outline-hidden focus:border-blue-500 focus:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                autoFocus
              />
            </div>

            {/* Scrollable Font List */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-1 text-xs">
              {/* If search query has no results */}
              {filteredFonts.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-400">
                  No fonts found
                </div>
              ) : search.trim() ? (
                /* Search Results Mode */
                <div className="space-y-0.5">
                  {filteredFonts.map((font, idx) => {
                    const isSelected =
                      activeFont.family.toLowerCase() === font.family.toLowerCase() ||
                      activeFont.displayName.toLowerCase() === font.displayName.toLowerCase();
                    const isHighlighted = idx === highlightedIndex;

                    return (
                      <button
                        key={font.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelect(font)}
                        className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors ${
                          isHighlighted
                            ? "bg-blue-100 text-blue-900 dark:bg-blue-900/60 dark:text-blue-100"
                            : isSelected
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                            : "hover:bg-zinc-100 text-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <span
                            className="text-xs truncate"
                            style={{ fontFamily: font.previewFamily }}
                          >
                            {font.displayName}
                          </span>
                          {font.note && (
                            <span className="text-[10px] text-zinc-400 shrink-0 font-sans">
                              (metric-compatible)
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <span className="ml-1 text-blue-600 font-bold dark:text-blue-400">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* Categorized Section Mode */
                <>
                  {/* 1. Fonts in this document */}
                  {documentFonts.length > 0 && (
                    <div className="mb-2">
                      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-xs px-2 py-1 text-[10px] font-bold tracking-wider text-blue-600 uppercase border-b border-zinc-100 dark:bg-zinc-900/95 dark:border-zinc-800 dark:text-blue-400">
                        Fonts in this document
                      </div>
                      {documentFonts.slice(0, 4).map((fName) => {
                        const match =
                          FONT_LIBRARY.find(
                            (f) =>
                              f.family.toLowerCase() === fName.toLowerCase() ||
                              f.displayName.toLowerCase() === fName.toLowerCase()
                          ) || {
                            id: fName,
                            family: fName,
                            displayName: fName,
                            category: "Sans-serif" as const,
                            fontCategory: "sans-serif" as FontChoice,
                            fallbackStack: fName,
                            previewFamily: fName,
                            files: { regular: "arial.woff" },
                          };

                        const isSelected =
                          activeFont.family.toLowerCase() === match.family.toLowerCase() ||
                          activeFont.displayName.toLowerCase() === match.displayName.toLowerCase();

                        return (
                          <button
                            key={`doc_${fName}`}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSelect(match)}
                            className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors ${
                              isSelected
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                                : "hover:bg-zinc-100 text-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            }`}
                          >
                            <span
                              className="text-xs truncate"
                              style={{ fontFamily: match.previewFamily }}
                            >
                              {match.displayName}
                            </span>
                            {isSelected && (
                              <span className="text-blue-600 font-bold dark:text-blue-400">
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* 2. Recently used */}
                  {recentlyUsed.length > 0 && (
                    <div className="mb-2">
                      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-xs px-2 py-1 text-[10px] font-bold tracking-wider text-zinc-400 uppercase border-b border-zinc-100 dark:bg-zinc-900/95 dark:border-zinc-800">
                        Recently Used
                      </div>
                      {recentlyUsed.map((rName) => {
                        const match = FONT_LIBRARY.find(
                          (f) =>
                            f.displayName.toLowerCase() === rName.toLowerCase() ||
                            f.family.toLowerCase() === rName.toLowerCase()
                        );
                        if (!match) return null;

                        const isSelected =
                          activeFont.family.toLowerCase() === match.family.toLowerCase() ||
                          activeFont.displayName.toLowerCase() === match.displayName.toLowerCase();

                        return (
                          <button
                            key={`recent_${rName}`}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSelect(match)}
                            className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors ${
                              isSelected
                                ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                                : "hover:bg-zinc-100 text-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            }`}
                          >
                            <span
                              className="text-xs truncate"
                              style={{ fontFamily: match.previewFamily }}
                            >
                              {match.displayName}
                            </span>
                            {isSelected && (
                              <span className="text-blue-600 font-bold dark:text-blue-400">
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* 3. Category Groups (Office-compatible, Sans-serif, Serif, Monospace, Indian languages, Handwriting) */}
                  {FONT_CATEGORIES.map((category) => {
                    const fontsInCat = FONT_LIBRARY.filter((f) => f.category === category);
                    if (fontsInCat.length === 0) return null;

                    return (
                      <div key={category} className="mb-2">
                        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-xs px-2 py-1 text-[10px] font-bold tracking-wider text-zinc-400 uppercase border-b border-zinc-100 dark:bg-zinc-900/95 dark:border-zinc-800">
                          {category}
                        </div>
                        {fontsInCat.map((font) => {
                          const isSelected =
                            activeFont.family.toLowerCase() === font.family.toLowerCase() ||
                            activeFont.displayName.toLowerCase() === font.displayName.toLowerCase();

                          return (
                            <button
                              key={font.id}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleSelect(font)}
                              className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left transition-colors ${
                                isSelected
                                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                                  : "hover:bg-zinc-100 text-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 overflow-hidden">
                                <span
                                  className="text-xs truncate"
                                  style={{ fontFamily: font.previewFamily }}
                                >
                                  {font.displayName}
                                </span>
                                {font.note && (
                                  <span className="text-[10px] text-zinc-400 shrink-0 font-sans">
                                    (metric-compatible)
                                  </span>
                                )}
                              </div>
                              {isSelected && (
                                <span className="text-blue-600 font-bold dark:text-blue-400">
                                  ✓
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
