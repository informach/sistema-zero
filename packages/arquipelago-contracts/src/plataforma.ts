import { z } from 'zod'
import type { AparenciaLida } from './aparencias'
import type { MoldeDeObjeto } from './objetos'
import type { ResultadoDaFerramentaRotina } from './rotina-ferramenta'

/**
 * A PORTA entre o jogo e a plataforma. A página da plataforma que hospeda o jogo monta este
 * objeto e chama `montarArquipelago(elemento, plataforma)`. O jogo não conhece sessão, cookie,
 * rota nem componente da plataforma: só estas funções.
 *
 * Avatar e quarto são os únicos dados divididos: o jogo lê e grava pelos mesmos caminhos da
 * plataforma, então mudou no jogo, muda na plataforma, e ao contrário. As ferramentas de criar
 * (Pinta, Molda, Estúdio) também são as da plataforma: o jogo PEDE para abrir e a página abre a
 * ferramenta de verdade por cima do jogo; melhorou a ferramenta, melhorou no jogo.
 */
export const VERSAO_CONTRATO_PLATAFORMA = 1

/**
 * As versões do contrato que os dois lados aceitam (A35, revisão de 31/10/2026): a atual e a
 * anterior, para o jogo e a plataforma poderem subir em dias diferentes. Ao subir a versão, o lado
 * novo continua aceitando o antigo por uma rodada de implantação; a versão anterior só deixa de
 * valer quando a seguinte chegar. Hoje só existe a 1.
 */
export const VERSOES_COMPATIVEIS_DA_PLATAFORMA: readonly number[] =
  VERSAO_CONTRATO_PLATAFORMA > 1
    ? [VERSAO_CONTRATO_PLATAFORMA, VERSAO_CONTRATO_PLATAFORMA - 1]
    : [VERSAO_CONTRATO_PLATAFORMA]
export function versaoCompativel(versao: unknown): boolean {
  return typeof versao === 'number' && VERSOES_COMPATIVEIS_DA_PLATAFORMA.includes(versao)
}

/**
 * A negociação (A35, lacunas de 01/11/2026): o lado novo entrega ao antigo a porta da versão
 * antiga. Com as duas versões aceitas por este lado, vale a menor delas: um host v2 monta a
 * `Plataforma` v1 para um jogo v1, e um jogo v2 lê a v1 de um host v1. `null` quando a versão
 * do outro lado não é aceita (ele está duas versões atrás, ou na frente).
 */
export function negociarVersao(outroLado: unknown): number | null {
  if (!versaoCompativel(outroLado)) return null
  return Math.min(VERSAO_CONTRATO_PLATAFORMA, outroLado as number)
}

export type PublicoJogo = 'kids' | 'adulto'

export interface PerfilDoJogo {
  id: string
  /** Só o primeiro nome (é o que aparece nas falas do jogo). */
  primeiroNome: string
}

export interface JornadaDoJogo {
  /** 1 a 8: posto no Kids, etapa no adulto (8 = Lenda). */
  posicao: number
}

export interface SlotDoAvatar {
  asset: string
  color?: string
}

export interface AvatarDoJogo {
  slots: Record<string, SlotDoAvatar>
}

/**
 * Espelho do estado do quarto da plataforma (`RoomStateView`), com o que o jogo usa. Objetos
 * soltos (`looseObject`): campos que a plataforma acrescentar depois passam intactos, e o jogo
 * nunca os apaga ao gravar o quarto de volta.
 */
export const ItemDoQuartoSchema = z.looseObject({
  itemId: z.string().min(1).max(80),
  x: z.number().int(),
  y: z.number().int(),
  rot: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional(),
  wall: z.enum(['left', 'right']).optional(),
  on: z.string().optional(),
  slot: z.number().int().optional(),
})
export const QuartoSchema = z.looseObject({
  theme: z.string(),
  placedItems: z.array(ItemDoQuartoSchema).max(200),
  pet: z.string().nullable(),
  wallColors: z.object({ left: z.string().optional(), right: z.string().optional() }).optional(),
  floor: z.string().optional(),
  lighting: z.string().optional(),
})
export type QuartoDoJogo = z.infer<typeof QuartoSchema>

