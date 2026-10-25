import { useStore } from '@/store/useStore';
import { useT } from '@/i18n';
import { FlaskConical } from 'lucide-react';

export function DemoBadge() {
  const isDemoData = useStore(s => s.isDemoData);
  const T = useT();

  if (!isDemoData) return null;

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 font-medium">
      <FlaskConical size={12} />
      <span>{T.demo_badge}</span>
    </div>
  );
}
