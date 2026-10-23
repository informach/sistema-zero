import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { EMBAIXADOR_DUVIDAS, PAINEL_EMBAIXADOR } from '../../src/content/embaixador'
import {
  AMBASSADOR_SECTIONS,
  GIFT_FAQ,
  GIFT_SECTIONS,
  PRESENTE_KIDS,
} from '../../src/content/presente'
import { PRESENTE_ADULTO } from '../../src/content/presente-adulto'
import {
  CONTINUAR_ADULTO_PATH,
  dataBrasilia,
  RESGATE_COPY,
  resgateHref,
} from '../../src/content/presente-resgate'
import BolsaResgate from '../../src/islands/BolsaResgate'
import EmbaixadorBonus, { bonusLabel } from '../../src/islands/EmbaixadorBonus'
import EmbaixadorPainel, { linksDoEmbaixador } from '../../src/islands/EmbaixadorPainel'

const src = (path: string) => Bun.file(new URL(`../../src/${path}`, import.meta.url)).text()

/** Todo texto que as páginas do presente e o painel mostram (os módulos tipados de copy). */
const MODULOS = {
  kids: PRESENTE_KIDS,
  adulto: PRESENTE_ADULTO,
  resgate: RESGATE_COPY,
  painel: PAINEL_EMBAIXADOR,
  duvidas: EMBAIXADOR_DUVIDAS,
  programa: AMBASSADOR_SECTIONS,
  experiencia: GIFT_SECTIONS,
  faq: GIFT_FAQ,
}

describe('copy do presente: as regras de voz valem nos dois públicos', () => {
  test('sem travessão, exclamação, fórmulas proibidas, "carreira", "senhor(a)" ou "IA" solta', () => {
    for (const [nome, modulo] of Object.entries(MODULOS)) {
      const texto = JSON.stringify(modulo)
      expect([nome, /[—–!]/.test(texto)]).toEqual([nome, false])
      expect([nome, /mesmo que|sem precisar|em preparação|carreira/i.test(texto)]).toEqual([
        nome,
        false,
      ])
      expect([nome, /\bsenhora?\b/i.test(texto)]).toEqual([nome, false])
      expect([nome, /\bIA\b/.test(texto)]).toEqual([nome, false])
      expect([nome, /não é [^.]{1,40}\. É /i.test(texto)]).toEqual([nome, false])
      // O nome do curso vai sem a interrogação (decisão de 16/10/2026).
      expect([nome, texto.includes('Cadê Todo Mundo?')]).toEqual([nome, false])
    }
  })

  test('a faixa Kids é 9 a 14 e o adulto é 18 ou mais, sem números inventados', () => {
    const kids = JSON.stringify([PRESENTE_KIDS, RESGATE_COPY.kids])
    expect(kids).toContain('9 a 14 anos')
    expect(kids).not.toMatch(/9 a 17|a partir de 9 anos/)
    const adulto = JSON.stringify([PRESENTE_ADULTO, RESGATE_COPY.adult])
    expect(adulto).toContain('18 anos ou mais')
    expect(adulto).not.toMatch(/9 a 14|seu filho|responsável/i)
    // Nenhum valor de bônus escrito à mão: ele vem de `bonus.amountCents`.
    expect(JSON.stringify(PAINEL_EMBAIXADOR)).not.toMatch(/R\$\s*\d/)
  })

  test('títulos no formato "Página | Sistema Zero", um por público', () => {
    for (const titulo of [
      PRESENTE_KIDS.seoTitle,
      PRESENTE_ADULTO.seoTitle,
      PAINEL_EMBAIXADOR.seoTitle,
    ])
      expect(titulo).toMatch(/^[^|·—]+ \| Sistema Zero$/)
    expect(PRESENTE_KIDS.seoTitle).not.toBe(PRESENTE_ADULTO.seoTitle)
  })
})

