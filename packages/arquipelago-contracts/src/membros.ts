import { z } from 'zod'
import { PERFIS_DA_FAMILIA_MAXIMO } from './api'
import { ILHAS, POSICOES_DA_JORNADA, POSTOS_DA_JORNADA } from './ilhas'

/**
 * Formatos da conversa entre o serviço do jogo e o Members (rotas internas
 * `/members/internal/arquipelago/*`, nunca pelo gateway). Os dois lados importam daqui.
 */

const TituloSchema = z.string().trim().min(1).max(200)

/** `GET /members/internal/arquipelago/jornada`: os postos do Kids e as etapas do adulto. */
export const JornadaDosMembrosSchema = z.strictObject({
  kids: z.strictObject({
    /** Versão da política publicada do Kids (0 = ainda não publicada). */
    versao: z.number().int().min(0),
    /** Identificadores dos postos, na ordem da jornada. */
    postos: z.array(z.string().min(1).max(40)).max(20),
  }),
  adulto: z.strictObject({
    versao: z.number().int().min(0),
    configurada: z.boolean(),
    /** Etapas na ordem; a Lenda é a posição depois da última, não uma etapa. */
    etapas: z
      .array(z.strictObject({ id: z.string().min(1).max(120), titulo: TituloSchema }))
      .max(50),
  }),
})
export type JornadaDosMembros = z.infer<typeof JornadaDosMembrosSchema>

const BlocoSchema = z.string().min(1).max(160)

/** `GET /members/internal/arquipelago/jogador`: posição na jornada e blocos conquistados. */
export const JogadorDosMembrosSchema = z.strictObject({
  posicao: z.number().int().min(1).max(500),
  total: z.number().int().min(1).max(500),
  blocos: z.array(BlocoSchema).max(5000),
})
export type JogadorDosMembros = z.infer<typeof JogadorDosMembrosSchema>

/** `GET /members/internal/arquipelago/curriculo-de-blocos`: que curso libera qual bloco. */
export const CurriculoDeBlocosSchema = z.strictObject({
  versao: z.number().int().min(0),
  cursos: z
    .array(
      z.strictObject({
        courseId: z.uuid(),
        titulo: TituloSchema,
        slug: z.string().min(1).max(200),
        posto: z.string().min(1).max(40).nullable(),
        papel: z.string().min(1).max(40).nullable(),
        blocos: z.array(BlocoSchema).max(3000),
      }),
    )
    .max(2000),
  catalogo: z
    .array(
      z.strictObject({
        type: BlocoSchema,
        rotulo: z.string().max(300),
        categoria: z.string().max(120),
      }),
    )
    .max(10_000),
})
export type CurriculoDeBlocos = z.infer<typeof CurriculoDeBlocosSchema>

export const ProblemaDoMapaSchema = z.discriminatedUnion('tipo', [
  z.strictObject({ publico: z.literal('kids'), tipo: z.literal('politica-nao-publicada') }),
  z.strictObject({
    publico: z.literal('kids'),
    tipo: z.literal('postos-diferentes'),
    esperado: z.array(z.string()),
    recebido: z.array(z.string()),
  }),
  z.strictObject({ publico: z.literal('adulto'), tipo: z.literal('jornada-nao-configurada') }),
  z.strictObject({
    publico: z.literal('adulto'),
    tipo: z.literal('etapas-a-mais-ou-a-menos'),
    esperado: z.number(),
    recebido: z.number(),
  }),
])
export type ProblemaDoMapa = z.infer<typeof ProblemaDoMapaSchema>

/**
 * Confere o mapa ilha → posto do contrato contra a jornada publicada. Kids: os postos do Members
 * precisam ser exatamente os do mapa, na mesma ordem. Adulto: a ilha abre pela POSIÇÃO da etapa
 * (decisão de 27/10/2026), então a jornada precisa de uma etapa por ilha antes do Farol (a Lenda).
 */
export function conferirMapaDasIlhas(jornada: JornadaDosMembros): ProblemaDoMapa[] {
  const problemas: ProblemaDoMapa[] = []
  const esperado = ILHAS.map((i) => i.posto)
  if (jornada.kids.versao === 0) problemas.push({ publico: 'kids', tipo: 'politica-nao-publicada' })
  else if (
    jornada.kids.postos.length !== esperado.length ||
    jornada.kids.postos.some((p, i) => p !== esperado[i])
  )
    problemas.push({
      publico: 'kids',
      tipo: 'postos-diferentes',
      esperado: [...esperado],
      recebido: [...jornada.kids.postos],
    })
  if (!jornada.adulto.configurada || jornada.adulto.etapas.length === 0)
    problemas.push({ publico: 'adulto', tipo: 'jornada-nao-configurada' })
  else if (jornada.adulto.etapas.length !== POSICOES_DA_JORNADA - 1)
    problemas.push({
      publico: 'adulto',
      tipo: 'etapas-a-mais-ou-a-menos',
      esperado: POSICOES_DA_JORNADA - 1,
      recebido: jornada.adulto.etapas.length,
    })
  return problemas
}

