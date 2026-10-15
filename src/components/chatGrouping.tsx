// Regroupe les messages par jour et calcule le libellé à afficher
// (façon WhatsApp : "Aujourd'hui", "Hier", nom du jour si < 7 jours,
// sinon la date complète "12 août 2025").

export type ChatSection = {
  title: string;
  dateKey: string;
  data: any[];
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function capitalize(s: string): string {
  return s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function formatDayLabel(date: Date): string {
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000);

  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  if (diffDays > 1 && diffDays < 7) {
    return capitalize(date.toLocaleDateString('fr-FR', { weekday: 'long' }));
  }
  const sameYear = date.getFullYear() === today.getFullYear();
  return capitalize(
    date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: sameYear ? undefined : 'numeric',
    })
  );
}

// Suppose les messages triés du plus ancien au plus récent (ordre habituel d'un chat).
export function groupMessagesByDay(messages: any[]): ChatSection[] {
  const order: string[] = [];
  const groups = new Map<string, any[]>();

  for (const msg of messages) {
    const raw = msg.dateEnvoi ?? msg.createdAt;
    const d = raw ? new Date(raw) : new Date();
    const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
      order.push(dateKey);
    }
    groups.get(dateKey)!.push(msg);
  }

  return order.map((dateKey) => {
    const data = groups.get(dateKey)!;
    const raw = data[0].dateEnvoi ?? data[0].createdAt;
    const sample = raw ? new Date(raw) : new Date();
    return { title: formatDayLabel(sample), dateKey, data };
  });
}