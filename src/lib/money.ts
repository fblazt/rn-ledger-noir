const idrFormatter = new Intl.NumberFormat('id-ID', {
  currency: 'IDR',
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
  style: 'currency',
});

export function formatIdr(amount: number) {
  return idrFormatter.format(amount);
}
