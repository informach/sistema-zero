'use client'

import Link from 'next/link'
import type { ComponentProps } from 'react'

/** O jogo recebe COEP em sua resposta; navegação SPA não troca a política do documento. */
export function ArquipelagoNavLink({
  href,
  ...props
}: Omit<ComponentProps<'a'>, 'href'> & { href: string }) {
  if (href === '/arquipelago') return <a href={href} {...props} />
  return <Link href={href} prefetch={false} {...props} />
}
