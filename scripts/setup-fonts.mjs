import fs from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

const targetDir = path.resolve(process.cwd(), "public", "fonts");
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

function findFontFile(pkg, weight, style, preferredSubset) {
  const dir = path.resolve(process.cwd(), "node_modules", "@fontsource", pkg, "files");
  if (!fs.existsSync(dir)) return null;

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".woff"));

  // Try exact subset match
  let matched = files.find((f) => {
    const isPreferred = f.includes(`-${preferredSubset}-`) || f.includes(`${pkg}-${preferredSubset}-`);
    const isWeight = f.includes(`-${weight}-`);
    const isStyle = f.includes(`-${style}.woff`);
    return isPreferred && isWeight && isStyle;
  });

  if (!matched) {
    // Try latin
    matched = files.find((f) => {
      const isLatin = f.includes("-latin-") && !f.includes("-latin-ext-");
      const isWeight = f.includes(`-${weight}-`);
      const isStyle = f.includes(`-${style}.woff`);
      return isLatin && isWeight && isStyle;
    });
  }

  if (!matched) {
    // Try any subset with this weight and style
    matched = files.find((f) => {
      const isWeight = f.includes(`-${weight}-`);
      const isStyle = f.includes(`-${style}.woff`);
      return isWeight && isStyle;
    });
  }

  if (!matched && (weight === "700" || style === "italic")) {
    // Fallback if bold or italic doesn't exist
    return null;
  }

  if (!matched) {
    // Fallback to 400 normal
    matched = files.find((f) => f.includes("-400-normal.woff") || f.includes("-normal.woff")) || files[0];
  }

  return matched ? path.join(dir, matched) : null;
}

