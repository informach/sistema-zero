import { z } from 'zod'
import { ILHA_IDS } from './ilhas'
import { GELADEIRA_GUARDA, OBJETOS_DA_CASA } from './objetos'
import { contarCartoes, LIMITES_DA_ROTINA, RotinaSchema } from './rotinas'

/**
 * O salvamento do jogo de UM perfil. Tem versão: o serviço aceita a versão atual e as
 * anteriores (migradas por `migrarSalvamento`), então um jogo novo nunca perde o progresso de
 * quem salvou antes. Mudou o formato? Crie a próxima versão, escreva a migração da anterior e
 * mantenha os testes.
 */
export const VERSAO_SALVAMENTO = 11

const iso = z.iso.datetime({ offset: true })
const nivel = z.number().min(0).max(100)

export const SEMENTES = ['alface', 'tomate', 'milho'] as const
export type Semente = (typeof SEMENTES)[number]

export const CanteiroSchema = z.strictObject({
  id: z.string().min(1).max(20),
  semente: z.enum(SEMENTES).nullable(),
  plantadoEm: iso.nullable(),
  regadoEm: iso.nullable(),
})
export type Canteiro = z.infer<typeof CanteiroSchema>

export const SalvamentoV1Schema = z.strictObject({
  versao: z.literal(1),
  criadoEm: iso,
  necessidades: z.strictObject({ fome: nivel, energia: nivel, diversao: nivel }),
  horta: z.array(CanteiroSchema).max(24),
  /** Item → quantidade. Itens desconhecidos de uma versão futura são ignorados pelo jogo. */
  inventario: z.record(z.string().min(1).max(40), z.number().int().min(0).max(999)),
  posicao: z.strictObject({ x: z.number(), y: z.number(), z: z.number() }).nullable(),
  /** Pontes cuja chegada (a cor varrendo a ilha) a pessoa já viu. */
  pontesVistas: z.array(z.enum(ILHA_IDS)).max(ILHA_IDS.length),
  casa: z.strictObject({ portaNova: z.boolean() }),
})
export type SalvamentoV1 = z.infer<typeof SalvamentoV1Schema>

/**
 * Os percursos com tempo e estrelas. `vila-telhados` (a entrega pelos telhados da Vila Doce,
 * fase2-05) e `pico-cume` (a subida ao cume do Pico Gelado, fase3-07) entraram em 29/10/2026 sem
 * versão nova: só alargam o que a V2 em diante aceitam.
 */
export const PERCURSOS = ['bosque-copas', 'vila-telhados', 'pico-cume'] as const
export type PercursoId = (typeof PERCURSOS)[number]

/** Uma hora: o jogo desiste da corrida que passa disto (nada acima vai para o salvamento). */
export const MELHOR_TEMPO_MAXIMO_MS = 60 * 60 * 1000

/**
 * O melhor de um percurso. Cada estrela vale sozinha e fica para sempre: a de chegar, a do
 * tempo-alvo e a dos vagalumes podem vir de corridas diferentes. O melhor tempo é o menor de
 * todas as corridas que chegaram.
 */
export const ResultadoDoPercursoSchema = z.strictObject({
  estrelas: z.strictObject({ chegada: z.boolean(), tempo: z.boolean(), vagalumes: z.boolean() }),
  melhorTempoMs: z.number().int().min(0).max(MELHOR_TEMPO_MAXIMO_MS),
})
export type ResultadoDoPercurso = z.infer<typeof ResultadoDoPercursoSchema>

/** V2 (27/10/2026): a V1 mais o melhor resultado de cada percurso. */
export const SalvamentoV2Schema = SalvamentoV1Schema.extend({
  versao: z.literal(2),
  percursos: z.partialRecord(z.enum(PERCURSOS), ResultadoDoPercursoSchema),
})
export type SalvamentoV2 = z.infer<typeof SalvamentoV2Schema>

/** Da V1 para a V2: tudo igual, e nenhum percurso corrido ainda. */
export function migrarDaV1(v1: SalvamentoV1): SalvamentoV2 {
  return { ...v1, versao: 2, percursos: {} }
}

/** Os bichos do Bosque que se esconderam no Cinza e que a criança pode adotar. */
export const BICHOS_DO_BOSQUE = ['cachorro', 'gato', 'coelho', 'porquinho'] as const
export type BichoDoBosque = (typeof BICHOS_DO_BOSQUE)[number]

/** Um dia do calendário no horário do aparelho (`AAAA-MM-DD`): o "hoje" da Capi e dos bichos. */
const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

