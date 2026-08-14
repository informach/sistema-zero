import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PublicPlayer } from '@/components/kids/public-player'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Jogar no Sistema Zero',
  description: 'Um projeto criado por uma criança no Sistema Zero. Jogue direto no navegador!',
  // É a ÚNICA rota anonimamente alcançável (link compartilhado). NÃO indexar: o
  // jogo de uma criança não deve aparecer em buscadores (descoberta/privacidade —
  // plataforma infantil). `force-dynamic` garante o header em toda resposta.
  robots: { index: false, follow: false },
}

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

/**
 * Página PÚBLICA (sem login) de jogar um projeto compartilhado do Mural. Fica
 * FORA do grupo `(app)` (sem a sidebar/chrome kids e SEM o gate de sessão) — o
 * link é aberto por família/amigos. Mostra só o jogo + o título; nenhum dado da
 * criança. O id é o UUID público do artefato (`playId`); inválido → 404.
 */
export default async function JogarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID_RE.test(id)) notFound()
  return <PublicPlayer id={id} />
}
