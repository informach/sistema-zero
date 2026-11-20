import { LIMITES_DA_EXPORTACAO } from '@sistemazero/molda-cenarios-core/compilar'
import {
  MAX_BYTES_DO_MANIFESTO,
  MIME_DO_MANIFESTO,
} from '@sistemazero/molda-cenarios-core/publicacao'
import {
  type DocumentoDeCenario,
  type FragmentoBasico,
  MAX_BYTES_DE_TEXTURA_CENARIO,
  MAX_BYTES_RECURSO_TERRENO,
  type MetadadosDeTerreno,
} from '@sistemazero/molda-cenarios-core/v2'

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
export const TIPOS_DE_BLOB = [
  'modelo',
  'miniatura',
  'capa',
  'textura',
  'terreno',
  'manifesto-compilado',
  'recurso-compilado',
] as const
export type TipoDeBlob = (typeof TIPOS_DE_BLOB)[number]
export const TIPOS_DE_CONTEUDO = [
  'model/gltf-binary',
  'image/webp',
  'image/png',
  'application/octet-stream',
  MIME_DO_MANIFESTO,
] as const
export type TipoDeConteudo = (typeof TIPOS_DE_CONTEUDO)[number]
export interface ConferenciaDeBlob {
  digest: string
  bytes: number
  tipoDoConteudo: TipoDeConteudo
  terreno?: MetadadosDeTerreno
}
export const ehImagemDeCenario = (tipo: TipoDeBlob) =>
  tipo === 'miniatura' || tipo === 'capa' || tipo === 'textura'
/** A mesma imagem pode servir ao retrato de um modelo e à capa de um cenário. */
export const tiposDeBlobCompativeis = (a: TipoDeBlob, b: TipoDeBlob) =>
  a === b ||
  (ehImagemDeCenario(a) && ehImagemDeCenario(b)) ||
  (a === 'recurso-compilado' && (b === 'modelo' || ehImagemDeCenario(b))) ||
  (b === 'recurso-compilado' && (a === 'modelo' || ehImagemDeCenario(a)))