/** Até onde vai a amizade com um morador (5 corações de 100). */
export const AMIZADE_MAXIMA = 500

/**
 * O que a criança construiu com um morador (`sistemas/moradores.ts` tem as regras): a Capi, no
 * Bosque, e o Bento, na Vila Doce (V7), guardam o mesmo formato.
 */
export const MoradorSchema = z.strictObject({
  amizade: z.number().int().min(0).max(AMIZADE_MAXIMA),
  /** O último dia em que conversaram (a primeira conversa do dia é a que conta). */
  conversaEm: dia.nullable(),
  /** O último dia em que ela ganhou presente (só o primeiro do dia conta). */
  presenteEm: dia.nullable(),
  /** O pedido do dia, guardado para não mudar no meio do dia. */
  pedido: z.strictObject({ dia, id: z.string().min(1).max(40), entregue: z.boolean() }).nullable(),
})
export type Morador = z.infer<typeof MoradorSchema>
/** A Capi (o nome de antes da V7; o formato é o de qualquer morador). */
export const CapiSchema = MoradorSchema
export type Capi = Morador

/** Um morador que a criança ainda não conheceu. */
export const MORADOR_NOVO: Morador = {
  amizade: 0,
  conversaEm: null,
  presenteEm: null,
  pedido: null,
}

/** O bicho adotado (`sistemas/bichos.ts` tem as regras de cuidar, ensinar e crescer). */
export const BichoAdotadoSchema = z.strictObject({
  id: z.enum(BICHOS_DO_BOSQUE),
  nome: z.string().trim().min(1).max(16),
  fase: z.enum(['filhote', 'adulto']),
  fome: nivel,
  limpeza: nivel,
  carinho: nivel,
  /** Dias em que foi bem cuidado (as três medidas passaram de 60 em algum momento). */
  diasCuidados: z.number().int().min(0).max(999),
  /** O último dia que já contou em `diasCuidados`. */
  diaCuidadoEm: dia.nullable(),
  truque: z.strictObject({
    sessoes: z.number().int().min(0).max(99),
    ultimaEm: dia.nullable(),
    aprendido: z.boolean(),
  }),
})
export type BichoAdotado = z.infer<typeof BichoAdotadoSchema>

/** V3 (28/10/2026): a V2 mais a Capi e os bichos do Bosque (achados e o adotado). */
export const SalvamentoV3Schema = SalvamentoV2Schema.extend({
  versao: z.literal(3),
  moradores: z.strictObject({ capi: CapiSchema }),
  bichos: z.strictObject({
    achados: z
      .array(z.enum(BICHOS_DO_BOSQUE))
      .max(BICHOS_DO_BOSQUE.length)
      .refine((lista) => new Set(lista).size === lista.length, 'bicho achado repetido'),
    adotado: BichoAdotadoSchema.nullable(),
  }),
})
export type SalvamentoV3 = z.infer<typeof SalvamentoV3Schema>

/** Da V2 para a V3: tudo igual, a Capi sem amizade ainda e nenhum bicho achado. */
export function migrarDaV2(v2: SalvamentoV2): SalvamentoV3 {
  return {
    ...v2,
    versao: 3,
    moradores: { capi: { amizade: 0, conversaEm: null, presenteEm: null, pedido: null } },
    bichos: { achados: [], adotado: null },
  }
}

// ------------------------------------------------------------------ V4: o modo construção

/** Um ponto ou uma célula da grade de uma obra (1 célula = 1 unidade, coordenadas inteiras). */
const coordenada = z.number().int().min(-60).max(60)

export const EIXOS_DA_OBRA = ['x', 'z'] as const
export type EixoDaObra = (typeof EIXOS_DA_OBRA)[number]

/**
 * Um trecho reto de parede (ou de cerca) na linha da grade: sai do ponto (x, z) e anda `n`
 * células no eixo (`x`: até (x + n, z); `z`: até (x, z + n)).
 */
export const TrechoSchema = z.strictObject({
  x: coordenada,
  z: coordenada,
  eixo: z.enum(EIXOS_DA_OBRA),
  n: z.number().int().min(1).max(60),
})
export type Trecho = z.infer<typeof TrechoSchema>

/** Porta e janelas do kit: a largura de cada uma, em células, mora no jogo (`aberturas.ts`). */
export const TIPOS_DE_ABERTURA = [
  'porta',
  'janela-grande',
  'janela-arco',
  'janela-redonda',
] as const
export type TipoDeAbertura = (typeof TIPOS_DE_ABERTURA)[number]

