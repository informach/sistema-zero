import { Lock } from 'lucide-react'
import { COMUNIDADE_OFERTA_URL } from '@/lib/links'
import { KidsBand } from './kids-band'
import { KidsMascot } from './mascot'

type PreviewItem = { emoji: string; text: string }

/**
 * Tela compartilhada de PRODUTO bloqueado (Estúdio/Clube/Pensa/Pinta/Mural): o item
 * aparece no menu, mas a criança ainda não tem acesso. Mascote `thinking` + prévia do
 * que tem dentro + o bloco da **Comunidade dos Criadores** (a assinatura kids que libera
 * TODOS esses produtos — combo confirmado no seed do catálogo) com um CTA para a oferta.
 * Cada produto é um wrapper fino que passa `title`/`intro`/`preview`. NÃO usar na tela
 * genérica `KidsLockedSpace` (coringa gateado por curso/cargo — o CTA prometeria errado).
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
    <KidsBand
      tone="creme"
      innerClassName="mx-auto flex w-full max-w-md flex-col items-center px-4 py-12 text-center"
    >
      <KidsMascot expression="sleeping" className="kid-float mx-auto size-24" />
      <h1 className="sz-display mt-4 text-[clamp(1.6rem,4vw,2.2rem)]">{title}</h1>
      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 font-bold text-muted-foreground text-sm">
        <Lock className="size-4" /> Ainda não liberado
      </div>
      <p className="mt-4 font-semibold text-base text-muted-foreground">{intro}</p>

      <ul className="mt-5 flex w-full flex-col gap-2 text-left">
        {preview.map((item) => (
          <li key={item.text} className="kids-carta flex items-center gap-3 p-3">
            <span aria-hidden="true" className="text-2xl leading-none">
              {item.emoji}
            </span>
            <span className="font-semibold text-sm">{item.text}</span>
          </li>
        ))}
      </ul>

      {/* Faz parte da Comunidade dos Criadores → pedido ao responsável + botão de assinar. */}
      <div className="kids-carta mt-6 w-full border-primary/30! p-4 text-center">
        <p className="font-bold">{title} faz parte da Comunidade dos Criadores! 🎉</p>
        <p className="mt-1 text-muted-foreground text-sm">
          Quem é da Comunidade dos Criadores tem isso e tudo o mais liberado pra criar à vontade.
        </p>
        <p className="mt-4 text-sm">
          Peça para o seu pai, a sua mãe ou um responsável clicar no botão abaixo e te inscrever na
          Comunidade dos Criadores. 💙
        </p>
        <a
          href={COMUNIDADE_OFERTA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 font-bold text-primary-foreground"
        >
          Entrar na Comunidade dos Criadores
        </a>
        <p className="mt-3 font-semibold text-muted-foreground text-sm">
          Assim que você entrar, fica tudo liberado pra você! ✨
        </p>
      </div>
    </KidsBand>
  )
}
