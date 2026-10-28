import {
  type ConferenciaDoManifesto,
  FORMATO_DO_MANIFESTO,
  ILHA_IDS,
  ilha,
  type ManifestoDeDesafios,
  ManifestoDeDesafiosSchema,
  type ResumoDoDesafio,
} from '@sistemazero/arquipelago-contracts'

/**
 * O manifesto de desafios no Admin (regras puras): ler o arquivo com erros que dizem onde está o
 * problema, dividir o pacote grande em lotes que cabem no corpo da requisição, juntar as prévias e
 * achar os desafios do cadastro que o arquivo não traz. Quem decide o que cada desafio vira é o
 * serviço do jogo (`POST /manifestos/conferir`); aqui nada é gravado.
 */

/**
 * Um lote: abaixo do teto de 4 MB do gateway, com folga para o envelope, e poucos desafios, porque
 * a conferência roda o gabarito de cada um no executor (cerca de 160 s de prazo por pedido).
 */
export const MANIFEST_LOT_LIMITS = { bytes: 3_500_000, items: 4 } as const

const MAX_ERRORS = 12

export type ParsedManifest =
  | { ok: true; manifest: ManifestoDeDesafios }
  | { ok: false; errors: string[] }

const FIELD_LABELS: Record<string, string> = {
  slug: 'identificador',
  publico: 'público',
  ilha: 'ilha',
  tipo: 'tipo',
  quadro: 'quadro',
  ordem: 'ordem',
  publicar: 'publicar',
  conteudo: 'conteúdo',
  titulo: 'título',
  enunciado: 'enunciado',
  dicas: 'dicas',
  projetoInicial: 'projeto inicial',
  gabarito: 'gabarito',
  objetivos: 'objetivos',
  desafioExtra: 'desafio extra',
  recompensa: 'recompensa',
  blocosManuais: 'blocos manuais',
}

function where(path: readonly PropertyKey[], raw: unknown): string {
  if (path[0] !== 'desafios' || typeof path[1] !== 'number') {
    const field = path.map(String).join('.')
    return field ? `No arquivo (${field})` : 'No arquivo'
  }
  const index = path[1]
  const item = (raw as { desafios?: unknown[] })?.desafios?.[index] as
    | { slug?: unknown }
    | undefined
  const slug = typeof item?.slug === 'string' && item.slug ? ` "${item.slug}"` : ''
  const field = path
    .slice(2)
    .map((p) => (typeof p === 'number' ? `${p + 1}` : (FIELD_LABELS[String(p)] ?? String(p))))
    .join(' › ')
  return `Desafio ${index + 1}${slug}${field ? `, ${field}` : ''}`
}

/** Lê o texto do arquivo (ou colado) e confere com o contrato. */
export function parseChallengeManifest(text: string): ParsedManifest {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, errors: ['O arquivo não é um JSON válido. Confira vírgulas e chaves.'] }
  }
  if ((raw as { formato?: unknown })?.formato !== FORMATO_DO_MANIFESTO)
    return {
      ok: false,
      errors: [
        `Este arquivo não é um manifesto de desafios: falta "formato": "${FORMATO_DO_MANIFESTO}".`,
      ],
    }
  const parsed = ManifestoDeDesafiosSchema.safeParse(raw)
  if (parsed.success) return { ok: true, manifest: parsed.data }
  const errors = parsed.error.issues
    .slice(0, MAX_ERRORS)
    .map((issue) => `${where(issue.path, raw)}: ${issue.message}`)
  if (parsed.error.issues.length > MAX_ERRORS)
    errors.push(`E mais ${parsed.error.issues.length - MAX_ERRORS} problemas.`)
  return { ok: false, errors }
}

const bytesOf = (m: ManifestoDeDesafios) =>
  new TextEncoder().encode(JSON.stringify({ manifesto: m })).length

/**
 * Divide o arquivo em lotes. Os desafios do Quadro das Cores de uma mesma ilha e público vão
 * sempre juntos: um quadro que muda de dono no arquivo precisa do outro desafio no mesmo lote,
 * senão o serviço o veria ocupado. Um grupo maior que o lote vai sozinho (o serviço responde se não
 * couber no corpo).
 */
