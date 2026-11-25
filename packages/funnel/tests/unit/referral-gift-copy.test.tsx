import { describe, expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { EMBAIXADOR_DUVIDAS, PAINEL_EMBAIXADOR } from '../../src/content/embaixador'
import {
  AMBASSADOR_SECTIONS,
  GIFT_FAQ,
  GIFT_SECTIONS,
  PRESENTE_KIDS,
  presenteKidsDaOferta,
} from '../../src/content/presente'
import { PRESENTE_ADULTO, presenteAdultoDaOferta } from '../../src/content/presente-adulto'
import { presenteCursoCopy } from '../../src/content/presente-curso'
import {
  CONTINUAR_ADULTO_PATH,
  cursoParaPaisHref,
  dataBrasilia,
  RESGATE_COPY,
  resgateCopy,
  resgateHref,
} from '../../src/content/presente-resgate'
import BolsaResgate from '../../src/islands/BolsaResgate'
import EmbaixadorBonus, { bonusLabel } from '../../src/islands/EmbaixadorBonus'
import EmbaixadorCampanhas from '../../src/islands/EmbaixadorCampanhas'
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

  test('a faixa Kids é 5 a 17 (abaixo de 9 com acompanhante) e o adulto é 18 ou mais', () => {
    const kids = JSON.stringify([PRESENTE_KIDS, RESGATE_COPY.kids])
    expect(kids).toContain('5 a 17 anos')
    expect(kids).not.toMatch(/9 a 17|9 a 14|menores também|menores de 9 anos também/)
    const adulto = JSON.stringify([PRESENTE_ADULTO, RESGATE_COPY.adult])
    expect(adulto).toContain('18 anos ou mais')
    expect(adulto).not.toMatch(/5 a 17|9 a 17|seu filho|responsável/i)
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
    expect(texto).toContain('treinar habilidades cognitivas para a vida')
    expect(texto).toContain('funções executivas')
    expect(texto).toContain('causa e consequência')
    expect(texto).toContain('O primeiro passo é do responsável')
    expect(texto).toContain('7 dias de acesso ao curso e ao Mural')
    expect(texto).toContain('link de um jogo publicado permanece acessível')
    expect(texto).toContain('assinatura à parte')
    expect(texto).toContain('Cada e-mail pode resgatar um presente Kids')
    expect(texto).toContain('pensado para crianças e adolescentes de 5 a 17 anos. Abaixo de 9 anos')
    expect(texto).toContain('abaixo de 9 anos, precisa de acompanhante')
    expect(PRESENTE_KIDS.hero.beneficios[1]).toBe('7 dias de acesso ao curso e ao Mural')
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
      PRESENTE_KIDS.porQue.imagem,
      PRESENTE_KIDS.familia.imagem,
      ...PRESENTE_KIDS.habilidades.comparacao.map((figura) => figura.imagem),
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
    // O Termo adulto é o padrão do rodapé; a página de venda do Cadê adulto passa o dela.
    expect(layout).toContain('termosHref = P.legal.termos.href')
    expect(layout).toContain('<Footer audience="pro" termosHref={termosHref} />')
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
  test('o título público da campanha não recebe uma segunda introdução de presente', () => {
    const title = 'Um presente da palestra na clínica Laopa'
    expect(PRESENTE_KIDS.origem.evento.replace('{{nome}}', title)).toBe(title)
    for (const audience of ['kids', 'adult'] as const) {
      const html = renderToStaticMarkup(
        <BolsaResgate
          code="laopa-20261106"
          referrerName={title}
          communityUrl="https://community.example.com"
          audience={audience}
          campaign
        />,
      )
      expect(html).toContain(`${title}: o curso Cadê Todo Mundo`)
      expect(html).not.toContain(`Presente de ${title}`)
    }
  })

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
    expect(html).toContain('Liberar o presente para minha família')
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

/** A copy pela oferta do presente (15/11/2026): curso, prazo e Mural vêm do `gift`. */
const OFERTA_CADE = {
  offerId: '22222222-2222-4222-8222-222222222222',
  offerTitle: 'Cadê Todo Mundo 7 dias',
  courseSlug: 'cade-todo-mundo',
  courseTitle: 'Cadê Todo Mundo',
  learner: 'child' as const,
  accessDays: 7,
  includesMural: true,
}
const OFERTA_PAIS = {
  offerId: '44444444-4444-4444-8444-444444444444',
  offerTitle: 'Vilão em aliado',
  courseSlug: 'transformando-o-vilao-em-aliado',
  courseTitle: 'Transformando o vilão em aliado',
  learner: 'parents' as const,
  accessDays: null,
  includesMural: false,
}
const OFERTA_FAROL = {
  ...OFERTA_CADE,
  offerTitle: 'A Chave do Farol 30 dias',
  courseSlug: 'a-chave-do-farol',
  courseTitle: 'A Chave do Farol',
  accessDays: 30,
}

describe('presente pela oferta do catálogo', () => {
  test('sem gift a copy é a de sempre; o Cadê de 7 dias com Mural repete o texto antigo', () => {
    expect(resgateCopy('kids')).toBe(RESGATE_COPY.kids)
    expect(resgateCopy('kids', OFERTA_CADE).rodape).toBe(RESGATE_COPY.kids.rodape)
    expect(
      resgateCopy('adult', { ...OFERTA_CADE, courseSlug: 'cade-todo-mundo-adulto' }).rodape,
    ).toBe(RESGATE_COPY.adult.rodape)
    expect(presenteKidsDaOferta(undefined)).toBe(PRESENTE_KIDS)
    expect(JSON.stringify(presenteKidsDaOferta(OFERTA_CADE))).toBe(JSON.stringify(PRESENTE_KIDS))
    expect(JSON.stringify(presenteAdultoDaOferta(OFERTA_CADE))).toBe(
      JSON.stringify(PRESENTE_ADULTO),
    )
  })

  test('o Cadê com outro prazo troca os 7 dias da página inteira e do formulário', () => {
    const P = presenteKidsDaOferta({ ...OFERTA_CADE, accessDays: 14 })
    const texto = JSON.stringify(P)
    expect(texto).not.toMatch(/(?<!\d)7 dias|sete dias/i)
    expect(P.hero.beneficios[1]).toBe('14 dias de acesso ao curso e ao Mural')
    expect(P.barra.titulo).toBe('Presente de 14 dias')
    expect(texto).toContain('5 a 17 anos')
    const adulto = JSON.stringify(presenteAdultoDaOferta({ ...OFERTA_CADE, accessDays: 14 }))
    expect(adulto).not.toMatch(/(?<!\d)7 (dias|DIAS)|sete dias/i)
    expect(adulto).toContain('CURSO · 14 DIAS')
    const t = resgateCopy('kids', { ...OFERTA_CADE, accessDays: 14 })
    expect(t.rodape).toBe(
      'Presente de {{nome}}: o curso Cadê Todo Mundo e o Mural Kids por 14 dias, sem custo e sem cartão.',
    )
    expect(t.erros.expirado).toStartWith('Os 14 dias contados do seu cadastro já terminaram.')
  })

  test('o Cadê sem o Mural na oferta tira a seção e o cartão do Mural', async () => {
    const P = presenteKidsDaOferta({ ...OFERTA_CADE, includesMural: false })
    expect(P.hero.beneficios[1]).toBe('7 dias de acesso ao curso')
    expect(P.condicoes.cartoes.map((c) => c.titulo)).not.toContain('Mural para compartilhar')
    expect(resgateCopy('kids', { ...OFERTA_CADE, includesMural: false }).rodape).toBe(
      'Presente de {{nome}}: o curso Cadê Todo Mundo por 7 dias, sem custo e sem cartão.',
    )
    const adulto = presenteAdultoDaOferta({ ...OFERTA_CADE, includesMural: false })
    expect(adulto.condicoes.cartoes.map((c) => c.rotulo)).toEqual([
      'CURSO · 7 DIAS',
      'R$ 0 · SEM CARTÃO',
    ])
    for (const pagina of ['PresenteOferta', 'PresenteAdultoOferta'])
      expect(await src(`components/referrals/${pagina}.astro`)).toContain(
        '{mostraMural && <section',
      )
  })

  test('curso para pais: para o pai ou a mãe, sem perfil do filho, sem Mural, sem prazo', () => {
    const P = presenteCursoCopy('kids', OFERTA_PAIS, 'pais')
    const texto = JSON.stringify(P)
    expect(P.hero.titulo.destaque).toBe('um curso para você, pai ou mãe.')
    expect(P.hero.beneficios).toEqual([
      'Um curso para você, pai ou mãe',
      'Acesso ao curso, sem prazo',
      'Presente gratuito, sem cartão e sem assinatura automática',
    ])
    expect(texto).toContain('Transformando o vilão em aliado')
    expect(texto).toContain('Cursos para pais')
    expect(texto).not.toMatch(/Mural|seu filho|perfil|Cadê|7 dias/)
    expect(P.seoTitle).toBe('Presente para pais: Transformando o vilão em aliado | Sistema Zero')

    const html = renderToStaticMarkup(
      <BolsaResgate
        code="pais-1234"
        referrerName="Encontro de pais"
        communityUrl="https://kids.example.com"
        campaign
        gift={OFERTA_PAIS}
        variante="pais"
      />,
    )
    expect(html).toContain('Estes dados são seus')
    expect(html).toContain('Seu nome')
    expect(html).toContain('Liberar o meu curso')
    expect(html).toContain(
      'Encontro de pais: o curso Transformando o vilão em aliado, sem prazo, sem custo e sem cartão.',
    )
    expect(html).toContain('você confirma que tem 18 anos ou mais')
    expect(html).not.toMatch(/Mural|perfil da criança|responsável pela criança|7 dias/)
    const t = resgateCopy('kids', OFERTA_PAIS, 'pais')
    expect(t.concluido.proximo).toContain('abra o curso em Cursos para pais')
    expect(t.concluido.nota).toBe('Este presente não tem prazo e não gera cobrança.')
    expect(cursoParaPaisHref('https://kids.example.com', 'transformando-o-vilao-em-aliado')).toBe(
      'https://kids.example.com/pais/cursos/transformando-o-vilao-em-aliado',
    )
  })

  test('outro curso: o nome e o prazo da oferta, Kids e adulto', () => {
    const kids = presenteCursoCopy('kids', OFERTA_FAROL, 'curso')
    expect(kids.hero.titulo).toEqual({
      antes: 'A Chave do Farol, ',
      destaque: 'de presente para o seu filho.',
    })
    expect(kids.hero.beneficios[1]).toBe('30 dias de acesso ao curso e ao Mural')
    expect(kids.condicoes.cartoes.map((c) => c.titulo)).toEqual([
      'O curso por 30 dias',
      'Mural para compartilhar',
      'Gratuito, sem cartão',
    ])
    expect(kids.estados.preparing.texto).toContain('O presente vale 30 dias contados do cadastro')
    expect(resgateCopy('kids', OFERTA_FAROL, 'curso').rodape).toBe(
      'Presente de {{nome}}: o curso A Chave do Farol e o Mural Kids por 30 dias, sem custo e sem cartão.',
    )
    const adulto = presenteCursoCopy('adult', { ...OFERTA_FAROL, includesMural: false }, 'curso')
    expect(adulto.hero.beneficios[0]).toBe('Para quem tem 18 anos ou mais')
    expect(JSON.stringify(adulto)).not.toMatch(/seu filho|responsável|5 a 17|Mural/i)
    expect(adulto.seoTitle).toBe('Presente: A Chave do Farol | Sistema Zero')
  })

  test('o Cadê com prazo é templating: nenhum "7 dias" ou "sete dias" sobra com outro prazo', () => {
    for (const accessDays of [1, 10, 30]) {
      const kids = JSON.stringify(presenteKidsDaOferta({ ...OFERTA_CADE, accessDays }))
      const adulto = JSON.stringify(presenteAdultoDaOferta({ ...OFERTA_CADE, accessDays }))
      for (const texto of [kids, adulto]) {
        expect(texto).not.toMatch(/(?<!\d)7 dias|(?<!\d)7 DIAS|sete dias/i)
        expect(texto).toContain(accessDays === 1 ? '1 dia' : `${accessDays} dias`)
      }
    }
    expect(presenteKidsDaOferta({ ...OFERTA_CADE, accessDays: 10 }).condicoes.titulo).toBe(
      '10 dias para conhecer o curso e observar seu filho criando',
    )
  })

  test('a frase do Mural na confirmação: "mesma data" só com prazo, aula 2 só no Cadê Kids', () => {
    // O texto aprovado do Cadê continua o mesmo.
    expect(RESGATE_COPY.kids.concluido.muralTrial).toBe(
      'O Mural Kids também está liberado até a mesma data: seu filho pode publicar o jogo do curso, comentar e reagir. A aula 2 ensina como publicar, e o link do jogo publicado continua funcionando enquanto a publicação estiver disponível.',
    )
    expect(RESGATE_COPY.adult.concluido.muralTrial).toBe(
      'O Mural adulto também está liberado até a mesma data: você pode publicar o jogo do curso, comentar e reagir. O link do jogo publicado continua funcionando enquanto a publicação estiver disponível.',
    )
    expect(resgateCopy('kids', OFERTA_CADE).concluido.muralTrial).toBe(
      RESGATE_COPY.kids.concluido.muralTrial,
    )
    // Outro curso com prazo: a data sim, a aula 2 do Cadê não.
    expect(resgateCopy('kids', OFERTA_FAROL, 'curso').concluido.muralTrial).toBe(
      'O Mural Kids também está liberado até a mesma data: seu filho pode publicar o jogo do curso, comentar e reagir. O link do jogo publicado continua funcionando enquanto a publicação estiver disponível.',
    )
    // Sem prazo (inclusive o Cadê sem prazo, que vai para a variante `curso`): nem data nem aula 2.
    const semPrazo = { ...OFERTA_FAROL, accessDays: null }
    expect(resgateCopy('kids', semPrazo, 'curso').concluido.muralTrial).toBe(
      'O Mural Kids também está liberado: seu filho pode publicar o jogo do curso, comentar e reagir. O link do jogo publicado continua funcionando enquanto a publicação estiver disponível.',
    )
    expect(
      resgateCopy('kids', { ...OFERTA_CADE, accessDays: null }, 'curso').concluido.muralTrial,
    ).not.toMatch(/mesma data|aula 2/)
    expect(resgateCopy('adult', semPrazo, 'curso').concluido.muralTrial).toBe(
      'O Mural adulto também está liberado: você pode publicar o jogo do curso, comentar e reagir. O link do jogo publicado continua funcionando enquanto a publicação estiver disponível.',
    )
  })

  test('as variantes pais e guia só valem no Kids: no adulto o formulário é o do curso genérico', async () => {
    for (const variante of ['pais', 'guia'] as const) {
      expect(resgateCopy('adult', OFERTA_PAIS, variante)).toEqual(
        resgateCopy('adult', OFERTA_PAIS, 'curso'),
      )
      expect(resgateCopy('adult', OFERTA_PAIS, variante).aviso).toBeNull()
    }
    expect(await src('islands/BolsaResgate.tsx')).toContain(
      "(variante === 'pais' || variante === 'guia') && audience !== 'adult' && gift?.courseSlug",
    )
  })

  test('as variantes seguem as regras de voz da copy do presente', () => {
    const paginas = [
      presenteCursoCopy('kids', OFERTA_PAIS, 'pais'),
      presenteCursoCopy('kids', OFERTA_FAROL, 'curso'),
      presenteCursoCopy('adult', OFERTA_FAROL, 'curso'),
    ]
    const formularios = [
      resgateCopy('kids', OFERTA_PAIS, 'pais'),
      resgateCopy('kids', OFERTA_FAROL, 'curso'),
      resgateCopy('adult', OFERTA_FAROL, 'curso'),
    ]
    for (const variante of [...paginas, ...formularios]) {
      const texto = JSON.stringify(variante)
      expect(/[—–!]/.test(texto)).toBe(false)
      expect(/mesmo que|sem precisar|em preparação|carreira/i.test(texto)).toBe(false)
      expect(texto).not.toContain(',,')
    }
    for (const copy of paginas) expect(copy.seoTitle).toMatch(/^[^|·—]+ \| Sistema Zero$/)
  })
})

describe('painel do embaixador', () => {
  test('o prazo do presente termina no último minuto válido em Brasília', () => {
    const html = renderToStaticMarkup(
      <EmbaixadorCampanhas
        campaigns={{
          total: 1,
          limit: 20,
          offset: 0,
          items: [
            {
              id: 'campaign',
              publicTitle: 'Encontro',
              audience: 'kids',
              state: 'scheduled',
              startsAt: '2026-11-06T03:00:00Z',
              endsAt: '2026-11-09T03:00:00Z',
              shareUrl: 'https://example.com/bolsa/encontro',
              commissionEnabled: false,
              commissionAmountCents: null,
              commissionAnnualAmountCents: null,
              commissionWindowDays: null,
            },
          ],
        }}
      />,
    )
    expect(html).toContain('08/11/2026, 23:59')
    expect(html).not.toContain('09/11/2026')
  })
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
    expect(html).toContain('Uma criança de 5 a 17 anos')
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
    const plans = renderToStaticMarkup(
      <EmbaixadorBonus
        token={'t'.repeat(20)}
        bonus={{ pixKey: null, items: [], amountCents: 3000, annualAmountCents: 8000 }}
      />,
    )
    expect(plans).toMatch(/R\$\s?30,00 no plano mensal ou R\$\s?80,00 no anual/)
    expect(plans).toContain('sem comissão nas renovações')
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
