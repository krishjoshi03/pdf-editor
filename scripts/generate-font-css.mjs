import fs from "node:fs";
import path from "node:path";

// Read lib/pdf/fonts.ts manually or dynamically
const fontsTsPath = path.resolve(process.cwd(), "lib", "pdf", "fonts.ts");
const content = fs.readFileSync(fontsTsPath, "utf-8");

// Extract the FONT_LIBRARY array
const match = content.match(/export const FONT_LIBRARY: FontDefinition\[\] = (\[[\s\S]*?\n\];)/);
if (!match) {
  console.error("Could not find FONT_LIBRARY in fonts.ts");
  process.exit(1);
}

// Evaluate FONT_LIBRARY
const fontLibrary = eval(match[1]);

let css = "/* PDFivo Local Offline Fonts Library (37 Bundled OFL Fonts) */\n\n";

for (const font of fontLibrary) {
  for (const [key, file] of Object.entries(font.files)) {
    const weight = key.includes("bold") || key.includes("Bold") ? "700" : "400";
    const style = key.toLowerCase().includes("italic") ? "italic" : "normal";
    const format = file.endsWith(".ttf") ? "truetype" : "woff";
    css += `@font-face {\n`;
    css += `  font-family: '${font.family}';\n`;
    css += `  src: url('/fonts/${file}') format('${format}');\n`;
    css += `  font-weight: ${weight};\n`;
    css += `  font-style: ${style};\n`;
    css += `  font-display: swap;\n`;
    css += `}\n\n`;
  }
}

fs.writeFileSync(path.resolve(process.cwd(), "app", "editor-fonts.css"), css);
console.log(`Generated app/editor-fonts.css for ${fontLibrary.length} fonts!`);
