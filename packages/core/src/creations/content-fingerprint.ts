/**
 * Impressão digital do CONTEÚDO de um projeto do Estúdio ou de um desenho do Pinta (10/10/2026).
 *
 * É o que responde "o que a equipe recebeu é o projeto de agora?": o navegador calcula a mesma
 * impressão para o rascunho guardado na conta e para o envio, e o members só compara os dois
 * textos (guarda como texto opaco, nunca recalcula). Por isso a função mora aqui, uma só para os
 * dois lados do navegador.
 *
 * O que entra é o que muda o JOGO ou o DESENHO, nunca o que muda só a vitrine: nome, datas, capa,
 * modo do editor e a posição dos blocos na tela ficam de fora (arrastar um bloco não pede um
 * reenvio). ⚠️ O NOME volta pelos arquivos: o `index.html` gerado leva `<title>` com o nome do
 * projeto, e o editor de blocos regera os arquivos na próxima edição. Renomear e mexer num bloco
 * muda a impressão (reenviar resolve; tirar o título da conta exigiria o `v2`). As imagens da BIBLIOTECA do curso também ficam de fora: o player acrescenta à força
 * as que o projeto inicial ganhou depois (`completeLibraryAssets`), e contá-las marcaria como
 * desatualizado quem não mexeu em nada. Trocar qual imagem aparece muda o `script.js`, e isso conta.
 */

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      const inner = (value as Record<string, unknown>)[key]
      if (inner !== undefined) out[key] = sortKeysDeep(inner)
    }
    return out
  }
  return value
}

/**
 * JSON canônico (chaves ordenadas em profundidade, `undefined` fora): é ISTO que se hasheia e
 * que sobe como parte — nunca o gzip (não é determinístico) nem só um campo (nome/metadados
 * diferentes colidiriam). Estável entre navegadores e entre leituras do IndexedDB.
 *
 * ⚠️ Os hashes das PARTES já guardadas no R2 dependem deste texto byte a byte: mudar a regra
 * faria toda parte conhecida subir de novo (e a descida recusaria as antigas por hash).
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortKeysDeep(value))
}

/** SHA-256 hex de um texto (UTF-8). Assíncrono: o navegador calcula fora da main thread. */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** `v1:` + SHA-256 hex. A versão na frente deixa a régua mudar sem confundir impressões antigas. */
export const CONTENT_FINGERPRINT_PATTERN = /^v1:[a-f0-9]{64}$/

export function isContentFingerprint(value: unknown): value is string {
  return typeof value === 'string' && CONTENT_FINGERPRINT_PATTERN.test(value)
}

/** Sem `crypto.subtle` (contexto inseguro, navegador muito antigo) não há impressão. */
function canHash(): boolean {
  return (
    typeof crypto !== 'undefined' &&
    typeof crypto.subtle?.digest === 'function' &&
    typeof TextEncoder !== 'undefined'
  )
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Imagem da biblioteca do CURSO (não a pessoal, que vem do Pinta como `personal:<id>`). */
function isCourseLibraryAsset(asset: Record<string, unknown>): boolean {
  return (
    asset.source === 'library' &&
    !(typeof asset.libId === 'string' && asset.libId.startsWith('personal:'))
  )
}

/**
 * A impressão de um projeto do Estúdio (o `Project`, lido do disco do navegador). `null` = não
 * dá para calcular aqui (sem `crypto.subtle`, ou não é um projeto): o critério deixa passar.
 */
export async function studioContentFingerprint(project: unknown): Promise<string | null> {
  if (!record(project) || !canHash()) return null
  const assets = Array.isArray(project.assets) ? project.assets.filter(record) : []
  const extensions = Array.isArray(project.installedExtensions)
    ? project.installedExtensions
        .map((extension) => (record(extension) ? extension.id : extension))
        .filter((id): id is string => typeof id === 'string')
        .sort()
    : []
  const own = assets
    .filter((asset) => !isCourseLibraryAsset(asset))
    .map((asset) => canonicalJson(asset))
    .sort()
  const payload = {
    v: 1,
    kind: project.kind === 'pro' ? 'pro' : 'classic',
    files: project.files ?? null,
    extraFiles: project.extraFiles ?? [],
    tree: project.tree ?? null,
    extensions,
    assets: own,
  }
  return `v1:${await sha256Hex(canonicalJson(payload))}`
}

/** Campos do desenho que não são o desenho: quem é e quando foi mexido. */
const PINTA_IDENTITY_FIELDS = new Set(['id', 'name', 'createdAt', 'updatedAt'])

/**
 * A impressão de um desenho do Pinta no formato de transporte (`pintaAssetToWire`). Renomear o
 * desenho não pede reenvio; mudar um pixel, sim.
 */
export async function pintaContentFingerprint(wireAsset: unknown): Promise<string | null> {
  if (!record(wireAsset) || !canHash()) return null
  const content: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(wireAsset)) {
    if (!PINTA_IDENTITY_FIELDS.has(key)) content[key] = value
  }
  return `v1:${await sha256Hex(canonicalJson({ v: 1, pinta: content }))}`
}
