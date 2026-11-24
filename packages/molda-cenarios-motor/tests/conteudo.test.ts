import { expect, test } from 'bun:test'
import { digestDosBytes } from '@sistemazero/molda-cenarios-core/v2'
import { conferirConteudoDoModelo } from '../src/modelos'

function exemplo() {
  const json = new TextEncoder().encode(JSON.stringify({ asset: { version: '2.0' }, meshes: [{}] }))
  const n = Math.ceil(json.length / 4) * 4
  const dados = new Uint8Array(20 + n),
    v = new DataView(dados.buffer)
  v.setUint32(0, 0x46546c67, true)
  v.setUint32(4, 2, true)
  v.setUint32(8, dados.length, true)
  v.setUint32(12, n, true)
  v.setUint32(16, 0x4e4f534a, true)
  dados.fill(32, 20)
  dados.set(json, 20)
  return dados
}
test('o renderer recusa arquivo inválido e conteúdo trocado antes de decodificar o modelo', async () => {
  const bytes = exemplo(),
    digest = await digestDosBytes(bytes)
  expect(await conferirConteudoDoModelo(bytes.buffer, digest)).toBe(bytes.buffer)
  await expect(conferirConteudoDoModelo(bytes.buffer, 'a'.repeat(64))).rejects.toThrow(
    'não corresponde',
  )
  await expect(conferirConteudoDoModelo(new ArrayBuffer(10), digest)).rejects.toThrow(
    'não é um modelo GLB',
  )
})
