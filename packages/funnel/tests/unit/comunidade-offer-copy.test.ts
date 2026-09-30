import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Guarda editorial da página de vendas da Comunidade dos Criadores (tese v2,
// 30/09/2026 — docs/plans/2026-09-30-comunidade-criadores-analise-e-proposta-v2.md):
// "Ele já joga. Aqui ele aprende a criar os próprios jogos, e continua." Fixa a
// espinha argumentativa (dor com causa → alavanca → saídas que falham → mecanismo
// → prova → comparação → objeções → valor), as invariantes comerciais e o que não
// pode voltar (promessa acima do catálogo, estrela sem avaliação, aviso de
// renovação que não existe para o cartão, culpa, terapia, absolutos).

const SRC = join(import.meta.dir, '..', '..', 'src')
const source = (...parts: string[]) =>
  readFileSync(join(SRC, ...parts), 'utf8').replace(/\s+/g, ' ')
const raw = readFileSync(
  join(SRC, 'components', 'funnel', 'oferta', 'ComunidadeOfertaBody.astro'),
  'utf8',
)
const offer = raw.replace(/\s+/g, ' ')

/** Só o markup público (sem frontmatter, CSS, script e comentários). */
const markup = raw
  .slice(raw.indexOf('<div class="cdc">'), raw.indexOf('<Footer'))
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/\s+/g, ' ')
const h1s = [...markup.matchAll(/<h1>(.*?)<\/h1>/g)].map((m) =>
  (m[1] ?? '').replace(/<[^>]+>/g, '').trim(),
)

