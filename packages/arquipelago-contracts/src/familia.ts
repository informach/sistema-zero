import { z } from 'zod'
import { PERFIS_DA_FAMILIA_MAXIMO } from './api'
import { OBJETOS_DA_CASA } from './objetos'
import { QuartoSchema } from './plataforma'
import { CanteiroSchema, ObraSchema, PERCURSOS, ResultadoDoPercursoSchema } from './salvamento'

/**
 * A família no Arquipélago (28/10/2026, fase1-18): o resumo da semana de cada criança e as
 * permissões de visita que os pais escolhem. Lido pela área dos pais do Kids; as permissões são
 * lidas pelo jogo quando as visitas chegarem (Fase 3).
 */

/** Quantos dias o resumo cobre: hoje e os 6 anteriores, no dia de São Paulo. */
export const DIAS_DA_SEMANA_DA_FAMILIA = 7

/** Até quantas horas depois de jogar uma aula concluída conta como "voltou ao curso". */
export const HORAS_DA_VOLTA_AO_CURSO = 24

const DIA = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const QUANTOS = z.number().int().min(0)

/**
 * O que uma criança fez e aprendeu nos últimos 7 dias. Cada parte é `null` quando o serviço não
 * tem o dado (desafios desligados, Members fora do ar): os pais nunca veem número inventado.
 */
export const SemanaDaCriancaSchema = z.strictObject({
  perfilId: z.uuid(),
  /** Desafios do Estúdio aprovados (o principal passou) na janela; `null` = desafios fechados. */
  desafios: z
    .strictObject({
      aprovados: QUANTOS,
      /** Dos aprovados, quantos são de ilhas antes da mais nova aberta para ela; `null` = sem a jornada. */
      deIlhasAnteriores: QUANTOS.nullable(),
    })
    .nullable(),
  /**
   * Projetos azuis com a aparência feita por ela, desde sempre (o salvamento não guarda a data);
   * `null` = o salvamento não pôde ser lido.
   */
  objetos: z.strictObject({ pinta: QUANTOS, molda: QUANTOS }).nullable(),
  /** Tempo livre no jogo na janela, em segundos, e em quantos dias ela jogou. */
  tempoLivre: z.strictObject({ segundos: QUANTOS, dias: QUANTOS.max(DIAS_DA_SEMANA_DA_FAMILIA) }),
  /**
   * Em quantos dias da janela ela concluiu aula do curso até `HORAS_DA_VOLTA_AO_CURSO` depois de
   * uma sessão no jogo terminar (29/10/2026). `null` = sem a leitura dos cursos (Members fora ou
   * não ligado). Opcional para o serviço e o app subirem em qualquer ordem.
   */
  voltaAoCurso: z
    .strictObject({ dias: QUANTOS.max(DIAS_DA_SEMANA_DA_FAMILIA) })
    .nullable()
    .optional(),
})
export type SemanaDaCrianca = z.infer<typeof SemanaDaCriancaSchema>

/**
 * `GET /arquipelago/familia/semana?perfis=`: a semana das crianças da conta que veem o jogo.
 * `criancas` traz só quem já jogou nesta conta (o serviço sabe a conta de cada criança pelo login
 * dela); `aindaSemJogo` são as que veem o jogo mas ainda não guardaram nada nele.
 */
export const SemanaDaFamiliaSchema = z.strictObject({
  algumaCriancaVe: z.boolean(),
  inicio: DIA,
  fim: DIA,
  limiteDiarioMinutos: z.number().int().positive(),
  criancas: z.array(SemanaDaCriancaSchema).max(PERFIS_DA_FAMILIA_MAXIMO),
  aindaSemJogo: z.array(z.uuid()).max(PERFIS_DA_FAMILIA_MAXIMO),
})
export type SemanaDaFamilia = z.infer<typeof SemanaDaFamiliaSchema>

const NOME = z.string().min(1).max(80)

/**
 * O que a área dos pais recebe do repasse: a semana com o nome de cada criança (o nome vem da
 * grade de perfis da plataforma, nunca do serviço do jogo).
 */
export const SemanaDaFamiliaParaOsPaisSchema = SemanaDaFamiliaSchema.extend({
  criancas: z.array(SemanaDaCriancaSchema.extend({ nome: NOME })).max(PERFIS_DA_FAMILIA_MAXIMO),
  aindaSemJogo: z
    .array(z.strictObject({ perfilId: z.uuid(), nome: NOME }))
    .max(PERFIS_DA_FAMILIA_MAXIMO),
})
export type SemanaDaFamiliaParaOsPais = z.infer<typeof SemanaDaFamiliaParaOsPaisSchema>

