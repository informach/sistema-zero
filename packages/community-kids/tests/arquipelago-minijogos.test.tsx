import { afterEach, expect, test } from 'bun:test'
import { render, screen, waitFor } from '@testing-library/react'
import {
  MinijogosDaCrianca,
  MinijogosDaFamilia,
} from '../src/app/pais/_components/arquipelago-minijogos'

const original = globalThis.fetch
afterEach(() => {
  globalThis.fetch = original
})
test('minijogos da família aparecem sem consultar ou depender da semana', async () => {
  const caminhos: string[] = []
  globalThis.fetch = (async (url: string) => {
    caminhos.push(String(url))
    return Response.json({
      criancas: [
        {
          perfilId: '11111111-1111-4111-8111-111111111111',
          nome: 'Lia',
          minijogos: [
            {
              desafioId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
              titulo: 'Corrida',
              capa: null,
              aprovadoEm: '2026-10-29T12:00:00Z',
              atualizadoEm: '2026-10-29T12:00:00Z',
            },
          ],
        },
      ],
    })
  }) as unknown as typeof fetch
  render(<MinijogosDaFamilia />)
  await screen.findByText('Minijogos que Lia fez')
  expect(caminhos).toEqual(['/api/parents/arquipelago/minijogos'])
})
test('cartão mostra o nome e Jogar quando há minijogo', async () => {
  globalThis.fetch = (async () =>
    Response.json({
      minijogos: [
        {
          desafioId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          titulo: 'Corrida',
          capa: null,
          aprovadoEm: '2026-10-29T12:00:00Z',
          atualizadoEm: '2026-10-29T12:00:00Z',
        },
      ],
    })) as unknown as typeof fetch
  render(<MinijogosDaCrianca perfilId="11111111-1111-4111-8111-111111111111" nome="Lia" />)
  await screen.findByText('Minijogos que Lia fez')
  expect(screen.getByRole('button', { name: 'Jogar Corrida' })).toBeTruthy()
})
test('lista vazia e falha de leitura não exibem cartão nem erro', async () => {
  for (const resposta of [
    Response.json({ minijogos: [] }),
    new Response('', { status: 503 }),
    Response.json({ invalido: true }),
  ]) {
    let terminou = false
    globalThis.fetch = (async () => {
      terminou = true
      return resposta
    }) as unknown as typeof fetch
    const v = render(
      <MinijogosDaCrianca perfilId="11111111-1111-4111-8111-111111111111" nome="Lia" />,
    )
    await waitFor(() => expect(terminou).toBe(true))
    expect(v.container.textContent).toBe('')
    v.unmount()
  }
})
