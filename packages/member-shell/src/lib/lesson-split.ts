import { isPublicInteractiveBlock } from '@sistemazero/core/learning'
import { isSceneActivity, sceneActivityForReading } from '@sistemazero/core/learning/scene'

/**
 * A régua do lado a lado da aula (o conteúdo à esquerda, a ferramenta à direita).
 *
 * Duas perguntas moram aqui: QUEM vai para cada coluna (`partirSecao`, no fim do arquivo) e se
 * a divisória vale a pena NESTA largura (`resolveLessonSplit`).
 *
 * Mora fora do componente porque é ela que a dona sente na mão: com os números
 * antigos (ferramenta com piso de 640px) o vídeo ficava preso em "largura da coluna
 * menos 640", e numa coluna de 1108px a divisória andava 104px — "consigo diminuir
 * um pouco, mas bem limitado". Conta solta no meio do render é conta que ninguém
 * mede; aqui ela tem teste que morde.
 */

/** Piso do ARRASTO: até onde a criança pode espremer o lado do conteúdo. */
export const CONTENT_MIN_WIDTH_PX = 320

/**
 * Piso do ARRASTO do lado da ferramenta.
 *
 * ⚠️ NÃO é requisito do editor: o `@sistemazero/studio` vira abas por dentro abaixo
 * de 1024px de largura PRÓPRIA (`STUDIO_NARROW_MAX_PX`), ou seja ele já abria em
 * abas com os 640px antigos — o número era editorial, não técnico. Quem quer o
 * editor grande usa o "Expandir", que cobre a tela inteira.
 */
export const TOOL_MIN_WIDTH_PX = 380

/** Largura do handle antes de o CSS do app ser medido (SSR e 1º render). */
export const SPLIT_HANDLE_WIDTH_PX = 24

/**
 * Coluna a partir da qual o lado a lado LIGA.
 *
 * ⚠️ DELIBERADAMENTE maior que a soma dos pisos (320 + 380 + 44 = 744): divisória
 * que mal anda é pior que divisória nenhuma. Enquanto o limiar era a própria soma,
 * uma coluna de 1010px mostrava a alça com curso de arrasto quase zero — o que lê
 * como "às vezes funciona, às vezes não". Com 1080 ela nasce sempre com ~336px de
 * curso. Abaixo disso a aula empilha e oferece "Ver exemplo"/"Criar", que é a
 * resposta honesta para uma coluna estreita.
 */
export const SPLIT_COMFORT_WIDTH_PX = 1080

/**
 * Com quanto os dois painéis NASCEM, em % (o guardado por perfil vence isto — ver o
 * `autoSaveId` no componente).
 *
 * ⚠️ Mora aqui, e não no componente, porque ele e os PISOS são um par: um padrão
 * fora do intervalo `[piso, 100 − piso do outro]` é clampado pela lib em silêncio, e
 * a aula nasceria num layout que ninguém escolheu. O caso apertado é sempre a coluna
 * no limiar do conforto, e é ele que o teste cobra.
 */
export const SPLIT_DEFAULT_SIZE = 50

export type LessonSplit = {
  /** A divisória existe E arrasta de verdade nesta largura. */
  arrastavel: boolean
  /** Piso do painel de conteúdo, em % do grupo (0 quando empilhado). */
  contentMinimum: number
  /** Piso do painel da ferramenta, em % do grupo (0 quando empilhado). */
  toolMinimum: number
}

