import {
  type Canteiro,
  type CasaDeAmigo,
  type CasaDoIrmao,
  type CasasDeAmigos,
  criarSalvamentoInicial,
  type IrmaosParaOJogo,
  type QuartoDoJogo,
  VERSAO_DAS_VISITAS,
  VERSAO_DAS_VISITAS_DE_AMIGOS,
} from '@sistemazero/arquipelago-contracts'
import { obraDeExemplo } from './obra-de-exemplo'

/**
 * Os irmãos de mentira (fase3-12), com as mesmas respostas e recusas do serviço e do BFF:
 * - `irmaos`: a Ana (com a casa da obra de exemplo, um quarto do espaço com beliche e cachorro e
 *   recordes nos dois percursos) e o Tomás (a casa de antes, um recorde nas copas e o quarto que não
 *   abriu, como quando o Members não responde);
 * - `sozinha` (padrão): nenhum irmão;
 * - `desligada`: os responsáveis desligaram as visitas (a lista diz, a casa dá 403);
 * - `fora-do-ar`: o serviço ou o Auth não responderam (502).
 * No playground: `?familia=irmaos|sozinha|desligada|fora-do-ar`.
 */
export type FamiliaDoPlayground = 'irmaos' | 'sozinha' | 'desligada' | 'fora-do-ar'

export const ANA = 'aaaaaaaa-0000-4000-8000-00000000000a'
export const TOMAS = 'bbbbbbbb-0000-4000-8000-00000000000b'

const MUITO_ANTES = '2026-01-01T12:00:00.000Z'

/** O quarto da Ana: bem diferente do quarto de exemplo, para a visita mostrar que é o dela. */
const QUARTO_DA_ANA: QuartoDoJogo = {
  theme: 'espaco',
  placedItems: [
    { itemId: 'beliche', x: 0, y: 1, rot: 0 },
    { itemId: 'estante', x: 3, y: 0 },
    { itemId: 'mesa-estudo', x: 8, y: 0 },
    { itemId: 'pufe', x: 6, y: 4 },
    { itemId: 'planta', x: 10, y: 0 },
    { itemId: 'poster', x: 2, y: 1, wall: 'left' },
    { itemId: 'mapa-mundi', x: 5, y: 1, wall: 'right' },
  ],
  pet: 'pet-cachorro',
}

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
      quarto: QUARTO_DA_ANA,
    }
  if (perfilId === TOMAS)
    return {
      versao: VERSAO_DAS_VISITAS,
      perfilId,
      obra: null,
      horta: horta({ 2: { semente: 'alface', regadoEm: MUITO_ANTES } }),
      completos: [],
      quarto: null,
    }
  return null
}

const CASA = /^\/irmaos\/([0-9a-f-]{36})\/casa$/

/** A casa de amigo de mentira (N08a): com `irmaos`, os responsáveis já aceitaram a Casa da Lua. */
export const CASA_DA_LUA = 'cccccccc-0000-4000-8000-00000000000c'
const CASA_DE_AMIGO = /^\/amigos\/([0-9a-f-]{36})\/casa$/
const CASAS_DE_AMIGOS: CasasDeAmigos['casas'] = [{ id: CASA_DA_LUA, apelido: 'Casa da Lua' }]

function amigos(
  situacao: FamiliaDoPlayground,
  caminho: string,
): { status: number; corpo: unknown } {
  if (situacao === 'fora-do-ar')
    return { status: 502, corpo: { error: { code: 'ARQUIPELAGO_INDISPONIVEL' } } }
  const casa = CASA_DE_AMIGO.exec(caminho)
  if (!casa) {
    const corpo: CasasDeAmigos = {
      versao: VERSAO_DAS_VISITAS_DE_AMIGOS,
      situacao: situacao === 'desligada' ? 'desligado' : 'ok',
      casas: situacao === 'irmaos' ? CASAS_DE_AMIGOS : [],
    }
    return { status: 200, corpo }
  }
  if (situacao === 'desligada')
    return { status: 403, corpo: { error: { code: 'VISITAS_DE_AMIGOS_DESLIGADAS' } } }
  if (situacao !== 'irmaos' || casa[1] !== CASA_DA_LUA)
    return { status: 404, corpo: { error: { code: 'CASA_DE_AMIGO_INDISPONIVEL' } } }
  const corpo: CasaDeAmigo = {
    versao: VERSAO_DAS_VISITAS_DE_AMIGOS,
    id: CASA_DA_LUA,
    apelido: 'Casa da Lua',
    obra: obraDeExemplo(),
    horta: horta({ 0: { semente: 'milho', regadoEm: MUITO_ANTES } }),
    completos: [],
    quarto: null,
  }
  return { status: 200, corpo }
}

export function criarFamiliaFalsa(situacao: FamiliaDoPlayground = 'sozinha') {
  return {
    buscar(caminho: string, metodo: string): { status: number; corpo: unknown } | null {
      if (caminho === '/amigos' || CASA_DE_AMIGO.test(caminho))
        return metodo === 'GET'
          ? amigos(situacao, caminho)
          : { status: 404, corpo: { error: { code: 'NOT_FOUND' } } }
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
