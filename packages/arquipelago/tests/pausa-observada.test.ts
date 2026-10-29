import { expect, test } from 'bun:test'
import { conferirPausaNoAr } from '../playground/pausa-observada'

test('amostras estáveis no ar não dependem de ultrapassar a altura usada para abrir o menu', () => {
  // Posições reais do CI 40855277559. O medidor publica a cada 250 ms:
  // quando o React pausa, a altura já pode ser menor que a da amostra do clique.
  const amostras = Array.from({ length: 5 }, () => ({
    x: 0,
    y: 28.55557037353295,
    z: 10,
    noChao: false,
  }))
  expect(amostras[1]!.y > 30).toBe(false) // condição antiga que recusava uma pausa estável
  expect(conferirPausaNoAr(amostras)).toEqual(amostras[4]!)
})

test('pouso, deslocamento em qualquer amostra e leitura incompleta continuam recusados', () => {
  const amostras = Array.from({ length: 5 }, () => ({ x: 0, y: 28, z: 10, noChao: false }))
  expect(() => conferirPausaNoAr(amostras.slice(0, 4))).toThrow('cinco amostras')
  expect(() => conferirPausaNoAr(amostras.map((a, i) => ({ ...a, noChao: i === 2 })))).toThrow(
    'queda',
  )
  expect(() =>
    conferirPausaNoAr(amostras.map((a, i) => ({ ...a, x: i === 2 ? 0.03 : 0 }))),
  ).toThrow('movendo')
  expect(() =>
    conferirPausaNoAr(amostras.map((a, i) => ({ ...a, y: i === 2 ? Number.NaN : a.y }))),
  ).toThrow('movendo')
})