describe('copy comercial da Comunidade dos Criadores (tese v2: ele já joga, aqui ele cria)', () => {
  test('hero padrão promete criação a partir do interesse que já existe; a variante pós-Desafio vende continuidade', () => {
    expect(h1s).toHaveLength(2)
    expect(h1s[0]).toContain('Seu filho já joga.')
    expect(h1s[0]).toContain('Aqui ele aprende a criar os próprios jogos.')
    expect(h1s[1]).toContain('O primeiro jogo ficou pronto.')
    for (const h1 of h1s) expect(h1).not.toMatch(/tela|hiperfoco|inteligência artificial/i)
    // A variante existe e é dirigida pela prop `origem` (rota: `?origem=desafio`).
    expect(raw).toContain("origem === 'desafio'")
    expect(markup).toContain('!posDesafio ?')
    expect(markup).toContain('Para quem já publicou o primeiro jogo')
  })

  test('nomeia a dor com a causa e a alavanca antes de apresentar o produto', () => {
    expect(markup).toContain('Ele passa horas dentro do jogo.')
    expect(markup).toContain('não sobra nada que seja dele')
    expect(markup).toContain('O jogo foi feito para ser jogado até o fim')
    expect(markup).toContain('o limite muda a quantidade')
    expect(markup).toContain('O mesmo interesse que te preocupa é a melhor porta de entrada')
    expect(markup).toContain('Três saídas comuns, e o ponto em que cada uma falha')
    expect(markup).toContain('um caminho, uma pessoa e um lugar para mostrar')
    // A dor e as saídas ficam fora da variante pós-Desafio.
    expect(markup).toContain('!posDesafio && ( <section class="sec" id="dor">')
    expect(markup).toContain('!posDesafio && ( <section class="sec" id="saidas">')
  })

  test('promete o que o produto entrega hoje e declara o lançamento', () => {
    expect(markup).toContain('O Desafio do Primeiro Jogo')
    expect(markup).toContain('Os primeiros projetos são guiados')
    expect(markup).toContain('elementos preparados para a criança começar')
    expect(markup).toContain('A plataforma está em lançamento')
    expect(markup).toContain('os cursos de hoje e todos os que entrarem fazem parte da assinatura')
    expect(markup).toContain('Rafael, Débora e André testaram a plataforma')
    expect(markup).toContain('filho dos criadores da plataforma')
    expect(markup).not.toContain('★')
  })

  test('mecanismo: Jornada, Recados, Mural, Clube e as quatro ferramentas nos postos certos', () => {
    expect(markup).toContain('Jornada do Criador')
    expect(markup).toContain('como as faixas do judô')
    expect(markup).toContain('lidas por uma pessoa da equipe')
    expect(markup).toContain('link e QR code')
    expect(markup).toContain('As conversas passam por moderação antes de aparecer')
    expect(markup).toContain('Estúdio, Pinta, Pensa e Molda')
    expect(markup).toContain(
      'Estúdio e Pinta em Construtor, Pensa em Inventor, Molda em Explorador de Mundos',
    )
    expect(markup).toContain('sem nenhuma compra extra por dentro')
    expect(markup).toContain('Método Z.E.R.O.')
  })

  test('responde às objeções na ordem do medo, com telas e IA como apoio', () => {
    expect(markup).toContain('Se ele começar e largar')
    expect(markup).toContain('os jogos publicados continuam acessíveis no Mural')
    expect(markup).toContain('Uma parte do tempo de tela que vocês já permitem')
    expect(markup).toContain('Seu papel cabe em três gestos')
    expect(markup).toContain('Não existe chat aberto nem compra dentro da plataforma')
    expect(markup).toContain('nunca monta pelo aluno')
    expect(markup).toContain('Sem aula ao vivo, ele aprende de verdade')
    expect(markup).toContain('O Scratch é gratuito. Por que assinar a Comunidade?')
  })

  test('valor com âncoras derivadas do preço vivo e condições verdadeiras', () => {
    expect(raw).toContain('const diaLabel = formatBRLFromCents2(Math.round(mensalCents / 30))')
    expect(raw).toContain(
      'const porCriancaLabel = formatBRLFromCents2(Math.round(mensalCents / 2))',
    )
    expect(markup).toContain('{diaLabel} por dia')
    expect(markup).toContain('para até duas crianças')
    expect(markup).toContain('Economize {economiaLabel} no ano')
    expect(markup).toContain('equivale a {anualPorMesLabel} por mês')
    expect(markup).toContain('Cancele quando quiser')
    expect(markup).toContain('Garantia de 7 dias')
    expect(markup).toContain('Renovação controlada pela sua área de responsável')
    // O lembrete de renovação só existe para o anual à vista; o cartão recorrente
    // não recebe aviso prévio — a página não pode prometer isso.
    expect(markup).not.toMatch(/aviso (por e-mail )?antes de (toda|cada) renovação/i)
    // Nenhum preço de terceiro fixo na copy (fontes não conferidas) e nenhuma soma inventada.
    expect(markup).not.toMatch(/R\$ ?250/)
    expect(markup).not.toContain('<s>R$ 388</s>')
    expect(markup).not.toContain('as três ferramentas')
  })

  test('não usa absolutos, culpa, terapia ou promessas acima do catálogo', () => {
    for (const trecho of [
      'maior talento dele',
      'Preguiça e vício',
      'vício',
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
      'fica tudo liberado',
      'Seu filho está crescendo em um mundo tecnológico',
      'A assinatura libera a plataforma inteira',
      'profissão do futuro',
      'indicado para',
    ]) {
      expect(markup).not.toContain(trecho)
    }
  })

  test('segue o Light Copy no texto público: sem travessão, sem exclamação, sem "Não é X. É Y."', () => {
    const texto = markup.replace(/<[^>]+>/g, ' ').replace(/\{[^}]*\}/g, ' ')
    expect(texto).not.toContain('—')
    expect(texto).not.toMatch(/[\p{L}.)"”]!/u)
    expect(texto).not.toMatch(/não é [^.]*\. é /i)
    expect(texto).not.toMatch(/\bmesmo que\b|\bsem precisar\b/i)
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

  test('a rota da oferta lê `?origem=desafio` e repassa só para o body da Comunidade', () => {
    const route = source('pages', '[audience]', '[produto]', 'oferta.astro')
    expect(route).toContain("Astro.url.searchParams.get('origem') === 'desafio' ? 'desafio' : null")
    expect(route).toContain('<ComunidadeOfertaBody {...bodyProps} plans={plans} origem={origem} />')
    expect(route).not.toContain('<DesafioOfertaBody {...bodyProps} origem=')
  })
})
