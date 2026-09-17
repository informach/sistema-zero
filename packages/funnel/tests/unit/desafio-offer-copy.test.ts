import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DESAFIO_PRIMEIRO_JOGO } from '../../src/funnels/desafio-primeiro-jogo'

const SRC = join(import.meta.dir, '..', '..', 'src')
const source = (path: string) => readFileSync(join(SRC, ...path.split('/')), 'utf8')

describe('copy comercial do Desafio de 30 dias', () => {
  test('registro público não anuncia a nova oferta como vitalícia', () => {
    expect(DESAFIO_PRIMEIRO_JOGO.lifetimeAccess).toBe(false)
    expect(DESAFIO_PRIMEIRO_JOGO.content.copy.precoLabel).toBe('R$ 67')
    expect(DESAFIO_PRIMEIRO_JOGO.seoDescription).toContain('30 dias de acesso')
  })

  test('oferta, checkout e obrigado tornam prazo, renovação e cupom explícitos', () => {
    const offer = source('components/funnel/oferta/DesafioOfertaBody.astro')
    const checkout = source('islands/CheckoutForm.tsx')
    const precheckout = source('islands/PreCheckoutModal.tsx')
    const thanks = source('pages/[audience]/[produto]/obrigado.astro')

    expect(offer).toContain('30 dias de acesso a partir')
    expect(offer).toContain('Pagamento único · Não é assinatura')
    expect(offer).toContain('Com o cupom {validCoupon.code}')
    expect(offer).toContain('o checkout mostra o valor com')
    expect(offer).not.toContain('ou {displayedTotal} quando')
    expect(offer).not.toContain('R$ 97')
    expect(offer).not.toContain('Pagamento único · Acesso vitalício')
    expect(checkout).toContain('Recebeu um código em uma escola, clínica ou palestra?')
    expect(checkout).toContain('Continuar por')
    expect(checkout).toContain('Renovação automática')
    expect(precheckout).toContain('O primeiro jogo está a um passo de começar')
    expect(precheckout).toContain('Compra única por Pix ou cartão')
    expect(thanks).toContain('Os 30 dias ainda não começaram')
    expect(thanks).toContain('Agora o primeiro jogo pode sair do papel')
    expect(thanks).toContain('Criar acesso e abrir a primeira etapa')
    expect(thanks).toContain('computeFixedAccessExpiry')
  })

  test('fala de tecnologia, equilíbrio e criação sem transformar horas de tela na tese', () => {
    const offer = source('components/funnel/oferta/DesafioOfertaBody.astro')
    const visibleCopy = offer.slice(0, offer.lastIndexOf('<style'))

    expect(offer).toContain('Seu filho já usa tecnologia todos os dias')
    expect(offer).toContain('A tecnologia já faz parte da infância')
    expect(offer).toContain('Além dos horários, vale olhar para o que seu filho aprende')
    expect(offer).toContain('Crianças precisam dormir bem, brincar, se')
    expect(offer).toContain('movimentar e conviver')
    expect(offer).toContain('Academia Americana de Pediatria')
    expect(offer).toContain('UNICEF')
    expect(offer).toContain('Sociedade Brasileira de Pediatria')
    expect(offer).toContain('Essas referências não avaliam nem recomendam o Sistema Zero')
    expect(offer).toContain('Criar também é brincar')
    expect(offer).toContain('Quando a nave sai da tela')
    expect(offer).toContain('respeitar os limites do jogo')
    expect(offer).toContain('Quando o ponto não aparece')
    expect(offer).toContain('No quiz, você disse que gostaria de ver seu filho')
    expect(offer).toContain('Hoje ele joga mundos criados por outras pessoas')
    expect(offer).not.toContain('Hoje, você chama seu filho para sair do jogo')
    expect(offer).not.toContain('O jogo diverte a criança.')
    expect(offer).not.toContain('A proposta não é aumentar o tempo de tela')
    expect(offer).not.toContain('Mais tempo de tela não é a resposta')
    expect(offer).not.toContain('Isso significa mais tempo de tela?')
    expect(offer).not.toContain('Seu filho não precisa de mais tempo de tela')
    expect(offer).not.toContain('tira notas excelentes')
    expect(visibleCopy).not.toContain('—')
  })

  test('termina no orgulho de mostrar uma criação, sem voltar ao conflito com o jogo', () => {
    const offer = source('components/funnel/oferta/DesafioOfertaBody.astro')
    const visibleCopy = offer.slice(0, offer.lastIndexOf('<style'))

    expect(visibleCopy).toContain('Ele se diverte criando.')
    expect(visibleCopy).toContain('Tudo o que vocês recebem para começar')
    expect(visibleCopy).not.toContain('sair do jogo')
  })

  test('explica o papel dos pais sem exigir vocabulário técnico', () => {
    const offer = source('components/funnel/oferta/DesafioOfertaBody.astro')

    expect(offer).toContain('Você apoia sem precisar ensinar')
    expect(offer).toContain('Você não precisa ensinar. Só precisa ajudar a começar.')
    expect(offer).toContain('As aulas mostram o caminho para a criança, passo a passo.')
    expect(offer).not.toContain('Você não precisa programar')
    expect(offer).not.toContain('Você não precisa saber programar.')
  })

  test('carrega os ícones uma vez no layout e preserva a fonte nos cards do papel dos pais', () => {
    const offer = source('components/funnel/oferta/DesafioOfertaBody.astro')
    const communityOffer = source('components/funnel/oferta/ComunidadeOfertaBody.astro')
    const home = source('pages/index.astro')
    const layout = source('layouts/BaseLayout.astro')
    const globalStyles = source('styles/global.css')

    expect(layout).toContain("import '@fontsource/material-symbols-rounded/400.css'")
    expect(globalStyles).toContain('.material-symbols-rounded')
    expect(globalStyles).toContain('font-family: "Material Symbols Rounded", sans-serif')
    expect(offer).not.toContain("import '@fontsource/material-symbols-rounded/400.css'")
    expect(communityOffer).not.toContain("import '@fontsource/material-symbols-rounded/400.css'")
    expect(home).not.toContain("import '@fontsource/material-symbols-rounded/400.css'")
    expect(offer).not.toMatch(/\.dpj \.arow \.al-val span\s*\{[^}]*font-family/s)
  })

  test('mostra a plataforma atual e somente entregas confirmadas do desafio', () => {
    const offer = source('components/funnel/oferta/DesafioOfertaBody.astro')

    expect(offer).toContain("img('plataforma-trilha.webp')")
    expect(offer).toContain("img('plataforma-aula.webp')")
    expect(offer).toContain("img('plataforma-experimento.webp')")
    expect(offer).toContain("img('plataforma-estudio.webp')")
    expect(offer).toContain("img('plataforma-materiais.webp')")
    expect(offer).toContain('Caderno do Aluno + Mapa dos Pais')
    expect(offer).toContain('Jogo pronto + link para compartilhar')
    expect(offer).toContain('Certificado de conclusão')
    expect(offer).not.toContain("img('print-estudio.webp')")
    expect(offer).not.toContain("img('entrega-trilha.webp')")
    expect(offer).not.toContain("img('entrega-estudio.webp')")
    expect(offer).not.toContain("img('entrega-link.webp')")
    expect(offer).not.toContain("img('entrega-video.webp')")
  })
})
