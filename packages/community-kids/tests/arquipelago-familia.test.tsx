import { afterEach, expect, mock, test } from 'bun:test'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { ladrilhosDaSemana, tempoPorExtenso } from '../src/app/pais/_components/arquipelago-familia'
import { ArquipelagoLimitCard } from '../src/app/pais/_components/arquipelago-limit-card'

const LIA = '11111111-1111-4111-8111-111111111111'
const TOM = '22222222-2222-4222-8222-222222222222'

const originalFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = originalFetch
})

const crianca = (parte: Partial<Parameters<typeof ladrilhosDaSemana>[0]> = {}) => ({
  perfilId: LIA,
  nome: 'Lia',
  desafios: { aprovados: 3, deIlhasAnteriores: 1 },
  objetos: { pinta: 2, molda: 1 },
  tempoLivre: { segundos: 4200, dias: 3 },
  ...parte,
})

test('o tempo do jogo em segundos vira a fala da família', () => {
  expect(tempoPorExtenso(0)).toBe('0 min')
  expect(tempoPorExtenso(30)).toBe('menos de 1 min')
  expect(tempoPorExtenso(4200)).toBe('1 h 10 min')
  expect(tempoPorExtenso(7200)).toBe('2 h')
})

test('cada número da semana só aparece quando o serviço o tem', () => {
  expect(ladrilhosDaSemana(crianca(), 30)).toEqual([
    {
      chave: 'desafios',
      valor: '3',
      rotulo: 'desafios do Estúdio aprovados',
      detalhe: '1 de ilhas anteriores',
    },
    {
      chave: 'objetos',
      valor: '3',
      rotulo: 'objetos com a aparência criada por Lia',
      detalhe: '2 no Pinta e 1 no Molda, desde o começo',
    },
    {
      chave: 'tempo',
      valor: '1 h 10 min',
      rotulo: 'de tempo livre no jogo',
      detalhe: 'em 3 dias, limite de 30 min por dia',
    },
  ])
  // Sem desafios no modo do jogo e sem o salvamento legível: os ladrilhos somem, nada de zero.
  expect(ladrilhosDaSemana(crianca({ desafios: null, objetos: null }), 45)).toEqual([
    {
      chave: 'tempo',
      valor: '1 h 10 min',
      rotulo: 'de tempo livre no jogo',
      detalhe: 'em 3 dias, limite de 45 min por dia',
    },
  ])
  // Sem saber a ilha mais nova, não diz quantos são de ilhas anteriores.
  const semAnteriores = ladrilhosDaSemana(
    crianca({
      desafios: { aprovados: 1, deIlhasAnteriores: null },
      objetos: { pinta: 1, molda: 0 },
      tempoLivre: { segundos: 0, dias: 0 },
    }),
    30,
  )
  expect(semAnteriores[0]).toEqual({
    chave: 'desafios',
    valor: '1',
    rotulo: 'desafio do Estúdio aprovado',
    detalhe: undefined,
  })
  expect(semAnteriores[1]?.rotulo).toBe('objeto com a aparência criada por Lia')
  expect(semAnteriores[2]).toEqual({
    chave: 'tempo',
    valor: '0 min',
    rotulo: 'de tempo livre no jogo',
    detalhe: 'limite de 30 min por dia',
  })
  const desafios = (aprovados: number, deIlhasAnteriores: number) =>
    ladrilhosDaSemana(crianca({ desafios: { aprovados, deIlhasAnteriores } }), 30)[0]
  expect(desafios(0, 0)).toMatchObject({ valor: '0', detalhe: undefined })
  expect(desafios(2, 2)?.detalhe).toBe('todos de ilhas anteriores')
  expect(desafios(2, 0)?.detalhe).toBeUndefined()
  expect(desafios(1, 1)?.detalhe).toBe('1 de ilhas anteriores')
})

const LIMITE = { limiteDiarioMinutos: 30, algumaCriancaVe: true }
const SEMANA = {
  algumaCriancaVe: true,
  inicio: '2026-10-22',
  fim: '2026-10-28',
  limiteDiarioMinutos: 30,
  criancas: [crianca()],
  aindaSemJogo: [{ perfilId: TOM, nome: 'Tom' }],
}
const PADRAO = { visitasDeIrmaos: true, visitasDeOutrasCriancas: false, fotosNoClube: false }

type Rotas = Record<string, (init?: RequestInit) => Response>

function servidor(rotas: Rotas) {
  const calls: Array<{ url: string; method: string; body?: string }> = []
  globalThis.fetch = Object.assign(
    mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      calls.push({ url, method: init?.method ?? 'GET', body: init?.body?.toString() })
      const responder = Object.entries(rotas).find(([r]) => url.endsWith(r))?.[1]
      return responder ? responder(init) : Response.json({}, { status: 404 })
    }),
    { preconnect: originalFetch.preconnect },
  )
  return calls
}

