import type { CreativeToolId } from '@sistemazero/core/career'

/**
 * Cor de ASSINATURA de cada oficina (redesenho 09/2026).
 *
 * Até aqui as quatro herdavam o mesmo azul do chrome compartilhado, e a criança
 * não tinha como reconhecer a oficina antes de ler o nome — no card, na galeria e
 * no atalho do menu tudo era azul. Cada uma passa a ter a sua, como na referência.
 *
 * ⚠️ São DUAS cores por oficina, e as duas são obrigatórias. `fundo` é cor de
 * FUNDO: medido, com texto branco pequeno as quatro ficam entre 3,68 e 4,23:1 e
 * reprovam AA — servem para o cabeçalho do card com ÍCONE branco (não-texto, régua
 * 3:1, que todas passam) e nunca para tinta miúda. `tinta` é o mesmo matiz
 * escurecido até passar sobre branco E sobre o creme das faixas (5,1 a 5,7:1), e é
 * o que se usa quando a cor precisa virar TEXTO.
 *
 * Os valores vivem no CSS (`--tool-*` em globals.css) porque precisam de par no
 * tema escuro; aqui ficam só os nomes das variáveis.
 */
export interface ToolSignature {
  fundo: string
  tinta: string
}

export const TOOL_SIGNATURE: Record<CreativeToolId, ToolSignature> = {
  // O Estúdio fica com o AZUL da marca: é a ferramenta principal e a única que
  // aparece dentro da aula, então trocar a cor dela seria trocar a cor do produto.
  'estudio-completo': { fundo: 'var(--tool-estudio)', tinta: 'var(--tool-estudio-texto)' },
  pinta: { fundo: 'var(--tool-pinta)', tinta: 'var(--tool-pinta-texto)' },
  pensa: { fundo: 'var(--tool-pensa)', tinta: 'var(--tool-pensa-texto)' },
  molda: { fundo: 'var(--tool-molda)', tinta: 'var(--tool-molda-texto)' },
}

/** Oficina desconhecida (id novo antes do deploy daqui) → a cor da marca. */
export function toolSignature(id: string): ToolSignature {
  return (
    (TOOL_SIGNATURE as Record<string, ToolSignature | undefined>)[id] ??
    TOOL_SIGNATURE['estudio-completo']
  )
}
