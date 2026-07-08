'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { SessionUser } from '@/lib/types'
import { ThemeToggle } from './theme-toggle'
import { UserMenu } from './user-menu'

export function Topbar({ user }: { user: SessionUser }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="flex h-14 items-center gap-4 px-4 md:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          {/* Logo dual-theme (mesmos SVGs do admin/community): dark ⇄ light */}
          <Image
            src="/logo_dark.svg"
            width={515}
            height={75}
            alt="Sistema Zero"
            className="hidden h-auto w-[120px] md:w-[140px] dark:block"
            priority
          />
          <Image
            src="/logo_white.svg"
            width={515}
            height={72}
            alt="Sistema Zero"
            className="block h-auto w-[120px] md:w-[140px] dark:hidden"
            priority
          />
          <span className="hidden text-xs font-medium text-muted-foreground sm:inline">
            Helpdesk
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  )
}
