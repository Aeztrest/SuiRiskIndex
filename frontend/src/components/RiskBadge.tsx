import { getRiskLevel, getRiskColor } from '@/lib/types';

interface RiskBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showScore?: boolean;
}

export default function RiskBadge({ score, size = 'md', showScore = true }: RiskBadgeProps) {
  const level = getRiskLevel(score);
  const colorClass = getRiskColor(score);

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${colorClass} ${sizeClasses[size]}`}
    >
      {showScore && <span className="font-mono">{score}</span>}
      {showScore && <span>·</span>}
      <span>{level}</span>
    </span>
  );
}
