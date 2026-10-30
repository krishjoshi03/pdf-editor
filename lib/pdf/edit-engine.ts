import { rgb, PDFFont, RGB, StandardFonts, PDFDocument } from "pdf-lib";
import { safeLoadPdf, yieldToEventLoop } from "./safe-load";
import { TextBlock, TextRun, PageBorderConfig, shouldPageHaveBorder } from "./edit-types";
import { getBestMatchingFont, splitTextIntoFontRuns, ensureFontkitRegistered } from "./font-matcher";
import { ToolExecutionResult } from "./types";

export interface ApplyEditsOptions {
  fileData: Uint8Array | ArrayBuffer;
  blocks: TextBlock[];
  outputFilename?: string;
  onProgress?: (progress: number, stage: string) => void;
  pageBorder?: PageBorderConfig;
}

interface ExportWord {
  text: string;
  font: PDFFont;
  fontSize: number;
  color: RGB;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  width: number;
}

interface WrappedLine {
  words: ExportWord[];
  isFirstLineOfParagraph: boolean;
  isLastLineOfParagraph: boolean;
  availableWidth: number;
  totalWordsWidth: number;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  if (!hex || typeof hex !== "string") return { r: 0.15, g: 0.39, b: 0.92 };
  let clean = hex.replace("#", "");
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return { r: 0.15, g: 0.39, b: 0.92 };
  return {
    r: Math.max(0, Math.min(1, ((num >> 16) & 255) / 255)),
    g: Math.max(0, Math.min(1, ((num >> 8) & 255) / 255)),
    b: Math.max(0, Math.min(1, (num & 255) / 255)),
  };
}

export function safeNum(val: unknown, fallback = 0, min = -100000, max = 100000): number {
  if (typeof val !== "number" || !Number.isFinite(val) || Number.isNaN(val)) {
    return fallback;
  }
  return Math.min(Math.max(val, min), max);
}

export function safeRgb(color?: { r: number; g: number; b: number }, fallback = { r: 0, g: 0, b: 0 }): RGB {
  const r = safeNum(color?.r, fallback.r, 0, 1);
  const g = safeNum(color?.g, fallback.g, 0, 1);
  const b = safeNum(color?.b, fallback.b, 0, 1);
  return rgb(r, g, b);
}

/**
 * Splits text runs into individual words with exact font, size, and styling.
 */
function prepareWordsFromRuns(
  runs: TextRun[],
  fonts: {
    regular: PDFFont;
    bold: PDFFont;
    italic: PDFFont;
    boldItalic: PDFFont;
  },
  baseColor: RGB
): ExportWord[] {
  const words: ExportWord[] = [];

  for (const run of runs) {
    const runFont =
      run.isBold && run.isItalic
        ? fonts.boldItalic
        : run.isBold
        ? fonts.bold
        : run.isItalic
        ? fonts.italic
        : fonts.regular;

    const runColor = run.color
      ? rgb(run.color.r, run.color.g, run.color.b)
      : baseColor;

    const rawWords = run.text.split(/(\s+)/);

    for (const rw of rawWords) {
      if (!rw) continue;
      let wWidth = run.fontSize * 0.5 * rw.length;
      try {
        wWidth = runFont.widthOfTextAtSize(rw, run.fontSize);
      } catch {
        // fallback estimate
      }

      words.push({
        text: rw,
        font: runFont,
        fontSize: run.fontSize,
        color: runColor,
        isBold: run.isBold,
        isItalic: run.isItalic,
        isUnderline: Boolean(run.isUnderline),
        width: wWidth,
      });
    }
  }

  return words;
}

/**
 * Wraps formatted words into lines respecting column width and first-line indent.
 */