/** Uma porta ou janela numa parede: começa no ponto (x, z) e ocupa a largura dela no eixo. */
export const AberturaSchema = z.strictObject({
  tipo: z.enum(TIPOS_DE_ABERTURA),
  x: coordenada,
  z: coordenada,
  eixo: z.enum(EIXOS_DA_OBRA),
})
export type Abertura = z.infer<typeof AberturaSchema>

export const PISOS_DA_CASA = ['tabua', 'ladrilho', 'azulejo'] as const
export type PisoDaCasa = (typeof PISOS_DA_CASA)[number]
export const PISOS_DO_QUINTAL = ['pedra', 'grama'] as const
export type PisoDoQuintal = (typeof PISOS_DO_QUINTAL)[number]

const celula = { x: coordenada, z: coordenada }

/** O piso de um cômodo inteiro, guardado por uma célula de dentro dele. */
export const PisoDoComodoSchema = z.strictObject({ ...celula, tipo: z.enum(PISOS_DA_CASA) })

/** Um objeto com função posto na obra: a célula do canto e o giro (em quartos de volta). */
export const ObjetoNaObraSchema = z.strictObject({
  ...celula,
  id: z.enum(OBJETOS_DA_CASA),
  giro: z.number().int().min(0).max(3),
})

/** Nenhuma chave repetida na lista. */
function semRepetir(chaves: readonly string[]): boolean {
  return new Set(chaves).size === chaves.length
}
const naCelula = (c: { x: number; z: number }) => `${c.x},${c.z}`

/**
 * Uma obra: a casa (o lote da sua ilha) ou uma cabana. Paredes e cercas vão em trechos, o piso vai
 * por cômodo e o caminho por célula. Os tetos seguram o salvamento abaixo de 64 KB no pior caso;
 * o jogo tem tetos menores por lote.
 */
export const ObraSchema = z.strictObject({
  paredes: z.array(TrechoSchema).max(200),
  aberturas: z.array(AberturaSchema).max(60),
  pisos: z.array(PisoDoComodoSchema).max(30),
  objetos: z
    .array(ObjetoNaObraSchema)
    .max(OBJETOS_DA_CASA.length)
    .refine((lista) => semRepetir(lista.map((o) => o.id)), 'objeto repetido'),
  cercas: z.array(TrechoSchema).max(120),
  caminhos: z
    .array(z.strictObject({ ...celula, tipo: z.enum(PISOS_DO_QUINTAL) }))
    .max(240)
    .refine((lista) => semRepetir(lista.map(naCelula)), 'caminho repetido'),
  canteiros: z
    .array(z.strictObject(celula))
    .max(18)
    .refine((lista) => semRepetir(lista.map(naCelula)), 'canteiro repetido'),
})
export type Obra = z.infer<typeof ObraSchema>

/** As ilhas onde dá para fazer cabana (28/10/2026: só o Bosque, a primeira ilha nova). */
export const ILHAS_COM_CABANA = ['bosque'] as const
export type IlhaComCabana = (typeof ILHAS_COM_CABANA)[number]

/** De onde vem a aparência de um objeto: a galeria (comprada) ou feita por ela. */
export const ORIGENS_DA_APARENCIA = ['galeria', 'pinta', 'molda', 'criacao'] as const
export type OrigemDaAparencia = (typeof ORIGENS_DA_APARENCIA)[number]

/** Uma aparência: a origem e o id (o da galeria no catálogo, ou o da criação na conta). */
export const AparenciaDoObjetoSchema = z.strictObject({
  origem: z.enum(ORIGENS_DA_APARENCIA),
  id: z.string().min(1).max(80),
})
export type AparenciaDoObjeto = z.infer<typeof AparenciaDoObjetoSchema>

export function mesmaAparencia(a: AparenciaDoObjeto, b: AparenciaDoObjeto): boolean {
  return a.origem === b.origem && a.id === b.id
}

/**
 * O projeto azul de um objeto (V4 e V5): a função já vale desde que ele foi ganho. A aparência (da
 * galeria, do Pinta, do Molda ou de uma criação guardada) chega depois; `guardado` é o que está na
 * geladeira (alimento → quantidade).
 */
