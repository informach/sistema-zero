/**
 * As FAMÍLIAS de ferramentas da oficina e as faixas em que elas se liberam.
 *
 * O Molda não conhece carreira. O host (o kids) traduz o posto da criança numa lista de famílias
 * liberadas e passa em `MoldaHostAdapter.toolAccess`; aqui mora só o vocabulário, como dado
 * puro, sem nenhum import, para o host poder ler pelo subpath `@sistemazero/molda/tools` sem
 * trazer React, Three ou IndexedDB junto (`src/assets/purity.test.ts` cobra isso).
 *
 * ⚠️ Os nomes das faixas (`MOLDA_TOOL_BANDS`) são o contrato com o core
 * (`MOLDA_TOOL_BAND_LEVELS`, em `packages/core/src/career/journey.ts`). O kids tem um teste que
 * confere os dois lados. Família nova entra aqui com a faixa dela, e só.
 *
 * ⚠️ Trancar tira a AUTORIA, nunca a leitura: uma criação que já usa uma família trancada abre,
 * reproduz e exporta intacta. O portão só esconde o controle que CRIA ou MUDA aquilo.
 */

export const MOLDA_TOOL_BANDS = ['basic', 'intermediate', 'professional'] as const
export type MoldaToolBandId = (typeof MOLDA_TOOL_BANDS)[number]

/** A aba em que a família mora; `files` é a barra do app. */
export type MoldaToolTab = 'model' | 'paint' | 'animate' | 'files'

export interface MoldaToolFamily {
  id: string
  tab: MoldaToolTab
  band: MoldaToolBandId
  /** Como a família aparece em "Ferramentas que vêm por aí": curto, na língua da criança. */
  label: string
}

export const MOLDA_TOOL_FAMILIES = [
  // ── básico: o que a criança encontra ao abrir o Molda ────────────────────────
  { id: 'model.pieces', tab: 'model', band: 'basic', label: 'Peças, mover, girar e tamanho' },
  { id: 'model.finish', tab: 'model', band: 'basic', label: 'Cor e acabamento da peça' },
  { id: 'model.mirror', tab: 'model', band: 'basic', label: 'Espelho no meio' },
  { id: 'model.reference', tab: 'model', band: 'basic', label: 'Imagem de apoio' },
  { id: 'paint.brush', tab: 'paint', band: 'basic', label: 'Pintar a peça' },
  { id: 'animate.create', tab: 'animate', band: 'basic', label: 'Criar movimentos' },
  { id: 'files.export', tab: 'files', band: 'basic', label: 'Levar a criação' },
  // ── intermediário: Arquiteto(a) de Mundos ────────────────────────────────────
  {
    id: 'model.precise',
    tab: 'model',
    band: 'intermediate',
    label: 'Medidas exatas e ponto de giro',
  },
  {
    id: 'model.mirror-axis',
    tab: 'model',
    band: 'intermediate',
    label: 'Espelho em qualquer direção',
  },
  { id: 'model.locator', tab: 'model', band: 'intermediate', label: 'Pontos de apoio' },
  {
    id: 'model.area-select',
    tab: 'model',
    band: 'intermediate',
    label: 'Escolher por área e com o laço',
  },
  {
    id: 'model.mesh',
    tab: 'model',
    band: 'intermediate',
    label: 'Editar a malha: pontos, linhas e faces',
  },
  { id: 'paint.layers', tab: 'paint', band: 'intermediate', label: 'Camadas de pintura' },
  {
    id: 'paint.shapes',
    tab: 'paint',
    band: 'intermediate',
    label: 'Formas, degradê e carimbo',
  },
  { id: 'paint.sheet', tab: 'paint', band: 'intermediate', label: 'A folha de pintura inteira' },
  { id: 'paint.flipbook', tab: 'paint', band: 'intermediate', label: 'Pintura que se mexe' },
  // ── profissional: Lenda ──────────────────────────────────────────────────────
  {
    id: 'model.mesh-pro',
    tab: 'model',
    band: 'professional',
    label: 'Ferramentas avançadas de malha',
  },
  { id: 'model.skin', tab: 'model', band: 'professional', label: 'Ossos e pesos' },
  { id: 'paint.maps', tab: 'paint', band: 'professional', label: 'Relevo, brilho e metal' },
  { id: 'paint.material', tab: 'paint', band: 'professional', label: 'Materiais avançados' },
  { id: 'paint.uv', tab: 'paint', band: 'professional', label: 'Encaixar a pintura' },
  {
    id: 'animate.pro',
    tab: 'animate',
    band: 'professional',
    label: 'Curvas e articulações',
  },
  {
    id: 'files.interop',
    tab: 'files',
    band: 'professional',
    label: 'Arquivos de outros programas',
  },
] as const satisfies readonly MoldaToolFamily[]

export type MoldaToolFamilyId = (typeof MOLDA_TOOL_FAMILIES)[number]['id']

/**
 * O que o host passa. `allow` é uma lista FECHADA: família fora dela fica trancada, e id que o
 * pacote não conhece é ignorado (host mais novo que o pacote). `upcoming` é o que vem depois,
 * com a frase pronta do host ("Abrem no nível Arquiteto(a) de Mundos"): o pacote nunca monta
 * frase com nome de posto. Sem `upcoming`, restringe sem anunciar.
 */
export interface MoldaToolAccess {
  allow: readonly string[]
  upcoming?: readonly { when: string; families: readonly string[] }[]
}

export interface MoldaUpcomingTools {
  when: string
  families: readonly MoldaToolFamily[]
}

export interface MoldaToolAccessReader {
  /** A família está liberada para a criança criar e mudar. */
  can(id: MoldaToolFamilyId): boolean
  /** Existe alguma trava (o host mandou uma lista). */
  restricted: boolean
  /** O que vem depois NAQUELA aba, na ordem do host; grupos vazios somem. */
  upcoming(tab: MoldaToolTab): MoldaUpcomingTools[]
}

const FAMILY_BY_ID: ReadonlyMap<string, MoldaToolFamily> = new Map(
  MOLDA_TOOL_FAMILIES.map((family) => [family.id, family]),
)

/** Ausente = tudo liberado: é o que o playground, os testes e outros hosts precisam. */
export function readMoldaToolAccess(access: MoldaToolAccess | undefined): MoldaToolAccessReader {
  if (!access) return { can: () => true, restricted: false, upcoming: () => [] }
  const allowed = new Set(access.allow)
  const groups = (access.upcoming ?? []).map((group) => ({
    when: group.when,
    families: group.families.flatMap((id) => {
      const family = FAMILY_BY_ID.get(id)
      return family && !allowed.has(family.id) ? [family] : []
    }),
  }))
  return {
    can: (id) => allowed.has(id),
    restricted: true,
    upcoming: (tab) =>
      groups
        .map((group) => ({
          when: group.when,
          families: group.families.filter((family) => family.tab === tab),
        }))
        .filter((group) => group.families.length > 0),
  }
}

/** As famílias das faixas pedidas, na ordem do catálogo. É assim que o host monta o `allow`. */
export function moldaToolFamilyIds(bands: readonly MoldaToolBandId[]): MoldaToolFamilyId[] {
  const wanted = new Set(bands)
  return MOLDA_TOOL_FAMILIES.filter((family) => wanted.has(family.band)).map((family) => family.id)
}
