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
  semFonte: z.array(
    z.enum(['volta-adulto', 'compras', 'minijogos', 'curso-24h', 'conclusoes-curso']),
  ),
})
export type RelatorioDaMedicao = z.infer<typeof RelatorioDaMedicaoSchema>
