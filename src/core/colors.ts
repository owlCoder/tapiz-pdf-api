// ──────────────────────────────────────────────────────────────────
//  Color Palette — matches Tapiz UI CSS custom properties
//  Primary: Electric Cyan (--color-primary-* series)
//  Print-safe: light backgrounds only, no dark fills except accents
// ──────────────────────────────────────────────────────────────────
export type RGB = [number, number, number];
export const C: Record<string, RGB> = {
  // Primary — Electric Cyan
  primary:    [14,  116, 144],  // 500  #0e7490  (light-mode primary-500)
  primary50:  [232, 251, 255],  // 50   #e8fbff
  primary100: [199, 245, 255],  // 100  #c7f5ff
  primary200: [153, 238, 255],  // 200  #99eeff
  primary300: [14,  165, 201],  // 300  #0ea5c9  (light-mode primary-300)
  primary400: [8,   145, 178],  // 400  #0891b2  (light-mode primary-400)
  primary600: [20,  150, 179],  // 600  #1496b3
  primary700: [14,  112, 136],  // 700  #0e7088
  primary800: [10,  79,  96],   // 800  #0a4f60
  primary900: [6,   47,  59],   // 900  #062f3b

  // Semantic — print-safe, light tint backgrounds
  emerald:    [5,   150, 105],  // #059669 (light-mode good)
  emerald50:  [209, 250, 229],
  amber:      [180, 83,  9],    // #b45309
  amber50:    [255, 251, 235],
  red:        [185, 28,  28],   // #b91c1c
  red50:      [254, 242, 242],
  blue:       [37,  99,  235],  // #2563eb
  blue50:     [239, 246, 255],

  // Grayscale — light mode (white paper)
  gray50:  [249, 250, 251],
  gray100: [243, 244, 246],
  gray200: [229, 231, 235],
  gray300: [209, 213, 219],
  gray400: [156, 163, 175],
  gray500: [107, 114, 128],
  gray600: [75,  85,  99],
  gray700: [55,  65,  81],
  gray800: [31,  41,  55],
  gray900: [17,  24,  39],
  white:   [255, 255, 255],
};
