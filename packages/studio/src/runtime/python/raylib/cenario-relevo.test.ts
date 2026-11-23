import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { malhaDoPedacoDoRelevo, saiaDoPedaco } from '@sistemazero/molda-cenarios-core/compilar'
import { casosDoRelevo, entradasDoRelevo } from '../../../../scripts/gen-raylib-relevo-cases'

/**
 * O relevo em campo do `cenario.py` segue a referência do núcleo (plano "Mundos de 2 km", lote 6):
 * o arquivo de casos que o teste Python lê é o que o núcleo calcula hoje. Mudou a malha, a cor ou
 * a saia no núcleo? Este teste reprova até o arquivo ser regravado
 * (`bun scripts/gen-raylib-relevo-cases.ts`), e aí o teste Python confere a cópia dele.
 */
const forma = { origem: { x: -30, z: 10 }, passo: 2, colunas: 64, linhas: 64 }

test('os casos do relevo do Raylib são os que o núcleo calcula', async () => {
  const gravado = JSON.parse(
    readFileSync(new URL('./__tests__/relevo-casos.json', import.meta.url), 'utf8'),
  )
  expect(gravado).toEqual(JSON.parse(JSON.stringify(await casosDoRelevo())))
})

test('a referência: a diagonal da colisão, as alturas do campo, os buracos e as saias', () => {
  const e = entradasDoRelevo()
  const mascara = new Uint8Array(forma.colunas * forma.linhas)
  for (const i of e.buracos) mascara[i] = 1
  const dados = { forma, alturas: e.alturas, buracos: mascara, pesos: e.pesos, camadas: e.camadas }
  const p = { i0: 0, j0: 0, celulas: 8, passo: 1 }
  const m = malhaDoPedacoDoRelevo(dados, p)
  const n = 9
  // A célula (0, 0): [a, c, b, b, c, d], como `malhaDeGradeNaPeca` e a colisão.
  expect(m.indices.slice(0, 6)).toEqual([0, n, 1, 1, n, n + 1])
  // O vértice (3, 2) está na altura do campo.
  expect(m.vertices.slice((2 * n + 3) * 3, (2 * n + 3) * 3 + 3)).toEqual([
    -30 + 3 * 2,
    e.alturas[2 * 65 + 3]!,
    10 + 2 * 2,
  ])
  // Cada célula de buraco tira os dois triângulos dela.
  const furado = malhaDoPedacoDoRelevo(dados, { i0: 16, j0: 8, celulas: 16, passo: 1 })
  const inteiro = malhaDoPedacoDoRelevo(
    { ...dados, buracos: new Uint8Array(mascara.length) },
    { i0: 16, j0: 8, celulas: 16, passo: 1 },
  )
  expect(inteiro.indices.length - furado.indices.length).toBe(e.buracos.length * 6)
  // A saia cobre o afastamento entre a borda fina e a grossa (e nunca é menor que meio metro).
  expect(saiaDoPedaco(dados, { i0: 0, j0: 0, celulas: 64, passo: 8 })).toBeGreaterThan(0.5)
  // Toda cor sai opaca.
  for (let k = 3; k < m.cores.length; k += 4) expect(m.cores[k]).toBe(255)
})
