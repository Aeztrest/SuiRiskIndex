import { getIdentityLevel, getIdentityColor } from '@/lib/types';

interface IdentityBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function IdentityBadge({ score, size = 'md' }: IdentityBadgeProps) {
  const level = getIdentityLevel(score);
  const colorClass = getIdentityColor(score);

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  const icons = {
    Bronze: '🥉',
    Silver: '🥈',
    Gold: '🥇',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${colorClass} ${sizeClasses[size]}`}
    >
      <span>{icons[level]}</span>
      <span>{level}</span>
    </span>
  );
}
