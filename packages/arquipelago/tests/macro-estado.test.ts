import { expect, test } from 'bun:test'
import { ensaioInicial, lerEnsaio, partidaDoEnsaio } from '../playground/macro-estado'
import { ilhaDoArquipelago, paraLocal } from '../src/sistemas/geografia-do-arquipelago'

test('retoma por coordenadas locais, com chão conferido novamente', () => {
  const s = ensaioInicial()
  s.ponteInstalada = true
  s.posicao = { ilha: 'bosque', local: { x: 70, y: 9000, z: 40 } }
  const lido = lerEnsaio(JSON.stringify(s))
  expect(lido.posicao.local.y).toBeLessThan(40)
  const p = partidaDoEnsaio(lido, 0.6)
  expect(paraLocal(ilhaDoArquipelago('bosque'), p).x).toBe(70)
  expect(p.y).toBeCloseTo(lido.posicao.local.y + 0.85)
})

test('dados incompatíveis, mar, ilha fechada e corrupção são erros explícitos', () => {
  const inicial = ensaioInicial()
  for (const v of [
    { ...inicial, versao: 1 },
    { ...inicial, posicao: { ilha: 'sua-ilha', local: { x: 9999, y: 0, z: 0 } } },
    { ...inicial, posicao: { ilha: 'bosque', local: { x: 0, y: 4, z: 0 } } },
    { ...inicial, posicao: { ilha: 'sua-ilha', local: { x: '0', y: 0, z: 0 } } },
  ])
    expect(() => lerEnsaio(JSON.stringify(v))).toThrow()
  expect(() => lerEnsaio('{')).toThrow()
  expect(lerEnsaio(null)).toEqual(inicial)
})
test('retomada em terra não usa o chão sob construções, canteiros ou ponte de arte', () => {
  for (const [x, z] of [
    [-3, 100],
    [24, 133],
    [58, 127],
    [-10, 137],
    [-10, 147],
    [43, 145],
  ]) {
    const s = ensaioInicial()
    s.posicao = { ilha: 'sua-ilha', local: { x: x!, y: 4, z: z! } }
    expect(() => lerEnsaio(JSON.stringify(s))).toThrow('chão acessível')
  }
})
