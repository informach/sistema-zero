import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { assertRivFile, hasRiveMagic, InvalidRivFileError, RIVE_FORMAT_MAJOR } from '@/lib/riv-file'

/** Arquivos Rive REAIS do repo — os mesmos que o app da criança já toca. */
function zappy(nome: string): Uint8Array {
  return new Uint8Array(
    readFileSync(resolve(import.meta.dir, '../../community-kids/public/zappy', `${nome}.riv`)),
  )
}

describe('validação do .riv', () => {
  test('aceita os arquivos reais, incluindo minors DIFERENTES do mesmo major', () => {
    // ⚠️ `happy.riv` é `07 03` e `fala.riv` é `07 04`, exportados do mesmo editor
    // em datas diferentes: é a prova de que prender o MINOR recusaria arquivo bom.
    for (const nome of ['happy', 'fala', 'celebrating', 'sleeping', 'thinking']) {
      const bytes = zappy(nome)
      expect(hasRiveMagic(bytes)).toBe(true)
      expect(() => assertRivFile(bytes)).not.toThrow()
    }
    expect(zappy('happy')[4]).toBe(RIVE_FORMAT_MAJOR)
    expect(zappy('happy')[5]).not.toBe(zappy('fala')[5])
  })

  test.each([
    ['PNG renomeado', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    ['SVG (o formato que este caminho substituiu)', new TextEncoder().encode('<svg xmlns="x">')],
    ['vazio', new Uint8Array()],
    ['só três bytes do magic', new Uint8Array([0x52, 0x49, 0x56])],
    ['magic sem nada depois', new Uint8Array([0x52, 0x49, 0x56, 0x45])],
  ])('recusa %s', (_nome, bytes) => {
    expect(hasRiveMagic(bytes)).toBe(false)
    expect(() => assertRivFile(bytes)).toThrow(InvalidRivFileError)
  })

  test('recusa um major que este runtime não lê, com mensagem própria', () => {
    // Exportado por um editor mais novo: no navegador daria canvas VAZIO, calado.
    const futuro = new Uint8Array([0x52, 0x49, 0x56, 0x45, RIVE_FORMAT_MAJOR + 1, 0x00, 0x00])
    expect(hasRiveMagic(futuro)).toBe(true)
    expect(() => assertRivFile(futuro)).toThrow(/formato que o app ainda não lê/)

    // Varuint de vários bytes (bit alto ligado): ler só o 1º byte daria número errado.
    const multibyte = new Uint8Array([0x52, 0x49, 0x56, 0x45, 0x87, 0x01, 0x00])
    expect(() => assertRivFile(multibyte)).toThrow(InvalidRivFileError)
  })
})