/** Uma chamada ao serviço do jogo, repassada pela plataforma com a sessão de quem joga. */
export interface RespostaDoServico {
  status: number
  corpo: unknown
}
export interface ServicoDoJogo {
  buscar(
    caminho: string,
    opcoes?: {
      metodo?: 'GET' | 'POST' | 'PUT' | 'DELETE'
      corpo?: unknown
      sinal?: AbortSignal
      /** Pede resumo/print da lista. Hosts anteriores ignoram e devolvem a vista sem eles. */
      apresentacaoDosDesafios?: true
    },
  ): Promise<RespostaDoServico>
}

/** Ferramentas da plataforma que o jogo pode pedir para abrir (com o molde do objeto). */
/** `quarto` (§6.28, A10): o editor do Meu Quarto da plataforma; ao fechar, o jogo recebe o quarto. */
export type FerramentaDaPlataforma =
  | 'pinta'
  | 'molda'
  | 'estudio'
  | 'rotina-lumi'
  | 'avatar'
  | 'quarto'
export interface PedidoDeFerramenta {
  ferramenta: FerramentaDaPlataforma
  /** Identifica o que o jogo quer de volta (o objeto, o desafio). */
  proposito: string
  /** Molde, tamanho, projeto inicial: cada ferramenta lê o que entende. */
  molde?: unknown
}
export type ResultadoDeFerramenta =
  | { situacao: 'pronto'; criacaoId: string }
  | { situacao: 'rotina-pronta'; resultado: ResultadoDaFerramentaRotina }
  | { situacao: 'avatar-pronto'; avatar: AvatarDoJogo }
  | { situacao: 'quarto-pronto'; quarto: QuartoDoJogo }
  | { situacao: 'cancelado' }
  | { situacao: 'indisponivel'; motivo: string }

/**
 * Fotos no Clube (N08b, 30/10/2026). `ligado`: a permissão dos responsáveis está ligada e o
 * Clube tem o canal das fotos com aprovação prévia. `sem-clube`: a criança não tem o Clube ou o
 * canal não existe. A foto mandada espera a moderação do Clube (`em-moderacao`); só a equipe
 * publica direto (`publicada`).
 */
export const SITUACOES_DO_CLUBE = ['ligado', 'desligado', 'sem-clube', 'fora-do-ar'] as const
export type SituacaoDoClube = (typeof SITUACOES_DO_CLUBE)[number]
export const SituacaoDoClubeSchema = z.strictObject({ situacao: z.enum(SITUACOES_DO_CLUBE) })
export const ENVIOS_AO_CLUBE = [
  'em-moderacao',
  'publicada',
  'desligado',
  'sem-clube',
  'falhou',
] as const
export type EnvioAoClube = (typeof ENVIOS_AO_CLUBE)[number]
export const EnvioAoClubeSchema = z.strictObject({ situacao: z.enum(ENVIOS_AO_CLUBE) })
export interface ClubeDoJogo {
  situacao(): Promise<SituacaoDoClube>
  mandarFoto(foto: Blob): Promise<EnvioAoClube>
}

/**
 * "Usar uma criação minha que cabe neste molde" (§6.28, A30): uma criação da conta, do Pinta (a
 * planificação no tamanho do molde) ou do Molda (um modelo dentro do teto de triângulos). A
 * miniatura é a da biblioteca da conta, quando ela tem.
 */
export const CriacaoQueCabeSchema = z.strictObject({
  ferramenta: z.enum(['pinta', 'molda']),
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),
  nome: z.string().min(1).max(120),
  miniatura: z.string().max(16_000).startsWith('data:image/').nullable(),
})
export type CriacaoQueCabe = z.infer<typeof CriacaoQueCabeSchema>

export interface Plataforma {
  /** A versão negociada (`negociarVersao`): a atual ou a anterior, a menor dos dois lados. */
  versaoContrato: number
  publico: PublicoJogo
  perfil: PerfilDoJogo
  lerJornada(): Promise<JornadaDoJogo>
  lerAvatar(): Promise<AvatarDoJogo>
  lerQuarto(): Promise<QuartoDoJogo>
  salvarQuarto(quarto: QuartoDoJogo): Promise<QuartoDoJogo>
  servico: ServicoDoJogo
  abrirFerramenta(pedido: PedidoDeFerramenta): Promise<ResultadoDeFerramenta>
  /** Só criações da pessoa desta montagem. Bytes próprios, sem URL autenticada no jogo. */
  lerAparencia?(criacaoId: string, sinal?: AbortSignal): Promise<AparenciaLida | null>
  /** As criações da conta que cabem no molde (A30), da mais nova à mais antiga. */
  listarCriacoesQueCabem?(molde: MoldeDeObjeto, sinal?: AbortSignal): Promise<CriacaoQueCabe[]>
  /** Fotos no Clube (N08b): só o Kids monta. Sem ele, a foto fica só no aparelho. */
  clube?: ClubeDoJogo
  /** Sai do jogo e volta para a plataforma (a página decide para onde). */
  voltarParaPlataforma(): void
  relatarErro(erro: unknown, contexto: string): void
}

