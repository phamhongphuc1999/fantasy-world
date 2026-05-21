import { cn } from 'src/lib/utils';
import { ReactNode } from 'react';

/**
 * Decorative divider bar — separates sections with a fantasy flourish.
 */
export function FantasyDivider({ className }: { className?: string }) {
  return (
    <div className={cn('my-3 flex items-center gap-2 select-none', className)}>
      <span className="h-px flex-1 bg-linear-to-r from-transparent via-amber-700/20 to-transparent" />
      <span className="font-rune text-xs leading-none text-amber-600/40">❧</span>
      <span className="h-px flex-1 bg-linear-to-r from-transparent via-amber-700/20 to-transparent" />
    </div>
  );
}

/**
 * Corner ornament — decorates card/dialog corners with medieval chess symbols.
 */
export function CornerOrnament({
  position,
  className,
}: {
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
}) {
  const posClass = {
    'top-left': 'top-0 left-0 -translate-x-1/4 -translate-y-1/4',
    'top-right': 'top-0 right-0 translate-x-1/4 -translate-y-1/4',
    'bottom-left': 'bottom-0 left-0 -translate-x-1/4 translate-y-1/4',
    'bottom-right': 'bottom-0 right-0 translate-x-1/4 translate-y-1/4',
  };

  return (
    <span
      className={cn(
        'font-fantasy pointer-events-none absolute text-2xl leading-none text-amber-700/15 select-none',
        posClass[position],
        className
      )}
    >
      {position.startsWith('top') ? '♜' : '♝'}
    </span>
  );
}

/**
 * Rune badge — small colored tag with a mystical feel.
 */
export function RuneBadge({
  children,
  variant = 'mystic',
  className,
}: {
  children: ReactNode;
  variant?: 'mystic' | 'gold' | 'blood';
  className?: string;
}) {
  return (
    <span
      className={cn(
        'font-fantasy inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs tracking-wider',
        variant === 'mystic' && 'border border-purple-500/30 bg-purple-900/30 text-purple-200',
        variant === 'gold' && 'border border-amber-500/30 bg-amber-900/30 text-amber-200',
        variant === 'blood' && 'border border-red-500/30 bg-red-900/30 text-red-200',
        className
      )}
    >
      {children}
    </span>
  );
}
