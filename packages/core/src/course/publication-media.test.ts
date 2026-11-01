import { describe, expect, test } from 'bun:test'
import { inventoryCourseMedia, remapCourseMedia } from './publication-media'

const origin = {
  publicBaseUrl: 'https://test-assets.example/a',
  publicBucket: 'test',
  privateBucket: 'test-private',
}
const image = 'https://test-assets.example/a/image.png'
const video = 'https://player.vimeo.com/video/1234?h=abc'
const privateFile = 'r2priv:materials/manual.pdf'
describe('mídias da publicação de curso', () => {
  test('URLs com query diferente usam uma única transferência e conservam as opções do vídeo', () => {
    const first = `${video}&loop=1`,
      second = `${video}&autoplay=1`
    const resources = inventoryCourseMedia([first, second, `${image}?v=1`, `${image}?v=2`], origin)
    expect(resources).toHaveLength(2)
    const vimeo = resources.find((r) => r.kind === 'vimeo')!
    expect(vimeo.sources).toHaveLength(2)
    const result = remapCourseMedia(
      [first, second],
      origin,
      new Map([[vimeo.source, 'https://player.vimeo.com/video/9876?h=new']]),
    )
    expect(new URL(result[0]!).searchParams.get('loop')).toBe('1')
    expect(new URL(result[1]!).searchParams.get('autoplay')).toBe('1')
  })
  test('inclui a capa, legenda, PDF, animação e URLs em programas e textos, sem duplicar downloads', () => {
    const resources = inventoryCourseMedia(
      {
        cover: image,
        animation: {
          url: 'https://test-assets.example/a/animation.edi-animation.json',
          poster: { url: image },
        },
        attachments: [{ url: privateFile }],
        blocks: [{ src: video, captions: [{ url: 'https://test-assets.example/a/caption.vtt' }] }],
        markdown: `![Desenho](${image})`,
        html: `<img src="${image}">`,
        files: {
          'main.js': `const imagem = "${image}";`,
          'escaped.js': `const imagem = "${image.replaceAll('/', '\\/')}";`,
        },
      },
      origin,
    )
    expect(resources).toHaveLength(5)
    expect(resources.find((r) => r.source === image)?.references).toHaveLength(6)
    expect(resources.find((r) => r.source === privateFile)).toMatchObject({
      kind: 'r2-private',
      bucket: 'test-private',
      key: 'materials/manual.pdf',
    })
    expect(resources.find((r) => r.source === video)?.videoId).toBe('1234')
  })
  test('não confunde um domínio parecido ou um link editorial com um arquivo da origem', () => {
    expect(
      inventoryCourseMedia(
        [
          'https://test-assets.example.evil/a/x.png',
          'https://test-assets.example/another/x.png',
          'https://example.org/leia',
          'https://{seu-dominio}',
          'https://usuario:senha@exemplo.org/rota',
        ],
        origin,
      ),
    ).toEqual([])
    expect(() => inventoryCourseMedia(['http://test-assets.example/a/image.png'], origin)).toThrow(
      'protocolo',
    )
    const upper = 'HTTPS://TEST-ASSETS.EXAMPLE/a/image.png'
    expect(
      remapCourseMedia({ url: upper }, origin, new Map([[upper, 'https://cdn.example/image.png']]))
        .url,
    ).toBe('https://cdn.example/image.png')
  })
  test('remapeia somente mídias preparadas, inclusive escapes e chaves, sem alterar a origem', () => {
    const date = new Date('2026-11-01T00:00:00Z')
    const dictionary: Record<string, string> = { [image]: 'imagem' }
    const source = {
      image,
      video,
      file: privateFile,
      code: image.replaceAll('/', '\\/'),
      dictionary,
      date,
    }
    const target = remapCourseMedia(
      source,
      origin,
      new Map([
        [image, 'https://cdn.example/new.png'],
        [video, 'https://player.vimeo.com/video/9876?h=def'],
        [privateFile, 'r2priv:production/manual.pdf'],
      ]),
    )
    expect(target.image).toBe('https://cdn.example/new.png')
    expect(target.code).toBe('https:\\/\\/cdn.example\\/new.png')
    expect(target.dictionary).toEqual({ 'https://cdn.example/new.png': 'imagem' })
    expect(target.date).toEqual(date)
    expect(target.date).not.toBe(date)
    expect(source.image).toBe(image)
    expect(() => remapCourseMedia(source, origin, new Map())).toThrow('não foi preparada')
  })
  test('recusa links de teste restantes ou destinos que tornariam o privado público', () => {
    expect(() => remapCourseMedia({ image }, origin, new Map([[image, image]]))).toThrow('Restou')
    expect(() =>
      remapCourseMedia(
        { file: privateFile },
        origin,
        new Map([[privateFile, 'https://cdn.example/manual.pdf']]),
      ),
    ).toThrow('privado')
    expect(() =>
      remapCourseMedia(
        { source: 'https:\\u002f\\u002ftest-assets.example/a/image.png' },
        origin,
        new Map(),
      ),
    ).toThrow('Restou')
    expect(() => remapCourseMedia({ video }, origin, new Map([[video, video]]))).toThrow(
      'vídeo Vimeo de destino',
    )
    expect(() =>
      remapCourseMedia({ video }, origin, new Map([[video, 'https://evil.example/file.mp4']])),
    ).toThrow('vídeo Vimeo de destino')
  })
  test('preserva opções do player, usa a autorização nova e recusa colisão de chaves', () => {
    const second = 'https://test-assets.example/a/second.png'
    expect(
      remapCourseMedia({ image }, origin, new Map([[image, 'https://cdn.example/new.png']])).image,
    ).toBe('https://cdn.example/new.png')
    const player = `${video}&loop=1#t=3s`
    const result = remapCourseMedia(
      { player },
      origin,
      new Map([[player, 'https://player.vimeo.com/video/9876?h=new']]),
    )
    expect(new URL(result.player).searchParams.get('h')).toBe('new')
    expect(new URL(result.player).searchParams.get('loop')).toBe('1')
    expect(new URL(result.player).hash).toBe('#t=3s')
    expect(() =>
      remapCourseMedia(
        { [image]: 1, [second]: 2 },
        origin,
        new Map([
          [image, 'https://cdn.example/same.png'],
          [second, 'https://cdn.example/same.png'],
        ]),
      ),
    ).toThrow('colisão')
  })
})