export interface MontagemDoArquipelago {
  desmontar(): void
}
export type MontarArquipelago = (
  elemento: HTMLElement,
  plataforma: Plataforma,
) => MontagemDoArquipelago

/** O que o módulo do jogo publicado exporta. */
export interface ModuloDoArquipelago {
  versaoContrato: number
  montarArquipelago: MontarArquipelago
}

/** O manifesto publicado com o jogo: qual arquivo de entrada carregar nesta versão. */
/**
 * Os arquivos que o build do jogo publica (entrada, partes, mapas e recursos): nome simples, sem
 * pasta. A MESMA régua vale no manifesto, no serviço que publica e no repasse da plataforma.
 */
export const EXTENSOES_DO_CLIENTE = {
  js: 'text/javascript; charset=utf-8',
  map: 'application/json; charset=utf-8',
  json: 'application/json; charset=utf-8',
  glb: 'model/gltf-binary',
  png: 'image/png',
  webp: 'image/webp',
  jpg: 'image/jpeg',
  ktx2: 'image/ktx2',
  wasm: 'application/wasm',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
} as const
export const ARQUIVO_DO_CLIENTE = new RegExp(
  `^[A-Za-z0-9_-]{1,80}\\.(?:js\\.map|${Object.keys(EXTENSOES_DO_CLIENTE).join('|')})$`,
)
export function tipoDoArquivoDoCliente(nome: string): string | null {
  if (!ARQUIVO_DO_CLIENTE.test(nome)) return null
  const extensao = nome.slice(nome.lastIndexOf('.') + 1) as keyof typeof EXTENSOES_DO_CLIENTE
  return EXTENSOES_DO_CLIENTE[extensao] ?? null
}

export const ManifestoDoClienteSchema = z.strictObject({
  versao: z.string().min(1).max(80),
  entrada: z
    .string()
    .refine((v) => v.endsWith('.js') && ARQUIVO_DO_CLIENTE.test(v), 'arquivo de entrada inválido'),
  versaoContrato: z.number().int().min(1),
  geradoEm: z.iso.datetime({ offset: true }),
})
export type ManifestoDoCliente = z.infer<typeof ManifestoDoClienteSchema>

/**
 * A publicação separada do jogo (lacunas, 01/11/2026, desfaz a A11): cada versão compilada vai
 * para o CDN em `arquipelago/versoes/<versao>/`, imutável, e os canais (`arquipelago/canais/
 * estavel.json` e `teste.json`) apontam para uma delas. Voltar uma versão é trocar o ponteiro. O
 * host escolhe o canal pelo ambiente; sem CDN configurado, segue lendo o manifesto do serviço.
 */
export const CANAIS_DO_CLIENTE = ['estavel', 'teste'] as const
export type CanalDoCliente = (typeof CANAIS_DO_CLIENTE)[number]
export const VERSAO_DO_CLIENTE = /^[A-Za-z0-9._-]{1,80}$/
/** A pasta de uma versão no CDN (sem barra no começo, com barra no fim). */
export const pastaDaVersao = (versao: string) => `arquipelago/versoes/${versao}/`
export const arquivoDoCanal = (canal: CanalDoCliente) => `arquipelago/canais/${canal}.json`
/** O marcador que a publicação grava por último: a versão só pode ser promovida com ele. */
export const MARCADOR_DA_VERSAO = 'completa.json'

export const PonteiroDoCanalSchema = z.strictObject({
  formato: z.literal(2),
  canal: z.enum(CANAIS_DO_CLIENTE),
  versao: z.string().regex(VERSAO_DO_CLIENTE),
  entrada: ManifestoDoClienteSchema.shape.entrada,
  versaoContrato: z.number().int().min(1),
  /** Quando a versão foi compilada e quando o canal passou a apontar para ela. */
  geradoEm: z.iso.datetime({ offset: true }),
  promovidoEm: z.iso.datetime({ offset: true }),
})
export type PonteiroDoCanal = z.infer<typeof PonteiroDoCanalSchema>
