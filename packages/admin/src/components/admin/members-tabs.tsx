'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import { MEMBERS_TABS } from './nav'

/**
 * Abas da área de membros (Alunos | Cursos). `Alunos` fica ativa em tudo sob
 * `/admin/membros` que NÃO seja `/cursos` (inclui o detalhe `/membros/:userId`).
 */
export function MembersTabs() {
  const pathname = usePathname()
  const onCursos = pathname.startsWith('/admin/membros/cursos')
  return (
    <div className="flex items-center gap-1 border-b border-border">
      {MEMBERS_TABS.map((tab) => {
        const active = tab.href === '/admin/membros/cursos' ? onCursos : !onCursos
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-sm transition-colors',
              active
                ? 'border-primary font-semibold text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
