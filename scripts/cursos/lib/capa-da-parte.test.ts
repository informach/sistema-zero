import { describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { capaDaParteConfere } from './capa-da-parte'

const imagem = Buffer.from('capa aprovada da aula')
const digest = createHash('sha256').update(imagem).digest('hex')
const promovida = 'https://cdn.sistemazero.com.br/admin/course-publication/recurso/file.png'

describe('capa da parte na troca do vídeo', () => {
  test('reconhece a mesma imagem promovida com chave que não contém seu hash', async () => {
    const buscar = async (url: string) => {
      expect(String(url)).toBe(promovida)
      return new Response(imagem)
    }
    expect(await capaDaParteConfere(promovida, digest, buscar)).toBe(true)
  })

  test('recusa outra imagem, mesmo hospedada no endereço esperado da promoção', async () => {
    expect(
      await capaDaParteConfere(promovida, digest, async () => new Response('outra capa')),
    ).toBe(false)
  })

  test('não aceita a conferência quando o arquivo não pode ser lido', async () => {
    await expect(
      capaDaParteConfere(promovida, digest, async () => new Response(null, { status: 503 })),
    ).rejects.toThrow('503')
  })

  test('preserva as capas endereçadas pelo hash dos próprios bytes', async () => {
    expect(
      await capaDaParteConfere(`https://example.com/admin/${digest}.png`, digest, async () => {
        throw new Error('Este caso não precisa baixar a imagem')
      }),
    ).toBe(true)
  })
})
