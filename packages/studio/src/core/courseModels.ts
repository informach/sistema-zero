import { COURSE_MODEL_LOADERS } from './course-models/registry.generated'
import type { ProjectAsset } from './project'

/**
 * Biblioteca de modelos dos cursos.
 *
 * Os modelos 3D de um curso (a Ilha do Farol tem 25, com as variações da personalização) não
 * cabem dentro de cada projeto: o manifesto de uma aula tem teto de 2 MiB e o projeto da
 * criança viaja inteiro para a nuvem. Então o arquivo fica guardado UMA vez aqui, num módulo
 * gerado por modelo (`course-models/m-<sha256>.generated.ts`), e o projeto leva só:
 *
 * - `source: 'library'` + `libId: 'modelo-curso:<sha256 do GLB>'`;
 * - um `dataUrl` com um GLB MÍNIMO válido (`courseModelStub`): sem malha, mas com os nomes das
 *   animações, para o seletor de animação dos blocos funcionar sem baixar o modelo.
 *
 * Quem monta o jogo (prévia, player público, capa, exportação) chama `preloadCourseModels`
 * antes, e o `asset3DManifest` troca o mínimo pelo modelo de verdade. ⚠️ O modelo resolvido
 * NUNCA é gravado no projeto: o que se salva continua sendo a referência.
 */
export const COURSE_MODEL_LIB_PREFIX = 'modelo-curso:'

const SHA = /^[a-f0-9]{64}$/

/** O sha256 do modelo quando o asset é uma referência da biblioteca dos cursos. */
export function courseModelSha(
  asset: Pick<ProjectAsset, 'kind' | 'source' | 'libId'> | null | undefined,
): string | null {
  if (!asset || asset.kind !== 'model3d' || asset.source !== 'library') return null
  const id = asset.libId
  if (typeof id !== 'string' || !id.startsWith(COURSE_MODEL_LIB_PREFIX)) return null
  const sha = id.slice(COURSE_MODEL_LIB_PREFIX.length)
  return SHA.test(sha) ? sha : null
}

export function isCourseModelLibId(libId: unknown): boolean {
  return (
    typeof libId === 'string' &&
    libId.startsWith(COURSE_MODEL_LIB_PREFIX) &&
    SHA.test(libId.slice(COURSE_MODEL_LIB_PREFIX.length))
  )
}

const resolved = new Map<string, string>()
const inFlight = new Map<string, Promise<void>>()

/** O GLB completo já carregado (data URL), ou `undefined`. Síncrono, para o manifesto. */
export function courseModelDataUrl(
  asset: Pick<ProjectAsset, 'kind' | 'source' | 'libId'>,
): string | undefined {
  const sha = courseModelSha(asset)
  return sha ? resolved.get(sha) : undefined
}

/** Referências do projeto que ainda não foram carregadas (e que esta versão conhece). */
export function pendingCourseModels(assets: readonly ProjectAsset[] | null | undefined): string[] {
  if (!assets) return []
  const out: string[] = []
  for (const asset of assets) {
    const sha = courseModelSha(asset)
    if (sha && !resolved.has(sha) && COURSE_MODEL_LOADERS[sha] && !out.includes(sha)) out.push(sha)
  }
  return out
}

function load(sha: string): Promise<void> {
  const running = inFlight.get(sha)
  if (running) return running
  const loader = COURSE_MODEL_LOADERS[sha]
  if (!loader) return Promise.resolve()
  const job = loader()
    .then((mod) => {
      if (typeof mod.default === 'string') resolved.set(sha, mod.default)
    })
    .finally(() => inFlight.delete(sha))
  inFlight.set(sha, job)
  return job
}

/**
 * Carrega os modelos da biblioteca que o projeto usa. Referência desconhecida (projeto feito
 * por um Estúdio mais novo) fica com o GLB mínimo: o jogo roda, sem aquela peça.
 */
export async function preloadCourseModels(
  assets: readonly ProjectAsset[] | null | undefined,
): Promise<void> {
  await Promise.all(pendingCourseModels(assets).map(load))
}

/** Os assets com o GLB completo no lugar das referências (para quem grava arquivos, como o Pro). */
export async function resolveCourseModels(assets: readonly ProjectAsset[]): Promise<ProjectAsset[]> {
  await preloadCourseModels(assets)
  return assets.map((asset) => {
    const dataUrl = courseModelDataUrl(asset)
    return dataUrl ? { ...asset, dataUrl } : asset
  })
}

/** O sha256 conhecido por esta versão do Estúdio (geração e testes). */
export function knownCourseModels(): string[] {
  return Object.keys(COURSE_MODEL_LOADERS)
}

/** Só para testes: esquece o que já foi carregado. */
export function clearCourseModelCacheForTests(): void {
  resolved.clear()
  inFlight.clear()
}

/**
 * O GLB mínimo que mora no projeto no lugar do modelo: um glTF 2.0 válido, sem malha, com os
 * NOMES das animações do modelo (canais vazios) e o sha no `asset.extras`. Passa pela
 * validação de assets (assinatura GLB 2.0) e o `readGlbSummary` lê os clipes dele.
 */
export function courseModelStub(sha: string, clips: readonly string[]): string {
  if (!SHA.test(sha)) throw new Error(`sha256 inválido: ${sha}`)
  const json: Record<string, unknown> = {
    asset: { version: '2.0', generator: 'Sistema Zero', extras: { szModeloCurso: sha } },
    scene: 0,
    scenes: [{ nodes: [] }],
  }
  if (clips.length) json.animations = clips.map((name) => ({ name, channels: [], samplers: [] }))
  let text = JSON.stringify(json)
  while (text.length % 4) text += ' '
  const body = new TextEncoder().encode(text)
  const bytes = new Uint8Array(12 + 8 + body.length)
  const view = new DataView(bytes.buffer)
  view.setUint32(0, 0x46546c67, true) // glTF
  view.setUint32(4, 2, true)
  view.setUint32(8, bytes.length, true)
  view.setUint32(12, body.length, true)
  view.setUint32(16, 0x4e4f534a, true) // JSON
  bytes.set(body, 20)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return `data:model/gltf-binary;base64,${btoa(binary)}`
}
