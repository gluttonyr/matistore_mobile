export function isEventExpired(dateFin: string): boolean {
  const end = new Date(dateFin);
  if (isNaN(end.getTime())) return false;
  // Un événement reste actif jusqu'à la fin de sa journée de fin (23:59:59.999),
  // il n'expire qu'à partir de 00:00 le lendemain de dateFin.
  const endOfDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
  return endOfDay.getTime() < Date.now();
}

export function formatEventDate(dateDebut: string, dateFin: string): string {
  try {
    const start = new Date(dateDebut);
    const end = new Date(dateFin);
    const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    if (start.toDateString() === end.toDateString()) return fmt(start);
    return `${fmt(start)} - ${fmt(end)}`;
  } catch {
    return '';
  }
}
