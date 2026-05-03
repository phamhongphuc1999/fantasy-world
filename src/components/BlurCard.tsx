import { ComponentProps, ReactNode } from 'react';
import { cn } from 'src/lib/utils';

interface TProps extends ComponentProps<'section'> {
  title: string;
  titleComponent?: ReactNode;
}

export default function BlurCard({ title, titleComponent, ...props }: TProps) {
  return (
    <section
      {...props}
      className={cn('rounded-lg border border-white/10 bg-white/5 p-3', props.className)}
    >
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold tracking-wide text-slate-300 uppercase">{title}</h4>
        {titleComponent}
      </div>
      <div className="mt-2">{props.children}</div>
    </section>
  );
}
