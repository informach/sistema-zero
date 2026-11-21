import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { criarHostEmMemoria } from '../src/oficina/host-memoria'
import type { Biblioteca } from '../src/oficina/portas'
import { Gaveta, ordenarBibliotecas } from '../src/oficina/telas/Gaveta'

const biblioteca = (id: string, nome: string): Biblioteca =>
  ({ id, nome, espacoId: 'equipe', licenca: 'restrita', modelos: 0 }) as unknown as Biblioteca

test('o Adventure Land vem primeiro e as outras ficam na ordem do mundo', () => {
  const ordem = ordenarBibliotecas([
    biblioteca('r', 'Reino'),
    biblioteca('m', 'Morada'),
    biblioteca('a', 'Adventure Land'),
    biblioteca('f', 'Fantasia'),
  ])
  expect(ordem.map((b) => b.nome)).toEqual(['Adventure Land', 'Reino', 'Morada', 'Fantasia'])
  // Sem o pacote preferido, nada muda de lugar.
  expect(
    ordenarBibliotecas([biblioteca('r', 'Reino'), biblioteca('m', 'Morada')]).map((b) => b.id),
  ).toEqual(['r', 'm'])
})

test('a gaveta abre no pacote preferido, com ele em primeiro nos botões', () => {
  const html = renderToStaticMarkup(
    <Gaveta
      host={criarHostEmMemoria({ equipe: true })}
      bibliotecas={[biblioteca('r', 'Reino'), biblioteca('a', 'Adventure Land')]}
      aoPor={() => {}}
      aoArrastar={() => {}}
      aoEscolherBibliotecas={() => {}}
      aberta
      aoMudarAbertura={() => {}}
    />,
  )
  const adventure = html.indexOf('Adventure Land'),
    reino = html.indexOf('Reino')
  expect(adventure).toBeGreaterThan(-1)
  expect(adventure).toBeLessThan(reino)
  // O botão pressionado é o do Adventure Land.
  expect(html).toMatch(/aria-pressed="true"[^>]*>(<svg[\s\S]*?<\/svg>)?Adventure Land/)
})
