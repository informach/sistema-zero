import { expect, test } from 'bun:test'
import { demonstrationFrame, fitDemonstrationImage } from '../src/video/demonstration-motion'

test('câmera usa frame local e permite busca fora de ordem sem depender da reprodução', () => {
  const end = demonstrationFrame('detail-context-v1', 119, 120)
  expect(end.context).toBe(1)
  expect(demonstrationFrame('detail-context-v1', 0, 120).context).toBe(0)
  expect(demonstrationFrame('detail-context-v1', 119, 120)).toEqual(end)
  expect(demonstrationFrame('detail-context-v1', 50, 120).context).toBeGreaterThan(0)
  expect(demonstrationFrame('detail-context-v1', 50, 120).context).toBeLessThan(1)
  expect(demonstrationFrame('detail-context-v1', -30, 120).context).toBe(0)
  expect(demonstrationFrame('detail-context-v1', 200, 120).context).toBe(1)
  expect(demonstrationFrame('detail-context-v1', 0, 1).context).toBe(1)
})
test('regra/resultado e comparação apresentam ambas as fontes sem inventar frames intermediários', () => {
  expect(demonstrationFrame('rule-result-v1', 0, 100).activeSource).toBe(0)
  expect(demonstrationFrame('rule-result-v1', 99, 100).activeSource).toBe(1)
  expect(demonstrationFrame('before-after-v1', 99, 100).activeSource).toBe(1)
  expect(demonstrationFrame('before-after-v1', 0, 100).context).toBe(1)
  expect(demonstrationFrame('before-after-v1', 50, 100).context).toBe(0)
  expect(demonstrationFrame('before-after-v1', 99, 100).context).toBe(1)
  expect(demonstrationFrame('rule-result-v1', 0, 1).context).toBe(1)
})
test('contain preserva o quadro completo e usa dimensões reais para o foco', () => {
  expect(fitDemonstrationImage(800, 600, 400, 400)).toEqual({
    width: 400,
    height: 300,
    left: 0,
    top: 50,
  })
  expect(fitDemonstrationImage(600, 800, 400, 400)).toEqual({
    width: 300,
    height: 400,
    left: 50,
    top: 0,
  })
})
