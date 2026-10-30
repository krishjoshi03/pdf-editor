import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { FONT_LIBRARY } from "../lib/pdf/fonts";
import { applyPdfEdits } from "../lib/pdf/edit-engine";
import { extractPageText } from "../lib/pdf/text-extractor";
import { TextBlock, TextRun } from "../lib/pdf/edit-types";

const TEST_PDF_PATH = path.resolve(process.cwd(), "public", "test-acknowledgement.pdf");

test.describe("PDFivo Edit PDF Production QA & Bug Fix Verification - UI Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/edit-pdf");
    const fileChooserInput = page.locator("#dropzone-file-input");
    await fileChooserInput.waitFor({ state: "attached" });
    await page.waitForTimeout(500);
    await fileChooserInput.setInputFiles(TEST_PDF_PATH);

    const blocks = page.locator("[data-text-block]");
    await blocks.first().waitFor({ state: "visible", timeout: 20000 });
  });

  test("(a) clicking blank space inside and outside the page creates nothing", async ({ page }) => {
    const initialBlocksCount = await page.locator("[data-text-block]").count();
    expect(initialBlocksCount).toBeGreaterThan(0);

    // 1. Click outside page in the gray container area (#edit-workspace-scroll)
    const scrollContainer = page.locator("#edit-workspace-scroll");
    await scrollContainer.click({ position: { x: 20, y: 50 } });
    await page.waitForTimeout(300);

    // Check count is unchanged
    const afterOutsideClick = await page.locator("[data-text-block]").count();
    expect(afterOutsideClick).toBe(initialBlocksCount);

    // Verify absolutely no "Type text here" text anywhere on page
    const typeTextElements = page.getByText("Type text here");
    expect(await typeTextElements.count()).toBe(0);

    // 2. Click inside the page surface at empty coordinates (e.g., bottom margin)
    const pageSurface = page.locator("#page-container-1 > div:nth-child(2)");
    const boundingBox = await pageSurface.boundingBox();
    expect(boundingBox).not.toBeNull();

    await pageSurface.click({ position: { x: 300, y: (boundingBox?.height || 800) - 50 } });
    await page.waitForTimeout(300);

    // Check count is still unchanged
    const afterInsideClick = await page.locator("[data-text-block]").count();
    expect(afterInsideClick).toBe(initialBlocksCount);

    // Verify still no "Type text here"
    expect(await typeTextElements.count()).toBe(0);
  });

  test("(c) edit counter stays 0 after clicking without changing", async ({ page }) => {
    // Check initial status bar
    const statusBar = page.locator("#edit-pdf-status-bar");
    await expect(statusBar).toContainText("Ready");

    // Click on a block to select it
    const firstBlock = page.locator("[data-text-block]").first();
    await firstBlock.click();
    await page.waitForTimeout(200);

    // Status bar must still show Ready / 0 edits
    await expect(statusBar).toContainText("Ready");
    expect(await statusBar.innerText()).not.toContain("edits recorded");
    expect(await statusBar.innerText()).not.toContain("1 edit recorded");

    // Click on empty gray area to deselect
    await page.locator("#edit-workspace-scroll").click({ position: { x: 20, y: 50 } });
    await page.waitForTimeout(200);

    // Status bar must still show Ready
    await expect(statusBar).toContainText("Ready");
    expect(await statusBar.innerText()).not.toContain("edits recorded");
  });

  test("(b) Add text tool places a box only inside the page, an empty box disappears on blur", async ({ page }) => {
    const initialBlocksCount = await page.locator("[data-text-block]").count();

    // 1. Activate Add Text tool via toolbar button
    const addTextBtn = page.getByRole("button", { name: /Add Text/i });
    await addTextBtn.click();

    const pageSurface = page.locator("#page-container-1 > div:nth-child(2)");
    await expect(pageSurface).toHaveClass(/cursor-crosshair/);

    // 2. Click outside the page in the gray area
    await page.locator("#edit-workspace-scroll").click({ position: { x: 20, y: 50 } });
    await page.waitForTimeout(200);

    // Block count should NOT change from outside click
    expect(await page.locator("[data-text-block]").count()).toBe(initialBlocksCount);

    // Cancel tool with Escape
    await page.keyboard.press("Escape");
    await page.waitForTimeout(100);
    expect(await pageSurface.getAttribute("class")).not.toContain("cursor-crosshair");

    // 3. Re-activate Add Text tool via keyboard shortcut 'T'
    await page.keyboard.press("t");
    await expect(pageSurface).toHaveClass(/cursor-crosshair/);

    // 4. Click inside the page bounds at an empty area (e.g. x: 100, y: 350)
    await pageSurface.click({ position: { x: 100, y: 350 } });
    await page.waitForTimeout(300);

    // Block count should now be initialBlocksCount + 1
    const newBlocksCount = await page.locator("[data-text-block]").count();
    expect(newBlocksCount).toBe(initialBlocksCount + 1);

    // Find the newly placed text block
    const newBlockContainer = page.locator("[data-text-block]").last();
    const newBlockEditable = newBlockContainer.locator('[contenteditable="true"]');
    const newBlockText = await newBlockEditable.innerText();
    // Must be empty with NO placeholder text ("Type text here")
    expect(newBlockText.trim()).toBe("");

    // Background must be transparent (not white or filled)
    const bg = await newBlockContainer.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    expect(bg === "rgba(0, 0, 0, 0)" || bg === "transparent").toBe(true);

    // Edit counter must still not count empty new block
    const statusBar = page.locator("#edit-pdf-status-bar");
    await expect(statusBar).toContainText("Ready");

    // 5. Blur the empty new box by clicking outside on the gray container
    await page.locator("#edit-workspace-scroll").click({ position: { x: 20, y: 50 } });
    await page.waitForTimeout(300);

    // The empty new block must be automatically deleted on blur
    const afterBlurCount = await page.locator("[data-text-block]").count();
    expect(afterBlurCount).toBe(initialBlocksCount);

    // Counter remains 0
    await expect(statusBar).toContainText("Ready");
  });

  test("(d) font dropdown opens via portal, lists 35+ fonts, search works, and font applies", async ({ page }) => {
    // Select the first text block
    const firstBlock = page.locator("[data-text-block]").first();
    await firstBlock.click();
    await page.waitForTimeout(200);

    // Click font family picker trigger button
    const fontPickerBtn = page.getByTitle("Choose Font Family");
    await fontPickerBtn.click();

    // Verify portal panel rendered in document.body
    const portalPanel = page.locator('div[style*="position: fixed"][style*="z-index: 99999"]');
    await expect(portalPanel).toBeVisible();

    // Check search input is present and autofocus
    const searchInput = portalPanel.locator('input[placeholder="Search font..."]');
    await expect(searchInput).toBeVisible();

    // Verify sticky category sections exist
    await expect(portalPanel).toContainText("Office-compatible");
    await expect(portalPanel).toContainText("Sans-serif");
    await expect(portalPanel).toContainText("Serif");
    await expect(portalPanel).toContainText("Monospace");
    await expect(portalPanel).toContainText("Indian languages");
    await expect(portalPanel).toContainText("Handwriting");

    // Verify at least 35 font options are bundled and accessible
    const fontOptions = portalPanel.locator("button");
    const count = await fontOptions.count();
    expect(count).toBeGreaterThanOrEqual(35);

    // Test Search filtering: search "rob"
    await searchInput.click();
    await searchInput.fill("rob");
    await page.waitForTimeout(200);

    // Should show "Roboto" and "Roboto Mono"
    await expect(portalPanel).toContainText("Roboto");
    await expect(portalPanel).toContainText("Roboto Mono");

    // Search for a non-existent font
    await searchInput.fill("nonexistentfontxyz");
    await page.waitForTimeout(200);
    await expect(portalPanel).toContainText("No fonts found");

    // Clear search and select "Roboto"
    await searchInput.fill("Roboto");
    await page.waitForTimeout(200);
    const robotoOption = portalPanel.locator("button", { hasText: "Roboto" }).first();
    await robotoOption.click();

    // Dropdown should close automatically
    await expect(portalPanel).not.toBeVisible();

    // Trigger button should now display "Roboto"
    await expect(fontPickerBtn).toContainText("Roboto");
  });
});

