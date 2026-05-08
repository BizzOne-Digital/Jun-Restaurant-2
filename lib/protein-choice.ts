/** Matches Uber-style "Choice of Protein" for dishes with chicken, beef, pork, shrimp, katsu, or chop in the name. */
export const PROTEIN_OPTION_NAME = "Choice of Protein";

export const PROTEIN_OPTIONS: { value: string; label: string; addonCents: number }[] = [
  { value: "Vegetarian", label: "Vegetarian", addonCents: 0 },
  { value: "Chicken", label: "Chicken", addonCents: 100 },
  { value: "Beef", label: "Beef", addonCents: 100 },
  { value: "Shrimp", label: "Shrimp", addonCents: 200 },
  { value: "Combo", label: "Combo (Chicken, Beef and Shrimp)", addonCents: 300 },
];

export function requiresProteinChoiceMenuItem(itemName: string): boolean {
  return /\b(chicken|beef|pork|shrimp|katsu|chop)\b/i.test(itemName);
}

export function proteinAddonFromSelected(selected?: { name: string; value: string }[]): number {
  const row = selected?.find((o) => o.name === PROTEIN_OPTION_NAME);
  if (!row) return 0;
  const opt = PROTEIN_OPTIONS.find((o) => o.value === row.value);
  return opt?.addonCents ?? 0;
}

export function isValidProteinSelection(selected?: { name: string; value: string }[]): boolean {
  const row = selected?.find((o) => o.name === PROTEIN_OPTION_NAME);
  if (!row) return false;
  return PROTEIN_OPTIONS.some((o) => o.value === row.value);
}
