interface RiskGaugeProps {
  score: number; // 0–100
}

export function RiskGauge({ score }: RiskGaugeProps) {
  const color = score >= 60 ? '#ef4444' : score >= 30 ? '#f59e0b' : '#22c55e';
  const angle = -135 + (score / 100) * 270;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 100 60" width={100} height={60}>
        {/* Background arc */}
        <path
          d="M 10 55 A 40 40 0 0 1 90 55"
          fill="none" stroke="#e5e7eb" strokeWidth={10} strokeLinecap="round"
        />
        {/* Foreground arc */}
        <path
          d="M 10 55 A 40 40 0 0 1 90 55"
          fill="none" stroke={color} strokeWidth={10} strokeLinecap="round"
          strokeDasharray={`${(score / 100) * 125.7} 125.7`}
        />
        {/* Needle */}
        <g transform={`rotate(${angle}, 50, 55)`}>
          <line x1="50" y1="55" x2="50" y2="22" stroke="#374151" strokeWidth={2} strokeLinecap="round" />
        </g>
        <circle cx="50" cy="55" r="3" fill="#374151" />
        {/* Score text */}
        <text x="50" y="48" textAnchor="middle" fontSize="12" fontWeight="700" fill={color}>
          {score}
        </text>
      </svg>
    </div>
  );
}