function wrapFormattedWords(
  words: ExportWord[],
  columnWidth: number,
  firstLineIndent: number
): WrappedLine[] {
  const lines: WrappedLine[] = [];
  let currentWords: ExportWord[] = [];
  let currentLineWidth = 0;
  let isFirstLine = true;

  function getAvailableWidth(isFirst: boolean) {
    return isFirst ? Math.max(40, columnWidth - Math.max(0, firstLineIndent)) : columnWidth;
  }

  function flushLine(isLast: boolean) {
    if (currentWords.length === 0) return;
    const avail = getAvailableWidth(isFirstLine);
    let wordsWidth = 0;
    for (const w of currentWords) {
      if (!/^\s+$/.test(w.text)) {
        wordsWidth += w.width;
      }
    }

    lines.push({
      words: [...currentWords],
      isFirstLineOfParagraph: isFirstLine,
      isLastLineOfParagraph: isLast,
      availableWidth: avail,
      totalWordsWidth: wordsWidth,
    });

    currentWords = [];
    currentLineWidth = 0;
    isFirstLine = isLast; // if last, next will be first line of new paragraph
  }

  for (let i = 0; i < words.length; i++) {
    const word = words[i];

    // Explicit paragraph break
    if (word.text.includes("\n")) {
      const parts = word.text.split("\n");
      for (let pIdx = 0; pIdx < parts.length; pIdx++) {
        if (pIdx > 0) {
          flushLine(true);
        }
        if (parts[pIdx]) {
          currentWords.push({
            ...word,
            text: parts[pIdx],
          });
          currentLineWidth += word.width;
        }
      }
      continue;
    }

    const isWhitespace = /^\s+$/.test(word.text);
    const avail = getAvailableWidth(isFirstLine);

    if (currentLineWidth + word.width <= avail || currentWords.length === 0) {
      currentWords.push(word);
      currentLineWidth += word.width;
    } else {
      if (!isWhitespace) {
        flushLine(false);
        currentWords.push(word);
        currentLineWidth = word.width;
      }
    }
  }

  if (currentWords.length > 0) {
    flushLine(true);
  }

  return lines;
}

/**
 * Exports edited PDF:
 * 1. Covers original text with background-colored rectangle for modified/deleted blocks.
 * 2. Draws replacement or newly added text with paragraph wrapping, alignment, and matched fonts.
 * 3. Handles justification by computing exact extra word spacing per line.
 * 4. Handles first-line indents and multi-line runs.
 * 5. Draws underline lines if enabled.
 * 6. Keeps all unedited page content streams, images, and vectors completely intact.
 */
