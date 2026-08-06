import type { JSX } from 'react'

/**
 * ⚠️ ESTE ARQUIVO É O CONTRATO da espera dos apps embarcados (Pensa, Pinta,
 * Estúdio). Mexeu na moldura de um client? Mexa AQUI — nunca numa cópia.
 *
 * Por que existe: cada um dos três aparece em DOIS momentos antes do app entrar —
 * o `loading.tsx` da rota (enquanto o Server Component resolve o acesso) e o
 * estado `mod === null` do client (enquanto o pacote é importado). Os dois
 * precisam ser PIXEL-IDÊNTICOS, senão a criança vê duas telas de espera
 * diferentes com o mesmo texto e parece que a página piscou.
 *
 * Foi exatamente o que aconteceu em 08/2026: o card externo saiu dos três
 * clients e ficou nos três `loading.tsx`, que juravam num comentário estar
 * "espelhando a moldura real". Duas fontes da verdade não sobrevivem a um
 * refactor; uma sobrevive.
 *
 * Sem `'use client'` de propósito: é consumido por Server Component
 * (`loading.tsx`) E por Client Component (os três clients).
 */

/**
 * Moldura do Pensa e do Pinta. Sem card (borda/fundo): os embarcados são SEÇÕES
 * da comunidade e o fundo deles já é o `--background` da página. `min-h` +
 * `flex-1` casam com a altura que o `MainContainer` trava para estas rotas.
 */
export const EMBEDDED_APP_FRAME = 'flex min-h-[34rem] w-full flex-1 flex-col overflow-hidden'

/**
 * Moldura do Estúdio — igual à de cima, MENOS o `flex flex-col`.
 *
 * ⚠️ Ela existe separada de propósito: o wrapper do Estúdio sempre foi BLOCO, e
 * os filhos dele (a lista de projetos, o editor, o canvas do Blockly) se
 * dimensionam por `h-full` contando com isso. Transformar em coluna flex é uma
 * mudança de layout que só se prova no browser, e o ganho visual seria zero — o
 * que a criança vê é idêntico nas duas. Uma constante a mais é barato; um canvas
 * que não preenche, não.
 */
export const EMBEDDED_STUDIO_FRAME = 'min-h-[34rem] w-full flex-1 overflow-hidden'

/**
 * O miolo da espera — usado DENTRO da moldura que o client já tem montada.
 * `h-full` + `flex-1` juntos de propósito: preenche tanto na moldura bloco do
 * Estúdio quanto na coluna flex do Pensa/Pinta, sem precisar de variante.
 */
export function EmbeddedAppLoadingBody({ label }: { label: string }): JSX.Element {
  return (
    <div
      aria-busy="true"
      className="grid h-full flex-1 place-items-center text-muted-foreground text-sm"
    >
      {label}
    </div>
  )
}

/** Moldura + miolo: é o corpo inteiro de um `loading.tsx` de rota embarcada. */
export function EmbeddedAppLoading({
  label,
  frame = EMBEDDED_APP_FRAME,
}: {
  label: string
  /** Passe `EMBEDDED_STUDIO_FRAME` na rota do Estúdio (ver acima). */
  frame?: string
}): JSX.Element {
  return (
    <div className={frame}>
      <EmbeddedAppLoadingBody label={label} />
    </div>
  )
}
