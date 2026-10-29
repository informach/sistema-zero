import {
  type Canteiro,
  type CasaDoIrmao,
  criarSalvamentoInicial,
  type IrmaosParaOJogo,
  VERSAO_DAS_VISITAS,
} from '@sistemazero/arquipelago-contracts'
import { obraDeExemplo } from './obra-de-exemplo'

/**
 * Os irmãos de mentira (fase3-12), com as mesmas respostas e recusas do serviço e do BFF:
 * - `irmaos`: a Ana (com a casa da obra de exemplo e recordes nos dois percursos) e o Tomás (a casa
 *   de antes, um recorde nas copas);
 * - `sozinha` (padrão): nenhum irmão;
 * - `desligada`: os responsáveis desligaram as visitas (a lista diz, a casa dá 403);
 * - `fora-do-ar`: o serviço ou o Auth não responderam (502).
 * No playground: `?familia=irmaos|sozinha|desligada|fora-do-ar`.
 */
export type FamiliaDoPlayground = 'irmaos' | 'sozinha' | 'desligada' | 'fora-do-ar'

export const ANA = 'aaaaaaaa-0000-4000-8000-00000000000a'
export const TOMAS = 'bbbbbbbb-0000-4000-8000-00000000000b'

const MUITO_ANTES = '2026-01-01T12:00:00.000Z'

function horta(
  plantas: Partial<Record<number, Pick<Canteiro, 'semente' | 'regadoEm'>>>,
): Canteiro[] {
  return criarSalvamentoInicial(new Date(MUITO_ANTES)).horta.map((c, i) => {
    const p = plantas[i]
    return p ? { ...c, semente: p.semente, plantadoEm: MUITO_ANTES, regadoEm: p.regadoEm } : c
  })
}

const IRMAOS: IrmaosParaOJogo['irmaos'] = [
  {
    perfilId: ANA,
    nome: 'Ana',
    temCasa: true,
    percursos: {
      'bosque-copas': {
        estrelas: { chegada: true, tempo: true, vagalumes: true },
        melhorTempoMs: 48_200,
      },
      'vila-telhados': {
        estrelas: { chegada: true, tempo: false, vagalumes: true },
        melhorTempoMs: 25_900,
      },
    },
  },
  {
    perfilId: TOMAS,
    nome: 'Tomás',
    temCasa: false,
    percursos: {
      'bosque-copas': {
        estrelas: { chegada: true, tempo: false, vagalumes: false },
        melhorTempoMs: 95_000,
      },
    },
  },
]

function casaDe(perfilId: string): CasaDoIrmao | null {
  if (perfilId === ANA)
    return {
      versao: VERSAO_DAS_VISITAS,
      perfilId,
      obra: obraDeExemplo(),
      horta: horta({
        0: { semente: 'tomate', regadoEm: MUITO_ANTES },
        1: { semente: 'milho', regadoEm: MUITO_ANTES },
        3: { semente: 'alface', regadoEm: null },
      }),
      completos: ['geladeira'],
    }
  if (perfilId === TOMAS)
    return {
      versao: VERSAO_DAS_VISITAS,
      perfilId,
      obra: null,
      horta: horta({ 2: { semente: 'alface', regadoEm: MUITO_ANTES } }),
      completos: [],
    }
  return null
}

const CASA = /^\/irmaos\/([0-9a-f-]{36})\/casa$/

export function criarFamiliaFalsa(situacao: FamiliaDoPlayground = 'sozinha') {
  return {
    buscar(caminho: string, metodo: string): { status: number; corpo: unknown } | null {
      const casa = CASA.exec(caminho)
      if (caminho !== '/irmaos' && !casa) return null
      if (metodo !== 'GET') return { status: 404, corpo: { error: { code: 'NOT_FOUND' } } }
      if (situacao === 'fora-do-ar')
        return { status: 502, corpo: { error: { code: 'ARQUIPELAGO_INDISPONIVEL' } } }
      if (!casa) {
        const corpo: IrmaosParaOJogo = {
          versao: VERSAO_DAS_VISITAS,
          situacao: situacao === 'desligada' ? 'desligado' : 'ok',
          irmaos: situacao === 'irmaos' ? IRMAOS : [],
        }
        return { status: 200, corpo }
      }
      if (situacao === 'desligada')
        return { status: 403, corpo: { error: { code: 'VISITAS_DESLIGADAS' } } }
      const achada = situacao === 'irmaos' ? casaDe(casa[1] ?? '') : null
      return achada
        ? { status: 200, corpo: achada }
        : { status: 404, corpo: { error: { code: 'IRMAO_NAO_ENCONTRADO' } } }
    },
  }
}
