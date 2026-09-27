import { expect } from 'bun:test'
import { readGlb } from './glbRead'

/**
 * Comparação de fixture gravada TOLERANTE a ULP, e o porquê de ela existir.
 *
 * ⚠️⚠️ As fixtures do Estúdio guardam um GLB inteiro, e o caminho que as produz decompõe uma
 * matriz afim em TRS (`affineTrsChain` → `rotationQuaternion`), passando por `Math.atan2`,
 * `Math.sin` e `Math.cos`. Esses três têm **precisão definida pela implementação** no
 * ECMAScript: o Bun do Windows e o do Linux divergem no ÚLTIMO bit dos Float64. Uma fixture
 * gravada num sistema, comparada byte a byte no outro, reprova sempre — foi o que aconteceu
 * na primeira vez que estes arquivos rodaram no CI (Linux), com diferenças no 17º dígito.
 *
 * O que a fixture precisa provar continua valendo inteiro: a cópia congelada do Estúdio é a
 * mesma coisa que o produtor gera HOJE. Então números são comparados por tolerância e todo o
 * resto (nomes, ids, estrutura, contagens) continua exato. Os bytes do chunk BIN, que são
 * Float32, seguem comparados byte a byte: o arredondamento para Float32 absorve a diferença.
 */
const RELATIVE_TOLERANCE = 1e-11

function closeEnough(actual: number, expected: number): boolean {
  if (Object.is(actual, expected)) return true
  if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false
  return Math.abs(actual - expected) <= RELATIVE_TOLERANCE * Math.max(1, Math.abs(expected))
}

/** Caminho legível até o campo que divergiu; sem ele o erro seria um objeto gigante. */
function compare(actual: unknown, expected: unknown, path: string): void {
  if (typeof expected === 'number' && typeof actual === 'number') {
    if (!closeEnough(actual, expected))
      throw new Error(`${path}: ${actual} não bate com ${expected} nem por tolerância`)
    return
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) throw new Error(`${path}: esperava lista`)
    if (actual.length !== expected.length)
      throw new Error(`${path}: ${actual.length} itens contra ${expected.length}`)
    for (let i = 0; i < expected.length; i += 1) compare(actual[i], expected[i], `${path}[${i}]`)
    return
  }
  if (expected && typeof expected === 'object') {
    if (!actual || typeof actual !== 'object' || Array.isArray(actual))
      throw new Error(`${path}: esperava objeto`)
    const a = actual as Record<string, unknown>,
      e = expected as Record<string, unknown>
    expect(Object.keys(a).sort()).toEqual(Object.keys(e).sort())
    for (const key of Object.keys(e)) compare(a[key], e[key], `${path}.${key}`)
    return
  }
  expect(actual).toEqual(expected)
}

function glbOf(dataUrl: string): Uint8Array {
  return new Uint8Array(Buffer.from(dataUrl.split(',')[1] ?? '', 'base64'))
}

/** BIN idêntico byte a byte; JSON por tolerância. */
export function expectSameGlb(actualDataUrl: string, expectedDataUrl: string): void {
  const actual = readGlb(glbOf(actualDataUrl)),
    expected = readGlb(glbOf(expectedDataUrl))
  expect(actual.bin).toEqual(expected.bin)
  compare(actual.json, expected.json, 'glb')
}

/**
 * A fixture inteira: `dataUrl` pelo GLB acima, o resto por tolerância nos números e exato
 * em tudo o mais.
 */
export function expectSameFixture(actual: unknown, expected: unknown): void {
  const a = actual as Record<string, unknown>,
    e = expected as Record<string, unknown>
  expect(Object.keys(a).sort()).toEqual(Object.keys(e).sort())
  for (const key of Object.keys(e)) {
    if (key === 'dataUrl') {
      expectSameGlb(String(a.dataUrl), String(e.dataUrl))
      continue
    }
    compare(a[key], e[key], key)
  }
}
