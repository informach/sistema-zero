import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SRC = join(import.meta.dir, '..', '..', 'src')
const source = (...parts: string[]) =>
  readFileSync(join(SRC, ...parts), 'utf8').replace(/\s+/g, ' ')
const offer = readFileSync(
  join(SRC, 'components', 'funnel', 'oferta', 'ComunidadeOfertaBody.astro'),
  'utf8',
).replace(/\s+/g, ' ')

describe('copy comercial da Comunidade dos Criadores', () => {
  test('apresenta criação guiada como promessa e telas e IA como apoio', () => {
    const hero = offer.match(/<h1>(.*?)<\/h1>/)?.[1]?.replace(/<[^>]+>/g, '')
    expect(hero).toContain('transformar as próprias ideias em jogos')
    expect(hero).not.toMatch(/tela|hiperfoco|inteligência artificial/i)
    expect(offer).toContain('Os primeiros projetos são guiados')
    expect(offer).toContain('elementos preparados para a criança começar')
    expect(offer).toContain('Uma parte do tempo de tela que vocês já permitem')
    expect(offer).toContain('A Comunidade também usa IA como apoio')
    expect(offer).toContain('Rafael, Débora e André já testaram a plataforma')
    expect(offer).not.toContain('Seu filho está crescendo em um mundo tecnológico')
  })

  test('vende continuidade depois do primeiro jogo', () => {
    expect(offer).toContain('O primeiro jogo é só o começo')
    expect(offer).toContain('A Comunidade organiza um percurso')
    expect(offer).toContain('A Jornada organiza o caminho inteiro')
    expect(offer).toContain('O Desafio do Primeiro Jogo')
  })

  test('explica que tudo está incluído e a jornada organiza as liberações', () => {
    expect(offer).toContain('Toda a plataforma está incluída na assinatura')
    expect(offer).toContain('A liberação acontece conforme a Jornada do Criador')
    expect(offer).toContain('sem nenhuma compra extra por dentro')
    expect(offer).not.toContain('A assinatura libera a plataforma inteira')
  })

  test('apresenta as quatro ferramentas incluídas', () => {
    expect(offer).toContain('Estúdio, Pinta, Pensa e Molda')
    expect(offer).toContain('Estúdio e Pinta chegam no posto de Construtor')
    expect(offer).toContain('Pensa no posto de Inventor')
    expect(offer).toContain('Molda no posto de Explorador de Mundos')
    expect(offer).not.toContain('<s>R$ 388</s>')
    expect(offer).not.toContain('as três ferramentas')
  })

  test('não usa absolutos, culpa ou comparações inadequadas para vender', () => {
    for (const trecho of [
      'maior talento dele',
      'Preguiça e vício',
      'Zero motivação forçada',
      'voltar sozinha',
      'ele vai sozinho',
      'Seu filho nunca fica sozinho',
      'Risco zero pra você',
      'Sessão de terapia',
      'Adiar tem um custo',
      'todo mundo vai querer jogar',
      '<h4>Resiliência</h4>',
      '<h4>Autoria e autoestima</h4>',
      '<h4>Persistência</h4>',
      'em vez de mais um recorde que some',
    ]) {
      expect(offer).not.toContain(trecho)
    }
  })

  test('descreve ações observáveis durante o projeto, sem prometer traços pessoais', () => {
    expect(offer).toContain('Entender o que cada escolha muda')
    expect(offer).toContain('Testar e ajustar')
    expect(offer).toContain('Fazer escolhas próprias')
    expect(offer).toContain('Levar a ideia até uma versão jogável')
    expect(offer).toContain('Usar ferramentas para criar')
    expect(offer).toContain('além das partidas de que já gosta')
  })

  test('usa capturas atuais para todos os pilares da experiência', () => {
    for (const filename of [
      'print-jornada.webp',
      'print-aula.webp',
      'print-oficina.webp',
      'print-mural.webp',
      'print-clube.webp',
      'print-recados.webp',
      'print-espaco.webp',
    ]) {
      expect(offer).toContain(`img('${filename}')`)
    }
    expect(offer).not.toContain("img('print-estudio.webp')")
    expect(offer).not.toContain("img('print-mundo.webp')")
  })

  test('mantém a mesma promessa do pré-checkout até a confirmação', () => {
    const precheckout = source('islands', 'PreCheckoutModal.tsx')
    const checkout = source('pages', '[audience]', '[produto]', 'checkout.astro')
    const thanks = source('pages', '[audience]', '[produto]', 'obrigado.astro')

    expect(precheckout).toContain(
      'Seu filho começa com projetos guiados para aprender a criar jogos',
    )
    expect(precheckout).toContain('revisar o plano, o valor e a renovação')
    expect(checkout).toContain('Um caminho para seu filho começar a criar jogos')
    expect(checkout).toContain('Após a aprovação, você cria até 2 perfis de criança')
    expect(thanks).toContain('Assinatura confirmada. Vamos começar o primeiro projeto?')
    expect(thanks).toContain('Abrir a Comunidade e começar')
  })
})