/** O mapa tem um posto por ilha, sem repetir, na ordem da jornada (conferência do próprio contrato). */
export function mapaDasIlhasEmOrdem(): boolean {
  return (
    ILHAS.length === POSTOS_DA_JORNADA.length &&
    ILHAS.every((ilha, i) => ilha.posto === POSTOS_DA_JORNADA[i] && ilha.posicao === i + 1)
  )
}

const ResultadoDeObjetivoSchema = z.strictObject({ id: z.string().max(80), passou: z.boolean() })

/**
 * `POST /members/internal/arquipelago/objetivos/analisar`: o Members confere um desafio com o
 * MESMO verificador das aulas. Corpo: `{audience, projetoInicial, gabarito, objetivos}`.
 * - `blocosDoGabarito`: os tipos de bloco do gabarito que existem no catálogo do Estúdio, sem os
 *   de moldura (`contract.domain === 'frame'`) e sem os que já vêm no projeto inicial.
 * - `vista`: os objetivos como a criança os vê (`projectObjectiveView`, sem a regra).
 * - `problemas`: o que impede publicar (regra inválida, Python, Pro, objetivo obrigatório em que o
 *   gabarito não passa, objetivos que rodam o jogo demais, executor fora do ar...).
 */
export const AnaliseDosMembrosSchema = z.strictObject({
  blocosDoGabarito: z.array(BlocoSchema).max(5000),
  blocosDesconhecidos: z.array(BlocoSchema).max(5000),
  vista: z
    .array(
      z.strictObject({
        id: z.string().max(80),
        label: z.string().max(200),
        hint: z.string().max(300).optional(),
        optional: z.literal(true).optional(),
        kind: z.enum(['block', 'idea', 'game', 'function', 'script']),
      }),
    )
    .max(20),
  problemas: z
    .array(
      z.strictObject({
        codigo: z.string().min(1).max(60),
        mensagem: z.string().min(1).max(500),
        objetivoId: z.string().max(80).optional(),
      }),
    )
    .max(100),
  gabarito: z.array(ResultadoDeObjetivoSchema).max(20),
  inicial: z.array(ResultadoDeObjetivoSchema).max(20),
})
export type AnaliseDosMembros = z.infer<typeof AnaliseDosMembrosSchema>

/**
 * `POST /members/internal/arquipelago/objetivos/verificar`: confere o projeto da pessoa.
 * Corpo: `{requester, audience, objetivos, projetoInicial, projeto}` (o `requester` é quem joga,
 * para o limite de conferências do executor ser por pessoa). 424 = executor fora; 429 = ocupado.
 */
export const VerificacaoDosMembrosSchema = z.strictObject({
  passou: z.boolean(),
  resultados: z.array(ResultadoDeObjetivoSchema).max(20),
})
export type VerificacaoDosMembros = z.infer<typeof VerificacaoDosMembrosSchema>

/** A maior janela que se pede ao Members de uma vez: os 7 dias do resumo e o dia seguinte, com folga. */
export const JANELA_DAS_AULAS_CONCLUIDAS_MAXIMA_MS = 9 * 86_400_000
/** Teto de aulas concluídas por pessoa numa resposta (ninguém conclui tanto em 9 dias). */
export const AULAS_CONCLUIDAS_MAXIMO = 500

/**
 * `GET /members/internal/arquipelago/aulas-concluidas?usuarios=&de=&ate=` (29/10/2026): a hora
 * de cada aula concluída por estas pessoas (o id do perfil no Kids) entre `de` e `ate`, para a
 * linha "concluiu aula depois de jogar" da área dos pais. Uma linha por pessoa pedida, mesmo sem
 * aula; as horas em ISO, da mais antiga para a mais nova.
 */
export const AulasConcluidasDosMembrosSchema = z.strictObject({
  usuarios: z
    .array(
      z.strictObject({
        userId: z.uuid(),
        concluidasEm: z.array(z.iso.datetime({ offset: true })).max(AULAS_CONCLUIDAS_MAXIMO),
      }),
    )
    .max(PERFIS_DA_FAMILIA_MAXIMO),
})
export type AulasConcluidasDosMembros = z.infer<typeof AulasConcluidasDosMembrosSchema>