describe('página Kids', () => {
  test('conversa com o responsável sobre o filho e diz o que o presente inclui', () => {
    const texto = JSON.stringify(PRESENTE_KIDS)
    expect(texto).toContain('Em 7 dias, seu filho faz um jogo de procurar personagens ')
    expect(texto).toContain('O primeiro passo é do responsável')
    expect(texto).toContain('O Mural por 7 dias')
    expect(texto).toContain('link do jogo publicado')
    expect(texto).toContain('Comunidade dos Criadores, uma assinatura à parte')
    expect(texto).toContain('Cada e-mail resgata um presente Kids')
    expect(texto).not.toContain('Desafio do Primeiro Jogo')
  })

  test('as imagens são as telas reais do Kids que existem no public', async () => {
    const imagens = [
      PRESENTE_KIDS.hero.figura.imagem,
      PRESENTE_KIDS.hero.figura.zappy,
      PRESENTE_KIDS.jogo.imagem,
      PRESENTE_KIDS.aula.imagem,
      PRESENTE_KIDS.mural.imagem,
      PRESENTE_KIDS.plataforma.imagem,
    ]
    for (const imagem of imagens)
      expect([
        imagem.src,
        await Bun.file(new URL(`../../public${imagem.src}`, import.meta.url)).exists(),
      ]).toEqual([imagem.src, true])
  })
})

describe('página adulta', () => {
  test('fala com a própria pessoa, com as legendas honestas das telas', () => {
    expect(PRESENTE_ADULTO.jogo.legenda).toBe(
      'Tela da versão Kids do curso. Na área adulta, a aparência é outra.',
    )
    expect(PRESENTE_ADULTO.aula.legenda).toBe(PRESENTE_ADULTO.jogo.legenda)
    expect(PRESENTE_ADULTO.mural.imagem.src).toBe('/img/comunidade-adulto/previa-mural.webp')
    expect(PRESENTE_ADULTO.mural.legenda).toBe('Prévia do Mural adulto com dados de teste.')
    expect(PRESENTE_ADULTO.legal.termos.href).toBe('/pro/comunidade-dos-criadores/termos')
    // O link do jogo publicado continua depois dos 7 dias, como no Kids (decisão de 20/10/2026).
    expect(PRESENTE_ADULTO.condicoes.nota).toContain('link do jogo que você publicou continua')
  })

  test('o corpo adulto veste o arcade e o layout usa o rodapé pro com o Termo adulto', async () => {
    const layout = await src('components/referrals/PresenteAdultoLayout.astro')
    expect(layout).toContain('htmlClass="theme-arcade"')
    expect(layout).toContain('<Footer audience="pro" termosHref={P.legal.termos.href} />')
    expect(layout).toContain('class="cda pa-corpo"')
    const corpo = await src('components/referrals/PresenteAdultoOferta.astro')
    expect(corpo).toContain('audience="adult"')
    expect(corpo).not.toContain('audience="kids"')
    const kids = await src('components/referrals/PresenteOferta.astro')
    expect(kids).toContain('audience="kids"')
    expect(await src('components/referrals/PresenteLayout.astro')).toContain(
      'htmlClass="theme-kids"',
    )
  })
})

