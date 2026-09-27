import { Lock, Sparkles } from 'lucide-react'
import { COMUNIDADE_OFERTA_URL } from '@/lib/links'
import { KidsClosingCard } from './kids-closing-card'
import { KidsRecado } from './kids-recado'
import { KidsMascot } from './mascot'

type PreviewItem = { emoji: string; text: string }

/**
 * Tela compartilhada de PRODUTO bloqueado (Estúdio/Clube/Pensa/Pinta/Mural): o item
 * aparece no menu, mas a criança ainda não tem acesso. Mascote + prévia do que tem dentro
 * (no cartão do recado) e o convite da **Comunidade dos Criadores** (a assinatura kids que
 * libera TODOS esses produtos — combo confirmado no seed do catálogo) no cartão de
 * fechamento da faixa lilás, com o botão para a oferta. Cada produto é um wrapper fino que
 * passa `title`/`intro`/`preview`. NÃO usar na tela genérica `KidsLockedSpace` (coringa
 * gateado por curso/cargo — o CTA prometeria errado).
 */
export function KidsLockedProduct({
  title,
  intro,
  preview,
}: {
  title: string
  intro: string
  preview: readonly PreviewItem[]
}) {
  return (
    <KidsRecado
      art={<KidsMascot expression="sleeping" className="kid-float size-24" />}
      chip="Ainda não liberado"
      chipIcon={Lock}
      title={title}
      closing={
        // Faz parte da Comunidade dos Criadores → pedido ao responsável + botão de assinar.
        <KidsClosingCard
          icon={Sparkles}
          title={`${title} faz parte da Comunidade dos Criadores! 🎉`}
          description={
            <>
              Quem é da Comunidade dos Criadores tem isso e tudo o mais liberado pra criar à
              vontade. Peça para o seu pai, a sua mãe ou um responsável clicar no botão e te
              inscrever na Comunidade dos Criadores. 💙 Assim que você entrar, fica tudo liberado
              pra você! ✨
            </>
          }
          action={
            <a
              href={COMUNIDADE_OFERTA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="sz-btn-gradient h-12 px-6 text-base"
            >
              Entrar na Comunidade dos Criadores
            </a>
          }
        />
      }
    >
      <p>{intro}</p>
      <ul className="mt-2 flex w-full flex-col gap-2 text-left">
        {preview.map((item) => (
          <li
            key={item.text}
            className="flex items-center gap-3 rounded-2xl bg-(--band-creme) px-4 py-3"
          >
            <span aria-hidden="true" className="text-2xl leading-none">
              {item.emoji}
            </span>
            <span className="font-bold text-[0.9375rem] text-foreground">{item.text}</span>
          </li>
        ))}
      </ul>
    </KidsRecado>
  )
}
