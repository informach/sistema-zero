import { describe, expect, test } from 'bun:test'
import {
  CasaDoIrmaoSchema,
  criarSalvamentoInicial,
  type IrmaoParaOJogo,
} from '@sistemazero/arquipelago-contracts'
import { criarLojaDaFamilia } from '../src/estado/familia'
import { criarLoja } from '../src/estado/loja'
import { RAIO_DA_PRAIA } from '../src/mundo/medidas'
import { criarPlataformaFalsa, QUARTO_DE_EXEMPLO } from '../src/plataforma/falsa'
import { ANA, criarFamiliaFalsa, TOMAS } from '../src/plataforma/familia-falsa'
import { obraDeExemplo } from '../src/plataforma/obra-de-exemplo'
import {
  FALA_DA_VOLTA,
  faixaDaVisita,
  falaDaChegada,
  falaDaSaida,
  hortaVisivel,
  leituraDaCasa,
  leituraDosIrmaos,
  objetoCompleto,
  obraVisivel,
  QUARTO_DA_VISITA,
  quartoVisivel,
  RAIO_DA_VISITA,
  recordesDaFamilia,
  saiuDaVisita,
  TEXTOS_DAS_VISITAS,
  type Visita,
  visitaDaCasa,
} from '../src/sistemas/visitas'

/**
 * Recordes da família e visitas (fase3-12): as contas dos recordes, as leituras do serviço com as
 * recusas, o mundo desenhando a casa do irmão e a visita sem gravar nada.
 */

const AGORA = new Date('2026-10-29T15:00:00Z')
const recorde = (ms: number, n: 0 | 1 | 2 | 3) => ({
  estrelas: { chegada: n >= 1, tempo: n >= 2, vagalumes: n >= 3 },
  melhorTempoMs: ms,
})
const irmao = (perfilId: string, nome: string, ms?: number): IrmaoParaOJogo => ({
  perfilId,
  nome,
  temCasa: false,
  percursos: ms === undefined ? {} : { 'bosque-copas': recorde(ms, 2) },
})

describe('os recordes da família', () => {
  test('do melhor tempo para o maior, quem não correu no fim, ela antes no empate', () => {
    const linhas = recordesDaFamilia('bosque-copas', recorde(60_000, 3), [
      irmao(TOMAS, 'Tomás', 95_000),
      irmao(ANA, 'Ana', 48_200),
      irmao('cccccccc-0000-4000-8000-00000000000c', 'Bia'),
      irmao('dddddddd-0000-4000-8000-00000000000d', 'Dani', 60_000),
    ])
    expect(linhas.map((l) => l.nome)).toEqual(['Ana', 'Você', 'Dani', 'Tomás', 'Bia'])
    expect(linhas[1]).toEqual({
      id: 'voce',
      nome: 'Você',
      ehVoce: true,
      tempo: '1:00,0',
      ms: 60_000,
      estrelas: 3,
    })
    expect(linhas.at(-1)).toMatchObject({ tempo: null, estrelas: 0 })
  })

  test('cada percurso tem os recordes dele; ela sem correr também fica no fim', () => {
    const linhas = recordesDaFamilia('vila-telhados', undefined, [irmao(ANA, 'Ana', 48_200)])
    expect(linhas.map((l) => [l.nome, l.tempo])).toEqual([
      ['Você', null],
      ['Ana', null],
    ])
  })
})

describe('as leituras do serviço', () => {
  const lista = { versao: 1, situacao: 'ok', irmaos: [irmao(ANA, 'Ana', 48_200)] }

  test('a lista: ok, desligada, e tudo o que não for o contrato conta como fora do ar', () => {
    expect(leituraDosIrmaos(200, lista)).toEqual({ tipo: 'ok', irmaos: lista.irmaos })
    expect(leituraDosIrmaos(200, { versao: 1, situacao: 'desligado', irmaos: [] })).toEqual({
      tipo: 'desligado',
    })
    for (const [status, corpo] of [
      [502, null],
      [403, { error: { code: 'ACESSO_BLOQUEADO' } }],
      [200, { ...lista, versao: 2 }],
      [200, { ...lista, irmaos: [{ ...lista.irmaos[0], nome: undefined }] }],
    ] as const)
      expect(leituraDosIrmaos(status, corpo)).toEqual({ tipo: 'fora-do-ar' })
  })

  test('a casa: só a do irmão pedido; 403 das visitas desligadas diz que desligaram', () => {
    const casa = { versao: 1, perfilId: ANA, obra: null, horta: [], completos: [], quarto: null }
    expect(leituraDaCasa(200, casa, ANA)).toEqual({
      tipo: 'ok',
      casa: CasaDoIrmaoSchema.parse(casa),
    })
    expect(leituraDaCasa(200, casa, TOMAS)).toEqual({ tipo: 'nao-abriu' })
    expect(leituraDaCasa(403, { error: { code: 'VISITAS_DESLIGADAS' } }, ANA)).toEqual({
      tipo: 'desligado',
    })
    expect(leituraDaCasa(404, { error: { code: 'IRMAO_NAO_ENCONTRADO' } }, ANA)).toEqual({
      tipo: 'nao-abriu',
    })
  })
})

