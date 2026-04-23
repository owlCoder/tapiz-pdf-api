// ──────────────────────────────────────────────────────────────────
//  Color Palette — matches Tapiz frontend CSS custom properties
//  Primary: Teal (--color-primary-* series)
// ──────────────────────────────────────────────────────────────────

export type RGB = [number, number, number];

export const C: Record<string, RGB> = {
  // Primary teal shades
  primary:    [47,  157, 147],   // 500
  primary50:  [238, 250, 248],   // 50
  primary100: [213, 242, 239],   // 100
  primary200: [171, 228, 222],   // 200
  primary300: [122, 210, 201],   // 300
  primary400: [76,  188, 177],   // 400
  primary600: [35,  125, 117],   // 600
  primary700: [27,  95,  89],    // 700
  primary800: [19,  69,  64],    // 800
  primary900: [12,  46,  43],    // 900

  // Semantic
  emerald:    [16,  185, 77],
  emerald50:  [236, 253, 243],
  amber:      [217, 119, 6],
  amber50:    [255, 251, 235],
  red:        [220, 38,  38],
  red50:      [254, 242, 242],
  blue:       [59,  130, 246],
  blue50:     [239, 246, 255],

  // Grayscale
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
