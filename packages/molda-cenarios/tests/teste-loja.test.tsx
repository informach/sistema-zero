import { expect, test } from 'bun:test'
import type { EstadoDoTeste } from '@sistemazero/molda-cenarios-motor'
import { renderToStaticMarkup } from 'react-dom/server'
import { ControlesDoTesteAoVivo, criarLojaDoTeste } from '../src/oficina/telas/Testar'

const estado = (x: number): EstadoDoTeste => ({
  modo: 'terceira',
  pausado: false,
  caiu: false,
  noChao: true,
  nadando: false,
  posicao: { x, y: 0, z: 0 },
  altura: 1.16,
  velocidade: 0,
  clipes: [],
  percurso: { estado: 'parado', inicio: null, fim: null, direta: 0, caminhada: 0, segundos: 0 },
})

test('a loja do teste avisa só quem assina, só quando o estado muda', () => {
  const loja = criarLojaDoTeste()
  let avisos = 0
  const sair = loja.assinar(() => avisos++)
  expect(loja.ler()).toBeNull()
  const a = estado(1)
  loja.definir(a)
  loja.definir(a)
  expect(avisos).toBe(1)
  expect(loja.ler()).toBe(a)
  loja.definir(estado(2))
  expect(avisos).toBe(2)
  sair()
  loja.definir(null)
  expect(avisos).toBe(2)
  expect(loja.ler()).toBeNull()
})

test('o painel ao vivo lê o estado da loja e some sem teste', () => {
  const loja = criarLojaDoTeste()
  const painel = () =>
    renderToStaticMarkup(
      <ControlesDoTesteAoVivo
        loja={loja}
        comandar={() => {}}
        entrada={() => {}}
        fechar={() => {}}
      />,
    )
  expect(painel()).toBe('')
  loja.definir(estado(3))
  expect(painel()).toContain('Exploração do cenário')
})
