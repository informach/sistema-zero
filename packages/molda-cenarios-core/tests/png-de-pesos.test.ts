import { describe, expect, test } from 'bun:test'
import { montarPng } from '../src/v2/png-comum'
import { codificarPngDePesos, lerPngDePesos } from '../src/v2/png-de-pesos'
import { TerrenoInvalido } from '../src/v2/terreno'

/** Os pesos do chão em PNG RGBA (plano "Mundos de 2 km", lote 1, 23/11/2026). */

async function compactar(cru: Uint8Array<ArrayBuffer>): Promise<Uint8Array> {
  const fluxo = new CompressionStream('deflate')
  const escritor = fluxo.writable.getWriter()
  escritor.write(cru)
  escritor.close()
  return new Uint8Array(await new Response(fluxo.readable).arrayBuffer())
}

describe('os pesos do chão em PNG', () => {
  test('ida e volta sem perder nada, inclusive o peso de quem tem alfa 0', async () => {
    let semente = 3
    const largura = 129,
      altura = 65,
      rgba = new Uint8Array(largura * altura * 4).map(() => {
        semente = (semente * 1103515245 + 12345) % 2147483648
        return semente % 256
      })
    // O caso que o canvas estraga: só a 1ª camada, com a 4ª (alfa) valendo 0.
    rgba.set([255, 0, 0, 0], 0)
    rgba.set([10, 200, 45, 0], 4)
    const png = await codificarPngDePesos({ largura, altura, rgba })
    const volta = await lerPngDePesos(png)
    expect(volta.largura).toBe(largura)
    expect(volta.altura).toBe(altura)
    expect(Array.from(volta.rgba.subarray(0, 8))).toEqual([255, 0, 0, 0, 10, 200, 45, 0])
    expect(volta.rgba).toEqual(rgba)
  })

  test('recusa dimensões erradas', async () => {
    await expect(
      codificarPngDePesos({ largura: 2, altura: 2, rgba: new Uint8Array(3) }),
    ).rejects.toThrow(TerrenoInvalido)
  })

  test('recusa PNG que não é RGBA de 8 bits, linha com outro filtro e arquivo corrompido', async () => {
    const cinza = montarPng(2, 2, 8, 0, await compactar(new Uint8Array([0, 1, 2, 0, 3, 4])))
    await expect(lerPngDePesos(cinza)).rejects.toThrow(
      'Os pesos do chão precisam ser um PNG RGBA de 8 bits',
    )
    const filtro = new Uint8Array(2 * (1 + 2 * 4))
    filtro[0] = 1
    const comFiltro = montarPng(2, 2, 8, 6, await compactar(filtro))
    await expect(lerPngDePesos(comFiltro)).rejects.toThrow('Os pesos do chão só aceitam o filtro 0')
    const bom = await codificarPngDePesos({
      largura: 2,
      altura: 2,
      rgba: new Uint8Array(16).fill(9),
    })
    const estragado = bom.slice()
    estragado[40] = (estragado[40]! + 1) & 255
    await expect(lerPngDePesos(estragado)).rejects.toThrow(TerrenoInvalido)
  })
})