test('a volta ao curso só aparece com a leitura dos cursos e com tempo de jogo', () => {
  const curso = (parte: Parameters<typeof crianca>[0]) =>
    ladrilhosDaSemana(crianca(parte), 30).find((l) => l.chave === 'curso')
  // 3 dias jogados (crianca padrão).
  expect(curso({ voltaAoCurso: { dias: 2 } })).toEqual({
    chave: 'curso',
    valor: '2 de 3',
    rotulo: 'dias de jogo com aula concluída depois',
    detalhe: 'aula do curso, até 24 h depois de jogar',
  })
  expect(curso({ voltaAoCurso: { dias: 0 } })?.valor).toBe('0 de 3')
  // Nunca mais dias de volta que dias jogados.
  expect(curso({ voltaAoCurso: { dias: 5 } })?.valor).toBe('3 de 3')
  expect(
    curso({ voltaAoCurso: { dias: 1 }, tempoLivre: { segundos: 600, dias: 1 } }),
  ).toMatchObject({
    valor: '1 de 1',
    rotulo: 'dia de jogo com aula concluída depois',
  })
  // Sem a leitura (null ou serviço antigo) ou sem jogar: o ladrilho não existe.
  for (const parte of [
    { voltaAoCurso: null },
    {},
    { voltaAoCurso: { dias: 0 }, tempoLivre: { segundos: 0, dias: 0 } },
  ])
    expect(curso(parte)).toBeUndefined()
})

test('o cartão mostra a semana de cada criança, o limite e as três permissões', async () => {
  servidor({
    '/limite': () => Response.json(LIMITE),
    '/semana': () => Response.json(SEMANA),
    '/permissoes': () => Response.json(PADRAO),
  })
  render(<ArquipelagoLimitCard />)
  const semana = await screen.findByRole('region', { name: 'A semana no jogo' })
  expect(within(semana).getByText('Dos últimos 7 dias, de 22/10 a 28/10.')).toBeTruthy()
  expect(within(semana).getByText('Lia')).toBeTruthy()
  expect(within(semana).getByText('desafios do Estúdio aprovados')).toBeTruthy()
  expect(within(semana).getByText('1 de ilhas anteriores')).toBeTruthy()
  expect(within(semana).getByText('1 h 10 min')).toBeTruthy()
  expect(within(semana).getByText('Tom')).toBeTruthy()
  expect(
    within(semana).getByText('Ainda sem números do jogo. Eles aparecem quando a criança jogar.'),
  ).toBeTruthy()
  expect(screen.getByRole('region', { name: 'Tempo livre no Arquipélago' })).toBeTruthy()
  const irmaos = screen.getByRole('switch', { name: /Visitas de irmãos/ }) as HTMLInputElement
  const outras = screen.getByRole('switch', {
    name: /Visitas de outras crianças/,
  }) as HTMLInputElement
  const fotos = screen.getByRole('switch', { name: /Fotos no Clube/ }) as HTMLInputElement
  expect([irmaos.checked, outras.checked, fotos.checked]).toEqual([true, false, false])
})

test('ligar uma permissão grava as três de uma vez e mostra o que o servidor confirmou', async () => {
  const calls = servidor({
    '/limite': () => Response.json(LIMITE),
    '/semana': () => Response.json(SEMANA),
    '/permissoes': (init) =>
      init?.method === 'PUT' ? Response.json(JSON.parse(String(init.body))) : Response.json(PADRAO),
  })
  render(<ArquipelagoLimitCard />)
  const fotos = (await screen.findByRole('switch', { name: /Fotos no Clube/ })) as HTMLInputElement
  fireEvent.click(fotos)
  await screen.findByText('Fotos no Clube: liberado.')
  expect(fotos.checked).toBe(true)
  expect(calls.at(-1)).toEqual({
    url: '/api/parents/arquipelago/permissoes',
    method: 'PUT',
    body: JSON.stringify({ ...PADRAO, fotosNoClube: true }),
  })
})

test('permissão que não gravou volta ao que estava e avisa', async () => {
  servidor({
    '/limite': () => Response.json(LIMITE),
    '/semana': () => Response.json(SEMANA),
    '/permissoes': (init) =>
      init?.method === 'PUT' ? Response.json({}, { status: 503 }) : Response.json(PADRAO),
  })
  render(<ArquipelagoLimitCard />)
  const irmaos = (await screen.findByRole('switch', {
    name: /Visitas de irmãos/,
  })) as HTMLInputElement
  fireEvent.click(irmaos)
  expect((await screen.findByRole('alert')).textContent).toContain('Não consegui salvar')
  expect(irmaos.checked).toBe(true)
})

test('semana ou permissões fora do ar: só aquela parte some, o limite fica', async () => {
  const calls = servidor({
    '/limite': () => Response.json(LIMITE),
    '/semana': () => Response.json({}, { status: 503 }),
    '/permissoes': () => Response.json({ visitasDeIrmaos: 'sim' }),
  })
  render(<ArquipelagoLimitCard />)
  await screen.findByRole('region', { name: 'Tempo livre no Arquipélago' })
  await waitFor(() => expect(calls.length).toBe(3))
  await act(async () => await new Promise((r) => setTimeout(r, 0)))
  expect(screen.queryByRole('switch')).toBeNull()
  expect(screen.queryByRole('region', { name: 'A semana no jogo' })).toBeNull()
  expect(screen.queryByRole('alert')).toBeNull()
})

test('jogo fechado para a família: nem a semana nem as permissões são pedidas', async () => {
  const calls = servidor({
    '/limite': () => Response.json({ ...LIMITE, algumaCriancaVe: false }),
    '/semana': () => Response.json(SEMANA),
    '/permissoes': () => Response.json(PADRAO),
  })
  const { container } = render(<ArquipelagoLimitCard />)
  await waitFor(() => expect(calls.length).toBe(1))
  await new Promise((r) => setTimeout(r, 0))
  expect(calls.length).toBe(1)
  expect(container.textContent).toBe('')
})
