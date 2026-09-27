'use client'

import { BrandLogo } from '@sistemazero/ui/brand-logo'
import Link from 'next/link'
import type { SessionUser } from '@/lib/types'
import { UserMenu } from './user-menu'

export function Topbar({ user }: { user: SessionUser }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="flex h-14 items-center gap-4 px-4 md:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          {/* A logo oficial: SVG embutido, o ZERO lendo `--logo-zero-*` do chassi console. */}
          <BrandLogo
            fundo="claro"
            label="Sistema Zero — atendimento"
            className="block h-auto w-[120px] md:w-[140px]"
          />
          <span className="hidden text-xs font-medium text-muted-foreground sm:inline">
            Helpdesk
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  )
}
