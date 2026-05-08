/** Buy-one-get-one-free: customer pays for ceil(qty / 2) units at list price. */
export function bogoPayableQuantity(quantity: number): number {
  if (quantity < 1) return 0;
  return Math.ceil(quantity / 2);
}

export function lineSubtotalCents(unitPriceCents: number, quantity: number, bogoEnabled: boolean): number {
  const units = bogoEnabled ? bogoPayableQuantity(quantity) : quantity;
  return unitPriceCents * units;
}

/** Full list price for qty units (ignores BOGO). */
export function listSubtotalWithoutBogoCents(unitPriceCents: number, quantity: number): number {
  return unitPriceCents * quantity;
}
