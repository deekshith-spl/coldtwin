import type { UrgencyLevel } from '@/types';
import { useT } from '@/i18n';

const CONFIG: Record<UrgencyLevel, { cls: string; label: (T: any) => string }> = {
  red:   { cls: 'bg-red-100 text-red-800 border border-red-200',     label: T => T.urgency_red },
  amber: { cls: 'bg-amber-100 text-amber-800 border border-amber-200', label: T => T.urgency_amber },
  green: { cls: 'bg-green-100 text-green-800 border border-green-200', label: T => T.urgency_green },
};

export function UrgencyChip({ level }: { level: UrgencyLevel }) {
  const T = useT();
  const { cls, label } = CONFIG[level];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {label(T)}
    </span>
  );
}
