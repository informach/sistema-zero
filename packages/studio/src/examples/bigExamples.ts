/**
 * Os exemplos GRANDES da galeria "Ver os jogos prontos" (lote 9 da conclusão do plano do Estúdio,
 * 22/11/2026): entram no grupo do motor deles com nome, descrição e capa, e o jogo inteiro só
 * carrega no clique (`load`).
 *
 * - O jogo D (1,75 milhão de caracteres de materiais) vem num pedaço do próprio pacote, baixado
 *   no clique: no catálogo da extensão, ele viria junto com a lista toda.
 * - O jogo E (20 MB de modelos) não cabe no pacote nem no git: o arquivo mora no R2 do ambiente e
 *   chega por uma rota do host (`exampleFilesBaseUrl`, no mesmo domínio). Sem o endereço, o card
 *   não aparece. O nome do arquivo é o hash do conteúdo, conferido antes de abrir.
 */
import type { ExampleExperience } from '#core'
import type { ExtensionExampleDifficulty } from '#extensions'
import type { SZIRV2 } from '#ir'
import type { ProjectAsset } from '../core/project'
import { JOGO_D_COVER, JOGO_D_RESUMO } from './jogoDResumo'
import { JOGO_E_ARQUIVO, JOGO_E_CAPA } from './jogoEArquivo.generated'

/** Um arquivo de exemplo fora do pacote: `<base>/<caminho>`, com o hash e o tamanho. */
export interface ArquivoDoExemplo {
  caminho: string
  sha256: string
  bytes: number
}

export interface BigExample {
  /** O grupo da galeria em que ele aparece (o motor que ele usa). */
  extensionId: 'game-2d' | 'game-3d'
  name: string
  description: string
  experience: ExampleExperience
  difficulty: ExtensionExampleDifficulty
  concepts: readonly string[]
  genre: string
  /** A imagem do card, tirada do próprio jogo. */
  cover: string
  /** Presente quando o jogo mora fora do pacote: o card só aparece com o endereço do host. */
  arquivo?: ArquivoDoExemplo
  load(exampleFilesBaseUrl?: string): Promise<{ ir: SZIRV2; assets: readonly ProjectAsset[] }>
}

const hex = (bytes: ArrayBuffer) =>
  [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')

/**
 * Baixa o arquivo de um exemplo grande e confere tamanho e hash antes de abrir: um arquivo
 * trocado ou cortado no caminho nunca vira projeto.
 */
export async function carregarArquivoDoExemplo(
  base: string | undefined,
  arquivo: ArquivoDoExemplo,
  fetcher: typeof fetch = fetch,
): Promise<{ ir: SZIRV2; assets: readonly ProjectAsset[] }> {
  if (!base) throw new Error('Este jogo pronto não está disponível aqui.')
  const resposta = await fetcher(`${base.replace(/\/+$/, '')}/${arquivo.caminho}`)
  if (!resposta.ok) throw new Error('Não consegui baixar este jogo pronto. Tente de novo.')
  const bytes = await resposta.arrayBuffer()
  if (
    bytes.byteLength !== arquivo.bytes ||
    hex(await crypto.subtle.digest('SHA-256', bytes)) !== arquivo.sha256
  )
    throw new Error('O arquivo deste jogo pronto chegou diferente. Tente de novo.')
  const dados = JSON.parse(new TextDecoder().decode(bytes)) as {
    ir?: SZIRV2
    assets?: ProjectAsset[]
  }
  if (!dados.ir || !Array.isArray(dados.assets))
    throw new Error('O arquivo deste jogo pronto não é um projeto.')
  // Sem programa o Estúdio abriria um projeto em branco com o nome do jogo (o primeiro arquivo do
  // jogo E saiu assim: o projeto do modo Ponte guarda o programa no código, e a galeria lê a IR).
  if (
    !Object.values(dados.ir.behavior ?? {}).some(
      (lista) => Array.isArray(lista) && lista.length > 0,
    )
  )
    throw new Error('O arquivo deste jogo pronto não tem o programa.')
  return { ir: dados.ir, assets: dados.assets }
}

export const BIG_EXAMPLES: readonly BigExample[] = [
  {
    extensionId: 'game-2d',
    ...JOGO_D_RESUMO,
    cover: JOGO_D_COVER,
    load: async () => {
      const { jogoDExample } = await import('./jogoDExample')
      return { ir: jogoDExample.ir, assets: jogoDExample.assets ?? [] }
    },
  },
  {
    extensionId: 'game-3d',
    name: 'Terra das Seis Regiões',
    experience: 'game',
    description:
      'Um mundo 3D do Molda Cenários com vila, floresta, caverna, lago, praia e montanha. O mundo carrega por regiões enquanto o herói anda; pegue as moedas e veja o placar de cada região.',
    difficulty: 'advanced',
    concepts: ['Molda Cenários', 'regiões', 'cenário 3D', 'moedas', 'placar'],
    genre: 'exploração',
    cover: JOGO_E_CAPA,
    arquivo: JOGO_E_ARQUIVO,
    load: (base) => carregarArquivoDoExemplo(base, JOGO_E_ARQUIVO),
  },
]
