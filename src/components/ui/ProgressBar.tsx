interface ProgressBarProps {
  value: number;   // 0–1
  color?: 'blue' | 'amber' | 'red' | 'green';
  height?: string;
  label?: string;
}

const COLOR_MAP = {
  blue:  'bg-cold-500',
  amber: 'bg-amber-400',
  red:   'bg-red-500',
  green: 'bg-green-500',
};

export function ProgressBar({ value, color = 'blue', height = 'h-1.5', label = 'Remaining shelf-life progress' }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={`w-full bg-gray-100 rounded-full overflow-hidden ${height}`}
    >
      <div
        className={`${COLOR_MAP[color]} h-full rounded-full transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
