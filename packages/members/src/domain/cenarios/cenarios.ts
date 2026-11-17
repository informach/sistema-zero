import type { DocumentoDeCenario } from '@sistemazero/molda-cenarios-core/v2'

/**
 * Molda Cenários: os dados da oficina de cenários 3D.
 *
 *   Espaço (a conta, ou o da equipe) → Bibliotecas → Modelos
 *                                    → Mundos → Cenários (com o registro de lotes)
 *
 * O dono é sempre o ESPAÇO. O espaço da conta é da conta do responsável (no Kids, as crianças
 * da família compartilham as bibliotecas); o da equipe é de quem trabalha no Sistema Zero e
 * guarda o acervo licenciado, que nunca aparece para outra conta.
 */

export const LICENCAS = ['livre', 'propria', 'restrita'] as const
export type Licenca = (typeof LICENCAS)[number]

export const TIPOS_DE_ESPACO = ['conta', 'equipe'] as const
export type TipoDeEspaco = (typeof TIPOS_DE_ESPACO)[number]

/** O que guarda cada arquivo: o `.glb` do modelo, o retrato dele ou a capa de um cenário. */
export const TIPOS_DE_BLOB = ['modelo', 'miniatura', 'capa', 'textura'] as const
export type TipoDeBlob = (typeof TIPOS_DE_BLOB)[number]
export const TIPOS_DE_CONTEUDO = ['model/gltf-binary', 'image/webp', 'image/png'] as const
export type TipoDeConteudo = (typeof TIPOS_DE_CONTEUDO)[number]
export interface ConferenciaDeBlob {
  digest: string
  bytes: number
  tipoDoConteudo: TipoDeConteudo
}
export const ehImagemDeCenario = (tipo: TipoDeBlob) => tipo !== 'modelo'
/** A mesma imagem pode servir ao retrato de um modelo e à capa de um cenário. */
export const tiposDeBlobCompativeis = (a: TipoDeBlob, b: TipoDeBlob) =>
  a === b || (ehImagemDeCenario(a) && ehImagemDeCenario(b))

export const LIMITES_DOS_CENARIOS = {
  /** Espaço de uma conta: 2 GB. Separado do 1 GB das criações do perfil. */
  bytesDaConta: 2 * 1024 ** 3,
  /** Espaço da equipe: 20 GB (o acervo licenciado passa de 800 MB). */
  bytesDaEquipe: 20 * 1024 ** 3,
  bibliotecasPorEspaco: 200,
  modelosPorBiblioteca: 5000,
  texturasPorBiblioteca: 2000,
  mundosPorEspaco: 500,
  cenariosPorMundo: 200,
  modeloBytes: 64 * 1024 * 1024,
  miniaturaBytes: 256 * 1024,
  capaBytes: 512 * 1024,
  texturaBytes: 4 * 1024 * 1024,
  /** Arquivos reservados por chamada: o gateway limita os pedidos por minuto. */
  reservaPorChamada: 50,
  paginaDeModelos: 200,
  /** Passado este prazo, uma reserva que nunca foi confirmada deixa de contar na cota. */
  reservaVenceMs: 60 * 60 * 1000,
} as const

export const TIPO_DO_CONTEUDO: Record<TipoDeBlob, TipoDeConteudo> = {
  modelo: 'model/gltf-binary',
  miniatura: 'image/webp',
  capa: 'image/webp',
  textura: 'image/webp',
}
export const TETO_DO_BLOB: Record<TipoDeBlob, number> = {
  modelo: LIMITES_DOS_CENARIOS.modeloBytes,
  miniatura: LIMITES_DOS_CENARIOS.miniaturaBytes,
  capa: LIMITES_DOS_CENARIOS.capaBytes,
  textura: LIMITES_DOS_CENARIOS.texturaBytes,
}

/**
 * Onde o arquivo mora no bucket. Por conteúdo e DENTRO do espaço: o mesmo modelo em duas contas
 * são dois objetos, de propósito (privacidade, exclusão de conta e licença não se misturam).
 */
