'use client'
import { isEmbeddedAppPath } from '@sistemazero/member-shell/lib/embedded-app-path'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import type { SessionUserWithAvatar } from '@/lib/types'
import { CommunityTopnav } from './community-topnav'

export function CommunityFrame({
  user,
  banner,
  children,
}: {
  user: SessionUserWithAvatar
  banner: ReactNode
  children: ReactNode
}) {
  const embedded = isEmbeddedAppPath(usePathname())
  return (
    <div
      className={`sz-app flex flex-col bg-background ${embedded ? 'h-dvh overflow-hidden' : 'min-h-screen'}`}
    >
      {banner}
      {!embedded ? <CommunityTopnav user={user} /> : null}
      <main
        className={
          embedded
            ? 'flex min-h-0 w-full flex-1 overflow-hidden'
            : 'mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-6'
        }
      >
        {children}
      </main>
    </div>
  )
}