export const ProjetoAzulV4Schema = z.strictObject({
  ganhoEm: iso,
  aparencia: AparenciaDoObjetoSchema.nullable(),
  guardado: z
    .record(z.string().min(1).max(40), z.number().int().min(1).max(GELADEIRA_GUARDA.completa))
    .refine(
      (g) => Object.values(g).reduce((a, b) => a + b, 0) <= GELADEIRA_GUARDA.completa,
      'mais do que cabe',
    )
    .optional(),
})
export type ProjetoAzulV4 = z.infer<typeof ProjetoAzulV4Schema>

/** Quantas aparências um objeto guarda (as da galeria e as feitas por ela). */
export const APARENCIAS_GUARDADAS_MAXIMO = 12

/**
 * O projeto azul de hoje (V6, 29/10/2026): a V4 mais `aparencias`, as que ela já tem para este
 * objeto (a da galeria só entra depois de paga; as dela, ao voltar do Pinta ou do Molda). Trocar
 * entre elas não cobra de novo, e a aparência em uso é sempre uma delas.
 */
export const ProjetoAzulSchema = ProjetoAzulV4Schema.extend({
  aparencias: z.array(AparenciaDoObjetoSchema).max(APARENCIAS_GUARDADAS_MAXIMO),
})
  .refine(
    (p) => p.aparencias.every((a, i) => p.aparencias.findIndex((b) => mesmaAparencia(a, b)) === i),
    'aparência repetida',
  )
  .refine(
    (p) => p.aparencia === null || p.aparencias.some((a) => mesmaAparencia(a, p.aparencia!)),
    'a aparência em uso fica entre as guardadas',
  )
export type ProjetoAzul = z.infer<typeof ProjetoAzulSchema>

/**
 * V4 (28/10/2026): a V3 mais a construção (`casa` é `null` até a primeira obra: até lá a casa é a
 * de antes, do `casa.glb`) e os projetos azuis ganhos.
 */
export const SalvamentoV4Schema = SalvamentoV3Schema.extend({
  versao: z.literal(4),
  construcao: z.strictObject({
    casa: ObraSchema.nullable(),
    cabanas: z.partialRecord(z.enum(ILHAS_COM_CABANA), ObraSchema),
  }),
  projetos: z.partialRecord(z.enum(OBJETOS_DA_CASA), ProjetoAzulV4Schema),
})
export type SalvamentoV4 = z.infer<typeof SalvamentoV4Schema>

/** Da V3 para a V4: tudo igual, a casa de antes, nenhuma cabana e nenhum projeto azul. */
export function migrarDaV3(v3: SalvamentoV3): SalvamentoV4 {
  return { ...v3, versao: 4, construcao: { casa: null, cabanas: {} }, projetos: {} }
}

/** V5: a entrega única da Capi por encontrar os quatro bichos do Bosque. */
export const SalvamentoV5Schema = SalvamentoV4Schema.extend({
  versao: z.literal(5),
  presenteDosBichosEntregue: z.boolean(),
})
export type SalvamentoV5 = z.infer<typeof SalvamentoV5Schema>

/** Quem já achou os bichos ainda pode receber na próxima conversa com a Capi. */
export function migrarDaV4(v4: SalvamentoV4): SalvamentoV5 {
  return { ...v4, versao: 5, presenteDosBichosEntregue: false }
}

/** V6 (29/10/2026): os projetos azuis guardam as aparências que ela já tem (`aparencias`). */
export const SalvamentoV6Schema = SalvamentoV5Schema.extend({
  versao: z.literal(6),
  projetos: z.partialRecord(z.enum(OBJETOS_DA_CASA), ProjetoAzulSchema),
})
export type SalvamentoV6 = z.infer<typeof SalvamentoV6Schema>

/** Da V5 para a V6: a aparência em uso passa a ser a única guardada. */
export function migrarDaV5(v5: SalvamentoV5): SalvamentoV6 {
  const projetos: SalvamentoV6['projetos'] = {}
  for (const [id, p] of Object.entries(v5.projetos) as [
    keyof SalvamentoV6['projetos'],
    ProjetoAzulV4,
  ][])
    projetos[id] = { ...p, aparencias: p.aparencia ? [p.aparencia] : [] }
  return { ...v5, versao: 6, projetos }
}

/** V7 (29/10/2026): os moradores ganham o Bento, da Vila Doce (fase2-02). */
export const SalvamentoV7Schema = SalvamentoV6Schema.extend({
  versao: z.literal(7),
  moradores: z.strictObject({ capi: MoradorSchema, bento: MoradorSchema }),
})
export type SalvamentoV7 = z.infer<typeof SalvamentoV7Schema>