const FONT_DEFS = [
  // 1. Office-compatible
  { id: "times-new-roman", family: "Tinos", displayName: "Times New Roman", note: "metric-compatible (Tinos)", category: "Office-compatible", fontCategory: "serif", pkg: "tinos", subset: "latin", fallback: "'Tinos', 'Times New Roman', Times, serif" },
  { id: "arial", family: "Arimo", displayName: "Arial", note: "metric-compatible (Arimo)", category: "Office-compatible", fontCategory: "sans-serif", pkg: "arimo", subset: "latin", fallback: "'Arimo', Arial, Helvetica, sans-serif" },
  { id: "calibri", family: "Carlito", displayName: "Calibri", note: "metric-compatible (Carlito)", category: "Office-compatible", fontCategory: "calibri", existingFiles: { regular: "carlito.ttf", bold: "carlito-bold.ttf" }, fallback: "'Carlito', Calibri, sans-serif" },
  { id: "cambria", family: "Caladea", displayName: "Cambria", note: "metric-compatible (Caladea)", category: "Office-compatible", fontCategory: "cambria", existingFiles: { regular: "caladea.ttf", bold: "caladea-bold.ttf" }, fallback: "'Caladea', Cambria, Georgia, serif" },
  { id: "courier-new", family: "Cousine", displayName: "Courier New", note: "metric-compatible (Cousine)", category: "Office-compatible", fontCategory: "monospace", pkg: "cousine", subset: "latin", fallback: "'Cousine', 'Courier New', Courier, monospace" },
  { id: "georgia", family: "Gelasio", displayName: "Georgia", note: "metric-compatible (Gelasio)", category: "Office-compatible", fontCategory: "serif", pkg: "gelasio", subset: "latin", fallback: "'Gelasio', Georgia, serif" },
  { id: "verdana", family: "DejaVu Sans", displayName: "Verdana", note: "metric-compatible (DejaVu Sans)", category: "Office-compatible", fontCategory: "sans-serif", pkg: "dejavu-sans", subset: "latin", fallback: "'DejaVu Sans', Verdana, sans-serif" },

  // 2. Sans-serif
  { id: "inter", family: "Inter", displayName: "Inter", category: "Sans-serif", fontCategory: "sans-serif", pkg: "inter", subset: "latin", fallback: "'Inter', sans-serif" },
  { id: "roboto", family: "Roboto", displayName: "Roboto", category: "Sans-serif", fontCategory: "roboto", pkg: "roboto", subset: "latin", existingFiles: { regular: "roboto.ttf", bold: "roboto-bold.ttf" }, fallback: "'Roboto', sans-serif" },
  { id: "open-sans", family: "Open Sans", displayName: "Open Sans", category: "Sans-serif", fontCategory: "sans-serif", pkg: "open-sans", subset: "latin", fallback: "'Open Sans', sans-serif" },
  { id: "lato", family: "Lato", displayName: "Lato", category: "Sans-serif", fontCategory: "sans-serif", pkg: "lato", subset: "latin", fallback: "'Lato', sans-serif" },
  { id: "montserrat", family: "Montserrat", displayName: "Montserrat", category: "Sans-serif", fontCategory: "sans-serif", pkg: "montserrat", subset: "latin", fallback: "'Montserrat', sans-serif" },
  { id: "poppins", family: "Poppins", displayName: "Poppins", category: "Sans-serif", fontCategory: "sans-serif", pkg: "poppins", subset: "latin", fallback: "'Poppins', sans-serif" },
  { id: "nunito", family: "Nunito", displayName: "Nunito", category: "Sans-serif", fontCategory: "sans-serif", pkg: "nunito", subset: "latin", fallback: "'Nunito', sans-serif" },
  { id: "source-sans-3", family: "Source Sans 3", displayName: "Source Sans 3", category: "Sans-serif", fontCategory: "sans-serif", pkg: "source-sans-3", subset: "latin", fallback: "'Source Sans 3', sans-serif" },
  { id: "work-sans", family: "Work Sans", displayName: "Work Sans", category: "Sans-serif", fontCategory: "sans-serif", pkg: "work-sans", subset: "latin", fallback: "'Work Sans', sans-serif" },
  { id: "raleway", family: "Raleway", displayName: "Raleway", category: "Sans-serif", fontCategory: "sans-serif", pkg: "raleway", subset: "latin", fallback: "'Raleway', sans-serif" },
  { id: "dm-sans", family: "DM Sans", displayName: "DM Sans", category: "Sans-serif", fontCategory: "sans-serif", pkg: "dm-sans", subset: "latin", fallback: "'DM Sans', sans-serif" },
  { id: "noto-sans", family: "Noto Sans", displayName: "Noto Sans", category: "Sans-serif", fontCategory: "sans-serif", pkg: "noto-sans", subset: "latin", fallback: "'Noto Sans', sans-serif" },
  { id: "ubuntu", family: "Ubuntu", displayName: "Ubuntu", category: "Sans-serif", fontCategory: "sans-serif", pkg: "ubuntu", subset: "latin", fallback: "'Ubuntu', sans-serif" },

  // 3. Serif
  { id: "merriweather", family: "Merriweather", displayName: "Merriweather", category: "Serif", fontCategory: "serif", pkg: "merriweather", subset: "latin", fallback: "'Merriweather', serif" },
  { id: "lora", family: "Lora", displayName: "Lora", category: "Serif", fontCategory: "serif", pkg: "lora", subset: "latin", fallback: "'Lora', serif" },
  { id: "libre-baskerville", family: "Libre Baskerville", displayName: "Libre Baskerville", category: "Serif", fontCategory: "serif", pkg: "libre-baskerville", subset: "latin", fallback: "'Libre Baskerville', serif" },
  { id: "playfair-display", family: "Playfair Display", displayName: "Playfair Display", category: "Serif", fontCategory: "serif", pkg: "playfair-display", subset: "latin", fallback: "'Playfair Display', serif" },
  { id: "eb-garamond", family: "EB Garamond", displayName: "EB Garamond", category: "Serif", fontCategory: "serif", pkg: "eb-garamond", subset: "latin", fallback: "'EB Garamond', serif" },
  { id: "cormorant-garamond", family: "Cormorant Garamond", displayName: "Cormorant Garamond", category: "Serif", fontCategory: "serif", pkg: "cormorant-garamond", subset: "latin", fallback: "'Cormorant Garamond', serif" },
  { id: "pt-serif", family: "PT Serif", displayName: "PT Serif", category: "Serif", fontCategory: "serif", pkg: "pt-serif", subset: "latin", fallback: "'PT Serif', serif" },
  { id: "noto-serif", family: "Noto Serif", displayName: "Noto Serif", category: "Serif", fontCategory: "serif", pkg: "noto-serif", subset: "latin", fallback: "'Noto Serif', serif" },

  // 4. Monospace
  { id: "roboto-mono", family: "Roboto Mono", displayName: "Roboto Mono", category: "Monospace", fontCategory: "monospace", pkg: "roboto-mono", subset: "latin", fallback: "'Roboto Mono', monospace" },
  { id: "source-code-pro", family: "Source Code Pro", displayName: "Source Code Pro", category: "Monospace", fontCategory: "monospace", pkg: "source-code-pro", subset: "latin", fallback: "'Source Code Pro', monospace" },
  { id: "fira-code", family: "Fira Code", displayName: "Fira Code", category: "Monospace", fontCategory: "monospace", pkg: "fira-code", subset: "latin", fallback: "'Fira Code', monospace" },

  // 5. Indian languages
  { id: "noto-sans-devanagari", family: "Noto Sans Devanagari", displayName: "Noto Sans Devanagari", category: "Indian languages", fontCategory: "devanagari", pkg: "noto-sans-devanagari", subset: "devanagari", existingFiles: { regular: "noto-devanagari.ttf", bold: "noto-devanagari-bold.ttf" }, fallback: "'Noto Sans Devanagari', sans-serif" },
  { id: "noto-sans-gujarati", family: "Noto Sans Gujarati", displayName: "Noto Sans Gujarati", category: "Indian languages", fontCategory: "gujarati", pkg: "noto-sans-gujarati", subset: "gujarati", existingFiles: { regular: "noto-gujarati.ttf", bold: "noto-gujarati-bold.ttf" }, fallback: "'Noto Sans Gujarati', sans-serif" },
  { id: "noto-serif-devanagari", family: "Noto Serif Devanagari", displayName: "Noto Serif Devanagari", category: "Indian languages", fontCategory: "devanagari", pkg: "noto-serif-devanagari", subset: "devanagari", fallback: "'Noto Serif Devanagari', serif" },

  // 6. Handwriting
  { id: "dancing-script", family: "Dancing Script", displayName: "Dancing Script", category: "Handwriting", fontCategory: "sans-serif", pkg: "dancing-script", subset: "latin", fallback: "'Dancing Script', cursive" },
  { id: "great-vibes", family: "Great Vibes", displayName: "Great Vibes", category: "Handwriting", fontCategory: "sans-serif", pkg: "great-vibes", subset: "latin", fallback: "'Great Vibes', cursive" },
  { id: "caveat", family: "Caveat", displayName: "Caveat", category: "Handwriting", fontCategory: "sans-serif", pkg: "caveat", subset: "latin", fallback: "'Caveat', cursive" },
];

