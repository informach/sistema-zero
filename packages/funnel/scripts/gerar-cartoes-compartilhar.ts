/**
 * Cartões de compartilhamento (og:image) do funil: um JPEG 1200×630 por produto, gerado das capas
 * que já existem (26/11/2026). O WhatsApp não mostra prévia em WebP com segurança, e as redes pedem
 * 1200×630; por isso a regra é uma só para todas as páginas (`src/lib/seo.ts`).
 *
 *   bun scripts/gerar-cartoes-compartilhar.ts
 *
 * Capa com outra proporção entra INTEIRA ("contain") sobre um fundo feito da própria imagem
 * desfocada e escurecida: nada do desenho é cortado. Os cartões do guia e do curso da Vivianne já
 * existiam (feitos à mão) e não são refeitos aqui.
 */
import { stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp from 'sharp'

const PUBLICO = resolve(import.meta.dir, '../public')
const LARGURA = 1200
const ALTURA = 630
const TETO_BYTES = 300 * 1024

const CARTOES: readonly { origem: string; destino: string }[] = [
  {
    origem: 'img/desafio-primeiro-jogo/farol-capa.webp',
    destino: 'img/desafio-primeiro-jogo/compartilhar.jpg',
  },
  {
    origem: 'img/cade-todo-mundo/cade-jogo-0.webp',
    destino: 'img/cade-todo-mundo/compartilhar.jpg',
  },
  {
    origem: 'img/comunidade-dos-criadores/checkout-capa.webp',
    destino: 'img/comunidade-dos-criadores/compartilhar.jpg',
  },
  {
    origem: 'img/comunidade-adulto/checkout-capa.webp',
    destino: 'img/comunidade-adulto/compartilhar.jpg',
  },
  // A bio e as páginas sem cartão próprio: a foto de Helena e Júlio.
  {
    origem: 'img/comunidade-dos-criadores/helena-julio-perfil.webp',
    destino: 'img/compartilhar.jpg',
  },
]

async function cartao(origem: string, destino: string): Promise<void> {
  const entrada = resolve(PUBLICO, origem)
  const fundo = await sharp(entrada)
    .resize(LARGURA, ALTURA, { fit: 'cover' })
    .blur(28)
    .modulate({ brightness: 0.72 })
    .toBuffer()
  const frente = await sharp(entrada)
    .resize(LARGURA, ALTURA, { fit: 'inside', withoutEnlargement: false })
    .toBuffer()
  const meta = await sharp(frente).metadata()
  const left = Math.round((LARGURA - (meta.width ?? LARGURA)) / 2)
  const top = Math.round((ALTURA - (meta.height ?? ALTURA)) / 2)
  for (const qualidade of [86, 80, 74, 68]) {
    await sharp(fundo)
      .composite([{ input: frente, left, top }])
      .jpeg({ quality: qualidade, mozjpeg: true, chromaSubsampling: '4:2:0' })
      .toFile(resolve(PUBLICO, destino))
    const { size } = await stat(resolve(PUBLICO, destino))
    if (size <= TETO_BYTES) {
      console.log(`${destino}: ${LARGURA}×${ALTURA}, ${Math.round(size / 1024)} KB (q${qualidade})`)
      return
    }
  }
  throw new Error(`${destino} passou de ${TETO_BYTES} bytes`)
}

for (const { origem, destino } of CARTOES) await cartao(origem, destino)
