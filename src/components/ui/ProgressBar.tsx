interface ProgressBarProps {
  value: number;   // 0–1
  color?: 'blue' | 'amber' | 'red' | 'green';
  height?: string;
}

const COLOR_MAP = {
  blue:  'bg-cold-500',
  amber: 'bg-amber-400',
  red:   'bg-red-500',
  green: 'bg-green-500',
};

export function ProgressBar({ value, color = 'blue', height = 'h-1.5' }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className={`w-full bg-gray-100 rounded-full overflow-hidden ${height}`}>
      <div
        className={`${COLOR_MAP[color]} h-full rounded-full transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
