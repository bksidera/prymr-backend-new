/** Convert a cent integer to a dollar string with 2 decimal places. */
export function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Convert a dollar amount to an integer cent value, rounding half-up. */
export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}
