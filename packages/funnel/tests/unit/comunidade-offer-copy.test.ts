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
  test('começa pela preocupação dos pais e apresenta uma mudança concreta de papel', () => {
    expect(offer).toContain('Seu filho já passa horas envolvido com jogos')
    expect(offer).toContain('Mais tempo de tela não é a solução')
    expect(offer).toContain('uma alternativa concreta para uma parte desse tempo')
    expect(offer).toContain('criar os próprios jogos')
  })

  test('vende continuidade depois do primeiro jogo', () => {
    expect(offer).toContain('O primeiro jogo é só o começo')
    expect(offer).toContain('A Comunidade organiza uma jornada')
    expect(offer).toContain('A Carreira organiza a jornada')
    expect(offer).toContain('O Desafio do Primeiro Jogo')
  })

  test('explica que tudo está incluído e a carreira organiza as liberações', () => {
    expect(offer).toContain('Toda a plataforma está incluída na assinatura')
    expect(offer).toContain('A liberação acontece conforme a Carreira do Criador')
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
    ]) {
      expect(offer).not.toContain(trecho)
    }
  })

  test('usa capturas atuais para todos os pilares da experiência', () => {
    for (const filename of [
      'print-carreira.webp',
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

    expect(precheckout).toContain('A Comunidade está a um passo de começar')
    expect(precheckout).toContain('você escolhe o plano e revisa o valor e a renovação')
    expect(checkout).toContain('Escolha como sua família quer começar')
    expect(checkout).toContain('O perfil da criança será criado depois')
    expect(thanks).toContain('Assinatura confirmada. Agora vamos preparar o primeiro acesso.')
    expect(thanks).toContain('Criar perfil e abrir a Comunidade')
  })
})
