import { FontChoice } from "./edit-types";

export type FontCategory =
  | "Office-compatible"
  | "Sans-serif"
  | "Serif"
  | "Monospace"
  | "Indian languages"
  | "Handwriting";

export interface FontDefinition {
  id: string;
  family: string; // CSS family name e.g. "Tinos", "Inter", "Carlito"
  displayName: string; // User-facing name e.g. "Times New Roman", "Inter", "Arial"
  note?: string; // Subtitle e.g. "metric-compatible (Tinos)"
  category: FontCategory;
  fontCategory: FontChoice;
  fallbackStack: string; // CSS fallback stack
  previewFamily: string; // CSS font-family for dropdown previews
  files: {
    regular: string;
    bold?: string;
    italic?: string;
    boldItalic?: string;
  };
}

export const FONT_CATEGORIES: FontCategory[] = [
  "Office-compatible",
  "Sans-serif",
  "Serif",
  "Monospace",
  "Indian languages",
  "Handwriting",
];

export const FONT_LIBRARY: FontDefinition[] = [
  // -------------------------------------------------------------
  // 1. Office-compatible (7 fonts)
  // -------------------------------------------------------------
  {
    id: "times-new-roman",
    family: "Tinos",
    displayName: "Times New Roman",
    note: "metric-compatible (Tinos)",
    category: "Office-compatible",
    fontCategory: "serif",
    fallbackStack: "'Tinos', 'Times New Roman', Times, serif",
    previewFamily: "'Tinos', serif",
    files: {
      regular: "times-new-roman.woff",
      bold: "times-new-roman-bold.woff",
      italic: "times-new-roman-italic.woff",
      boldItalic: "times-new-roman-bolditalic.woff",
    },
  },
  {
    id: "arial",
    family: "Arimo",
    displayName: "Arial",
    note: "metric-compatible (Arimo)",
    category: "Office-compatible",
    fontCategory: "sans-serif",
    fallbackStack: "'Arimo', Arial, Helvetica, sans-serif",
    previewFamily: "'Arimo', sans-serif",
    files: {
      regular: "arial.woff",
      bold: "arial-bold.woff",
      italic: "arial-italic.woff",
      boldItalic: "arial-bolditalic.woff",
    },
  },
  {
    id: "calibri",
    family: "Carlito",
    displayName: "Calibri",
    note: "metric-compatible (Carlito)",
    category: "Office-compatible",
    fontCategory: "calibri",
    fallbackStack: "'Carlito', Calibri, sans-serif",
    previewFamily: "'Carlito', sans-serif",
    files: {
      regular: "carlito.ttf",
      bold: "carlito-bold.ttf",
    },
  },
  {
    id: "cambria",
    family: "Caladea",
    displayName: "Cambria",
    note: "metric-compatible (Caladea)",
    category: "Office-compatible",
    fontCategory: "cambria",
    fallbackStack: "'Caladea', Cambria, Georgia, serif",
    previewFamily: "'Caladea', serif",
    files: {
      regular: "caladea.ttf",
      bold: "caladea-bold.ttf",
    },
  },
  {
    id: "courier-new",
    family: "Cousine",
    displayName: "Courier New",
    note: "metric-compatible (Cousine)",
    category: "Office-compatible",
    fontCategory: "monospace",
    fallbackStack: "'Cousine', 'Courier New', Courier, monospace",
    previewFamily: "'Cousine', monospace",
    files: {
      regular: "courier-new.woff",
      bold: "courier-new-bold.woff",
      italic: "courier-new-italic.woff",
      boldItalic: "courier-new-bolditalic.woff",
    },
  },
  {
    id: "georgia",
    family: "Gelasio",
    displayName: "Georgia",
    note: "metric-compatible (Gelasio)",
    category: "Office-compatible",
    fontCategory: "serif",
    fallbackStack: "'Gelasio', Georgia, serif",
    previewFamily: "'Gelasio', serif",
    files: {
      regular: "georgia.woff",
      bold: "georgia-bold.woff",
      italic: "georgia-italic.woff",
      boldItalic: "georgia-bolditalic.woff",
    },
  },
  {
    id: "verdana",
    family: "DejaVu Sans",
    displayName: "Verdana",
    note: "metric-compatible (DejaVu Sans)",
    category: "Office-compatible",
    fontCategory: "sans-serif",
    fallbackStack: "'DejaVu Sans', Verdana, sans-serif",
    previewFamily: "'DejaVu Sans', sans-serif",
    files: {
      regular: "verdana.woff",
      bold: "verdana-bold.woff",
      italic: "verdana-italic.woff",
      boldItalic: "verdana-bolditalic.woff",
    },
  },

  // -------------------------------------------------------------
  // 2. Sans-serif (13 fonts)
  // -------------------------------------------------------------
  {
    id: "inter",
    family: "Inter",
    displayName: "Inter",
    category: "Sans-serif",
    fontCategory: "sans-serif",
    fallbackStack: "'Inter', sans-serif",
    previewFamily: "'Inter', sans-serif",
    files: {
      regular: "inter.woff",
      bold: "inter-bold.woff",
      italic: "inter-italic.woff",
      boldItalic: "inter-bolditalic.woff",
    },
  },
  {
    id: "roboto",
    family: "Roboto",
    displayName: "Roboto",
    category: "Sans-serif",
    fontCategory: "roboto",
    fallbackStack: "'Roboto', sans-serif",
    previewFamily: "'Roboto', sans-serif",
    files: {
      regular: "roboto.ttf",
      bold: "roboto-bold.ttf",
      italic: "roboto-italic.woff",
      boldItalic: "roboto-bolditalic.woff",
    },
  },
  {
    id: "open-sans",
    family: "Open Sans",
    displayName: "Open Sans",
    category: "Sans-serif",
    fontCategory: "sans-serif",
    fallbackStack: "'Open Sans', sans-serif",
    previewFamily: "'Open Sans', sans-serif",
    files: {
      regular: "open-sans.woff",
      bold: "open-sans-bold.woff",
      italic: "open-sans-italic.woff",
      boldItalic: "open-sans-bolditalic.woff",
    },
  },
  {
    id: "lato",
    family: "Lato",
    displayName: "Lato",
    category: "Sans-serif",
    fontCategory: "sans-serif",
    fallbackStack: "'Lato', sans-serif",
    previewFamily: "'Lato', sans-serif",
    files: {
      regular: "lato.woff",
      bold: "lato-bold.woff",
      italic: "lato-italic.woff",
      boldItalic: "lato-bolditalic.woff",
    },
  },
  {
    id: "montserrat",
    family: "Montserrat",
    displayName: "Montserrat",
    category: "Sans-serif",
    fontCategory: "sans-serif",
    fallbackStack: "'Montserrat', sans-serif",
    previewFamily: "'Montserrat', sans-serif",
    files: {
      regular: "montserrat.woff",
      bold: "montserrat-bold.woff",
      italic: "montserrat-italic.woff",
      boldItalic: "montserrat-bolditalic.woff",
    },
  },
  {
    id: "poppins",
    family: "Poppins",
    displayName: "Poppins",
    category: "Sans-serif",
    fontCategory: "sans-serif",
    fallbackStack: "'Poppins', sans-serif",
    previewFamily: "'Poppins', sans-serif",
    files: {
      regular: "poppins.woff",
      bold: "poppins-bold.woff",
      italic: "poppins-italic.woff",
      boldItalic: "poppins-bolditalic.woff",
    },
  },
  {
    id: "nunito",
    family: "Nunito",
    displayName: "Nunito",
    category: "Sans-serif",
    fontCategory: "sans-serif",
    fallbackStack: "'Nunito', sans-serif",
    previewFamily: "'Nunito', sans-serif",
    files: {
      regular: "nunito.woff",
      bold: "nunito-bold.woff",
      italic: "nunito-italic.woff",
      boldItalic: "nunito-bolditalic.woff",
    },
  },
  {
    id: "source-sans-3",
    family: "Source Sans 3",
    displayName: "Source Sans 3",
    category: "Sans-serif",
    fontCategory: "sans-serif",
    fallbackStack: "'Source Sans 3', 'Source Sans Pro', sans-serif",
    previewFamily: "'Source Sans 3', sans-serif",
    files: {
      regular: "source-sans-3.woff",
      bold: "source-sans-3-bold.woff",
      italic: "source-sans-3-italic.woff",
      boldItalic: "source-sans-3-bolditalic.woff",
    },
  },
  {
    id: "work-sans",
    family: "Work Sans",
    displayName: "Work Sans",
    category: "Sans-serif",
    fontCategory: "sans-serif",
    fallbackStack: "'Work Sans', sans-serif",
    previewFamily: "'Work Sans', sans-serif",
    files: {
      regular: "work-sans.woff",
      bold: "work-sans-bold.woff",
      italic: "work-sans-italic.woff",
      boldItalic: "work-sans-bolditalic.woff",
    },
  },
  {
    id: "raleway",
    family: "Raleway",
    displayName: "Raleway",
    category: "Sans-serif",
    fontCategory: "sans-serif",
    fallbackStack: "'Raleway', sans-serif",
    previewFamily: "'Raleway', sans-serif",
    files: {
      regular: "raleway.woff",
      bold: "raleway-bold.woff",
      italic: "raleway-italic.woff",
      boldItalic: "raleway-bolditalic.woff",
    },
  },
  {
    id: "dm-sans",
    family: "DM Sans",
    displayName: "DM Sans",
    category: "Sans-serif",
    fontCategory: "sans-serif",
    fallbackStack: "'DM Sans', sans-serif",
    previewFamily: "'DM Sans', sans-serif",
    files: {
      regular: "dm-sans.woff",
      bold: "dm-sans-bold.woff",
      italic: "dm-sans-italic.woff",
      boldItalic: "dm-sans-bolditalic.woff",
    },
  },
  {
    id: "noto-sans",
    family: "Noto Sans",
    displayName: "Noto Sans",
    category: "Sans-serif",
    fontCategory: "sans-serif",
    fallbackStack: "'Noto Sans', sans-serif",
    previewFamily: "'Noto Sans', sans-serif",
    files: {
      regular: "noto-sans.woff",
      bold: "noto-sans-bold.woff",
      italic: "noto-sans-italic.woff",
      boldItalic: "noto-sans-bolditalic.woff",
    },
  },
  {
    id: "ubuntu",
    family: "Ubuntu",
    displayName: "Ubuntu",
    category: "Sans-serif",
    fontCategory: "sans-serif",
    fallbackStack: "'Ubuntu', sans-serif",
    previewFamily: "'Ubuntu', sans-serif",
    files: {
      regular: "ubuntu.woff",
      bold: "ubuntu-bold.woff",
      italic: "ubuntu-italic.woff",
      boldItalic: "ubuntu-bolditalic.woff",
    },
  },

  // -------------------------------------------------------------
  // 3. Serif (8 fonts)
  // -------------------------------------------------------------
  {
    id: "merriweather",
    family: "Merriweather",
    displayName: "Merriweather",
    category: "Serif",
    fontCategory: "serif",
    fallbackStack: "'Merriweather', serif",
    previewFamily: "'Merriweather', serif",
    files: {
      regular: "merriweather.woff",
      bold: "merriweather-bold.woff",
      italic: "merriweather-italic.woff",
      boldItalic: "merriweather-bolditalic.woff",
    },
  },
  {
    id: "lora",
    family: "Lora",
    displayName: "Lora",
    category: "Serif",
    fontCategory: "serif",
    fallbackStack: "'Lora', serif",
    previewFamily: "'Lora', serif",
    files: {
      regular: "lora.woff",
      bold: "lora-bold.woff",
      italic: "lora-italic.woff",
      boldItalic: "lora-bolditalic.woff",
    },
  },
  {
    id: "libre-baskerville",
    family: "Libre Baskerville",
    displayName: "Libre Baskerville",
    category: "Serif",
    fontCategory: "serif",
    fallbackStack: "'Libre Baskerville', Baskerville, serif",
    previewFamily: "'Libre Baskerville', serif",
    files: {
      regular: "libre-baskerville.woff",
      bold: "libre-baskerville-bold.woff",
      italic: "libre-baskerville-italic.woff",
      boldItalic: "libre-baskerville-bolditalic.woff",
    },
  },
  {
    id: "playfair-display",
    family: "Playfair Display",
    displayName: "Playfair Display",
    category: "Serif",
    fontCategory: "serif",
    fallbackStack: "'Playfair Display', Georgia, serif",
    previewFamily: "'Playfair Display', serif",
    files: {
      regular: "playfair-display.woff",
      bold: "playfair-display-bold.woff",
      italic: "playfair-display-italic.woff",
      boldItalic: "playfair-display-bolditalic.woff",
    },
  },
  {
    id: "eb-garamond",
    family: "EB Garamond",
    displayName: "EB Garamond",
    category: "Serif",
    fontCategory: "serif",
    fallbackStack: "'EB Garamond', Garamond, serif",
    previewFamily: "'EB Garamond', serif",
    files: {
      regular: "eb-garamond.woff",
      bold: "eb-garamond-bold.woff",
      italic: "eb-garamond-italic.woff",
      boldItalic: "eb-garamond-bolditalic.woff",
    },
  },
  {
    id: "cormorant-garamond",
    family: "Cormorant Garamond",
    displayName: "Cormorant Garamond",
    category: "Serif",
    fontCategory: "serif",
    fallbackStack: "'Cormorant Garamond', Garamond, serif",
    previewFamily: "'Cormorant Garamond', serif",
    files: {
      regular: "cormorant-garamond.woff",
      bold: "cormorant-garamond-bold.woff",
      italic: "cormorant-garamond-italic.woff",
      boldItalic: "cormorant-garamond-bolditalic.woff",
    },
  },
  {
    id: "pt-serif",
    family: "PT Serif",
    displayName: "PT Serif",
    category: "Serif",
    fontCategory: "serif",
    fallbackStack: "'PT Serif', serif",
    previewFamily: "'PT Serif', serif",
    files: {
      regular: "pt-serif.woff",
      bold: "pt-serif-bold.woff",
      italic: "pt-serif-italic.woff",
      boldItalic: "pt-serif-bolditalic.woff",
    },
  },
  {
    id: "noto-serif",
    family: "Noto Serif",
    displayName: "Noto Serif",
    category: "Serif",
    fontCategory: "serif",
    fallbackStack: "'Noto Serif', serif",
    previewFamily: "'Noto Serif', serif",
    files: {
      regular: "noto-serif.woff",
      bold: "noto-serif-bold.woff",
      italic: "noto-serif-italic.woff",
      boldItalic: "noto-serif-bolditalic.woff",
    },
  },

  // -------------------------------------------------------------
  // 4. Monospace (3 fonts)
  // -------------------------------------------------------------
  {
    id: "roboto-mono",
    family: "Roboto Mono",
    displayName: "Roboto Mono",
    category: "Monospace",
    fontCategory: "monospace",
    fallbackStack: "'Roboto Mono', monospace",
    previewFamily: "'Roboto Mono', monospace",
    files: {
      regular: "roboto-mono.woff",
      bold: "roboto-mono-bold.woff",
      italic: "roboto-mono-italic.woff",
      boldItalic: "roboto-mono-bolditalic.woff",
    },
  },
  {
    id: "source-code-pro",
    family: "Source Code Pro",
    displayName: "Source Code Pro",
    category: "Monospace",
    fontCategory: "monospace",
    fallbackStack: "'Source Code Pro', monospace",
    previewFamily: "'Source Code Pro', monospace",
    files: {
      regular: "source-code-pro.woff",
      bold: "source-code-pro-bold.woff",
      italic: "source-code-pro-italic.woff",
      boldItalic: "source-code-pro-bolditalic.woff",
    },
  },
  {
    id: "fira-code",
    family: "Fira Code",
    displayName: "Fira Code",
    category: "Monospace",
    fontCategory: "monospace",
    fallbackStack: "'Fira Code', monospace",
    previewFamily: "'Fira Code', monospace",
    files: {
      regular: "fira-code.woff",
      bold: "fira-code-bold.woff",
    },
  },

  // -------------------------------------------------------------
  // 5. Indian languages (3 fonts)
  // -------------------------------------------------------------
  {
    id: "noto-sans-devanagari",
    family: "Noto Sans Devanagari",
    displayName: "Noto Sans Devanagari",
    category: "Indian languages",
    fontCategory: "devanagari",
    fallbackStack: "'Noto Sans Devanagari', sans-serif",
    previewFamily: "'Noto Sans Devanagari', sans-serif",
    files: {
      regular: "noto-devanagari.ttf",
      bold: "noto-devanagari-bold.ttf",
    },
  },
  {
    id: "noto-sans-gujarati",
    family: "Noto Sans Gujarati",
    displayName: "Noto Sans Gujarati",
    category: "Indian languages",
    fontCategory: "gujarati",
    fallbackStack: "'Noto Sans Gujarati', sans-serif",
    previewFamily: "'Noto Sans Gujarati', sans-serif",
    files: {
      regular: "noto-gujarati.ttf",
      bold: "noto-gujarati-bold.ttf",
    },
  },
  {
    id: "noto-serif-devanagari",
    family: "Noto Serif Devanagari",
    displayName: "Noto Serif Devanagari",
    category: "Indian languages",
    fontCategory: "devanagari",
    fallbackStack: "'Noto Serif Devanagari', serif",
    previewFamily: "'Noto Serif Devanagari', serif",
    files: {
      regular: "noto-serif-devanagari.woff",
      bold: "noto-serif-devanagari-bold.woff",
    },
  },

  // -------------------------------------------------------------
  // 6. Handwriting (3 fonts)
  // -------------------------------------------------------------
  {
    id: "dancing-script",
    family: "Dancing Script",
    displayName: "Dancing Script",
    category: "Handwriting",
    fontCategory: "sans-serif",
    fallbackStack: "'Dancing Script', cursive",
    previewFamily: "'Dancing Script', cursive",
    files: {
      regular: "dancing-script.woff",
      bold: "dancing-script-bold.woff",
    },
  },
  {
    id: "great-vibes",
    family: "Great Vibes",
    displayName: "Great Vibes",
    category: "Handwriting",
    fontCategory: "sans-serif",
    fallbackStack: "'Great Vibes', cursive",
    previewFamily: "'Great Vibes', cursive",
    files: {
      regular: "great-vibes.woff",
    },
  },
  {
    id: "caveat",
    family: "Caveat",
    displayName: "Caveat",
    category: "Handwriting",
    fontCategory: "sans-serif",
    fallbackStack: "'Caveat', cursive",
    previewFamily: "'Caveat', cursive",
    files: {
      regular: "caveat.woff",
      bold: "caveat-bold.woff",
    },
  },
];

