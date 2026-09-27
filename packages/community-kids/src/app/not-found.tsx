import Link from 'next/link'
import { KidsRecado } from '@/components/kids/kids-recado'
import { KIDS_SCREEN_BAND } from '@/components/kids/kids-screen'
import { KidsMascot } from '@/components/kids/mascot'

/**
 * Página 404 da área do aluno, no molde das telas de recado (`KidsRecado`, 11/09/2026).
 * É a boundary da RAIZ, então aparece sem o menu: a tela inteira é a faixa creme.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col">
      <KidsRecado
        bandClassName={KIDS_SCREEN_BAND}
        art={<KidsMascot expression="thinking" className="size-24" />}
        title="Opa, não achei essa página!"
        actions={
          <Link href="/" className="sz-btn-gradient px-6">
            Voltar para o início
          </Link>
        }
      >
        <p>O endereço pode estar errado ou a página mudou de lugar. 😊</p>
      </KidsRecado>
    </main>
  )
}
