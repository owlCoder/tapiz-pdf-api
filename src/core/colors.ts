// ──────────────────────────────────────────────────────────────────
//  Color Palette — matches Tapiz frontend CSS custom properties
//  Primary: Prussian Navy (--color-primary-* series)
// ──────────────────────────────────────────────────────────────────
export type RGB = [number, number, number];
export const C: Record<string, RGB> = {
  // Primary Prussian Navy shades
  primary:    [14,  114, 232],  // 500  #0e72e8
  primary50:  [240, 247, 255],  // 50   #f0f7ff
  primary100: [218, 238, 255],  // 100  #daeeff
  primary200: [174, 216, 255],  // 200  #aed8ff
  primary300: [112, 184, 255],  // 300  #70b8ff
  primary400: [50,  146, 248],  // 400  #3292f8
  primary600: [8,   87,  203],  // 600  #0857cb
  primary700: [14,  76,  138],  // 700  #0e4c8a
  primary800: [13,  61,  110],  // 800  #0d3d6e
  primary900: [12,  49,  89],   // 900  #0c3159
  
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