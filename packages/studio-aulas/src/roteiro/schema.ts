import { z } from 'zod'

// A "fonte única da verdade" de uma aula. Um arquivo YAML (`roteiro.yaml`) que é
// legível/editável por humano E parseável por máquina: as etapas de voz, avatar,
// tela e montagem consomem ESTE schema. A skill `aula-roteiro` gera um arquivo
// que valida aqui.

/** Emoção da narração — mapeada para configurações do ElevenLabs na etapa de voz. */
export const EMOCOES = ['neutro', 'empolgado', 'calmo', 'curioso', 'comemorando'] as const
export type Emocao = (typeof EMOCOES)[number]

/** Tipo da cena — decide o layout na montagem (Remotion). */
export const TIPOS_CENA = [
  'apresentacao',
  'teoria',
  'pratica',
  'teste',
  'recapitulacao',
  'fecho',
] as const
export type TipoCena = (typeof TIPOS_CENA)[number]

/** Ilustrações de teoria reutilizáveis (biblioteca no Remotion). */
export const ILUSTRACOES = [
  'sprite',
  'colisao',
  'variavel',
  'condicional',
  'loop',
  'coordenadas-xy',
] as const
export type NomeIlustracao = (typeof ILUSTRACOES)[number]

/** Âncora de um balão: um bloco (por tipo) e, opcionalmente, um campo dele. */
const AncoraSchema = z.object({
  /** Tipo Blockly do bloco (ex.: `sz_g2d_create_sprite`). */
  bloco: z.string().min(1),
  /** Nome do campo/input do bloco (ex.: `X`, `NAME`). Ausente = o bloco todo. */
  campo: z.string().min(1).optional(),
})
export type Ancora = z.infer<typeof AncoraSchema>

// --- Ações de tela (o passo a passo que o gravador executa no Estúdio) ---

const AbrirCategoria = z.object({
  tipo: z.literal('abrirCategoria'),
  /** Nome da categoria como aparece na paleta (ex.: "Jogo 2D"). */
  categoria: z.string().min(1),
})

const PegarBloco = z.object({
  tipo: z.literal('pegarBloco'),
  /** Tipo Blockly do bloco a adicionar (ex.: `sz_g2d_create_sprite`). */
  bloco: z.string().min(1),
  /**
   * Onde encaixar: um frame (`sz_frame_behavior`/`sz_frame_appearance`/
   * `sz_frame_structure`) ou o tipo de um bloco já colocado (encadeia depois
   * dele). Ausente = fica solto (rascunho).
   */
  encaixarEm: z.string().min(1).optional(),
  /** Rótulo curto p/ referência humana no roteiro (não afeta a gravação). */
  rotulo: z.string().optional(),
})

const ConfigurarCampo = z.object({
  tipo: z.literal('configurarCampo'),
  /** Tipo do bloco cujo campo será ajustado. Ausente = último bloco colocado. */
  bloco: z.string().min(1).optional(),
  /** Nome do campo (ex.: `NAME`, `COLOR`). */
  campo: z.string().min(1),
  /** Valor a digitar/selecionar. */
  valor: z.union([z.string(), z.number()]),
})

const Balao = z.object({
  tipo: z.literal('balao'),
  ancora: AncoraSchema,
  texto: z.string().min(1),
})

const Testar = z.object({
  tipo: z.literal('testar'),
  /** Segundos rodando o preview antes de seguir. Default na etapa de tela. */
  segundos: z.number().positive().optional(),
})

const Pausar = z.object({
  tipo: z.literal('pausar'),
  /** Segundos parado (respiro didático). */
  segundos: z.number().positive(),
})

const Zoom = z.object({
  tipo: z.literal('zoom'),
  /** `perto` aproxima, `longe` afasta, `ajustar` enquadra tudo, ou uma escala (ex.: 1.4). */
  nivel: z.union([z.enum(['perto', 'longe', 'ajustar']), z.number().positive()]),
})

export const AcaoTelaSchema = z.discriminatedUnion('tipo', [
  AbrirCategoria,
  PegarBloco,
  ConfigurarCampo,
  Balao,
  Testar,
  Pausar,
  Zoom,
])
export type AcaoTela = z.infer<typeof AcaoTelaSchema>

const IlustracaoSchema = z.object({
  nome: z.enum(ILUSTRACOES),
  /** Parâmetros livres passados ao componente de teoria (ex.: nomes dos sprites). */
  params: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
})
export type IlustracaoRef = z.infer<typeof IlustracaoSchema>

export const CenaSchema = z.object({
  /** Id curto e único da cena (ex.: `c1`). Nomeia os arquivos gerados. */
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9][a-z0-9-]*$/, 'use minúsculas, números e hífen'),
  tipo: z.enum(TIPOS_CENA),
  /** Texto falado (vira o áudio e o lip-sync do avatar). */
  narracao: z.string().min(1),
  emocao: z.enum(EMOCOES).default('neutro'),
  /** Só em cenas de teoria: qual explicador animado mostrar. */
  ilustracao: IlustracaoSchema.optional(),
  /** Só em cenas de prática: o passo a passo na tela do Estúdio. */
  acoes: z.array(AcaoTelaSchema).optional(),
})
export type Cena = z.infer<typeof CenaSchema>

const VozOverridesSchema = z
  .object({
    estabilidade: z.number().min(0).max(1).optional(),
    estilo: z.number().min(0).max(1).optional(),
    similaridade: z.number().min(0).max(1).optional(),
  })
  .optional()

export const MetaSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9][a-z0-9-]*$/, 'slug em kebab-case'),
  titulo: z.string().min(1),
  dia: z.number().int().positive().optional(),
  /**
   * Projeto inicial no Estúdio: `vazio` (createEmptyProject) ou o nome de um
   * arquivo `.szproject.json` ao lado do roteiro.
   */
  projetoInicial: z.string().default('vazio'),
  /** Extensões a instalar no harness antes de gravar (ex.: `game-2d`). */
  extensoes: z.array(z.string()).default([]),
  /** Nome do arquivo de fundo (em `cenarios/`) da abertura/fecho. */
  cenarioAbertura: z.string().default('cenario-a'),
  /** Nome do arquivo de fundo do meio (teoria/prática). */
  cenarioMeio: z.string().default('cenario-b'),
  voz: VozOverridesSchema,
})
export type Meta = z.infer<typeof MetaSchema>

export const RoteiroSchema = z.object({
  meta: MetaSchema,
  cenas: z.array(CenaSchema).min(1),
})
export type Roteiro = z.infer<typeof RoteiroSchema>
