import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { initialKidsJourneyPolicy, JOURNEY_LEVEL_SLUGS } from '@sistemazero/core/journey'
import { lintLightCopy } from '@sistemazero/marketing-contracts'
import {
  espelhoDoModulo,
  MODULOS_ESPELHO,
  PASTA_ESPELHO,
} from '../../scripts/espelho-copy-comunidade'
import { AMBASSADOR_SECTIONS, GIFT_SECTIONS } from '../../src/content/presente'
import {
  COMUNIDADE_CHECKOUT,
  COMUNIDADE_OBRIGADO,
} from '../../src/funnels/comunidade-dos-criadores/content'
import {
  COMUNIDADE_OFERTAS_ANTIGAS,
  comunidadeOfferPath,
  isComunidadeOfertaAntiga,
  isComunidadeSubpagina,
} from '../../src/funnels/comunidade-dos-criadores/oferta'
import {
  ICONES_DE_CAPITULO,
  ICONES_DE_GRUPO,
} from '../../src/funnels/comunidade-dos-criadores/oferta/arte'
import { cupomDaOferta } from '../../src/funnels/comunidade-dos-criadores/oferta/cupom'
import { DESTAQUES } from '../../src/funnels/comunidade-dos-criadores/oferta/destaques'
import {
  calcularEconomiaAnual,
  precoPorDiaCents,
} from '../../src/funnels/comunidade-dos-criadores/oferta/economia'
import {
  PAGINA_9A17,
  RELATOS_9A17,
} from '../../src/funnels/comunidade-dos-criadores/oferta/pagina-9a17'
import {
  PAGINA_CONTINUAR,
  RELATOS_CONTINUAR,
} from '../../src/funnels/comunidade-dos-criadores/oferta/pagina-continuar'
import { PAGINA_MENOR9 } from '../../src/funnels/comunidade-dos-criadores/oferta/pagina-menor9'
import { RELATOS, RELATOS_RESERVA } from '../../src/funnels/comunidade-dos-criadores/oferta/relatos'
import type { RelatoId } from '../../src/funnels/comunidade-dos-criadores/oferta/types'
import {
  COMUNIDADE_VISUALS,
  PENDING_VISUALS,
} from '../../src/funnels/comunidade-dos-criadores/oferta/visuals'

