// ──────────────────────────────────────────────────────────────────
//  Color Palette — matches Tapiz frontend CSS custom properties
//  Primary: Warm brown / ochre (--color-primary-* series)
// ──────────────────────────────────────────────────────────────────

export type RGB = [number, number, number];

export const C: Record<string, RGB> = {
  // Primary warm brown shades
  primary:    [160, 128, 64],   // 500  #a08040
  primary50:  [250, 247, 242],  // 50   #faf7f2
  primary100: [240, 232, 216],  // 100  #f0e8d8
  primary200: [221, 208, 176],  // 200  #ddd0b0
  primary300: [200, 184, 136],  // 300  #c8b888
  primary400: [192, 168, 112],  // 400  #c0a870
  primary600: [122, 94,  40],   // 600  #7a5e28
  primary700: [96,  62,  24],   // 700  #603e18
  primary800: [80,  60,  20],   // 800  #503c14
  primary900: [56,  40,  12],   // 900  #38280c

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