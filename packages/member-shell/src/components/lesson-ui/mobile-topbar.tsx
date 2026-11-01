import type { ReactNode } from 'react'
/** Shared lesson header. Hosts provide their own logo, identity and authorized actions. */
export function LessonMobileTopbar({ brand, children }: { brand: ReactNode; children: ReactNode }) {
  return (
    <header className="kids-menu sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-(--menu-2) border-b bg-(--menu) px-3 text-(--menu-texto) md:hidden">
      {brand}
      <div className="flex min-w-0 items-center gap-2">{children}</div>
    </header>
  )
}
