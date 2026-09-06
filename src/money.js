export function integer(value, label = 'Amount') {
  if (!Number.isSafeInteger(value) || Math.abs(value) > 1_000_000_000_000) throw new Error(`${label} must be safe integer minor units within the sandbox limit`);
  return value;
}

export function convert(amount, rate) {
  integer(amount);
  if (!rate || !Number.isSafeInteger(rate.n) || !Number.isSafeInteger(rate.d) || rate.n <= 0 || rate.d <= 0) throw new Error('Invalid policy rate');
  const numerator = BigInt(Math.abs(amount)) * BigInt(rate.n);
  const denominator = BigInt(rate.d);
  const rounded = (numerator * 2n + denominator) / (2n * denominator);
  return integer(Number(rounded) * Math.sign(amount));
}

export function money(value, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value / 100);
}
