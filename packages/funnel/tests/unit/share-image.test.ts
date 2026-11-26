import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import sharp from 'sharp'
import { COMPARTILHAMENTO, compartilhamentoDoCaminho } from '../../src/content/compartilhamento'
import { FUNNELS } from '../../src/funnels/registry'
import {
  DEFAULT_SHARE_IMAGE,
  funnelOgImage,
  isShareCard,
  SHARE_IMAGE_HEIGHT,
  SHARE_IMAGE_WIDTH,
  shareImageType,
} from '../../src/lib/seo'

// Prévia no WhatsApp e nas redes (26/11/2026): toda página manda um cartão JPEG 1200×630 em URL
// absoluta, com tipo, largura e altura. As capas do checkout são WebP, que o WhatsApp não mostra com
// segurança, e as páginas do guia e da Vivianne mandavam a imagem em caminho relativo.
const RAIZ = resolve(import.meta.dir, '../..')
const PUBLICO = resolve(RAIZ, 'public')
const SITE = 'https://sistemazero.com.br'

async function confereCartao(caminho: string) {
  const arquivo = join(PUBLICO, caminho)
  const meta = await sharp(arquivo).metadata()
  expect(meta.format, caminho).toBe('jpeg')
  expect(meta.width, caminho).toBe(SHARE_IMAGE_WIDTH)
  expect(meta.height, caminho).toBe(SHARE_IMAGE_HEIGHT)
  expect(statSync(arquivo).size, caminho).toBeLessThanOrEqual(300 * 1024)
}

describe('cartão de compartilhamento', () => {
  test('cada funil registrado tem um cartão JPEG 1200×630 em URL absoluta', async () => {
    for (const f of Object.values(FUNNELS)) {
      const url = funnelOgImage(f, SITE)
      expect(url.startsWith(`${SITE}/img/`), f.key).toBe(true)
      expect(shareImageType(url), f.key).toBe('image/jpeg')
      expect(isShareCard(url), f.key).toBe(true)
      await confereCartao(new URL(url).pathname)
    }
  })

  test('o cartão do site (bio e páginas sem cartão próprio) existe e é 1200×630', async () => {
    expect(DEFAULT_SHARE_IMAGE).toBe('/img/compartilhar.jpg')
    await confereCartao(DEFAULT_SHARE_IMAGE)
  })

  test('o layout sempre manda a imagem absoluta, com tipo, tamanho, alt e twitter:image', () => {
    const layout = readFileSync(resolve(RAIZ, 'src/layouts/BaseLayout.astro'), 'utf8')
    expect(layout).toContain('new URL(ogImage ?? DEFAULT_SHARE_IMAGE, Astro.site ?? Astro.url)')
    for (const tag of [
      'og:image"',
      'og:image:secure_url',
      'og:image:type',
      'og:image:width',
      'og:image:height',
      'og:image:alt',
      'twitter:image',
    ])
      expect(layout).toContain(tag)
  })

  test('nenhuma página passa imagem WebP ou relativa como imagem de compartilhamento', () => {
    const astros: string[] = []
    const varre = (dir: string) => {
      for (const nome of readdirSync(dir, { withFileTypes: true })) {
        const caminho = join(dir, nome.name)
        if (nome.isDirectory()) varre(caminho)
        else if (nome.name.endsWith('.astro')) astros.push(caminho)
      }
    }
    varre(resolve(RAIZ, 'src'))
    for (const arquivo of astros) {
      const texto = readFileSync(arquivo, 'utf8')
      for (const m of texto.matchAll(/ogImage=\{([^}]*)\}/g)) {
        expect(m[1], arquivo).not.toMatch(/\.webp|P\.ogImage/)
      }
    }
  })
})

describe('texto de compartilhamento (26/11/2026)', () => {
  test('nenhum título ou descrição de compartilhamento diz "pagamento" ou "oferta"', () => {
    for (const [chave, texto] of Object.entries(COMPARTILHAMENTO)) {
      expect(texto.titulo, chave).not.toMatch(/pagamento|oferta/i)
      expect(texto.descricao, chave).not.toMatch(/pagamento|oferta/i)
    }
  })

  test('cada funil tem o seu texto, e o checkout e o obrigado compartilham o da página de venda', () => {
    for (const f of Object.values(FUNNELS)) {
      const venda = compartilhamentoDoCaminho(`${f.basePath}/oferta`)
      expect(venda, f.key).toEqual(COMPARTILHAMENTO[f.key] ?? null)
      expect(venda, f.key).not.toBeNull()
      expect(compartilhamentoDoCaminho(f.basePath), f.key).toEqual(venda)
      expect(compartilhamentoDoCaminho(`${f.basePath}/checkout`), f.key).toEqual(venda)
      expect(compartilhamentoDoCaminho(`${f.basePath}/obrigado`), f.key).toEqual(venda)
    }
  })

  test('a bio usa o texto dela; o quiz não é trocado (usa o próprio, filtrado no layout)', () => {
    expect(compartilhamentoDoCaminho('/')).toEqual(COMPARTILHAMENTO.bio ?? null)
    expect(compartilhamentoDoCaminho('/kids/desafio-primeiro-jogo/quiz')).toBeNull()
    const layout = readFileSync(resolve(RAIZ, 'src/layouts/BaseLayout.astro'), 'utf8')
    expect(layout).toContain('PALAVRAS_PROIBIDAS')
    expect(layout).toContain('content={shareTitle}')
  })
})