describe('a visita', () => {
  const visita = {
    perfilId: ANA,
    nome: 'Ana',
    obra: obraDeExemplo(),
    horta: [],
    completos: ['geladeira'],
    quarto: { theme: 'espaco', placedItems: [{ itemId: 'beliche', x: 0, y: 1 }], pet: null },
  } satisfies Visita

  test('o mundo desenha a casa, a horta e os objetos do irmão', () => {
    const salvamento = criarSalvamentoInicial(AGORA)
    expect(obraVisivel({ visita: null, salvamento })).toBeNull()
    expect(obraVisivel({ visita, salvamento })).toBe(visita.obra)
    expect(hortaVisivel({ visita, salvamento })).toEqual([])
    expect(hortaVisivel({ visita: null, salvamento })).toBe(salvamento.horta)
    expect(objetoCompleto({ visita, salvamento }, 'geladeira')).toBe(true)
    expect(objetoCompleto({ visita, salvamento }, 'forno')).toBe(false)
  })

  test('o quarto de dentro é o do irmão; sem ele, vazio e o Zappy avisa', () => {
    expect(quartoVisivel({ visita: null, quarto: QUARTO_DE_EXEMPLO })).toBe(QUARTO_DE_EXEMPLO)
    expect(quartoVisivel({ visita, quarto: QUARTO_DE_EXEMPLO })).toBe(visita.quarto)
    const semQuarto = { ...visita, quarto: null }
    expect(quartoVisivel({ visita: semQuarto, quarto: QUARTO_DE_EXEMPLO })).toBe(QUARTO_DA_VISITA)
    expect(QUARTO_DA_VISITA.placedItems).toEqual([])
    expect(QUARTO_DA_VISITA.pet).toBeNull()
    expect(falaDaChegada(visita)).toBe(faixaDaVisita('Ana'))
    expect(falaDaChegada(semQuarto)).toBe(
      'Você está na casa de Ana. Aqui você só olha. O quarto de Ana não abriu agora.',
    )
  })

  test('a visita vale na ilha central; passou da praia, termina', () => {
    expect(RAIO_DA_VISITA).toBe(RAIO_DA_PRAIA)
    expect(saiuDaVisita(2.5, 11)).toBe(false)
    expect(saiuDaVisita(0, RAIO_DA_PRAIA - 0.1)).toBe(false)
    expect(saiuDaVisita(RAIO_DA_PRAIA, 1)).toBe(true)
    expect(saiuDaVisita(77, 28)).toBe(true)
  })

  test('na visita nada é gravado; ao voltar, o jogo dela muda de novo', () => {
    const gravados: unknown[] = []
    const loja = criarLoja({
      salvamento: criarSalvamentoInicial(AGORA),
      jornada: 2,
      quarto: QUARTO_DE_EXEMPLO,
      avatar: { modelo: null } as never,
      acesso: {
        liberado: true,
        motivo: null,
        limiteDiarioMinutos: null,
        usadoHojeSegundos: 0,
        contabilizaTempo: false,
      },
      aoMudar: (s) => gravados.push(s),
    })
    const antes = loja.getState().salvamento
    loja.getState().visitar(visita)
    loja.getState().mudar((s) => ({ ...s, inventario: { milho: 9 } }))
    expect(loja.getState().salvamento).toBe(antes)
    expect(gravados).toEqual([])
    loja.getState().visitar(null)
    loja.getState().mudar((s) => ({ ...s, inventario: { milho: 9 } }))
    expect(loja.getState().salvamento.inventario).toEqual({ milho: 9 })
    expect(gravados).toHaveLength(1)
  })

  test('a visita leva só o que a casa mostra, com o nome do irmão', () => {
    const casa = CasaDoIrmaoSchema.parse({
      versao: 1,
      perfilId: ANA,
      obra: null,
      horta: [],
      completos: ['forno'],
      quarto: null,
    })
    expect(visitaDaCasa({ perfilId: ANA, nome: 'Ana' }, casa)).toEqual({
      perfilId: ANA,
      nome: 'Ana',
      obra: null,
      horta: [],
      completos: ['forno'],
      quarto: null,
    })
  })
})

