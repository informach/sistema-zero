import { z } from 'zod'
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

export type ProblemaDoMapa =
  | { publico: 'kids'; tipo: 'politica-nao-publicada' }
  | { publico: 'kids'; tipo: 'postos-diferentes'; esperado: string[]; recebido: string[] }
  | { publico: 'adulto'; tipo: 'jornada-nao-configurada' }
  | { publico: 'adulto'; tipo: 'etapas-a-mais-ou-a-menos'; esperado: number; recebido: number }

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
