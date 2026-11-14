/**
 * Leitura da biblioteca do avatar no repositório privado da arte (`informach/artes-3d`).
 *
 * ⚠️ Só LÊ, e só o que está no git (por padrão `origin/main`, onde entra apenas o que a coordenação
 * aprovou). Nunca olha a pasta de trabalho de lá: outra sessão está sempre criando peças, e o que
 * ainda não foi aprovado não pode aparecer aqui. A cópia local pode estar atrasada, então antes de
 * ler ele traz do remoto (`git fetch`): isso só atualiza as referências `origin/*`, sem tocar na
 * pasta de trabalho nem nas branches de lá.
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

export const PASTA_DA_ARTE = 'biblioteca_aventura/avatar'
export const REF_PADRAO = 'origin/main'

/** Pastas da biblioteca que não são categorias de peça. */
const FORA_DAS_CATEGORIAS = new Set(['pagina', 'esqueleto'])

export interface ItemDaArte {
  id: string
  rotulo: string
  /** A pasta da categoria (`cabelos`, `roupas_cima`…). */
  pasta: string
  slot: string
  grupo: string | null
  arquivo: string
  miniatura: string
  tris: number
  materiais: string[]
  original?: string
  pacote?: boolean
  genero?: string
  conjunto?: string
  expressao?: string
  cor_amostra?: string
  orelhas?: string
  fantasia?: string
  rascunho?: boolean
  festa?: string
  premio_da_festa?: boolean
  /** A caixa da peça na pose de descanso (metros, Y para cima). */
  caixa?: { min: [number, number, number]; max: [number, number, number] }
}

interface FantasiaDaArte {
  id: string
  rotulo: string
  pecas: { slot: string; peca: string }[]
}

export interface RegrasDaArte {
  slots: { slot: string; rotulo: string; obrigatorio: boolean; grupos: string[] }[]
  grupos: Record<string, { rotulo: string; pecas: string[] }>
  fantasias: FantasiaDaArte[]
  exclusoes: { fantasia_desliga: string[] }
  sorteio: {
    passos: {
      grupo: string
      probabilidade: number
      compativeis: string[] | null
      libera?: string
      chance_libera?: number
      libera_se_nao_ligado?: string[]
    }[]
  }
  orelhas_por_corpo: Record<string, string>
  rostos: {
    conjuntos: Record<string, Record<string, string>>
    expressoes: Record<string, { rotulo: string }>
  }
  padrao: { pecas: Record<string, string> }
  fora_do_sorteio?: string[]
  /** Peça do pack → a peça nossa que entra no lugar dela. */
  substituicoes?: { pares: Record<string, string> }
  nao_combina?: { pares: Record<string, string[]> }
  festas?: Record<string, { rotulo: string; premio: string; pecas_do_tema: string[] } | string>
}

export interface EsqueletoDaArte {
  id: string
  arquivo: string
  ossos: number
  /** Cada osso na pose de descanso: nome, pai e onde começa (metros, Y para cima, frente +Z). */
  lista_ossos: { nome: string; pai: string | null; cabeca: [number, number, number] }[]
  /** Encaixe → osso (`mao_direita` → `RightHandProp`). */
  pontos_de_segurar: Record<string, string>
  animacoes: { id: string; duracao_s: number; laco: boolean; maos_livres?: boolean }[]
}

/** Onde está o repositório da arte nesta máquina (`ARTES_3D_DIR`, ou a pasta irmã `artes-3d`). */
export function repositorioDaArte(): string {
  const pasta = process.env.ARTES_3D_DIR ?? resolve(import.meta.dirname, '../../../artes-3d')
  if (!existsSync(resolve(pasta, '.git')))
    throw new Error(`Repositório da arte não encontrado em ${pasta}. Defina ARTES_3D_DIR.`)
  return pasta
}

function git(args: readonly string[]): Buffer {
  const saida = spawnSync('git', ['-C', repositorioDaArte(), ...args], {
    maxBuffer: 256 * 1024 * 1024,
  })
  if (saida.status !== 0)
    throw new Error(`git ${args.join(' ')} falhou: ${saida.stderr.toString('utf8').trim()}`)
  return saida.stdout
}

/** Traz do remoto o que há de novo na arte (só as referências `origin/*`). */
export function buscarDaArte(): void {
  git(['fetch', '--quiet', 'origin'])
}

export class Arte {
  readonly commit: string
  /** Caminho (a partir da pasta do avatar) → id do blob no git. */
  readonly arvore: Map<string, string>

  constructor(readonly ref: string = REF_PADRAO) {
    this.commit = git(['rev-parse', `${ref}^{commit}`])
      .toString('utf8')
      .trim()
    this.arvore = new Map()
    const linhas = git(['ls-tree', '-r', '-z', this.commit, '--', PASTA_DA_ARTE]).toString('utf8')
    for (const linha of linhas.split('\0')) {
      const [meta, caminho] = linha.split('\t')
      const blob = meta?.split(' ')[2]
      if (blob && caminho) this.arvore.set(caminho.slice(PASTA_DA_ARTE.length + 1), blob)
    }
    if (this.arvore.size === 0) throw new Error(`Nada em ${PASTA_DA_ARTE} no ${ref}.`)
  }

  blob(caminho: string): string {
    const blob = this.arvore.get(caminho)
    if (!blob) throw new Error(`A arte não tem ${caminho} no ${this.ref}.`)
    return blob
  }

  ler(caminho: string): Uint8Array {
    return new Uint8Array(git(['cat-file', 'blob', this.blob(caminho)]))
  }

  json<T>(caminho: string): T {
    return JSON.parse(new TextDecoder().decode(this.ler(caminho))) as T
  }

  /** Dia do commit lido (AAAA-MM-DD). */
  data(): string {
    return git(['show', '-s', '--format=%cs', this.commit]).toString('utf8').trim()
  }

  regras(): RegrasDaArte {
    return this.json<RegrasDaArte>('regras.json')
  }

  esqueleto(): EsqueletoDaArte {
    const item = this.json<{ itens: EsqueletoDaArte[] }>('esqueleto/catalogo.json').itens[0]
    if (!item) throw new Error('A arte não tem o esqueleto.')
    return item
  }

  /** Todas as peças aprovadas, com a pasta de cada uma. */
  pecas(): ItemDaArte[] {
    const pastas = new Set<string>()
    for (const caminho of this.arvore.keys()) {
      const [pasta, arquivo] = caminho.split('/')
      if (pasta && arquivo === 'catalogo.json' && !FORA_DAS_CATEGORIAS.has(pasta)) pastas.add(pasta)
    }
    return [...pastas]
      .sort()
      .flatMap((pasta) =>
        this.json<{ itens: Omit<ItemDaArte, 'pasta'>[] }>(`${pasta}/catalogo.json`).itens.map(
          (item) => ({ ...item, pasta }),
        ),
      )
  }
}
