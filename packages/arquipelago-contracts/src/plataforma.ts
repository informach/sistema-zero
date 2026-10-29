import { z } from 'zod'
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
    opcoes?: { metodo?: 'GET' | 'POST' | 'PUT'; corpo?: unknown; sinal?: AbortSignal },
  ): Promise<RespostaDoServico>
}

/** Ferramentas da plataforma que o jogo pode pedir para abrir (com o molde do objeto). */
export type FerramentaDaPlataforma = 'pinta' | 'molda' | 'estudio' | 'rotina-lumi'
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
  | { situacao: 'cancelado' }
  | { situacao: 'indisponivel'; motivo: string }

export interface Plataforma {
  versaoContrato: typeof VERSAO_CONTRATO_PLATAFORMA
  publico: PublicoJogo
  perfil: PerfilDoJogo
  lerJornada(): Promise<JornadaDoJogo>
  lerAvatar(): Promise<AvatarDoJogo>
  lerQuarto(): Promise<QuartoDoJogo>
  salvarQuarto(quarto: QuartoDoJogo): Promise<QuartoDoJogo>
  servico: ServicoDoJogo
  abrirFerramenta(pedido: PedidoDeFerramenta): Promise<ResultadoDeFerramenta>
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
