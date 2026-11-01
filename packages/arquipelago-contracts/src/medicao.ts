import { z } from 'zod'

const dia = z.iso.date()
export const DIAS_MAXIMOS_DA_MEDICAO = 90
export const GRUPO_MINIMO_DA_MEDICAO = 5

/** Dias civis inclusivos. A conferência de futuro usa o relógio do serviço. */
export const FiltroDaMedicaoSchema = z
  .strictObject({
    de: dia,
    ate: dia,
    publico: z.enum(['kids', 'adulto']),
  })
  .refine((f) => {
    const dias = (Date.parse(f.ate) - Date.parse(f.de)) / 86_400_000
    return dias >= 0 && dias < DIAS_MAXIMOS_DA_MEDICAO
  }, 'Escolha um período de até 90 dias, com início antes do fim.')
export type FiltroDaMedicao = z.infer<typeof FiltroDaMedicaoSchema>

/** Um número suprimido nunca é enviado nem como zero nem em um campo auxiliar. */
export const NumeroDaMedicaoSchema = z.discriminatedUnion('situacao', [
  z.strictObject({
    situacao: z.literal('disponivel'),
    valor: z.number().int().nonnegative().safe(),
  }),
  z.strictObject({ situacao: z.literal('poucos-dados'), valor: z.null() }),
  z.strictObject({ situacao: z.literal('aguardando'), valor: z.null() }),
])
export type NumeroDaMedicao = z.infer<typeof NumeroDaMedicaoSchema>

/**
 * O que pode faltar na medição. `volta-adulto` fica para o serviço anterior: desde as lacunas
 * (01/11/2026) os dias de jogo do adulto são guardados. A satisfação dos pais (Kids) e a
 * permanência na assinatura não têm fonte no jogo e aparecem sempre como "sem fonte".
 */
export const FONTES_QUE_FALTAM = [
  'volta-adulto',
  'compras',
  'minijogos',
  'curso-24h',
  'conclusoes-curso',
  'satisfacao-dos-pais',
  'permanencia',
] as const
export type FonteQueFalta = (typeof FONTES_QUE_FALTAM)[number]

export const RelatorioDaMedicaoSchema = z.strictObject({
  periodo: FiltroDaMedicaoSchema,
  calculadoEm: z.iso.datetime(),
  volta: z.strictObject({
    situacao: z.enum(['disponivel', 'sem-fonte']),
    coortes: z
      .array(
        z.strictObject({
          dia: dia,
          dia1: NumeroDaMedicaoSchema,
          diaSeguinte: NumeroDaMedicaoSchema,
          dia7: NumeroDaMedicaoSchema,
        }),
      )
      .max(DIAS_MAXIMOS_DA_MEDICAO),
  }),
  criacao: z.strictObject({
    pintaMolda: NumeroDaMedicaoSchema,
    criacaoGuardada: NumeroDaMedicaoSchema,
    galeria: NumeroDaMedicaoSchema,
  }),
  /** Aplicações confirmadas em revisões posteriores à base, sem reconstruir o passado. */
  mudancasDeAparencia: z
    .strictObject({
      pintaMolda: NumeroDaMedicaoSchema,
      criacaoGuardada: NumeroDaMedicaoSchema,
      galeria: NumeroDaMedicaoSchema,
    })
    .optional(),
  desafiosAprovados: NumeroDaMedicaoSchema,
  /**
   * A volta ao curso (29/10/2026), pela MESMA regra e a mesma rota do Members do cartão dos pais:
   * dias de jogo (pessoa e dia de São Paulo) e, deles, os que tiveram aula concluída até
   * `HORAS_DA_VOLTA_AO_CURSO` depois do fim de uma sessão. Só sessões com essas horas já passadas.
   * Ausente quando a fonte falta (fica em `semFonte`); opcional para o serviço e o Admin subirem
   * em qualquer ordem.
   */
  voltaAoCurso: z
    .strictObject({
      diasDeJogo: NumeroDaMedicaoSchema,
      diasComAula: NumeroDaMedicaoSchema,
    })
    .optional(),
  minijogos: NumeroDaMedicaoSchema.optional(),
  /**
   * Como se aprende no jogo (§6.28, A26). Das conclusões do período medidas (desde 31/10/2026):
   * quantas na primeira tentativa, o total de tentativas e de dicas abertas até concluir, e
   * quantas sem dica. As rotinas dos Lumis guardadas hoje e as que rodam até o fim sem erro no
   * mundo de quem as montou. Reenvios de minijogos aprovados no período (um minijogo enviado de
   * novo conta uma vez por envio a mais) e compras pagas na galeria (quantidade e moedas).
   * Opcional para o serviço anterior.
   */
  aprendizagem: z
    .strictObject({
      conclusoesMedidas: NumeroDaMedicaoSchema,
      acertoNaPrimeira: NumeroDaMedicaoSchema,
      tentativas: NumeroDaMedicaoSchema,
      semDica: NumeroDaMedicaoSchema,
      dicas: NumeroDaMedicaoSchema,
      rotinas: NumeroDaMedicaoSchema,
      rotinasQueFuncionam: NumeroDaMedicaoSchema,
      reenvios: NumeroDaMedicaoSchema,
      /** Ausentes quando o Members não respondeu (aí `compras` fica em `semFonte`). */
      compras: NumeroDaMedicaoSchema.optional(),
      moedasNasCompras: NumeroDaMedicaoSchema.optional(),
    })
    .optional(),
  semFonte: z.array(z.enum(FONTES_QUE_FALTAM)),
})
export type RelatorioDaMedicao = z.infer<typeof RelatorioDaMedicaoSchema>

/** Os objetos do relatório aceitam campo a mais; o resto da régua continua a mesma. */
function tolerante(schema: z.ZodType): z.ZodType {
  if (schema instanceof z.ZodObject)
    return z.looseObject(
      Object.fromEntries(
        Object.entries(schema.shape as Record<string, z.ZodType>).map(([k, v]) => [
          k,
          tolerante(v),
        ]),
      ),
    )
  if (schema instanceof z.ZodOptional) return tolerante(schema.unwrap() as z.ZodType).optional()
  if (schema instanceof z.ZodArray) {
    const array = schema as z.ZodArray<z.ZodType>
    const max = array._zod.bag.maximum
    const lista = z.array(tolerante(array.element))
    return typeof max === 'number' ? lista.max(max) : lista
  }
  return schema
}
export type RelatorioDaMedicaoLido = Omit<RelatorioDaMedicao, 'semFonte'> & { semFonte: string[] }
/**
 * O que o Admin lê (lacunas, 01/11/2026): tolerante a campo novo e a uma fonte que falta ainda
 * desconhecida, para o serviço poder subir antes do Admin (o painel mostra um texto padrão). Os
 * números continuam na régua estrita: um formato de número novo é mudança de contrato.
 */
export const RelatorioDaMedicaoLidoSchema = (
  tolerante(RelatorioDaMedicaoSchema) as z.ZodObject
).extend({
  semFonte: z.array(z.string().min(1).max(80)).max(40),
}) as unknown as z.ZodType<RelatorioDaMedicaoLido>
