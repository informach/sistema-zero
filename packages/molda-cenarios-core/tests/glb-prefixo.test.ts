import { expect, test } from 'bun:test'
import { conferirGlb, conferirInicioGlb, GLB_MAX_JSON_BYTES, tamanhoDoInicioGlb } from '../src/v2'

function arquivo(json: unknown, bin = 0) {
  const dados = new TextEncoder().encode(JSON.stringify(json)),
    n = Math.ceil(dados.length / 4) * 4
  const bytes = new Uint8Array(20 + n + (bin ? bin + 8 : 0)),
    v = new DataView(bytes.buffer)
  v.setUint32(0, 0x46546c67, true)
  v.setUint32(4, 2, true)
  v.setUint32(8, bytes.length, true)
  v.setUint32(12, n, true)
  v.setUint32(16, 0x4e4f534a, true)
  bytes.fill(32, 20, 20 + n)
  bytes.set(dados, 20)
  if (bin) {
    v.setUint32(20 + n, bin, true)
    v.setUint32(24 + n, 0x004e4942, true)
  }
  return bytes
}
const json = { asset: { version: '2.0' }, meshes: [{}] }
test('a conferência do stream precisa só do prefixo e mantém o tamanho real do arquivo', () => {
  const glb = arquivo(json, 1024),
    prefixo = glb.subarray(0, tamanhoDoInicioGlb(glb))
  expect(conferirInicioGlb(prefixo, glb.length)).toEqual(conferirGlb(glb))
  expect(() => conferirGlb(prefixo)).toThrow('incompleto')
  expect(() => conferirInicioGlb(prefixo.subarray(0, prefixo.length - 1), glb.length)).toThrow(
    'incompleto',
  )
})
test('recusa metadados grandes antes da alocação, tabelas inválidas e referências externas', () => {
  const glb = arquivo(json),
    cabecalho = glb.subarray(0, 20).slice(),
    v = new DataView(cabecalho.buffer)
  v.setUint32(8, GLB_MAX_JSON_BYTES + 64, true)
  v.setUint32(12, GLB_MAX_JSON_BYTES + 4, true)
  expect(() => tamanhoDoInicioGlb(cabecalho)).toThrow('metadados')
  for (const extra of [{ meshes: 'falso' }, { extensionsUsed: {} }, { images: [{ uri: 2 }] }])
    expect(() => conferirGlb(arquivo({ ...json, ...extra }))).toThrow()
  expect(() =>
    conferirGlb(arquivo({ ...json, buffers: [{ uri: 'https://fora.invalid/arquivo.bin' }] })),
  ).toThrow('fora')
})
test('conferência completa recusa o BIN truncado, tipo duplicado e bytes extras', () => {
  const glb = arquivo(json, 4),
    inicio = tamanhoDoInicioGlb(glb)
  const tipo = glb.slice()
  new DataView(tipo.buffer).setUint32(inicio + 4, 0x4e4f534a, true)
  expect(() => conferirGlb(tipo)).toThrow('binário')
  const tamanho = glb.slice()
  new DataView(tamanho.buffer).setUint32(inicio, 8, true)
  expect(() => conferirGlb(tamanho)).toThrow('binário')
  const extra = new Uint8Array(glb.length + 4)
  extra.set(glb)
  new DataView(extra.buffer).setUint32(8, extra.length, true)
  expect(() => conferirGlb(extra)).toThrow('binário')
})
