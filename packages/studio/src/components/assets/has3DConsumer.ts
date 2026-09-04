import type { Project } from '#core'

/**
 * Quem CONSOME `.glb`/`.hdr` no projeto. Sem nenhum consumidor, um binário 3D seria
 * peso morto na cota — por isso o upload 3D e o "Adicionar" de modelo/céu do
 * "Trazer do Molda" ficam atrás desta régua (a SEÇÃO de modelos no painel continua
 * sem gate: gerenciar/excluir um órfão nunca depende disso).
 *
 * - As extensões **Jogo 3D** (o kit iniciante, desde os blocos "Criar o objeto … com o
 *   modelo" e "Usar o céu 360°" do lote 7 do Molda, 09/2026), **Jogo 3D Avançado** e
 *   **Mundo 3D**.
 * - A categoria de núcleo **Canvas 3D**, que carrega o modelo por
 *   `loader.load('modelo.glb')`: o sinal é o import do three no código gerado, ou um
 *   bloco `sz_t3d_` no blocksState (projeto novo em Blocos, antes da geração).
 */
export const THREE_D_CONSUMER_EXTENSIONS: ReadonlySet<string> = new Set([
  'game-3d',
  'game-3d-advanced',
  'world-3d',
])

export type ThreeDConsumerProjectLike = Pick<
  Project,
  'installedExtensions' | 'files' | 'blocksState'
>

export function projectHas3DConsumer(
  project: ThreeDConsumerProjectLike | null | undefined,
): boolean {
  if (!project) return false
  if ((project.installedExtensions ?? []).some((e) => THREE_D_CONSUMER_EXTENSIONS.has(e.id))) {
    return true
  }
  const files = project.files as unknown as Record<string, string | undefined> | undefined
  if (/from\s+['"]three(['"]|\/)/.test(files?.['script.js'] ?? '')) return true
  return project.blocksState ? JSON.stringify(project.blocksState).includes('sz_t3d_') : false
}