async function run() {
  console.log(`Processing ${FONT_DEFS.length} font definitions...`);

  const registry = [];

  for (const def of FONT_DEFS) {
    const files = {};

    // 1. Regular
    if (def.existingFiles?.regular) {
      files.regular = def.existingFiles.regular;
    } else if (def.pkg) {
      const src = findFontFile(def.pkg, "400", "normal", def.subset);
      if (src) {
        const destName = `${def.id}.woff`;
        fs.copyFileSync(src, path.join(targetDir, destName));
        files.regular = destName;
      }
    }

    // 2. Bold
    if (def.existingFiles?.bold) {
      files.bold = def.existingFiles.bold;
    } else if (def.pkg) {
      const src = findFontFile(def.pkg, "700", "normal", def.subset);
      if (src) {
        const destName = `${def.id}-bold.woff`;
        fs.copyFileSync(src, path.join(targetDir, destName));
        files.bold = destName;
      }
    }

    // 3. Italic
    if (def.existingFiles?.italic) {
      files.italic = def.existingFiles.italic;
    } else if (def.pkg) {
      const src = findFontFile(def.pkg, "400", "italic", def.subset);
      if (src) {
        const destName = `${def.id}-italic.woff`;
        fs.copyFileSync(src, path.join(targetDir, destName));
        files.italic = destName;
      }
    }

    // 4. Bold Italic
    if (def.existingFiles?.boldItalic) {
      files.boldItalic = def.existingFiles.boldItalic;
    } else if (def.pkg) {
      const src = findFontFile(def.pkg, "700", "italic", def.subset);
      if (src) {
        const destName = `${def.id}-bolditalic.woff`;
        fs.copyFileSync(src, path.join(targetDir, destName));
        files.boldItalic = destName;
      }
    }

    if (!files.regular) {
      console.error(`ERROR: Regular font file missing for ${def.family}!`);
    } else {
      registry.push({
        ...def,
        files,
      });
      console.log(`✓ ${def.displayName} (${def.family}): regular=${files.regular}, bold=${files.bold || "none"}, italic=${files.italic || "none"}, boldItalic=${files.boldItalic || "none"}`);
    }
  }

  console.log(`\nTesting PDF embedding for all ${registry.length} fonts...`);
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  for (const font of registry) {
    for (const [weightStyle, fileName] of Object.entries(font.files)) {
      const filePath = path.join(targetDir, fileName);
      if (!fs.existsSync(filePath)) {
        throw new Error(`File ${fileName} not found for ${font.family}`);
      }
      const buf = fs.readFileSync(filePath);
      try {
        const embedded = await doc.embedFont(buf, { subset: true });
        // Test basic encode
        const testText = font.category === "Indian languages" ? (font.id.includes("gujarati") ? "નમસ્તે" : "नमस्ते") : "The quick brown fox 123";
        if (font.category !== "Indian languages") {
          embedded.encodeText(testText);
        }
      } catch (err) {
        console.error(`Embedding failed for ${font.family} (${weightStyle}):`, err);
        throw err;
      }
    }
  }

  console.log(`✓ All ${registry.length} fonts embed without errors!`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