export async function applyPdfEdits(options: ApplyEditsOptions): Promise<ToolExecutionResult> {
  const {
    fileData,
    blocks,
    outputFilename = "pdfivo-edited.pdf",
    onProgress,
  } = options;

  onProgress?.(10, "Loading PDF document in memory...");
  const pdfDoc = await safeLoadPdf(fileData);
  ensureFontkitRegistered(pdfDoc);
  const pages = pdfDoc.getPages();

  // Filter modified, new, or deleted blocks
  const affectedBlocks = blocks.filter(
    (b) => b.isNew || b.isDeleted || b.isEdited || b.currentText !== b.originalText
  );

  onProgress?.(25, `Preparing ${affectedBlocks.length} modified text blocks...`);

  const total = affectedBlocks.length;
  for (let i = 0; i < total; i++) {
    const block = affectedBlocks[i];
    if (block.pageIndex < 0 || block.pageIndex >= pages.length) continue;

    onProgress?.(
      30 + Math.round(((i + 1) / (total || 1)) * 55),
      `Applying edits on page ${block.pageIndex + 1} (${i + 1}/${total})...`
    );

    const page = pages[block.pageIndex];
    const { width: pWidth, height: pHeight } = page.getSize();

    try {
      const bgRgb = safeRgb(block.bgColor, { r: 1, g: 1, b: 1 });
      const columnX = safeNum(block.layout?.columnX ?? block.pdfBounds.x, 0, 0, pWidth);
      const columnWidth = safeNum(block.layout?.columnWidth ?? block.pdfBounds.width, 100, 10, pWidth);
      const firstLineIndent = safeNum(block.layout?.firstLineIndent ?? 0, 0, -500, 500);
      const textAlign = block.layout?.textAlign ?? block.textAlign ?? "left";
      const fontSize = safeNum(block.fontSize, 12, 4, 144);
      const lineHeightPt = safeNum(block.layout?.lineHeight ?? fontSize * 1.25, fontSize * 1.25, 4, 200);

      // 1. Cover original text if this was an existing block (edited or deleted)
      if (!block.isNew) {
        if (block.originalLines && block.originalLines.length > 0) {
          for (const line of block.originalLines) {
            const rx = safeNum(line.x - 2, 0, 0, pWidth);
            const ry = safeNum(line.y - 2, 0, 0, pHeight);
            const rw = safeNum(line.width + 4, 10, 1, pWidth);
            const rh = safeNum(line.height + 4, 10, 1, pHeight);
            page.drawRectangle({
              x: rx,
              y: ry,
              width: rw,
              height: rh,
              color: bgRgb,
              opacity: 1,
            });
          }
        } else {
          const rx = safeNum(columnX - 2, 0, 0, pWidth);
          const ry = safeNum(block.pdfBounds.y - 2, 0, 0, pHeight);
          const rw = safeNum(columnWidth + Math.abs(firstLineIndent) + 4, 10, 1, pWidth);
          const rh = safeNum(block.pdfBounds.height + 4, 10, 1, pHeight);
          page.drawRectangle({
            x: rx,
            y: ry,
            width: rw,
            height: rh,
            color: bgRgb,
            opacity: 1,
          });
        }
      }

      // 2. Draw new text if not deleted and non-empty
      if (!block.isDeleted && block.currentText.trim() !== "") {
        const regularFont = await getBestMatchingFont(pdfDoc, {
          fontFamily: block.fontFamily,
          fontCategory: block.fontCategory,
          isBold: false,
          isItalic: false,
          textToEncode: block.currentText,
        });

        const boldFont = await getBestMatchingFont(pdfDoc, {
          fontFamily: block.fontFamily,
          fontCategory: block.fontCategory,
          isBold: true,
          isItalic: false,
          textToEncode: block.currentText,
        });

        const italicFont = await getBestMatchingFont(pdfDoc, {
          fontFamily: block.fontFamily,
          fontCategory: block.fontCategory,
          isBold: false,
          isItalic: true,
          textToEncode: block.currentText,
        });

        const boldItalicFont = await getBestMatchingFont(pdfDoc, {
          fontFamily: block.fontFamily,
          fontCategory: block.fontCategory,
          isBold: true,
          isItalic: true,
          textToEncode: block.currentText,
        });

        const defaultTextRgb = safeRgb(block.color, { r: 0.1, g: 0.1, b: 0.1 });

        // Construct runs if not present
        const runsToUse: TextRun[] =
          block.runs && block.runs.length > 0
            ? block.runs
            : [
                {
                  id: `run_${block.id}`,
                  text: block.currentText,
                  fontFamily: block.fontFamily,
                  fontCategory: block.fontCategory,
                  fontSize,
                  isBold: block.isBold,
                  isItalic: block.isItalic,
                  isUnderline: block.isUnderline,
                  color: block.color || { r: 0.1, g: 0.1, b: 0.1 },
                },
              ];

        const fonts = {
          regular: regularFont,
          bold: boldFont,
          italic: italicFont,
          boldItalic: boldItalicFont,
        };

        const words = prepareWordsFromRuns(runsToUse, fonts, defaultTextRgb);
        const spaceWidth = regularFont.widthOfTextAtSize(" ", fontSize);
        const wrappedLines = wrapFormattedWords(words, columnWidth, firstLineIndent);

        // Starting baseline Y
        let currentBaselineY = safeNum(block.y, 700, 0, pHeight);
        if (block.originalLines && block.originalLines.length > 0) {
          const firstLine = block.originalLines[0];
          currentBaselineY = safeNum(firstLine.y + firstLine.height - fontSize, currentBaselineY, 0, pHeight);
        }

        for (let lIdx = 0; lIdx < wrappedLines.length; lIdx++) {
          const line = wrappedLines[lIdx];
          const lineWords = line.words.filter((w) => !/^\s+$/.test(w.text));

          if (lineWords.length === 0) {
            currentBaselineY -= lineHeightPt;
            continue;
          }

          // Determine Line Start X
          let lineStartX = columnX;
          if (line.isFirstLineOfParagraph && firstLineIndent !== 0) {
            lineStartX = columnX + firstLineIndent;
          }

          // Total width of all words without spaces
          let wordsOnlyWidth = 0;
          for (const w of lineWords) {
            wordsOnlyWidth += w.width;
          }

          // Extra spacing per word for justification
          let extraSpacingPerWord = 0;
          const slots = lineWords.length - 1;

          if (textAlign === "justify" && !line.isLastLineOfParagraph && slots > 0) {
            const totalNormalSpaces = slots * spaceWidth;
            const remainingSpace = line.availableWidth - (wordsOnlyWidth + totalNormalSpaces);
            // Only stretch if remaining space is reasonable (avoid huge gaps on short lines)
            if (remainingSpace > 0 && remainingSpace <= line.availableWidth * 0.4) {
              extraSpacingPerWord = remainingSpace / slots;
            }
          } else if (textAlign === "center") {
            const totalNormalWidth = wordsOnlyWidth + slots * spaceWidth;
            lineStartX = columnX + Math.max(0, (columnWidth - totalNormalWidth) / 2);
          } else if (textAlign === "right") {
            const totalNormalWidth = wordsOnlyWidth + slots * spaceWidth;
            lineStartX = columnX + Math.max(0, columnWidth - totalNormalWidth);
          }

          // Draw each word on the line
          let currentX = lineStartX;

          for (let wIdx = 0; wIdx < lineWords.length; wIdx++) {
            const word = lineWords[wIdx];

            // Character fallback check
            let fontRuns: { font: PDFFont; text: string }[] = [];
            try {
              fontRuns = await splitTextIntoFontRuns(
                pdfDoc,
                word.font,
                word.text,
                word.isBold
              );
            } catch {
              fontRuns = [{ font: word.font, text: word.text }];
            }

            for (const fr of fontRuns) {
              try {
                page.drawText(fr.text, {
                  x: safeNum(currentX, 0, 0, pWidth),
                  y: safeNum(currentBaselineY, 0, 0, pHeight),
                  size: safeNum(word.fontSize, 12, 4, 144),
                  font: fr.font,
                  color: word.color,
                });
                currentX += fr.font.widthOfTextAtSize(fr.text, word.fontSize);
              } catch {
                try {
                  const clean = fr.text.replace(/[^\x20-\x7E]/g, "?");
                  const fallbackStd = await pdfDoc.embedFont(StandardFonts.Helvetica);
                  page.drawText(clean, {
                    x: safeNum(currentX, 0, 0, pWidth),
                    y: safeNum(currentBaselineY, 0, 0, pHeight),
                    size: safeNum(word.fontSize, 12, 4, 144),
                    font: fallbackStd,
                    color: word.color,
                  });
                  currentX += fallbackStd.widthOfTextAtSize(clean, word.fontSize);
                } catch {
                  // Ignore per-character failure if fallback also fails
                }
              }
            }

            // Advance space to next word
            if (wIdx < lineWords.length - 1) {
              currentX += spaceWidth + extraSpacingPerWord;
            }
          }

          // Draw underline if block or run is underlined
          if (block.isUnderline || lineWords.some((w) => w.isUnderline)) {
            const underlineY = safeNum(currentBaselineY - 2, 0, 0, pHeight);
            page.drawLine({
              start: { x: safeNum(lineStartX, 0, 0, pWidth), y: underlineY },
              end: { x: safeNum(currentX, 0, 0, pWidth), y: underlineY },
              thickness: safeNum(Math.max(0.75, fontSize * 0.06), 1, 0.2, 10),
              color: defaultTextRgb,
            });
          }

          currentBaselineY -= lineHeightPt;
        }
      }
    } catch (blockErr) {
      console.warn(`Resilient export: Error rendering block "${block.id}" on page ${block.pageIndex + 1}:`, blockErr);
      try {
        if (!block.isDeleted && block.currentText.trim() !== "") {
          const fallbackStd = await pdfDoc.embedFont(StandardFonts.Helvetica);
          const clean = block.currentText.replace(/[^\x20-\x7E]/g, "?");
          page.drawText(clean, {
            x: safeNum(block.pdfBounds.x, 50, 0, pWidth),
            y: safeNum(block.y, 700, 0, pHeight),
            size: safeNum(block.fontSize, 12, 4, 144),
            font: fallbackStd,
            color: rgb(0.1, 0.1, 0.1),
          });
        }
      } catch (fallbackErr) {
        console.warn(`Fallback rendering also skipped for block "${block.id}":`, fallbackErr);
      }
    }

    await yieldToEventLoop();
  }

  // Draw Page Borders if enabled
  if (options.pageBorder?.enabled) {
    try {
      onProgress?.(85, "Applying page borders...");
      const borderCfg = options.pageBorder;
      const borderCol = hexToRgb(borderCfg.color);
      const borderRgb = rgb(borderCol.r, borderCol.g, borderCol.b);
      const bWidth = safeNum(borderCfg.width, 1.5, 0.5, 20);
      const margin = safeNum(borderCfg.margin, 36, 0, 500);

      for (let pIdx = 0; pIdx < pages.length; pIdx++) {
        if (shouldPageHaveBorder(borderCfg, pIdx, pages.length)) {
          const p = pages[pIdx];
          const { width: pWidth, height: pHeight } = p.getSize();
          const boxX = margin;
          const boxY = margin;
          const boxW = Math.max(10, pWidth - margin * 2);
          const boxH = Math.max(10, pHeight - margin * 2);

          if (borderCfg.style === "double") {
            const subWidth = Math.max(0.5, bWidth / 2.5);
            // Outer rectangle
            p.drawRectangle({
              x: boxX,
              y: boxY,
              width: boxW,
              height: boxH,
              borderWidth: subWidth,
              borderColor: borderRgb,
            });
            // Inner rectangle
            const innerGap = Math.max(2, subWidth * 2);
            if (boxW > innerGap * 2 && boxH > innerGap * 2) {
              p.drawRectangle({
                x: boxX + innerGap,
                y: boxY + innerGap,
                width: boxW - innerGap * 2,
                height: boxH - innerGap * 2,
                borderWidth: subWidth,
                borderColor: borderRgb,
              });
            }
          } else if (borderCfg.style === "dashed") {
            p.drawRectangle({
              x: boxX,
              y: boxY,
              width: boxW,
              height: boxH,
              borderWidth: bWidth,
              borderColor: borderRgb,
              borderDashArray: [6, 3],
            });
          } else if (borderCfg.style === "dotted") {
            p.drawRectangle({
              x: boxX,
              y: boxY,
              width: boxW,
              height: boxH,
              borderWidth: bWidth,
              borderColor: borderRgb,
              borderDashArray: [2, 2],
            });
          } else {
            // Solid
            p.drawRectangle({
              x: boxX,
              y: boxY,
              width: boxW,
              height: boxH,
              borderWidth: bWidth,
              borderColor: borderRgb,
            });
          }
        }
      }
    } catch (borderErr) {
      console.warn("Failed to apply page border (continuing export):", borderErr);
    }
  }

  onProgress?.(90, "Writing optimized PDF file...");
  const pdfBytes = await pdfDoc.save();

  // Self-verification check before returning
  onProgress?.(96, "Verifying exported document integrity...");
  try {
    const verifyDoc = await PDFDocument.load(pdfBytes);
    if (verifyDoc.getPageCount() !== pages.length) {
      throw new Error(
        `Self-check page count mismatch: expected ${pages.length}, got ${verifyDoc.getPageCount()}`
      );
    }
  } catch (verifyErr) {
    throw new Error(
      `Export verification failed: ${verifyErr instanceof Error ? verifyErr.message : String(verifyErr)}`
    );
  }

  onProgress?.(100, "Done!");

  return {
    success: true,
    data: pdfBytes,
    filename: outputFilename,
    mimeType: "application/pdf",
  };
}
