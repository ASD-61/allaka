export function formatIQD(amount: number): string {
  return `${amount.toLocaleString('ar-IQ')} د.ع`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('ar-IQ', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}