/**
 * As permissões de visita da família (ECA Digital, Lei 15.211/2025, art. 21: interação restrita
 * por padrão, os pais liberam). As visitas são da Fase 3: por enquanto só se grava e se lê.
 */
export const PermissoesDaFamiliaSchema = z.strictObject({
  visitasDeIrmaos: z.boolean(),
  visitasDeOutrasCriancas: z.boolean(),
  fotosNoClube: z.boolean(),
})
export type PermissoesDaFamilia = z.infer<typeof PermissoesDaFamiliaSchema>

/** Sem escolha guardada: irmãos podem visitar; outras crianças e fotos no Clube, não. */
export const PERMISSOES_PADRAO: Readonly<PermissoesDaFamilia> = Object.freeze({
  visitasDeIrmaos: true,
  visitasDeOutrasCriancas: false,
  fotosNoClube: false,
})

// ── Recordes da família e visitas (fase3-12, 29/10/2026) ───────────────────────────────────────

/**
 * Versão das respostas dos irmãos e da casa do irmão. O jogo trata versão que não conhece como
 * "não carregou" (`docs/plans/2026-10-29-arquipelago-recordes-e-visitas.md`).
 */
export const VERSAO_DAS_VISITAS = 1

/** O melhor de cada percurso de um irmão (o mesmo formato do salvamento). */
const RecordesSchema = z.partialRecord(z.enum(PERCURSOS), ResultadoDoPercursoSchema)

/** Um irmão como o serviço do jogo o vê: só o id, os recordes e se já construiu a casa. */
export const IrmaoDoJogadorSchema = z.strictObject({
  perfilId: z.uuid(),
  percursos: RecordesSchema,
  temCasa: z.boolean(),
})
export type IrmaoDoJogador = z.infer<typeof IrmaoDoJogadorSchema>

/**
 * `GET /arquipelago/irmaos`: os irmãos da criança (a mesma conta, que veem o jogo e já jogaram
 * nela). `desligado` = os responsáveis desligaram as visitas de irmãos (`irmaos` vem vazia).
 * O serviço do jogo nunca manda nomes.
 */
export const IrmaosDoJogadorSchema = z.strictObject({
  versao: z.literal(VERSAO_DAS_VISITAS),
  situacao: z.enum(['ok', 'desligado']),
  irmaos: z.array(IrmaoDoJogadorSchema).max(PERFIS_DA_FAMILIA_MAXIMO),
})
export type IrmaosDoJogador = z.infer<typeof IrmaosDoJogadorSchema>

/** O que o jogo recebe do BFF: os mesmos irmãos com o nome da grade de perfis do Auth. */
export const IrmaosParaOJogoSchema = IrmaosDoJogadorSchema.extend({
  irmaos: z.array(IrmaoDoJogadorSchema.extend({ nome: NOME })).max(PERFIS_DA_FAMILIA_MAXIMO),
})
export type IrmaosParaOJogo = z.infer<typeof IrmaosParaOJogoSchema>
export type IrmaoParaOJogo = IrmaosParaOJogo['irmaos'][number]

/**
 * `GET /arquipelago/irmaos/:perfilId/casa`: o que a visita mostra de UM irmão, só para ver. A obra
 * da casa com o quintal (`null` = a casa de antes), a horta e os objetos com aparência (o jogo
 * desenha o modelo do objeto; a criação em si não vem). Nada mais do salvamento dele.
 * O `quarto` (30/10/2026) é o da plataforma, como o Meu quarto dele mostra; `null` quando o
 * Members não respondeu (o jogo avisa que o quarto não abriu, nunca mostra outro).
 */
export const CasaDoIrmaoSchema = z.strictObject({
  versao: z.literal(VERSAO_DAS_VISITAS),
  perfilId: z.uuid(),
  obra: ObraSchema.nullable(),
  horta: z.array(CanteiroSchema).max(24),
  completos: z.array(z.enum(OBJETOS_DA_CASA)).max(OBJETOS_DA_CASA.length),
  quarto: QuartoSchema.nullable(),
})
export type CasaDoIrmao = z.infer<typeof CasaDoIrmaoSchema>
