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

/**
 * ⚠️⚠️ O `JSON.stringify` do estado dos blocos é CARO e esta função passou a rodar no
 * caminho quente: desde 18/09/2026 a Topbar a consulta para decidir a porta "Modelos
 * 3D", e a Topbar nunca desmonta — o seletor do zustand reexecuta a cada `set()` da
 * store de projeto, ou seja, a cada TECLA na Ponte e a cada lote de 120 ms do Blockly.
 * Medido no Reino Zero (blocksState de 216 KB): 1,15 ms por chamada, +66% no tempo de
 * cada atualização de um projeto SEM 3D (onde as duas guardas baratas falham e o
 * stringify roda inteiro). Falha MUDA: nada quebra, o editor só fica pesado.
 *
 * O cache é por IDENTIDADE do `blocksState`, e é o que mata o caso pior: digitar no
 * Monaco troca `files`, nunca o `blocksState`, então a resposta vem do WeakMap.
 */
const canvas3DByBlocksState = new WeakMap<object, boolean>()

function blocksStateUsesCanvas3D(blocksState: Project['blocksState']): boolean {
  if (!blocksState || typeof blocksState !== 'object') return false
  const cached = canvas3DByBlocksState.get(blocksState)
  if (cached !== undefined) return cached
  const usa = JSON.stringify(blocksState).includes('sz_t3d_')
  canvas3DByBlocksState.set(blocksState, usa)
  return usa
}

export function projectHas3DConsumer(
  project: ThreeDConsumerProjectLike | null | undefined,
): boolean {
  if (!project) return false
  if ((project.installedExtensions ?? []).some((e) => THREE_D_CONSUMER_EXTENSIONS.has(e.id))) {
    return true
  }
  const files = project.files as unknown as Record<string, string | undefined> | undefined
  if (/from\s+['"]three(['"]|\/)/.test(files?.['script.js'] ?? '')) return true
  return blocksStateUsesCanvas3D(project.blocksState)
}

/**
 * A régua da aba "Modelos 3D" e da porta dela no menu ⋯ — FONTE ÚNICA de propósito.
 * A janela e o menu tinham a mesma conta escrita duas vezes, e divergir produz falha
 * muda nas duas direções: porta sem aba (a janela abriria em "Imagens" pelo fallback)
 * ou aba sem porta. Derivar mata a classe; duplicar deixa caminho esquecido.
 *
 * Três motivos independentes: há quem consuma 3D; o projeto TEM arquivo 3D (um órfão
 * precisa continuar gerenciável); ou o host deu o "Trazer do Molda" — sem o terceiro,
 * a porta do Molda sumiria justo para quem ainda não instalou nada de 3D, inclusive
 * para trazer TEXTURA, que é imagem e entra em qualquer projeto.
 */
export function projectHas3DMaterials(
  project: (ThreeDConsumerProjectLike & Pick<Project, 'assets'>) | null | undefined,
  hasMoldaLibrary: boolean,
): boolean {
  if (hasMoldaLibrary) return true
  if (projectHas3DConsumer(project)) return true
  return (project?.assets ?? []).some(
    (asset) => asset.kind === 'model3d' || asset.kind === 'environment3d',
  )
}
