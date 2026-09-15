import { describe, expect, test } from 'bun:test'
import { existsSync, statSync } from 'node:fs'
import { DESTINO, ORIGEM, sincroniza } from '../scripts/sync-rive-wasm'

/**
 * O `public/rive/rive.wasm` é DERIVADO (fora do git): o `dev` e o `build` o copiam
 * do pacote instalado. O que pode quebrar em silêncio é o CAMINHO DE ORIGEM — um
 * bump do `@rive-app/react-canvas` que mude o layout do pacote, ou a dep transitiva
 * `@rive-app/canvas` deixando de ser resolvível daqui. Aí o script falha, o WASM
 * não é servido, e o mascote animado cai no WebP sem que nada acuse.
 */
describe('WASM do Rive', () => {
  test('a origem existe no pacote instalado', () => {
    expect(existsSync(ORIGEM)).toBe(true)
    // Sanidade: o runtime tem ~1,8 MB. Um arquivo minúsculo aqui seria um stub.
    expect(statSync(ORIGEM).size).toBeGreaterThan(500_000)
  })

  test('sincronizar deixa o binário servível e é idempotente', () => {
    sincroniza()
    expect(existsSync(DESTINO)).toBe(true)
    expect(statSync(DESTINO).size).toBe(statSync(ORIGEM).size)
    // 2ª volta não recopia (o `dev` roda isto a cada boot).
    expect(sincroniza().copiou).toBe(false)
  })
})