describe('BolsaResgate por público', () => {
  test('Kids: dados do responsável, Termo Kids e o Mural Kids', () => {
    const html = renderToStaticMarkup(
      <BolsaResgate
        code="vo-x7k2"
        referrerName="Vó Cida"
        communityUrl="https://kids.example.com"
      />,
    )
    expect(html).toContain('Estes dados são do responsável')
    expect(html).toContain('Nome do responsável')
    expect(html).toContain('E-mail do responsável')
    expect(html).toContain('Liberar o curso para minha família')
    expect(html).toContain('Presente de Vó Cida: o curso Cadê Todo Mundo e o Mural Kids por 7 dias')
    expect(html).toContain('você confirma que é o responsável pela criança')
    expect(html).toContain('href="/kids/comunidade-dos-criadores/termos"')
    expect(html).not.toContain('18 anos')
    expect(html).not.toContain('vitalício')
  })

  test('adulto: os dados da própria pessoa, 18 anos ou mais e o Termo adulto', () => {
    const html = renderToStaticMarkup(
      <BolsaResgate
        code="vo-a9x4"
        referrerName="Marta"
        communityUrl="https://comunidade.example.com"
        audience="adult"
      />,
    )
    expect(html).toContain('Seu nome')
    expect(html).toContain('Seu e-mail')
    expect(html).toContain('Telefone')
    expect(html).toContain('Liberar o meu presente')
    expect(html).toContain('na versão adulta, e o Mural adulto por 7 dias')
    expect(html).toContain('você confirma que tem 18 anos ou mais')
    expect(html).toContain('href="/pro/comunidade-dos-criadores/termos"')
    expect(html).not.toContain('responsável')
    expect(html).not.toContain('perfil da criança')
  })

  test('retomada usa o mesmo formulário com o botão de retomar', () => {
    const html = renderToStaticMarkup(
      <BolsaResgate
        code="vo-a9x4"
        referrerName="Marta"
        communityUrl="https://c.example"
        audience="adult"
        retryOnly
      />,
    )
    expect(html).toContain('Retomar meu cadastro')
  })

  test('os links levam ao app do público; "Ver como continuar" vai à continuidade adulta', () => {
    expect(resgateHref('login', 'https://comunidade.example.com')).toBe(
      'https://comunidade.example.com/login',
    )
    expect(resgateHref('senha', 'https://kids.example.com')).toBe(
      'https://kids.example.com/esqueci-senha',
    )
    expect(resgateHref('continuar', 'https://comunidade.example.com')).toBe(CONTINUAR_ADULTO_PATH)
    expect(CONTINUAR_ADULTO_PATH).toBe('/pro/comunidade-dos-criadores/oferta/continuar')
    expect(RESGATE_COPY.adult.jaResgatado.titulo).toBe('Este e-mail já recebeu um presente adulto')
    expect(RESGATE_COPY.kids.jaResgatado.titulo).toBe('Este e-mail já recebeu um presente Kids')
    expect(RESGATE_COPY.adult.concluido.entrar).toBe('Entrar na Comunidade')
  })

  test('a ilha não lê env: a URL do app chega por prop', async () => {
    const ilha = await src('islands/BolsaResgate.tsx')
    expect(ilha).not.toMatch(/lib\/env|server\/|COMMUNITY_URL/)
  })

  test('vencimento em Brasília no formato da confirmação', () => {
    expect(dataBrasilia('2026-10-27T17:00:00Z')).toBe('27/10/2026, às 14h')
    expect(dataBrasilia('2026-10-27T17:30:00Z')).toBe('27/10/2026, às 14h30')
    expect(dataBrasilia('2026-10-27T17:30:00Z', false)).toBe('27/10/2026')
  })
})

