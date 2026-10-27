import { expect, test } from 'bun:test'
import { assetToJson } from '@sistemazero/pinta/assets'
import { createPixelSpriteAsset } from '../../pinta/src/core/project'
import { concluirPinta } from '../src/lib/arquipelago-pinta'

test('entrega a identidade somente depois de salvar e conferir a versão na nuvem', async () => {
  const desenho = createPixelSpriteAsset({ name: 'nave', frameSize: 32 })
  const ordem: string[] = []
  const id = await concluirPinta(
    {
      async flush() {
        ordem.push('local')
        return desenho
      },
    },
    {
      async confirm(recebido) {
        expect(recebido).toBe(desenho.id)
        ordem.push('confirmar')
      },
      async download() {
        ordem.push('conferir')
        return {
          json: assetToJson(desenho),
          summary: {
            itemId: desenho.id,
            name: desenho.name,
            kind: desenho.kind,
            itemUpdatedAt: desenho.updatedAt,
            revision: 1,
            bytes: 0,
            thumb: null,
            syncedAt: 0,
          },
          parts: [],
          fetchPart: async () => '',
        }
      },
    },
  )
  expect(id).toBe(desenho.id)
  expect(ordem).toEqual(['local', 'confirmar', 'conferir'])
})

test('não entrega versão divergente nem inventa desenho na galeria', async () => {
  const desenho = createPixelSpriteAsset({ name: 'nave', frameSize: 32 })
  const nuvem = {
    async confirm() {},
    async download() {
      return null
    },
  }
  expect(
    await concluirPinta(
      {
        async flush() {
          return null
        },
      },
      nuvem,
    ),
  ).toBeNull()
  await expect(
    concluirPinta(
      {
        async flush() {
          return desenho
        },
      },
      nuvem,
    ),
  ).rejects.toThrow()
})

test('recusa quando a conta tem uma versão diferente do desenho', async () => {
  const desenho = createPixelSpriteAsset({ name: 'nave', frameSize: 32 })
  const outra = createPixelSpriteAsset({ name: 'outra', frameSize: 32 })
  const nuvem = {
    async confirm() {},
    async download() {
      return {
        json: assetToJson(outra),
        summary: {
          itemId: desenho.id,
          name: desenho.name,
          kind: desenho.kind,
          itemUpdatedAt: desenho.updatedAt,
          revision: 1,
          bytes: 0,
          thumb: null,
          syncedAt: 0,
        },
        parts: [],
        fetchPart: async () => '',
      }
    },
  }
  await expect(
    concluirPinta(
      {
        async flush() {
          return desenho
        },
      },
      nuvem,
    ),
  ).rejects.toThrow()
})
