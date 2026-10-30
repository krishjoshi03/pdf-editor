import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import { PDFDocument } from "pdf-lib";

const TEST_PDF_PATH = path.resolve(process.cwd(), "public", "test-acknowledgement.pdf");

test.describe("PDFivo Edit PDF - Download Pipeline & Scenarios Verification", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/edit-pdf");
    const fileChooserInput = page.locator("#dropzone-file-input");
    await fileChooserInput.waitFor({ state: "attached" });
    await page.waitForTimeout(500);
    await fileChooserInput.setInputFiles(TEST_PDF_PATH);

    const blocks = page.locator("[data-text-block]");
    await blocks.first().waitFor({ state: "visible", timeout: 20000 });
  });

  test("1. End-to-end user flow: edit text and download edited PDF via browser download event", async ({ page }) => {
    // 1. Edit the first text block
    const firstBlock = page.locator("[data-text-block]").first();
    await firstBlock.click();
    await page.keyboard.type(" [VERIFIED_EDIT]");

    // 2. Prepare download listener
    const downloadPromise = page.waitForEvent("download", { timeout: 20000 });

    // 3. Click Download button
    const downloadBtn = page.getByRole("button", { name: /Download edited PDF/i });
    await expect(downloadBtn).toBeVisible();
    await downloadBtn.click();

    // 4. Await download event
    const download = await downloadPromise;
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/-edited\.pdf$/);

    // 5. Save downloaded file and verify size
    const tempPath = path.resolve(process.cwd(), "test-download-output.pdf");
    await download.saveAs(tempPath);
    const stat = fs.statSync(tempPath);
    expect(stat.size).toBeGreaterThan(0);

    // 6. Verify with pdf-lib: valid PDF, correct page count
    const downloadedBytes = fs.readFileSync(tempPath);
    const loadedDoc = await PDFDocument.load(downloadedBytes);
    expect(loadedDoc.getPageCount()).toBe(1);

    // Clean up temp file
    fs.unlinkSync(tempPath);
  });

  test("2. Download without edits produces valid identical-page PDF", async ({ page }) => {
    const downloadPromise = page.waitForEvent("download", { timeout: 20000 });
    const downloadBtn = page.getByRole("button", { name: /Download edited PDF/i });
    await downloadBtn.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/-edited\.pdf$/);

    const tempPath = path.resolve(process.cwd(), "test-noedit-output.pdf");
    await download.saveAs(tempPath);
    const stat = fs.statSync(tempPath);
    expect(stat.size).toBeGreaterThan(0);

    const loadedDoc = await PDFDocument.load(fs.readFileSync(tempPath));
    expect(loadedDoc.getPageCount()).toBe(1);
    fs.unlinkSync(tempPath);
  });

  test("3. Download with added text and crosshair placement", async ({ page }) => {
    // Activate Add Text tool
    const addTextBtn = page.getByRole("button", { name: /Add Text/i });
    await addTextBtn.click();

    // Click inside page to place new block
    const pageSurface = page.locator("#page-container-1 > div:nth-child(2)");
    await pageSurface.click({ position: { x: 250, y: 350 } });
    await page.keyboard.type("Brand New Added Heading");

    const downloadPromise = page.waitForEvent("download", { timeout: 20000 });
    const downloadBtn = page.getByRole("button", { name: /Download edited PDF/i });
    await downloadBtn.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/-edited\.pdf$/);

    const tempPath = path.resolve(process.cwd(), "test-addtext-output.pdf");
    await download.saveAs(tempPath);
    const loadedDoc = await PDFDocument.load(fs.readFileSync(tempPath));
    expect(loadedDoc.getPageCount()).toBe(1);
    fs.unlinkSync(tempPath);
  });

  test("4. Download with page border applied", async ({ page }) => {
    const borderBtn = page.getByRole("button", { name: "Border" });
    if ((await borderBtn.count()) > 0) {
      await borderBtn.click();
      const presetBtn = page.getByRole("button", { name: "Simple (Blue)" });
      await presetBtn.waitFor({ state: "visible" });
      await presetBtn.click();
      const doneBtn = page.getByRole("button", { name: "Done" });
      await doneBtn.click();
    }

    const downloadPromise = page.waitForEvent("download", { timeout: 20000 });
    const downloadBtn = page.getByRole("button", { name: /Download edited PDF/i });
    await downloadBtn.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/-edited\.pdf$/);

    const tempPath = path.resolve(process.cwd(), "test-border-output.pdf");
    await download.saveAs(tempPath);
    const loadedDoc = await PDFDocument.load(fs.readFileSync(tempPath));
    expect(loadedDoc.getPageCount()).toBe(1);
    fs.unlinkSync(tempPath);
  });
});
