import { afterEach, expect, mock, test } from 'bun:test'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { linhasDaSemana, tempoPorExtenso } from '../src/app/pais/_components/arquipelago-familia'
import { ArquipelagoLimitCard } from '../src/app/pais/_components/arquipelago-limit-card'

const LIA = '11111111-1111-4111-8111-111111111111'
const TOM = '22222222-2222-4222-8222-222222222222'

const originalFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = originalFetch
})

const crianca = (parte: Partial<Parameters<typeof linhasDaSemana>[0]> = {}) => ({
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

test('cada linha da semana só aparece com o número que o serviço tem', () => {
  expect(linhasDaSemana(crianca(), 30)).toEqual([
    '3 desafios do Estúdio aprovados, 1 deles de ilhas anteriores.',
    'Objetos com a aparência criada por Lia, desde o começo: 2 no Pinta e 1 no Molda.',
    'Tempo livre no jogo: 1 h 10 min em 3 dias (limite de 30 min por dia).',
  ])
  // Sem desafios no modo do jogo e sem o salvamento legível: as linhas somem, nada de zero.
  expect(linhasDaSemana(crianca({ desafios: null, objetos: null }), 45)).toEqual([
    'Tempo livre no jogo: 1 h 10 min em 3 dias (limite de 45 min por dia).',
  ])
  // Sem saber a ilha mais nova, não diz quantos são de ilhas anteriores.
  expect(
    linhasDaSemana(
      crianca({
        desafios: { aprovados: 1, deIlhasAnteriores: null },
        tempoLivre: { segundos: 0, dias: 0 },
      }),
      30,
    ),
  ).toEqual([
    '1 desafio do Estúdio aprovado.',
    'Objetos com a aparência criada por Lia, desde o começo: 2 no Pinta e 1 no Molda.',
    'Não passeou pelo jogo nestes dias (limite de 30 min por dia).',
  ])
  expect(linhasDaSemana(crianca({ desafios: { aprovados: 0, deIlhasAnteriores: 0 } }), 30)[0]).toBe(
    'Nenhum desafio do Estúdio aprovado nestes dias.',
  )
  expect(linhasDaSemana(crianca({ desafios: { aprovados: 2, deIlhasAnteriores: 2 } }), 30)[0]).toBe(
    '2 desafios do Estúdio aprovados, todos de ilhas anteriores.',
  )
  expect(linhasDaSemana(crianca({ desafios: { aprovados: 2, deIlhasAnteriores: 0 } }), 30)[0]).toBe(
    '2 desafios do Estúdio aprovados.',
  )
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
  const ultima = (parte: Parameters<typeof crianca>[0]) => linhasDaSemana(crianca(parte), 30).at(-1)
  // 3 dias jogados (crianca padrão).
  expect(ultima({ voltaAoCurso: { dias: 2 } })).toBe(
    'Concluiu aula do curso até 24 h depois de jogar em 2 dos 3 dias em que jogou.',
  )
  expect(ultima({ voltaAoCurso: { dias: 3 } })).toBe(
    'Concluiu aula do curso até 24 h depois de jogar, nos 3 dias em que jogou.',
  )
  expect(ultima({ voltaAoCurso: { dias: 0 } })).toBe(
    'Nenhuma aula do curso concluída até 24 h depois de jogar.',
  )
  expect(ultima({ voltaAoCurso: { dias: 1 }, tempoLivre: { segundos: 600, dias: 1 } })).toBe(
    'Concluiu aula do curso até 24 h depois de jogar.',
  )
  // Sem a leitura (null ou serviço antigo) ou sem jogar: a linha não existe.
  for (const parte of [
    { voltaAoCurso: null },
    {},
    { voltaAoCurso: { dias: 0 }, tempoLivre: { segundos: 0, dias: 0 } },
  ])
    expect(linhasDaSemana(crianca(parte), 30).some((l) => l.includes('aula do curso'))).toBe(false)
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
  expect(
    within(semana).getByText('3 desafios do Estúdio aprovados, 1 deles de ilhas anteriores.'),
  ).toBeTruthy()
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