/** Da V6 para a V7: tudo igual, e o Bento ainda sem conhecer a criança. */
export function migrarDaV6(v6: SalvamentoV6): SalvamentoV7 {
  return { ...v6, versao: 7, moradores: { ...v6.moradores, bento: { ...MORADOR_NOVO } } }
}

/** Os balcões da Vila Doce onde se faz turno (fase2-03): a padaria do Bento, a sorveteria e a barraca de sucos. */
export const POSTOS_DA_VILA = ['padaria', 'sorveteria', 'sucos'] as const
export type PostoDaVila = (typeof POSTOS_DA_VILA)[number]

/** O que ela já fez num balcão (`sistemas/turnos.ts` tem as regras). */
export const TurnoSchema = z.strictObject({
  /** O último dia em que o turno pagou (só o primeiro turno do dia em cada balcão paga). */
  pagoEm: dia.nullable(),
  /** As melhores estrelas de um turno ali (de 1 a 3). */
  melhor: z.number().int().min(1).max(3),
  /** Quantos turnos ela já terminou ali. */
  vezes: z.number().int().min(1).max(9999),
})
export type Turno = z.infer<typeof TurnoSchema>

/** V8 (29/10/2026): os turnos nos balcões da Vila Doce (fase2-03). */
export const SalvamentoV8Schema = SalvamentoV7Schema.extend({
  versao: z.literal(8),
  turnos: z.partialRecord(z.enum(POSTOS_DA_VILA), TurnoSchema),
})
export type SalvamentoV8 = z.infer<typeof SalvamentoV8Schema>

/** Da V7 para a V8: tudo igual, e nenhum turno feito. */
export function migrarDaV7(v7: SalvamentoV7): SalvamentoV8 {
  return { ...v7, versao: 8, turnos: {} }
}

/**
 * Os Lumis (fase2-06), as criaturinhas de luz que nascem do Cinza: à noite a lanterna prende um
 * borrão de névoa e ele vira um Lumi da família da ilha. Duas espécies por ilha, a comum e a rara
 * (nomes e jeito de ser no README de `arquipelago/arte/lumis`). A lista inteira entra já, para as
 * ilhas seguintes não pedirem versão nova.
 */
export const LUMIS = [
  'estrelinha',
  'buzio',
  'pitanga',
  'ipe',
  'quindim',
  'brigadeiro',
  'bolha',
  'perola',
  'gelinho',
  'cristal',
  'ovinho',
  'brotinho',
  'algodao',
  'pluma',
] as const
export type LumiId = (typeof LUMIS)[number]

/** V9 (29/10/2026): quantos Lumis de cada espécie ela já prendeu com a lanterna (fase2-06). */
export const SalvamentoV9Schema = SalvamentoV8Schema.extend({
  versao: z.literal(9),
  lumis: z.partialRecord(z.enum(LUMIS), z.number().int().min(1).max(999)),
})
export type SalvamentoV9 = z.infer<typeof SalvamentoV9Schema>

/** Da V8 para a V9: tudo igual, e nenhum Lumi preso ainda. */
export function migrarDaV8(v8: SalvamentoV8): SalvamentoV9 {
  return { ...v8, versao: 9, lumis: {} }
}

/**
 * V10 (29/10/2026, fase2-07): a rotina de cada Lumi preso, montada com os cartões (`rotinas.ts`).
 * Uma por espécie, só das que ela já prendeu (`lumis`), e com teto somando todas as rotinas.
 */
export const SalvamentoV10Schema = SalvamentoV9Schema.extend({
  versao: z.literal(10),
  rotinas: z.partialRecord(z.enum(LUMIS), RotinaSchema),
}).superRefine(conferirRotinas)

function conferirRotinas(
  s: {
    lumis: Partial<Record<LumiId, number>>
    rotinas: Partial<Record<LumiId, z.infer<typeof RotinaSchema>>>
  },
  ctx: z.RefinementCtx,
) {
  for (const lumi of Object.keys(s.rotinas) as LumiId[])
    if (!s.lumis[lumi])
      ctx.addIssue({ code: 'custom', message: `rotina de um Lumi que ela não tem: ${lumi}` })
  const total = Object.values(s.rotinas).reduce((n, r) => n + (r ? contarCartoes(r) : 0), 0)
  if (total > LIMITES_DA_ROTINA.cartoesNasRotinas)
    ctx.addIssue({ code: 'custom', message: 'cartões demais somando as rotinas' })
}
export type SalvamentoV10 = z.infer<typeof SalvamentoV10Schema>

