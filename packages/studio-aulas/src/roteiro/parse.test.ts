import { expect, test } from 'bun:test'
import { join } from 'node:path'
import { loadRoteiroFile, parseRoteiro } from './parse'

const VALIDO = `
meta:
  slug: teste-aula
  titulo: "Aula de teste"
  extensoes: [game-2d]
cenas:
  - id: c1
    tipo: apresentacao
    narracao: "Oi! Bora começar?"
    emocao: empolgado
  - id: c2
    tipo: pratica
    narracao: "Pega o bloco de criar sprite."
    acoes:
      - tipo: abrirCategoria
        categoria: "Jogo 2D"
      - tipo: pegarBloco
        bloco: sz_g2d_create_sprite
        encaixarEm: sz_frame_behavior
      - tipo: balao
        ancora: { bloco: sz_g2d_create_sprite, campo: X }
        texto: "X = onde nasce"
      - tipo: testar
`

test('parseia um roteiro válido e aplica defaults', () => {
  const r = parseRoteiro(VALIDO)
  expect(r.meta.slug).toBe('teste-aula')
  expect(r.meta.projetoInicial).toBe('vazio') // default
  expect(r.cenas).toHaveLength(2)
  const pratica = r.cenas[1]
  expect(pratica?.acoes?.[1]).toMatchObject({ tipo: 'pegarBloco', bloco: 'sz_g2d_create_sprite' })
})

test('rejeita cena com tipo inválido', () => {
  const ruim = VALIDO.replace('tipo: apresentacao', 'tipo: intro')
  expect(() => parseRoteiro(ruim)).toThrow(/Roteiro inválido/)
})

test('rejeita ids de cena repetidos', () => {
  const ruim = VALIDO.replace('id: c2', 'id: c1')
  expect(() => parseRoteiro(ruim)).toThrow(/id de cena repetido/)
})

test('rejeita YAML quebrado', () => {
  expect(() => parseRoteiro('meta: [::')).toThrow(/YAML/)
})

test.each([
  'dia-3-tela-sincronizada',
  'dia-3-jogo-completo',
])('%s pausa o gerador de asteroides fora da tela jogando', (aula) => {
  const roteiro = loadRoteiroFile(join(import.meta.dir, '../../aulas', aula, 'roteiro.yaml'))
  const acoes = roteiro.cenas.flatMap((cena) => cena.acoes ?? [])
  const protecao = acoes.find(
    (acao) =>
      acao.tipo === 'envolver' &&
      acao.container === 'sz_js_if_else' &&
      acao.corpo === 'THEN' &&
      acao.deDentroDe === 'sz_g2d_every_frames' &&
      acao.inputPai === 'BODY',
  )

  expect(protecao?.tipo).toBe('envolver')
  if (protecao?.tipo !== 'envolver') return

  expect(acoes).toContainEqual(
    expect.objectContaining({
      tipo: 'preencherSoquete',
      bloco: 'sz_g2d_scene_is',
      emBloco: `@${protecao.ref}`,
      input: 'COND',
      campo: 'SCENE',
      valor: 'jogando',
    }),
  )
})