describe('painel do embaixador', () => {
  test('o seletor oferece os dois públicos e abre no link Kids', () => {
    const html = renderToStaticMarkup(
      <EmbaixadorPainel
        token="token0123456789abcdef"
        shareUrl="https://example.com/bolsa/vo-x7k2"
        shareUrls={{
          kids: 'https://example.com/bolsa/vo-x7k2',
          adult: 'https://example.com/bolsa/vo-a9x4',
        }}
        stats={{ redemptionsCompleted: 3, invitesSent: 1 }}
      />,
    )
    expect(html.match(/type="radio"/g)).toHaveLength(2)
    expect(html).toContain('Uma criança de 9 a 14 anos')
    expect(html).toContain('Alguém de 18 anos ou mais')
    expect(html).toContain('Link do presente para uma família')
    expect(html).toContain('value="https://example.com/bolsa/vo-x7k2"')
    expect(html).toContain('Você faz o cadastro por este link: https://example.com/bolsa/vo-x7k2')
    expect(html).toContain('O e-mail leva o presente <strong>para uma família</strong>')
    expect(html).toContain('1 convite por e-mail enviado')
    expect(html).not.toContain('Cadê Todo Mundo?')
  })

  test('o painel envia o público escolhido no convite e cai no Kids com a resposta antiga', async () => {
    const ilha = await src('islands/EmbaixadorPainel.tsx')
    expect(ilha).toMatch(/apiPost\('\/api\/embaixador\/convites', \{[^}]*audience: publico/)
    expect(linksDoEmbaixador('https://e.com/bolsa/k')).toEqual({
      kids: 'https://e.com/bolsa/k',
      adult: null,
    })
    expect(
      linksDoEmbaixador('https://e.com/bolsa/k', { kids: 'https://e.com/bolsa/k', adult: null }),
    ).toEqual({ kids: 'https://e.com/bolsa/k', adult: null })
    // Só http(s) vira href e entra na mensagem do WhatsApp: outro esquema conta como link ausente.
    expect(
      linksDoEmbaixador('javascript:alert(1)', {
        kids: 'javascript:alert(1)',
        adult: 'data:text/html,x',
      }),
    ).toEqual({ kids: null, adult: null })
    const html = renderToStaticMarkup(
      <EmbaixadorPainel
        token="token0123456789abcdef"
        shareUrl="javascript:alert(1)"
        stats={{ redemptionsCompleted: 0, invitesSent: 0 }}
      />,
    )
    expect(html).not.toContain('javascript:')
    expect(html).toContain(PAINEL_EMBAIXADOR.link.indisponivel)
  })

  test('bônus: o valor vem do serviço e o "liberado" só promete pagamento com a chave salva', () => {
    const item = {
      id: 'b1',
      status: 'eligible' as const,
      bonusCents: 3000,
      subscribedAt: '2026-10-14T12:00:00Z',
      paidMarkedAt: null,
    }
    expect(bonusLabel(item, false)).toBe('liberado, falta a sua chave Pix')
    expect(bonusLabel(item, true)).toBe('liberado, aguardando pagamento manual')
    const com = renderToStaticMarkup(
      <EmbaixadorBonus
        token={'t'.repeat(20)}
        bonus={{ pixKey: null, items: [item], amountCents: 4500 }}
      />,
    )
    expect(com).toMatch(/R\$\s?45,00/)
    expect(com).toContain('Kids ou adulta')
    expect(com).toContain('Cadastre a sua chave para o dinheiro sair')
    const sem = renderToStaticMarkup(
      <EmbaixadorBonus token={'t'.repeat(20)} bonus={{ pixKey: 'a@b.com', items: [] }} />,
    )
    expect(sem).toContain('receber um bônus por essa indicação')
    expect(sem).not.toMatch(/R\$\s?\d/)
  })

  test('a página do painel é privada e mostra a tabela dos dois presentes', async () => {
    const page = await src('pages/embaixador/[token].astro')
    expect(page).toContain('referrer-policy')
    expect(page).toContain('EmbaixadorPainel')
    expect(page).toContain('EmbaixadorBonus')
    expect(page).toContain('P.inclui.linhas')
    expect(PAINEL_EMBAIXADOR.inclui.linhas.map((linha) => linha.item)).toEqual([
      'O curso',
      'O Mural',
      'Depois dos 7 dias',
      'Fica para a assinatura',
      'Custo',
    ])
  })

  test('a página pública do programa fala dos dois presentes', async () => {
    const page = await src('pages/kids/embaixadores.astro')
    expect(page).toContain('Seja embaixador | Sistema Zero')
    expect(page).toContain('ou a um adulto')
    expect(page).toContain('Meu perfil')
    // A seção Embaixador de Meu perfil no app adulto (`id="embaixador"` no community).
    expect(page).toContain('/perfil#embaixador`')
    expect(page).toContain('/pais/conta#embaixador`')
    expect(JSON.stringify(AMBASSADOR_SECTIONS)).toContain('a versão adulta')
  })
})

describe('privacidade das páginas', () => {
  test('recebimento Kids, adulto e painel saem com noindex; a página do programa é indexada', async () => {
    for (const layout of [
      'components/referrals/PresenteLayout.astro',
      'components/referrals/PresenteAdultoLayout.astro',
      'components/referrals/EmbaixadorLayout.astro',
    ])
      expect([layout, /<BaseLayout [^>]*\bnoindex\b/.test(await src(layout))]).toEqual([
        layout,
        true,
      ])
    expect(await src('pages/kids/embaixadores.astro')).toContain('noindex={false}')
    const painel = await src('pages/embaixador/[token].astro')
    expect(painel).toContain("'cache-control', 'private, no-store'")
    expect(painel).toContain("'referrer-policy', 'no-referrer'")
  })
})