/**
 * Finds font definition by family name, display name, or alias.
 */
export function findFontDefinition(query: string): FontDefinition | undefined {
  if (!query) return undefined;
  const q = query.toLowerCase().trim();
  return FONT_LIBRARY.find(
    (f) =>
      f.family.toLowerCase() === q ||
      f.displayName.toLowerCase() === q ||
      f.id === q ||
      (f.note && f.note.toLowerCase().includes(q))
  );
}

/**
 * Gets appropriate font file for family, weight and style.
 */
export function resolveFontFileName(
  font: FontDefinition,
  isBold = false,
  isItalic = false
): string {
  if (isBold && isItalic && font.files.boldItalic) {
    return font.files.boldItalic;
  }
  if (isBold && font.files.bold) {
    return font.files.bold;
  }
  if (isItalic && font.files.italic) {
    return font.files.italic;
  }
  return font.files.regular;
}

/**
 * Lazily loads a font face in the browser before applying.
 */
export async function lazyLoadFontFace(
  font: FontDefinition,
  isBold = false,
  isItalic = false
): Promise<void> {
  if (typeof window === "undefined" || !document.fonts) return;

  const fileName = resolveFontFileName(font, isBold, isItalic);
  const weight = isBold ? "700" : "400";
  const style = isItalic ? "italic" : "normal";
  const format = fileName.endsWith(".ttf") ? "truetype" : "woff";

  // Check if already registered
  const loadedFonts = Array.from(document.fonts);
  const exists = loadedFonts.some(
    (f) => f.family === font.family && f.weight === weight && f.style === style && f.status === "loaded"
  );
  if (exists) return;

  try {
    const face = new FontFace(
      font.family,
      `url(/fonts/${fileName}) format('${format}')`,
      { weight, style }
    );
    await face.load();
    document.fonts.add(face);
  } catch {
    // If browser FontFace constructor fails, try document.fonts.load
    try {
      await document.fonts.load(`${weight} ${style} 16px "${font.family}"`);
    } catch {
      // ignore
    }
  }
}