export function chaveDoBlob(espacoId: string, digest: string): string {
  return `cenarios/${espacoId}/blobs/${digest}`
}
/**
 * Prefixo de tudo o que um espaço guarda. O espaço da conta tem o id da própria conta, então a
 * exclusão de conta apaga `cenarios/<conta>/` sem consultar nada (ver `PurgeUserDataService`).
 */
export function prefixoDoEspaco(espacoId: string): string {
  return `cenarios/${espacoId}/`
}

/** Texto de busca: sem acento, minúsculo, só o que ajuda a achar o modelo. */
export function normalizarBusca(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}
export function buscaDoModelo(m: { nome: string; pasta: string; etiquetas: readonly string[] }) {
  return normalizarBusca(`${m.nome} ${m.pasta} ${m.etiquetas.join(' ')}`).slice(0, 600)
}

export interface Espaco {
  id: string
  tipo: TipoDeEspaco
  /** A conta dona; nulo no espaço da equipe. */
  contaId: string | null
  usadoBytes: number
  limiteBytes: number
}

export interface Biblioteca {
  id: string
  espacoId: string
  nome: string
  fonte?: string | null
  descricao?: string
  capaModelo?: string | null
  licenca: Licenca
  modelos: number
  texturas: number
  /** Digest do retrato que serve de capa (o do primeiro modelo). */
  capa: string | null
  atualizadaEm: Date
}

export interface Modelo {
  id: string
  bibliotecaId: string
  nome: string
  pasta: string
  etiquetas: string[]
  digest: string
  bytes: number
  triangulos: number
  min: [number, number, number]
  max: [number, number, number]
  miniatura: string | null
}

/** Uma imagem de chão da mesma biblioteca e cota dos modelos, com escala física de repetição. */
export interface Textura {
  id: string
  bibliotecaId: string
  nome: string
  pasta: string
  etiquetas: string[]
  digest: string
  bytes: number
  largura: number
  altura: number
  repeticaoMetros: number
}

export interface ConferenciaDeTextura extends ConferenciaDeBlob {
  largura: number
  altura: number
}

export interface Mundo {
  id: string
  espacoId: string
  nome: string
  cenarios: number
  bibliotecas: string[]
  capa: string | null
  criadoPor: string
  atualizadoEm: Date
}

export interface ResumoDeCenario {
  id: string
  mundoId: string
  nome: string
  revisao: number
  capa: string | null
  atualizadoEm: Date
}

export interface Cenario extends ResumoDeCenario {
  documento: DocumentoDeCenario
}

/** Quem está pedindo, como o gateway informou. */
export interface Ator {
  /** O perfil da criança no Kids; a própria conta no adulto. */
  usuarioId: string
  /** A conta do responsável (igual ao usuário no adulto). */
  contaId: string
  /** Equipe do Sistema Zero (superadmin, admin ou staff). */
  equipe: boolean
  /** Sessão de suporte: alguém da equipe olhando a conta de outra pessoa. */
  suporte: boolean
}

export const MODOS_DOS_CENARIOS = ['desligado', 'equipe', 'lista', 'aberto'] as const
export type ModoDosCenarios = (typeof MODOS_DOS_CENARIOS)[number]

export interface AberturaDosCenarios {
  modo: ModoDosCenarios
  /** Contas liberadas no modo `lista`. */
  lista: ReadonlySet<string>
}

/** A ferramenta está aberta para esta pessoa? A equipe entra em qualquer modo, menos desligado. */
export function podeUsarCenarios(abertura: AberturaDosCenarios, ator: Ator): boolean {
  if (abertura.modo === 'desligado') return false
  if (abertura.modo === 'aberto') return true
  if (ator.equipe && !ator.suporte) return true
  return abertura.modo === 'lista' && abertura.lista.has(ator.contaId.toLowerCase())
}

/** Este ator pode mexer neste espaço? */
export function podeNoEspaco(espaco: Espaco, ator: Ator): boolean {
  if (espaco.tipo === 'equipe') return ator.equipe && !ator.suporte
  return espaco.contaId === ator.contaId
}
