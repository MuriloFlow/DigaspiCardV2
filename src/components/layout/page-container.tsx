import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function PageContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main
      className={cn(
        "mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-32 pt-6 sm:px-6 sm:pt-8 lg:px-8",
        className,
      )}
    >
      {children}
    </main>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <p className="mb-2 text-xs font-semibold uppercase text-zinc-500">
          {eyebrow}
        </p>
        <h1 className="text-[clamp(2rem,4vw,3.8rem)] font-semibold leading-[1.02] text-zinc-950">
          {title}
        </h1>
        {description ? (
          <p className="mt-4 max-w-xl text-base leading-7 text-zinc-600">
            {description}
          </p>
        ) : null}
      </div>
      {children ? <div className="w-full shrink-0 sm:w-auto">{children}</div> : null}
    </header>
  );
}
