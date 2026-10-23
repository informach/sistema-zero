import { PublicPlayer } from '@sistemazero/member-shell/components/creator/public-player'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Jogar | Sistema Zero',
  description: 'Um jogo criado na comunidade Sistema Zero.',
  robots: { index: false, follow: false },
}
export default async function AdultPlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound()
  // `data-sz-public-player`: a tela cheia do jogo volta à base de 16 px (`globals.css`), porque o
  // player mede o cabeçalho em px para decidir quando pedir para girar o celular.
  return (
    <div data-sz-public-player className="contents">
      <PublicPlayer id={id} skin="adult" />
    </div>
  )
}