const SRC = join(import.meta.dir, '..', '..', 'src')
const PASTA_IMG = join(SRC, '..', 'public', 'img', 'comunidade-dos-criadores')
const source = (...parts: string[]) => readFileSync(join(SRC, ...parts), 'utf8')
const raw917 = source('components', 'funnel', 'oferta', 'Comunidade917Body.astro')
const rawMenor9 = source('components', 'funnel', 'oferta', 'ComunidadeMenor9Body.astro')
const rawContinuar = source('components', 'funnel', 'oferta', 'ComunidadeContinuarBody.astro')
const PAGINAS = [
  ['9a17', PAGINA_9A17],
  ['criar-junto', PAGINA_MENOR9],
  ['continuar', PAGINA_CONTINUAR],
] as const
const publicCopy = JSON.stringify({
  pagina917: PAGINA_9A17,
  paginaMenor9: PAGINA_MENOR9,
  paginaContinuar: PAGINA_CONTINUAR,
  relatos: RELATOS,
})
/** Os ids de relato citados num módulo de copy (`id: 'AV08'` ou `RELATOS.AV10`). */
const relatosNoModulo = (...partes: string[]) =>
  new Set(
    [
      ...source(...partes).matchAll(
        /(?:id: '|relato: '|RELATOS\.|legendaDoRelato\(')((?:AV|N)\d+)/g,
      ),
    ].map((m) => m[1] as RelatoId),
  )
/** Os arquivos de imagem de um módulo de copy (toda chave `file`), na ordem. */
const arquivosDe = (modulo: unknown): string[] => {
  const achados: string[] = []
  const visita = (valor: unknown) => {
    if (Array.isArray(valor)) valor.forEach(visita)
    else if (valor && typeof valor === 'object')
      for (const [chave, item] of Object.entries(valor))
        if (chave === 'file' && typeof item === 'string') achados.push(item)
        else visita(item)
  }
  visita(modulo)
  return achados
}

// Contratos editoriais e comerciais das páginas de oferta Kids (20/10/2026): 9 a 17 em `/oferta`,
// "criar junto" (menor de 9) e a continuidade. O HTML, as âncoras e a responsividade ficam nos
// testes de navegador.
describe('Comunidade Kids: 9 a 17, criar junto e continuidade', () => {
  test('três endereços; as cinco páginas de perfil de antes redirecionam para a de 9 a 17', () => {
    expect(comunidadeOfferPath('9a17')).toBe('/kids/comunidade-dos-criadores/oferta')
    expect(comunidadeOfferPath('criar-junto')).toBe(
      '/kids/comunidade-dos-criadores/oferta/criar-junto',
    )
    expect(comunidadeOfferPath('continuar')).toBe('/kids/comunidade-dos-criadores/oferta/continuar')
    for (const id of ['criar-junto', 'continuar']) expect(isComunidadeSubpagina(id)).toBe(true)
    for (const value of [undefined, '', '9a17', 'tempo-de-tela', 'toString', '__proto__'])
      expect(isComunidadeSubpagina(value)).toBe(false)
    expect([...COMUNIDADE_OFERTAS_ANTIGAS].sort()).toEqual([
      'criacao-de-jogos',
      'expressao-visual',
      'formacao-tecnologica',
      'habilidades-escolares',
      'tempo-de-tela',
    ])
    for (const id of COMUNIDADE_OFERTAS_ANTIGAS) expect(isComunidadeOfertaAntiga(id)).toBe(true)
    expect(isComunidadeOfertaAntiga('continuar')).toBe(false)
    const rota = source('pages', '[audience]', '[produto]', 'oferta', '[perfilOferta].astro')
    expect(rota).toContain(
      `Astro.redirect(\`/kids/comunidade-dos-criadores/oferta${'$'}{Astro.url.search}\`, 301)`,
    )
    // O corpo é escolhido pela chave do funil: um funil novo nunca cai na página do Desafio.
    const despacho = source('components', 'funnel', 'OfertaPage.astro')
    expect(despacho).toContain('Funil sem corpo de oferta declarado')
    expect(despacho).toContain("comunidadePage === 'criar-junto'")
    expect(despacho).toContain('<ComunidadeContinuarBody {...bodyProps} plans={plans} />')
  })

  test('a Como funciona virou 301 para a experiência da página de 9 a 17, com a query', () => {
    const pagina = source('pages', 'como-funciona.astro')
    expect(pagina).toContain(
      `Astro.redirect(\`/kids/comunidade-dos-criadores/oferta${'$'}{Astro.url.search}#experiencia\`, 301)`,
    )
    expect(existsSync(join(SRC, 'content', 'home-comunidade.ts'))).toBe(false)
    expect(existsSync(join(SRC, 'styles', 'comunidade-home.css'))).toBe(false)
    // O destino existe: a seção de experiência da página de 9 a 17.
    expect(raw917).toContain('id="experiencia"')
    const sitemap = readFileSync(join(SRC, '..', 'astro.config.mjs'), 'utf8')
    expect(sitemap).not.toContain('como-funciona')
    expect(sitemap).toContain('/kids/comunidade-dos-criadores/oferta/continuar`')
    expect(sitemap).toContain('/pro/comunidade-dos-criadores/oferta/continuar`')
    // Nenhum link do funil aponta para a URL antiga: só a própria rota do 301 e o reconhecimento
    // histórico do analytics a citam.
    const citam: string[] = []
    for (const arquivo of new Bun.Glob('**/*.{astro,ts,tsx}').scanSync(SRC))
      if (source(arquivo).includes('/como-funciona')) citam.push(arquivo.replaceAll('\\', '/'))
    expect(citam.sort()).toEqual(['analytics/page-context.ts', 'pages/como-funciona.astro'])
  })

  test('as páginas: sem "Jogue um jogo", sem preço escrito à mão, termos da oferta', () => {
    for (const [nome, modulo] of PAGINAS) {
      const texto = JSON.stringify(modulo)
      expect([nome, /jogue um jogo/i.test(texto)]).toEqual([nome, false])
      expect([nome, /R\$\s*\d/.test(texto)]).toEqual([nome, false])
      expect([nome, /[—–!]/.test(texto)]).toEqual([nome, false])
      expect([nome, /mesmo que|sem precisar|em preparação|carreira/i.test(texto)]).toEqual([
        nome,
        false,
      ])
      expect([nome, texto.includes('/kids/comunidade-dos-criadores/termos')]).toEqual([nome, true])
      expect([nome, texto.includes('/privacidade')]).toEqual([nome, true])
    }
    const titulos = PAGINAS.map(([, modulo]) => modulo.seoTitle)
    expect(new Set(titulos).size).toBe(titulos.length)
  })

  test('não promete revisão universal, resposta imediata, liberação total ou resultado em prazo fixo', () => {
    expect(publicCopy).not.toMatch(
      /cada atividade enviada|lendo as atividades|lidas por uma pessoa|na primeira semana/i,
    )
    expect(publicCopy).not.toMatch(
      /respost[ae].{0,25}em \d+ horas|fica tudo liberado|aviso (por e-mail )?antes de (toda|cada) renovação/i,
    )
    expect(publicCopy).not.toMatch(/vício|sessão de terapia|profissão do futuro/i)
    expect(publicCopy).toContain('Construtor')
    expect(publicCopy).toContain('Inventor')
  })

  test('continuidade: fala com quem já começou, sem presumir que ele terminou', () => {
    const P = PAGINA_CONTINUAR
    // Mesmo e-mail é o que liga a assinatura ao perfil que já existe: no herói, nos planos e nas dúvidas.
    expect(P.hero.description).toContain('mesmo e-mail')
    expect(P.planos.paragraph).toContain('mesmo e-mail')
    expect(P.planos.depois[0]).toContain('mesmo e-mail')
    // A criança que chega pela tela de ferramenta fechada é mandada ao responsável.
    expect(P.aviso).toContain('responsável')
    // A primeira situação é a de quem não terminou; só a oficina fica sem tela.
    expect(P.proximo.situacoes[0]?.title).toBe('Ainda no primeiro projeto')
    expect(P.proximo.situacoes).toHaveLength(5)
    expect(P.proximo.situacoes.filter((s) => !('imagem' in s))).toHaveLength(1)
    // Os dias que restam do Desafio não se somam: a página diz isso antes dos planos e nas dúvidas.
    expect(P.fica.inicio.text).toContain('não se somam')
    expect(JSON.stringify(P.faq)).toContain('não se somam')
    // Tráfego quente: poucas dúvidas, todas diferentes.
    const perguntas = P.faq.map((item) => item.question)
    expect(new Set(perguntas).size).toBe(perguntas.length)
    expect(perguntas.length).toBeLessThanOrEqual(12)
    // A faixa é a de 9 a 17, como a página padrão (a continuidade antiga dizia 9 a 14).
    expect(JSON.stringify(P)).not.toContain('9 a 14')
    expect(JSON.stringify(P.faq)).toContain('9 a 17')
  })

  test('continuidade: Light Copy em todo texto (as perguntas só nas dúvidas)', () => {
    const textos = (valor: unknown, caminho = ''): [string, string][] =>
      typeof valor === 'string'
        ? [[caminho, valor]]
        : Array.isArray(valor)
          ? valor.flatMap((v, i) => textos(v, `${caminho}[${i}]`))
          : valor && typeof valor === 'object'
            ? Object.entries(valor).flatMap(([k, v]) => textos(v, caminho ? `${caminho}.${k}` : k))
            : []
    for (const [caminho, texto] of textos(PAGINA_CONTINUAR)) {
      const pergunta = caminho.endsWith('.question')
      const regras = lintLightCopy(texto).filter((i) => !(i.rule === 3 && pergunta))
      expect([caminho, regras.map((i) => i.rule)]).toEqual([caminho, []])
    }
  })

  test('continuidade: os oito postos e o que cada um libera seguem a política da Jornada', () => {
    const { postos, marco } = PAGINA_CONTINUAR.jornada
    expect(postos).toHaveLength(JOURNEY_LEVEL_SLUGS.length)
    // Cada capacidade que a política libera aparece no posto em que ela abre.
    const NOMES: Record<string, string> = {
      studio: 'Estúdio livre',
      pinta: 'Pinta',
      ai: 'Zappy',
      pensa: 'Pensa',
      molda: 'Molda',
      'molda-intermediate': 'Molda',
      bridge: 'Ponte',
      pro: 'Estúdio Pro',
    }
    initialKidsJourneyPolicy().steps.forEach((step, i) => {
      for (const capacidade of step.capabilities) {
        const nome = NOMES[capacidade]
        if (nome)
          expect([postos[i + 1]?.nome, postos[i + 1]?.libera]).toEqual([
            postos[i + 1]?.nome,
            expect.stringContaining(nome),
          ])
      }
    })
    // O marco "depois do Farol" é o posto que abre o Estúdio livre e o Pinta.
    expect(postos[1]?.nome).toBe(marco.posto)
  })

  test('o espelho editorial (copy/pagina-*.md) é exatamente a copy que cada página renderiza', () => {
    // Gerado por scripts/espelho-copy-comunidade.ts: mudou a copy, rode o script (README da copy).
    expect(Object.keys(MODULOS_ESPELHO).sort()).toEqual(['9a17', 'continuar', 'criar-junto'])
    for (const { arquivo, modulo } of Object.values(MODULOS_ESPELHO)) {
      const doc = readFileSync(join(PASTA_ESPELHO, arquivo), 'utf8').replaceAll('\r\n', '\n')
      expect([arquivo, doc]).toEqual([arquivo, espelhoDoModulo(modulo)])
    }
  })

  test('economia do anual: só com os dois preços ao vivo, arredondada para baixo', () => {
    expect(calcularEconomiaAnual(9_700, 79_700)).toBe(36_700)
    expect(calcularEconomiaAnual(10_900, 89_900)).toBe(40_900)
    // 12 × 97,55 − 1.070 = 100,60: anuncia R$ 100, nunca R$ 101.
    expect(calcularEconomiaAnual(9_755, 107_000)).toBe(10_000)
    // 50 centavos não viram "R$ 1"; anual mais caro não vira economia negativa.
    expect(calcularEconomiaAnual(9_700, 116_350)).toBe(0)
    expect(calcularEconomiaAnual(9_700, 115_950)).toBe(400)
    expect(calcularEconomiaAnual(9_700, 120_000)).toBe(0)
    // Sem um dos preços ao vivo, não compara com o fallback.
    expect(calcularEconomiaAnual(undefined, 79_700)).toBe(0)
    expect(calcularEconomiaAnual(9_700, null)).toBe(0)
  })

  test('"menos de R$ X por dia": sempre acima da conta exata, uma função para as cinco páginas', () => {
    // 97 / 30 = 3,233… → R$ 3,30; num valor exato (90 / 30 = 3,00) sobe para R$ 3,10.
    expect(precoPorDiaCents(9_700)).toBe(330)
    expect(precoPorDiaCents(9_000)).toBe(310)
    expect(precoPorDiaCents(10_900)).toBe(370)
    for (const mensal of [100, 2_990, 9_700, 12_345, 19_990])
      expect(precoPorDiaCents(mensal)).toBeGreaterThan(mensal / 30)
    for (const corpo of [raw917, rawMenor9, rawContinuar])
      expect(corpo).toContain('precoPorDiaCents(mensalCents)')
  })

  test('o cupom da URL chega ao checkout e a página avisa sem inventar desconto', () => {
    expect(cupomDaOferta({ status: 'none' })).toEqual({ codigo: null, aviso: null })
    const valido = cupomDaOferta({
      status: 'valid',
      code: 'VOLTA10',
      listPriceCents: 9_700,
      discountCents: 970,
      finalPriceCents: 8_730,
    })
    expect(valido.codigo).toBe('VOLTA10')
    expect(valido.aviso?.alerta).toBe(false)
    // O cupom foi cotado contra a oferta principal: a página não promete o desconto no outro plano.
    expect(valido.aviso?.texto).toContain('se ele vale para o plano escolhido')
    expect(valido.aviso?.texto).not.toMatch(/R\$\s*\d/)
    const invalido = cupomDaOferta({
      status: 'invalid',
      code: 'NOPE',
      message: 'Cupom não encontrado.',
    })
    expect(invalido).toEqual({
      codigo: 'NOPE',
      aviso: {
        texto:
          'Cupom não encontrado. No checkout, o cupom é conferido de novo, e você pode trocar o código ou continuar sem ele.',
        alerta: true,
      },
    })
    for (const aviso of [valido.aviso, invalido.aviso])
      expect(lintLightCopy(aviso?.texto ?? '')).toEqual([])
    for (const corpo of [raw917, rawMenor9, rawContinuar]) {
      expect(corpo).toContain('const cupom = cupomDaOferta(coupon)')
      expect(corpo).toContain('couponCode={cupom.codigo}')
      expect(corpo).toContain("role={cupom.aviso.alerta ? 'alert' : undefined}")
    }
  })

  test('preços vêm do catálogo e cada plano mantém sua seleção no pré-checkout', () => {
    for (const corpo of [raw917, rawMenor9, rawContinuar]) {
      expect(corpo).toContain('plans?.main.intervalMonths === n')
      expect(corpo).toContain('mensal?.priceCents ?? COMUNIDADE_PRECO_FALLBACK.mensalCents')
      expect(corpo).toContain('anual?.priceCents ?? COMUNIDADE_PRECO_FALLBACK.anualCents')
      expect(corpo).toContain('calcularEconomiaAnual(mensal?.priceCents, anual?.priceCents)')
      expect(corpo).toContain('{economiaAnualCents > 0 &&')
      expect(corpo).toContain('data-checkout-oferta={mensal?.slug}')
      expect(corpo).toContain('data-checkout-oferta={anual?.slug}')
      expect(corpo.match(/data-checkout-cta/g)).toHaveLength(2)
      expect(corpo).toContain('<PreCheckoutModal')
      // O rodapé leva ao Termo da oferta (`termosHref={`${f.basePath}/termos`}`).
      expect(corpo).toContain(`termosHref={\`${'$'}{f.basePath}/termos\`}`)
    }
    expect(publicCopy).not.toMatch(/R\$\s*\d/)
    // Só a continuidade pede o mesmo e-mail no pré-checkout: a família já tem conta e perfil.
    expect(rawContinuar).toContain(
      '<PreCheckoutModal client:idle basePath={f.basePath} funnel={f.key} couponCode={cupom.codigo} continuidade />',
    )
    for (const corpo of [raw917, rawMenor9]) expect(corpo).not.toContain(' continuidade />')
  })

  test('toda tela do manifesto é REAL; o que falta capturar fica declarado e não aparece', () => {
    // Uma chave não pode ser real e pendente ao mesmo tempo.
    for (const id of Object.keys(PENDING_VISUALS)) expect(COMUNIDADE_VISUALS[id]).toBeUndefined()
    const frames = Object.values(COMUNIDADE_VISUALS).flatMap((visual) => visual.frames)
    for (const frame of frames) {
      expect(frame.file).toMatch(/^tela-[a-z0-9-]+\.webp$/)
      expect(frame.retina).toBe(frame.file.replace('.webp', '@2x.webp'))
      expect([frame.file, existsSync(join(PASTA_IMG, frame.file))]).toEqual([frame.file, true])
      expect([frame.retina, existsSync(join(PASTA_IMG, frame.retina))]).toEqual([
        frame.retina,
        true,
      ])
      expect(frame.width).toBeGreaterThan(0)
      expect(frame.height).toBeGreaterThan(0)
      expect(frame.alt.length).toBeGreaterThan(20)
      expect(frame.label.length).toBeGreaterThan(2)
    }
    for (const visual of Object.values(COMUNIDADE_VISUALS)) {
      expect(visual.caption.length).toBeGreaterThan(20)
      expect(visual.frames.length).toBeGreaterThanOrEqual(1)
      expect(visual.frames.length).toBeLessThanOrEqual(3)
    }
    // A venda não mostra "em construção" (decisão de 16/10/2026): as capturas inteiras da Jornada
    // e do catálogo trazem "Mais 6 postos estão sendo construídos"; só os recortes entram.
    const jornadaComConstrucao = [
      'tela-jornada.webp',
      'tela-jornada-postos.webp',
      'tela-catalogo.webp',
    ]
    const usadas = [...frames.map((f) => f.file), ...PAGINAS.flatMap(([, m]) => arquivosDe(m))]
    for (const arquivo of usadas) expect(jornadaComConstrucao).not.toContain(arquivo)
    expect(COMUNIDADE_VISUALS.jornada!.frames.map((f) => f.file)).toEqual([
      'tela-jornada-meus-postos.webp',
    ])
    for (const frame of frames) expect(frame.alt).not.toMatch(/em construção/i)
    // As prévias desenhadas saíram de vez: nenhuma ilustração se passa por tela da plataforma.
    expect(existsSync(join(PASTA_IMG, 'previas'))).toBe(false)
    expect(JSON.stringify(COMUNIDADE_VISUALS)).not.toMatch(/\.svg|previas\//)

    const component = source('components', 'funnel', 'oferta', 'ComunidadeVisual.astro')
    expect(component).toContain('width={frame.width}')
    expect(component).toContain('height={frame.height}')
    expect(component).toContain('data-zoom')
  })

  test('as imagens das páginas existem e nenhuma se repete no corpo de uma página', () => {
    for (const [nome, modulo] of PAGINAS) {
      const arquivos = arquivosDe(modulo)
      for (const arquivo of arquivos)
        expect([nome, arquivo, existsSync(join(PASTA_IMG, arquivo))]).toEqual([nome, arquivo, true])
      // O logo e o fechamento são peças do desenho; as telas e as fotos não se repetem, salvo o
      // print do modo Ponte da página de 9 a 17, que abre o herói e volta na fase da Ponte.
      const conteudo = arquivos.filter((a) => !/^(logo-|zappy-|checkout-capa)/.test(a))
      const repetidas = [...new Set(conteudo.filter((a, i) => conteudo.indexOf(a) !== i))]
      expect([nome, repetidas]).toEqual([nome, nome === '9a17' ? ['tela-codigo.webp'] : []])
    }
  })

  test('motor de seções (presente e embaixador): ícones e destaques só para seções que existem', () => {
    // As entradas só da continuidade antiga saíram com ela; toda entrada tem que apontar para uma
    // seção das páginas que ainda usam o motor, senão seria ignorada em silêncio.
    const secoes = new Set([...GIFT_SECTIONS, ...AMBASSADOR_SECTIONS].map((secao) => secao.id))
    for (const id of [
      ...Object.keys(ICONES_DE_CAPITULO),
      ...Object.keys(ICONES_DE_GRUPO),
      ...Object.keys(DESTAQUES),
    ])
      expect([id, secoes.has(id)]).toEqual([id, true])
    // O capítulo "experiencia" do presente e do embaixador guarda o ícone dele (o da posição seria
    // outro); a limpeza de 20/10/2026 quase o levou junto com as entradas da continuidade antiga.
    expect(ICONES_DE_CAPITULO.experiencia).toBe('extension')
  })

  test('relatos: falas reais com retrato, sem repetir na mesma página', () => {
    for (const [id, relato] of Object.entries(RELATOS)) {
      expect([id, existsSync(join(PASTA_IMG, relato.retrato))]).toEqual([id, true])
      expect(relato.fala.length).toBeGreaterThan(20)
      expect(relato.nome.length).toBeGreaterThan(2)
      expect(relato.papel).toMatch(/^(Aluno|Aluna|Pai d[oa] .+|Mãe d[oa] .+)$/)
      expect(relato.contexto.length).toBeGreaterThan(5)
    }
    const porPagina: [string, readonly RelatoId[]][] = [
      ['9a17', RELATOS_9A17],
      ['continuar', RELATOS_CONTINUAR],
    ]
    for (const [nome, ids] of porPagina) {
      for (const id of ids) expect([nome, id, id in RELATOS]).toEqual([nome, id, true])
      const repetidas = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))]
      expect([nome, repetidas]).toEqual([nome, []])
    }
    expect(rawContinuar).toContain('RELATOS[r.id].fala')
    // Toda fala guardada aparece em alguma página (9 a 17, criar junto, continuidade, cartas do
    // resultado do quiz ou citada numa dúvida) ou está na reserva, com o motivo.
    const citadas = new Set<string>([
      ...RELATOS_9A17,
      ...RELATOS_CONTINUAR,
      ...relatosNoModulo('funnels', 'comunidade-dos-criadores', 'oferta', 'pagina-menor9.ts'),
      ...relatosNoModulo('funnels', 'comunidade-dos-criadores', 'quiz', 'result-copy-9a17.ts'),
      ...relatosNoModulo('funnels', 'comunidade-dos-criadores', 'quiz', 'result-copy-m9.ts'),
    ])
    for (const id of relatosNoModulo(
      'funnels',
      'comunidade-dos-criadores',
      'oferta',
      'pagina-menor9.ts',
    ))
      expect([id, id in RELATOS]).toEqual([id, true])
    const duvidas = JSON.stringify([PAGINA_9A17.faq, PAGINA_MENOR9.duvidas, PAGINA_CONTINUAR.faq])
    for (const [id, relato] of Object.entries(RELATOS)) {
      const citada = citadas.has(id) || duvidas.includes(relato.fala)
      const reserva = id in RELATOS_RESERVA
      // Citada e na reserva ao mesmo tempo seria uma reserva esquecida.
      expect([id, citada !== reserva]).toEqual([id, true])
    }
    for (const motivo of Object.values(RELATOS_RESERVA)) expect(motivo?.length).toBeGreaterThan(20)
  })

  test('etapas compartilhadas não prometem começar antes de pagar ou reiniciar progresso', () => {
    const pre = source('islands', 'PreCheckoutModal.tsx')
    const checkout = source('pages', '[audience]', '[produto]', 'checkout.astro')
    const thanks = source('pages', '[audience]', '[produto]', 'obrigado.astro')
    expect(pre).toContain('Informe os dados do responsável')
    expect(pre).toContain('Continuar para o pagamento')
    // Os textos do checkout e do obrigado vêm do conteúdo do funil; as páginas só os desenham.
    expect(COMUNIDADE_CHECKOUT.titulo).toBe('Confirme sua assinatura da Comunidade dos Criadores')
    expect(checkout).toContain('{intro.titulo}')
    expect(COMUNIDADE_CHECKOUT.paragrafos.join(' ')).not.toContain('pelas atividades enviadas')
    expect(COMUNIDADE_OBRIGADO.titulo).toBe('Sua assinatura está confirmada.')
    expect(COMUNIDADE_OBRIGADO.acesso).toContain('Se já tem conta, entre com seu acesso habitual')
    expect(thanks).toContain("(titulo ?? 'Pagamento confirmado!')")
    // Uma string só: entre duas expressões, o Astro descarta o espaço e as frases grudavam.
    expect(thanks).toContain(`{\`${'$'}{introObrigado} ${'$'}{acesso}\`}`)
    expect(thanks).toContain('approved && (')
    expect(thanks).toContain('Pagamento ainda aguardando confirmação.')
  })
})