test.describe("PDFivo Edit PDF Production QA - Font Embedding & Layout Tests", () => {
  test("(e) all 37 fonts locally embed and export successfully with pdf-lib", async () => {
    expect(FONT_LIBRARY.length).toBeGreaterThanOrEqual(35);

    for (const fontDef of FONT_LIBRARY) {
      const doc = await PDFDocument.create();
      doc.registerFontkit(fontkit);
      const page = doc.addPage([400, 400]);

      // Read font file from public/fonts
      const regularFile = path.resolve(process.cwd(), "public", "fonts", fontDef.files.regular);
      expect(fs.existsSync(regularFile), `Font file ${regularFile} must exist`).toBe(true);

      const fontBytes = fs.readFileSync(regularFile);
      const embeddedFont = await doc.embedFont(fontBytes, { subset: true });
      expect(embeddedFont).toBeDefined();

      page.drawText(`Testing ${fontDef.displayName}`, {
        x: 50,
        y: 200,
        size: 14,
        font: embeddedFont,
      });

      const pdfBytes = await doc.save();
      expect(pdfBytes.length).toBeGreaterThan(100);
    }
  });

  test("(f) paragraph stability and alignment preservation pass", async () => {
    const rawPdfBytes = fs.readFileSync(TEST_PDF_PATH);
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const doc = await pdfjs.getDocument({ data: new Uint8Array(rawPdfBytes) }).promise;
    const page = await doc.getPage(1);
    const pageData = await extractPageText(page, 0, 1.0);

    expect(pageData.blocks.length).toBeGreaterThan(0);
    const ackPara = pageData.blocks.find((b: TextBlock) => b.originalText.includes("Dr. Sarah Jenkins"));
    expect(ackPara).toBeDefined();

    // Verify justified layout preservation
    expect(ackPara?.layout?.textAlign).toBe("justify");
    expect(ackPara?.layout?.firstLineIndent).toBe(30);
    expect(Math.round(ackPara?.layout?.columnWidth || 0)).toBe(474);

    // Verify bold runs extracted cleanly without string mutilation
    expect(ackPara?.runs).toBeDefined();
    const boldRuns = ackPara?.runs?.filter((r: TextRun) => r.isBold) || [];
    expect(boldRuns.length).toBe(2);
    expect(boldRuns[0].text.trim()).toBe("Dr. Sarah Jenkins");
    expect(boldRuns[1].text.trim()).toBe("Prof. Alan Turing");

    // Perform export with edited run
    const editedBlock: TextBlock = {
      ...ackPara!,
      currentText: ackPara!.originalText.replace("Dr. Sarah Jenkins", "Dr. Ada Lovelace"),
      isEdited: true,
      runs: ackPara!.runs?.map((r: TextRun) =>
        r.text.includes("Dr. Sarah Jenkins")
          ? { ...r, text: r.text.replace("Dr. Sarah Jenkins", "Dr. Ada Lovelace") }
          : r
      ),
    };

    const exportResult = await applyPdfEdits({
      fileData: new Uint8Array(rawPdfBytes),
      blocks: [editedBlock],
      outputFilename: "edited.pdf",
    });
    expect(exportResult.success).toBe(true);
    const exportBytes = exportResult.data as Uint8Array;
    expect(exportBytes).toBeDefined();
    expect(exportBytes.length).toBeGreaterThan(1000);

    // Load exported PDF and verify intact structure
    const reloaded = await PDFDocument.load(exportBytes);
    expect(reloaded.getPageCount()).toBe(1);
  });
});