export function resolveLessonSplit({
  contentWidth,
  handleWidth,
  hasWorkspace,
}: {
  /** Largura medida da coluna da aula (já sem o menu e a lista de aulas). */
  contentWidth: number
  /** Largura do handle medida no CSS do app (44px no kids, 24px no adulto). */
  handleWidth: number
  /** A seção tem uma ferramenta (Estúdio ou Pinta) ativa. */
  hasWorkspace: boolean
}): LessonSplit {
  const arrastavel = hasWorkspace && contentWidth >= SPLIT_COMFORT_WIDTH_PX
  // Os `Panel` dividem o que sobra depois do handle, então a régua de % é sobre
  // essa sobra — não sobre a coluna inteira.
  const panelWidth = Math.max(1, contentWidth - handleWidth)
  return {
    arrastavel,
    contentMinimum: arrastavel ? (CONTENT_MIN_WIDTH_PX / panelWidth) * 100 : 0,
    toolMinimum: arrastavel ? (TOOL_MIN_WIDTH_PX / panelWidth) * 100 : 0,
  }
}

/**
 * Um bloco da aula, do jeito que a régua precisa dele. `gallery` é contexto da AULA (o mesmo
 * Estúdio é bancada numa seção e entrega noutra), então quem o calcula é o componente.
 */
export type SplitBlock = { id: string; kind: string; content?: unknown; gallery?: boolean }

/** O editor embarcado: Estúdio e Pinta. É o único que fica MONTADO entre as seções. */
export function ehEditorDeSecao(block: SplitBlock): boolean {
  return (block.kind === 'studio' || block.kind === 'pinta') && !block.gallery
}

/**
 * A experimentação em cena.
 *
 * ⚠️ `interactive` NÃO basta: a experiência em HTML também é `interactive` e fica na
 * coluna do CONTEÚDO. A cena é bancada, como o editor.
 */
function ehCenaDeSecao(block: SplitBlock): boolean {
  return (
    block.kind === 'interactive' &&
    isPublicInteractiveBlock(block.content) &&
    // ⚠️ Pela leitura tolerante, como o guarda de cima: uma cena citando meta que saiu do catálogo
    // continua sendo cena, e não cai na coluna do conteúdo.
    isSceneActivity(sceneActivityForReading(block.content.activity))
  )
}

/** Vai para a coluna da DIREITA. */
function ehLadoFerramenta(block: SplitBlock): boolean {
  return ehEditorDeSecao(block) || ehCenaDeSecao(block)
}

export type SecaoPartida = {
  /** Blocos da coluna da esquerda, na ordem da seção. */
  contentIds: string[]
  /** Blocos da coluna da direita, na ordem da seção. */
  toolIds: string[]
  /** Há o que dividir: conteúdo dos DOIS lados. */
  podeDividir: boolean
  /** A direita tem um EDITOR (não só cena) — é o que decide as abas "Ver exemplo"/"Criar". */
  temEditor: boolean
}

/**
 * Onde cada bloco ATIVO da seção mora, e se vale dividir a tela.
 *
 * ⚠️⚠️ `podeDividir` exige conteúdo dos DOIS lados, e isso é o pedido dela: "se forem o único
 * bloco da seção, têm que ocupar a largura toda". Antes a divisão só olhava se havia
 * ferramenta, então uma seção só com o Estúdio abria ao meio com metade da tela VAZIA — e uma
 * seção com `workspaceBlockId` e `blockIds: []` reservava 320px de piso para um painel que não
 * renderiza nada.
 */
export function partirSecao({
  blocks,
  extraContent = false,
}: {
  /** Blocos ATIVOS da seção, na ORDEM, já sem o material de apoio. */
  blocks: SplitBlock[]
  /** A esquerda tem algo que não é bloco (ação da plataforma, atalho da ferramenta). */
  extraContent?: boolean
}): SecaoPartida {
  const toolIds: string[] = []
  const contentIds: string[] = []
  let temEditor = false
  for (const block of blocks) {
    if (!ehLadoFerramenta(block)) {
      contentIds.push(block.id)
      continue
    }
    toolIds.push(block.id)
    if (ehEditorDeSecao(block)) temEditor = true
  }
  return {
    contentIds,
    toolIds,
    podeDividir: toolIds.length > 0 && (contentIds.length > 0 || extraContent),
    temEditor,
  }
}