describe('a plataforma de mentira tem as mesmas recusas', () => {
  test('irmaos: a Ana e o Tomás, a casa de cada um; outro id, 404', async () => {
    const familia = criarFamiliaFalsa('irmaos')
    const lista = familia.buscar('/irmaos', 'GET')
    const lido = leituraDosIrmaos(lista?.status ?? 0, lista?.corpo)
    expect(lido.tipo === 'ok' && lido.irmaos.map((i) => i.nome)).toEqual(['Ana', 'Tomás'])
    const ana = familia.buscar(`/irmaos/${ANA}/casa`, 'GET')
    const casaDaAna = leituraDaCasa(ana?.status ?? 0, ana?.corpo, ANA)
    expect(casaDaAna.tipo === 'ok' && casaDaAna.casa.quarto?.theme).toBe('espaco')
    const tomas = familia.buscar(`/irmaos/${TOMAS}/casa`, 'GET')
    const casaDoTomas = leituraDaCasa(tomas?.status ?? 0, tomas?.corpo, TOMAS)
    expect(casaDoTomas.tipo === 'ok' && casaDoTomas.casa.quarto).toBeNull()
    expect(familia.buscar('/irmaos/cccccccc-0000-4000-8000-00000000000c/casa', 'GET')?.status).toBe(
      404,
    )
    expect(familia.buscar('/irmaos', 'POST')?.status).toBe(404)
    expect(familia.buscar('/galeria', 'GET')).toBeNull()
  })

  test('sozinha, desligada e fora do ar, como o serviço e o BFF', async () => {
    const sozinha = criarFamiliaFalsa()
    expect(sozinha.buscar('/irmaos', 'GET')?.corpo).toEqual({
      versao: 1,
      situacao: 'ok',
      irmaos: [],
    })
    const desligada = criarFamiliaFalsa('desligada')
    expect(desligada.buscar('/irmaos', 'GET')?.corpo).toMatchObject({ situacao: 'desligado' })
    expect(desligada.buscar(`/irmaos/${ANA}/casa`, 'GET')?.status).toBe(403)
    expect(criarFamiliaFalsa('fora-do-ar').buscar('/irmaos', 'GET')?.status).toBe(502)
  })

  test('a loja da família lê pela plataforma e marca desligada quando a casa recusa', async () => {
    const p = criarPlataformaFalsa({ persistir: false, familia: 'irmaos' })
    const familia = criarLojaDaFamilia(p)
    await familia.getState().carregar()
    const lido = familia.getState().leitura
    expect(lido?.tipo).toBe('ok')
    const ana = lido?.tipo === 'ok' ? lido.irmaos[0] : undefined
    if (!ana) throw new Error('sem a Ana')
    expect((await familia.getState().abrirCasa(ana)).tipo).toBe('ok')
    const desligada = criarLojaDaFamilia(
      criarPlataformaFalsa({ persistir: false, familia: 'desligada' }),
    )
    expect((await desligada.getState().abrirCasa(ana)).tipo).toBe('desligado')
    expect(desligada.getState().leitura).toEqual({ tipo: 'desligado' })
  })
})

test('os textos não usam travessão nem exclamação nem começam com pergunta', () => {
  for (const t of [
    ...Object.values(TEXTOS_DAS_VISITAS),
    faixaDaVisita('Ana'),
    falaDaChegada({ nome: 'Ana', quarto: null }),
    falaDaSaida('Ana'),
    FALA_DA_VOLTA,
  ]) {
    expect(t).not.toContain('—')
    expect(t).not.toContain('!')
    expect(t.split('.')[0]).not.toContain('?')
  }
})
