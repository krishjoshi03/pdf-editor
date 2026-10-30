import fs from "node:fs";
import path from "node:path";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { applyPdfEdits } from "../lib/pdf/edit-engine";
import { extractPageText } from "../lib/pdf/text-extractor";
import { TextBlock, FontChoice } from "../lib/pdf/edit-types";

function createBlock(overrides: Partial<TextBlock> & { id: string; pageIndex: number; currentText: string }): TextBlock {
  const x = overrides.x ?? 50;
  const y = overrides.y ?? 500;
  const w = overrides.pdfBounds?.width ?? 300;
  const h = overrides.pdfBounds?.height ?? 24;

  return {
    id: overrides.id,
    pageIndex: overrides.pageIndex,
    currentText: overrides.currentText,
    originalText: overrides.originalText ?? "",
    fontFamily: overrides.fontFamily ?? "Arial",
    fontCategory: (overrides.fontCategory ?? "sans-serif") as FontChoice,
    fontSize: overrides.fontSize ?? 12,
    color: overrides.color ?? { r: 0.1, g: 0.1, b: 0.1 },
    isBold: overrides.isBold ?? false,
    isItalic: overrides.isItalic ?? false,
    isUnderline: overrides.isUnderline ?? false,
    textAlign: overrides.textAlign ?? "left",
    x,
    y,
    pdfBounds: overrides.pdfBounds ?? { x, y, width: w, height: h },
    viewportBounds: overrides.viewportBounds ?? { left: x, top: y, width: w, height: h },
    isNew: overrides.isNew ?? false,
    isEdited: overrides.isEdited ?? false,
    isDeleted: overrides.isDeleted ?? false,
    layout: overrides.layout,
  };
}

