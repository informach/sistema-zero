import { Lock } from 'lucide-react'
import { KidsMascot } from './mascot'

/** URL pública da oferta de assinatura da Comunidade dos Criadores (funil kids). */
const COMUNIDADE_OFERTA_URL = 'https://sistemazero.com.br/kids/comunidade-dos-criadores/oferta'

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
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-12 text-center">
      <KidsMascot expression="thinking" className="mx-auto size-24" />
      <h1 className="mt-4 [font-family:var(--font-display)] font-bold text-2xl">{title}</h1>
      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 font-bold text-muted-foreground text-sm">
        <Lock className="size-4" /> Ainda não liberado
      </div>
      <p className="mt-4 text-muted-foreground">{intro}</p>

      <ul className="mt-5 flex w-full flex-col gap-2 text-left">
        {preview.map((item) => (
          <li
            key={item.text}
            className="flex items-center gap-3 rounded-2xl border-2 border-border bg-card p-3"
          >
            <span aria-hidden="true" className="text-2xl leading-none">
              {item.emoji}
            </span>
            <span className="font-medium text-sm">{item.text}</span>
          </li>
        ))}
      </ul>

      {/* Faz parte da Comunidade dos Criadores → pedido ao responsável + botão de assinar. */}
      <div className="mt-6 w-full rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 text-center">
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
        <p className="mt-3 text-muted-foreground text-sm">
          Assim que você entrar, fica tudo liberado pra você! ✨
        </p>
      </div>
    </div>
  )
}