/** Da V9 para a V10: tudo igual, e nenhuma rotina montada ainda. */
export function migrarDaV9(v9: SalvamentoV9): SalvamentoV10 {
  return { ...v9, versao: 10, rotinas: {} }
}

/** Das versões até a V7, passando pelas migrações em ordem, até a atual. */
const daV7 = (v7: SalvamentoV7) => migrarDaV9(migrarDaV8(migrarDaV7(v7)))

/**
 * O formato atual. Aceita também as versões anteriores e já devolve migradas: um salvamento
 * guardado antes continua valendo, e a gravação antiga de uma aba aberta antes da atualização é
 * guardada já migrada. Essa aba antiga, porém, não lê a resposta (V11): a primeira gravação dela
 * fica, e as seguintes falham até a página recarregar.
 */
const SalvamentoAteV10Schema = z.union([
  SalvamentoV10Schema,
  SalvamentoV9Schema.transform(migrarDaV9),
  SalvamentoV8Schema.transform((v8) => migrarDaV9(migrarDaV8(v8))),
  SalvamentoV7Schema.transform(daV7),
  SalvamentoV6Schema.transform((v6) => daV7(migrarDaV6(v6))),
  SalvamentoV5Schema.transform((v5) => daV7(migrarDaV6(migrarDaV5(v5)))),
  SalvamentoV4Schema.transform((v4) => daV7(migrarDaV6(migrarDaV5(migrarDaV4(v4))))),
  SalvamentoV3Schema.transform((v3) => daV7(migrarDaV6(migrarDaV5(migrarDaV4(migrarDaV3(v3)))))),
  SalvamentoV2Schema.transform((v2) =>
    daV7(migrarDaV6(migrarDaV5(migrarDaV4(migrarDaV3(migrarDaV2(v2)))))),
  ),
  SalvamentoV1Schema.transform((v1) =>
    daV7(migrarDaV6(migrarDaV5(migrarDaV4(migrarDaV3(migrarDaV2(migrarDaV1(v1))))))),
  ),
])
/** V11: descobertas únicas do mergulho, sem guardar posição ou fôlego temporários. */
export const SalvamentoV11Schema = z
  .strictObject({
    ...SalvamentoV10Schema.shape,
    versao: z.literal(11),
    recife: z.strictObject({ bau: z.boolean(), pagina: z.boolean(), tesouro: z.boolean() }),
  })
  .superRefine(conferirRotinas)
export type SalvamentoV11 = z.infer<typeof SalvamentoV11Schema>
export function migrarDaV10(v10: SalvamentoV10): SalvamentoV11 {
  return { ...v10, versao: 11, recife: { bau: false, pagina: false, tesouro: false } }
}
export const SalvamentoSchema = z.union([
  SalvamentoV11Schema,
  SalvamentoAteV10Schema.transform(migrarDaV10),
])
export type Salvamento = SalvamentoV11

/** Teto do documento serializado (o serviço recusa acima disto). */
export const SALVAMENTO_MAX_BYTES = 64 * 1024

export function criarSalvamentoInicial(agora: Date): Salvamento {
  return {
    versao: 11,
    recife: { bau: false, pagina: false, tesouro: false },
    presenteDosBichosEntregue: false,
    criadoEm: agora.toISOString(),
    necessidades: { fome: 80, energia: 100, diversao: 70 },
    horta: Array.from({ length: 6 }, (_, i) => ({
      id: `c${i + 1}`,
      semente: null,
      plantadoEm: null,
      regadoEm: null,
    })),
    inventario: { 'semente-alface': 3, 'semente-tomate': 2, 'semente-milho': 1 },
    posicao: null,
    pontesVistas: [],
    casa: { portaNova: false },
    percursos: {},
    moradores: { capi: { ...MORADOR_NOVO }, bento: { ...MORADOR_NOVO } },
    bichos: { achados: [], adotado: null },
    construcao: { casa: null, cabanas: {} },
    projetos: {},
    turnos: {},
    lumis: {},
    rotinas: {},
  }
}

/**
 * Lê qualquer versão conhecida e devolve a atual. Entrada inválida ou de versão futura volta
 * `null`: quem chama decide (o jogo começa do zero só se não houver nada guardado).
 */
export function migrarSalvamento(entrada: unknown): Salvamento | null {
  const lido = SalvamentoSchema.safeParse(entrada)
  return lido.success ? lido.data : null
}