export function splitManifest(
  manifest: ManifestoDeDesafios,
  limits: { bytes: number; items: number } = MANIFEST_LOT_LIMITS,
): ManifestoDeDesafios[] {
  const groups = new Map<string, ManifestoDeDesafios['desafios']>()
  const units: ManifestoDeDesafios['desafios'][] = []
  for (const d of manifest.desafios) {
    if (d.quadro === null) {
      units.push([d])
      continue
    }
    const key = `${d.publico}:${d.ilha}`
    const group = groups.get(key)
    if (group) group.push(d)
    else {
      const novo = [d]
      groups.set(key, novo)
      units.push(novo)
    }
  }
  const lot = (desafios: ManifestoDeDesafios['desafios']): ManifestoDeDesafios => ({
    ...manifest,
    desafios,
  })
  const lots: ManifestoDeDesafios['desafios'][] = []
  let current: ManifestoDeDesafios['desafios'] = []
  for (const unit of units) {
    const joined = [...current, ...unit]
    if (
      current.length > 0 &&
      (joined.length > limits.items || bytesOf(lot(joined)) > limits.bytes)
    ) {
      lots.push(current)
      current = [...unit]
    } else current = joined
  }
  if (current.length > 0) lots.push(current)
  return lots.map(lot)
}

/** As prévias dos lotes como uma só, na ordem do arquivo. */
export function mergeConferences(parts: readonly ConferenciaDoManifesto[]) {
  const zero = { criar: 0, atualizar: 0, igual: 0, conflito: 0, comProblema: 0, publica: 0 }
  return {
    itens: parts.flatMap((p) => p.itens),
    contagem: parts.reduce(
      (soma, p) => ({
        criar: soma.criar + p.contagem.criar,
        atualizar: soma.atualizar + p.contagem.atualizar,
        igual: soma.igual + p.contagem.igual,
        conflito: soma.conflito + p.contagem.conflito,
        comProblema: soma.comProblema + p.contagem.comProblema,
        publica: soma.publica + p.contagem.publica,
      }),
      zero,
    ),
  }
}

/**
 * O que o arquivo cobre: uma ilha de um público, o jogo inteiro (um público ou os dois) ou nada
 * (escopo "desafio" ou sem escopo, em que só os desafios do arquivo contam).
 */
export function manifestCoverage(manifest: ManifestoDeDesafios) {
  const publicos = [...new Set(manifest.desafios.map((d) => d.publico))]
  const [first] = manifest.desafios
  if (manifest.escopo === 'ilha' && first) return { publicos, ilha: first.ilha }
  if (manifest.escopo === 'jogo') return { publicos, ilha: null }
  return null
}

/**
 * Os desafios do cadastro que o arquivo de uma ilha ou do jogo não traz (fora os arquivados). Eles
 * nunca mudam sozinhos: a equipe pode arquivá-los de propósito depois de aplicar.
 */
export function missingFromManifest(
  manifest: ManifestoDeDesafios,
  rows: readonly ResumoDoDesafio[],
): ResumoDoDesafio[] {
  const coverage = manifestCoverage(manifest)
  if (!coverage) return []
  const slugs = new Set(manifest.desafios.map((d) => d.slug))
  return rows.filter(
    (r) =>
      r.situacao !== 'arquivado' &&
      !slugs.has(r.slug) &&
      coverage.publicos.includes(r.publico) &&
      (coverage.ilha === null || r.ilha === coverage.ilha),
  )
}

const ISLANDS = new Set<string>(ILHA_IDS)

/** O nome do arquivo baixado: o desafio, a ilha ou o jogo. */
export function manifestFileName(manifest: ManifestoDeDesafios): string {
  const [first] = manifest.desafios
  if (manifest.escopo === 'desafio' && first) return `desafio-${first.slug}.json`
  const publicos = [...new Set(manifest.desafios.map((d) => d.publico))]
  const publico = publicos.length === 1 ? publicos[0] : 'kids-e-adulto'
  if (manifest.escopo === 'ilha' && first && ISLANDS.has(first.ilha))
    return `desafios-${publico}-${first.ilha}.json`
  return `desafios-${publico}-jogo.json`
}

/** Como a prévia descreve o escopo do arquivo para a equipe. */
export function manifestScopeLabel(manifest: ManifestoDeDesafios): string {
  const n = manifest.desafios.length
  const conta = `${n} ${n === 1 ? 'desafio' : 'desafios'}`
  const [first] = manifest.desafios
  if (manifest.escopo === 'desafio') return 'Um desafio'
  if (manifest.escopo === 'ilha' && first) return `${ilha(first.ilha).nome}: ${conta}`
  if (manifest.escopo === 'jogo') return `O jogo inteiro: ${conta}`
  return conta
}