export const LIMITES_DOS_CENARIOS = {
  /** Espaço de uma conta: 2 GB. Separado do 1 GB das criações do perfil. */
  bytesDaConta: 2 * 1024 ** 3,
  /** Espaço da equipe: 20 GB (o acervo licenciado passa de 800 MB). */
  bytesDaEquipe: 20 * 1024 ** 3,
  /** Quanto tempo um arquivo sem dono pode ficar "saindo" antes de a reserva voltar a valer
   * sozinha (a limpeza do BFF normalmente confirma em menos de um segundo). */
  saidaDoArquivoMs: 10 * 60_000,
  bibliotecasPorEspaco: 200,
  modelosPorBiblioteca: 5000,
  texturasPorBiblioteca: 2000,
  conjuntosPorBiblioteca: 1000,
  versoesPorConjunto: 1000,
  mundosPorEspaco: 500,
  cenariosPorMundo: 200,
  modeloBytes: 64 * 1024 * 1024,
  miniaturaBytes: 256 * 1024,
  capaBytes: 512 * 1024,
  texturaBytes: MAX_BYTES_DE_TEXTURA_CENARIO,
  terrenoBytes: MAX_BYTES_RECURSO_TERRENO,
  manifestoCompiladoBytes: MAX_BYTES_DO_MANIFESTO,
  recursoCompiladoBytes: LIMITES_DA_EXPORTACAO.bytesDoPacote,
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
  terreno: 'application/octet-stream',
  'manifesto-compilado': MIME_DO_MANIFESTO,
  'recurso-compilado': 'application/octet-stream',
}
export const TETO_DO_BLOB: Record<TipoDeBlob, number> = {
  modelo: LIMITES_DOS_CENARIOS.modeloBytes,
  miniatura: LIMITES_DOS_CENARIOS.miniaturaBytes,
  capa: LIMITES_DOS_CENARIOS.capaBytes,
  textura: LIMITES_DOS_CENARIOS.texturaBytes,
  terreno: LIMITES_DOS_CENARIOS.terrenoBytes,
  'manifesto-compilado': LIMITES_DOS_CENARIOS.manifestoCompiladoBytes,
  'recurso-compilado': LIMITES_DOS_CENARIOS.recursoCompiladoBytes,
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

/** Composição reutilizável da biblioteca; a revisão aponta para conteúdo imutável. */
export interface Conjunto {
  id: string
  bibliotecaId: string
  nome: string
  pasta: string
  etiquetas: string[]
  revisao: number
  cenarioDeEdicaoId: string | null
  revisaoPublicadaDoCenario: number | null
  miniatura: string | null
  bytes: number
  objetos: number
  atualizadoEm: Date
}

export interface VersaoDeConjunto {
  conjuntoId: string
  revisao: number
  nome: string
  conteudo: FragmentoBasico
  miniatura: string | null
  bytes: number
  objetos: number
  autorId: string
  criadoEm: Date
}

export interface Mundo {
  id: string
  espacoId: string
  bibliotecaConjuntosId?: string | null
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
  /** Sessão de um perfil (a criança no Kids). Ausente em pedido antigo: vale a comparação
   * entre o usuário e a conta. */
  perfil?: boolean
}

export const MODOS_DOS_CENARIOS = ['desligado', 'equipe', 'lista', 'aberto'] as const
export type ModoDosCenarios = (typeof MODOS_DOS_CENARIOS)[number]

export interface AberturaDosCenarios {
  modo: ModoDosCenarios
  /** Contas liberadas no modo `lista`. */
  lista: ReadonlySet<string>
  /**
   * Nos modos `lista` e `aberto`, quem não é da equipe precisa também do Molda: o produto da
   * conta e a ferramenta liberada na jornada de quem pede (no Kids, a do perfil da criança). Sem
   * esta conferência, a ferramenta fica só para a equipe.
   */
  produto?: (ator: Ator) => Promise<boolean>
  /**
   * As faixas de ferramentas da oficina (`FAIXAS_DA_OFICINA`) de quem não é da equipe: a mesma
   * régua das faixas do Molda. Sem esta conferência, só o básico. A equipe tem todas.
   */
  faixas?: (ator: Ator) => Promise<readonly string[]>
  /** A cota de cada conta em bytes (padrão: `LIMITES_DOS_CENARIOS.bytesDaConta`). Vale também
   * para os espaços que já existem: a cota guardada é trocada no próximo uso. */
  cotaDaContaBytes?: number
}

/** O modo admite esta pessoa? A equipe entra em qualquer modo, menos desligado. O produto Molda
 * de quem não é da equipe é conferido à parte (`AberturaDosCenarios.produto`). */
export function podeUsarCenarios(abertura: AberturaDosCenarios, ator: Ator): boolean {
  if (abertura.modo === 'desligado') return false
  if (abertura.modo === 'aberto') return true
  if (ator.equipe && !ator.suporte) return true
  return abertura.modo === 'lista' && abertura.lista.has(ator.contaId.toLowerCase())
}

/**
 * A equipe na PRÓPRIA conta, fora de um perfil de criança: só ela vê o espaço da equipe, o
 * acervo licenciado ("só para a gente") e publica no jogo. O papel da conta também vale numa
 * sessão de perfil do Kids (é como a equipe testa a interface), mas o perfil pode ser de um filho
 * de quem é da equipe: lá a ferramenta abre só com o espaço da família.
 */
export function equipeNaPropriaConta(ator: Ator): boolean {
  const perfil = ator.perfil ?? ator.usuarioId !== ator.contaId
  return ator.equipe && !ator.suporte && !perfil
}

/**
 * No Kids, cada criança tem os PRÓPRIOS mundos (os que o perfil dela criou); as bibliotecas, e
 * os rascunhos de conjunto delas, seguem da família. Fora de uma sessão de perfil (o adulto, a
 * equipe na própria conta) a conta vê todos. O espaço já foi conferido por `podeNoEspaco`.
 */
export function podeNoMundo(mundo: Mundo, espaco: Espaco, ator: Ator): boolean {
  if (espaco.tipo !== 'conta' || mundo.bibliotecaConjuntosId) return true
  const perfil = ator.perfil ?? ator.usuarioId !== ator.contaId
  return !perfil || mundo.criadoPor === ator.usuarioId
}

/** Este ator pode mexer neste espaço? */
export function podeNoEspaco(espaco: Espaco, ator: Ator): boolean {
  if (espaco.tipo === 'equipe') return equipeNaPropriaConta(ator)
  return espaco.contaId === ator.contaId
}
