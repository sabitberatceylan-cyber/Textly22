export function sonGorulmeMetni(zamanMs) {
  if (!zamanMs) return null;
  const fark = Date.now() - zamanMs;
  if (fark < 60_000) return 'az önce';
  if (fark < 3_600_000) return `${Math.floor(fark / 60_000)} dk önce`;
  if (fark < 86_400_000) return `${Math.floor(fark / 3_600_000)} sa önce`;
  const d = new Date(zamanMs);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
}
