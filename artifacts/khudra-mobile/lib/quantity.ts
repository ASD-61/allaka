// Weight-based products (sold by the kilo) are ordered in half-kilo steps;
// everything else (pieces, bundles, fixed-weight packs) steps by 1.
export function qtyStepForUnit(unit: string): number {
  return /كغم|كيلو|kg/i.test(unit) ? 0.5 : 1;
}
