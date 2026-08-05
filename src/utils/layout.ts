// Status/Saved grids were hardcoded to 2 columns, sized for phone widths. On a tablet
// (or a phone rotated to landscape) that leaves each cell stretched huge and wastes the
// extra width. Scaling the column count to the available width keeps cells a reasonable,
// consistent size across phones, foldables, and tablets.
export function getGridColumns(width: number): number {
  if (width >= 900) return 5;
  if (width >= 700) return 4;
  if (width >= 500) return 3;
  return 2;
}