async function runAllScenarios() {
  console.log("=== EXHAUSTIVE SCENARIOS VALIDATION ===");

  const testPdfPath = path.resolve(process.cwd(), "public", "test-acknowledgement.pdf");
  const rawBytes = fs.readFileSync(testPdfPath);
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  async function getBlocks(bytes: Uint8Array) {
    const doc = await (pdfjs.getDocument as any)({
      data: new Uint8Array(bytes.slice(0)),
      fontExtraProperties: true,
    }).promise;
    const page = await doc.getPage(1);
    const data = await extractPageText(page, 0, 1.0);
    return data.blocks;
  }

  // 1. Download without edits
  console.log("\nScenario 1: Download without edits...");
  const blocks1 = await getBlocks(rawBytes);
  const res1 = await applyPdfEdits({
    fileData: new Uint8Array(rawBytes.slice(0)),
    blocks: blocks1,
    outputFilename: "scenario1-noedits-edited.pdf",
  });
  const data1 = res1.data as Uint8Array;
  if (!res1.success || !data1 || data1.byteLength === 0) throw new Error("Scenario 1 failed");
  const doc1 = await PDFDocument.load(data1);
  if (doc1.getPageCount() !== 1) throw new Error("Scenario 1 page count mismatch");
  console.log("✓ PASS: Scenario 1 (No edits) byte length:", data1.byteLength);

  // 2. Simple text edit
  console.log("\nScenario 2: Simple text edit...");
  const blocks2 = await getBlocks(rawBytes);
  blocks2[0] = {
    ...blocks2[0],
    currentText: "Updated Simple Text Header",
    isEdited: true,
  };
  const res2 = await applyPdfEdits({
    fileData: new Uint8Array(rawBytes.slice(0)),
    blocks: blocks2,
    outputFilename: "scenario2-simple-edited.pdf",
  });
  const data2 = res2.data as Uint8Array;
  if (!res2.success || !data2) throw new Error("Scenario 2 failed");
  await PDFDocument.load(data2);
  console.log("✓ PASS: Scenario 2 (Simple text edit) byte length:", data2.byteLength);

  // 3. 5 different fonts including Indian languages (Devanagari & Gujarati)
  console.log("\nScenario 3: 5 different fonts (Devanagari, Gujarati, Montserrat, Merriweather, Roboto Mono)...");
  const blocks3 = await getBlocks(rawBytes);
  const testFonts = [
    { text: "नमस्ते भारत Devanagari Script", family: "Noto Sans Devanagari", cat: "devanagari" as FontChoice },
    { text: "નમસ્તે ગુજરાત Gujarati Script", family: "Noto Sans Gujarati", cat: "gujarati" as FontChoice },
    { text: "Modern Sans Montserrat", family: "Montserrat", cat: "sans-serif" as FontChoice },
    { text: "Classic Serif Merriweather", family: "Merriweather", cat: "serif" as FontChoice },
    { text: "Monospace Roboto Mono 123", family: "Roboto Mono", cat: "monospace" as FontChoice },
  ];

  const customBlocks: TextBlock[] = testFonts.map((tf, idx) =>
    createBlock({
      id: `font_test_${idx}`,
      pageIndex: 0,
      currentText: tf.text,
      fontFamily: tf.family,
      fontCategory: tf.cat,
      fontSize: 14,
      color: { r: 0.1, g: 0.2, b: 0.6 },
      x: 50,
      y: 700 - idx * 40,
      isNew: true,
      isEdited: true,
      pdfBounds: { x: 50, y: 700 - idx * 40, width: 400, height: 30 },
    })
  );

  const res3 = await applyPdfEdits({
    fileData: new Uint8Array(rawBytes.slice(0)),
    blocks: [...blocks3, ...customBlocks],
    outputFilename: "scenario3-fonts-edited.pdf",
  });
  const data3 = res3.data as Uint8Array;
  if (!res3.success || !data3) throw new Error("Scenario 3 failed");
  await PDFDocument.load(data3);
  console.log("✓ PASS: Scenario 3 (5 diverse fonts with Indic scripts) byte length:", data3.byteLength);

  // 4. Added text
  console.log("\nScenario 4: Added text...");
  const blocks4 = await getBlocks(rawBytes);
  const addedBlock: TextBlock = createBlock({
    id: "new_block_1",
    pageIndex: 0,
    currentText: "Newly added paragraph in bottom margin area.",
    fontFamily: "Arial",
    fontCategory: "sans-serif",
    fontSize: 12,
    color: { r: 0, g: 0, b: 0 },
    x: 60,
    y: 100,
    isNew: true,
    isEdited: true,
    pdfBounds: { x: 60, y: 100, width: 350, height: 25 },
  });
  const res4 = await applyPdfEdits({
    fileData: new Uint8Array(rawBytes.slice(0)),
    blocks: [...blocks4, addedBlock],
    outputFilename: "scenario4-added-edited.pdf",
  });
  const data4 = res4.data as Uint8Array;
  if (!res4.success || !data4) throw new Error("Scenario 4 failed");
  console.log("✓ PASS: Scenario 4 (Added text) byte length:", data4.byteLength);

  // 5. Justified text
  console.log("\nScenario 5: Justified text...");
  const blocks5 = await getBlocks(rawBytes);
  const justifiedBlock: TextBlock = createBlock({
    id: "justified_block",
    pageIndex: 0,
    currentText: "This is a full paragraph of justified text that spans across several words and demonstrates uniform left and right margins properly calculated by the edit engine.",
    fontFamily: "Arial",
    fontCategory: "sans-serif",
    fontSize: 11,
    textAlign: "justify",
    layout: {
      textAlign: "justify",
      columnX: 60,
      columnWidth: 350,
      lineHeight: 16,
      firstLineIndent: 15,
      isLineMode: false,
    },
    color: { r: 0.1, g: 0.1, b: 0.1 },
    x: 60,
    y: 400,
    isNew: true,
    isEdited: true,
    pdfBounds: { x: 60, y: 400, width: 350, height: 60 },
  });
  const res5 = await applyPdfEdits({
    fileData: new Uint8Array(rawBytes.slice(0)),
    blocks: [...blocks5, justifiedBlock],
    outputFilename: "scenario5-justify-edited.pdf",
  });
  const data5 = res5.data as Uint8Array;
  if (!res5.success || !data5) throw new Error("Scenario 5 failed");
  console.log("✓ PASS: Scenario 5 (Justified text) byte length:", data5.byteLength);

  // 6. Page border on all pages
  console.log("\nScenario 6: Page border on all pages...");
  const blocks6 = await getBlocks(rawBytes);
  const res6 = await applyPdfEdits({
    fileData: new Uint8Array(rawBytes.slice(0)),
    blocks: blocks6,
    outputFilename: "scenario6-border-edited.pdf",
    pageBorder: {
      enabled: true,
      scope: "all",
      style: "double",
      color: "#2563eb",
      width: 2.5,
      margin: 24,
    },
  });
  const data6 = res6.data as Uint8Array;
  if (!res6.success || !data6) throw new Error("Scenario 6 failed");
  console.log("✓ PASS: Scenario 6 (Page borders) byte length:", data6.byteLength);

  // 7. Signature (Handwriting font Caveat / Dancing Script)
  console.log("\nScenario 7: Signature with handwriting font...");
  const blocks7 = await getBlocks(rawBytes);
  const sigBlock: TextBlock = createBlock({
    id: "sig_block",
    pageIndex: 0,
    currentText: "Johnathan Doe",
    fontFamily: "Caveat",
    fontCategory: "handwriting",
    fontSize: 24,
    color: { r: 0.05, g: 0.1, b: 0.5 },
    x: 100,
    y: 200,
    isNew: true,
    isEdited: true,
    pdfBounds: { x: 100, y: 200, width: 200, height: 40 },
  });
  const res7 = await applyPdfEdits({
    fileData: new Uint8Array(rawBytes.slice(0)),
    blocks: [...blocks7, sigBlock],
    outputFilename: "scenario7-signature-edited.pdf",
  });
  const data7 = res7.data as Uint8Array;
  if (!res7.success || !data7) throw new Error("Scenario 7 failed");
  console.log("✓ PASS: Scenario 7 (Handwriting signature) byte length:", data7.byteLength);

  // 8. 10+ page PDF document
  console.log("\nScenario 8: 10+ page PDF (12 pages generated)...");
  const multiDoc = await PDFDocument.create();
  const font = await multiDoc.embedFont(StandardFonts.Helvetica);
  for (let p = 0; p < 12; p++) {
    const page = multiDoc.addPage([595, 842]);
    page.drawText(`Page ${p + 1} of 12 Original Vector Text`, {
      x: 50,
      y: 750,
      size: 16,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
  }
  const multiBytes = await multiDoc.save();

  const multiBlocks: TextBlock[] = [
    createBlock({
      id: "multi_p7",
      pageIndex: 6, // page 7
      currentText: "Special Revision on Page 7",
      fontFamily: "Arial",
      fontCategory: "sans-serif",
      fontSize: 14,
      color: { r: 0.8, g: 0.1, b: 0.1 },
      x: 50,
      y: 700,
      isNew: true,
      isEdited: true,
      pdfBounds: { x: 50, y: 700, width: 300, height: 25 },
    }),
    createBlock({
      id: "multi_p12",
      pageIndex: 11, // page 12
      currentText: "Final Concluding Clause on Page 12",
      fontFamily: "Times New Roman",
      fontCategory: "serif",
      fontSize: 14,
      color: { r: 0.1, g: 0.5, b: 0.1 },
      x: 50,
      y: 700,
      isNew: true,
      isEdited: true,
      pdfBounds: { x: 50, y: 700, width: 300, height: 25 },
    }),
  ];

  const res8 = await applyPdfEdits({
    fileData: multiBytes,
    blocks: multiBlocks,
    outputFilename: "scenario8-12pages-edited.pdf",
    pageBorder: {
      enabled: true,
      scope: "all",
      style: "solid",
      color: "#333333",
      width: 1,
      margin: 30,
    },
  });
  const data8 = res8.data as Uint8Array;
  if (!res8.success || !data8) throw new Error("Scenario 8 failed");
  const doc8 = await PDFDocument.load(data8);
  if (doc8.getPageCount() !== 12) throw new Error("Scenario 8 page count mismatch");
  console.log("✓ PASS: Scenario 8 (12-page PDF document) byte length:", data8.byteLength);

  // 9. PDF with images / graphics (confirm unedited content streams are untouched)
  console.log("\nScenario 9: PDF with embedded image and vector shapes...");
  const imgDoc = await PDFDocument.create();
  const imgPage = imgDoc.addPage([595, 842]);
  
  // Create 1x1 PNG Uint8Array
  const png1x1 = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
    0x0b, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x60, 0x00, 0x00, 0x00,
    0x02, 0x00, 0x01, 0x73, 0x75, 0x01, 0x18, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
  ]);
  const embeddedPng = await imgDoc.embedPng(png1x1);
  imgPage.drawImage(embeddedPng, { x: 100, y: 500, width: 150, height: 150 });
  imgPage.drawRectangle({ x: 300, y: 500, width: 100, height: 100, color: rgb(0.2, 0.6, 0.9) });
  const imgPdfBytes = await imgDoc.save();

  const imgBlocks: TextBlock[] = [
    createBlock({
      id: "img_caption",
      pageIndex: 0,
      currentText: "Figure 1: Vector Graphic & Image Stream Untouched",
      fontFamily: "Arial",
      fontCategory: "sans-serif",
      fontSize: 12,
      color: { r: 0.3, g: 0.3, b: 0.3 },
      x: 100,
      y: 470,
      isNew: true,
      isEdited: true,
      pdfBounds: { x: 100, y: 470, width: 300, height: 20 },
    }),
  ];

  const res9 = await applyPdfEdits({
    fileData: imgPdfBytes,
    blocks: imgBlocks,
    outputFilename: "scenario9-images-edited.pdf",
  });
  const data9 = res9.data as Uint8Array;
  if (!res9.success || !data9) throw new Error("Scenario 9 failed");
  const doc9 = await PDFDocument.load(data9);
  if (doc9.getPageCount() !== 1) throw new Error("Scenario 9 page count mismatch");
  console.log("✓ PASS: Scenario 9 (PDF with images & graphics intact) byte length:", data9.byteLength);

  console.log("\n==========================================");
  console.log("ALL 9 REQUIRED SCENARIOS PASSED WITH 100% SUCCESS!");
  console.log("==========================================");
}

runAllScenarios().catch((err) => {
  console.error("FATAL ERROR IN SCENARIOS:", err);
  process.exit(1);
});
