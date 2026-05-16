import { ComponentProps, ReactNode } from 'react';
import { cn } from 'src/lib/utils';

interface TProps extends ComponentProps<'section'> {
  title: string;
  titleComponent?: ReactNode;
  containerProps?: ComponentProps<'div'>;
}

export default function BlurCard({ title, titleComponent, containerProps, ...props }: TProps) {
  return (
    <section
      {...props}
      className={cn('rounded-lg border border-white/10 bg-white/5 p-3', props.className)}
    >
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold tracking-wide text-slate-300 uppercase">{title}</h4>
        {titleComponent}
      </div>
      <div {...containerProps} className={cn('mt-2', containerProps?.className)}>
        {props.children}
      </div>
    </section>
  );
}

interface BlurItemCardProps extends ComponentProps<'div'> {
  title: string;
  children: ReactNode;
}

export function BlurItemCard({ title, children, ...props }: BlurItemCardProps) {
  return (
    <div
      {...props}
      className={cn('rounded-lg border border-white/10 bg-slate-900/30 p-3', props.className)}
    >
      <p className="mb-2 text-center text-xs font-bold tracking-wider text-slate-400 uppercase">
        {title}
      </p>
      {children}
    </div>
  );
}
