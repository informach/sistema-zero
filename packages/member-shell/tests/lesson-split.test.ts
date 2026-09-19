import { describe, expect, test } from 'bun:test'
import {
  CONTENT_MIN_WIDTH_PX,
  type LessonSplit,
  partirSecao,
  resolveLessonSplit,
  SPLIT_COMFORT_WIDTH_PX,
  SPLIT_DEFAULT_SIZE,
  TOOL_MIN_WIDTH_PX,
} from '../src/lib/lesson-split'

/**
 * A régua do lado a lado da aula.
 *
 * O que ela precisa garantir é UM número, e não os pisos: o CURSO DE ARRASTO, que é o
 * que a criança sente na mão. Com a régua antiga (ferramenta com piso de 640px) os
 * pisos eram "razoáveis" olhando sozinhos e mesmo assim o vídeo andava 104px numa
 * coluna de 1108px — a queixa real da dona ("consigo diminuir um pouco, mas bem
 * limitado"). Por isso os casos abaixo cobram o CURSO.
 */

/** Handle no kids (`width: 2.75rem` no globals.css); no adulto o Tailwind dá 24px. */
const HANDLE_KIDS = 44

/** Larguras REAIS da coluna da aula no kids (viewport menos o cromo): a 1440 com a
 *  lista de aulas escondida, a 1920 com os dois menus abertos, e a 1440 com os dois
 *  escondidos. São os três estados em que a divisória aparece no dia a dia. */
const COLUNAS_REAIS = [1108, 1260, 1376]

function split(contentWidth: number, handleWidth = HANDLE_KIDS) {
  return resolveLessonSplit({ contentWidth, handleWidth, hasWorkspace: true })
}

/**
 * Os pixels do painel do CONTEÚDO nos dois extremos do arrasto, REFAZENDO a conta que
 * o componente faz com o que a régua devolve (`minSize` e `maxSize={100 − o piso do
 * outro}`).
 *
 * ⚠️ Derivar do RESULTADO, e não das constantes, é o que faz estes casos morderem: a
 * primeira versão deste arquivo recalculava o curso a partir de
 * `CONTENT_MIN_WIDTH_PX`/`TOOL_MIN_WIDTH_PX` e teria passado inteira mesmo com a
 * `resolveLessonSplit` devolvendo lixo — testava aritmética de constantes, não a
 * função.
 */
function faixaDoConteudoPx(contentWidth: number, handleWidth = HANDLE_KIDS) {
  const r = split(contentWidth, handleWidth)
  if (!r.arrastavel) return { min: 0, max: 0, curso: 0 }
  const panelWidth = contentWidth - handleWidth
  const min = panelWidth * (r.contentMinimum / 100)
  const max = panelWidth * ((100 - r.toolMinimum) / 100)
  return { min, max, curso: max - min }
}

describe('resolveLessonSplit', () => {
  test('seção SEM ferramenta nunca arrasta, por mais larga que seja a tela', () => {
    const r = resolveLessonSplit({
      contentWidth: 3000,
      handleWidth: HANDLE_KIDS,
      hasWorkspace: false,
    })
    expect(r.arrastavel).toBe(false)
    expect(r.contentMinimum).toBe(0)
    expect(r.toolMinimum).toBe(0)
  })

  test('coluna abaixo do conforto empilha, com os dois pisos zerados', () => {
    // ⚠️ Os pisos PRECISAM zerar: empilhada, a divisória fica `disabled` e um
    // `minSize` vivo faria a lib guardar um layout que a coluna não comporta.
    const r = split(SPLIT_COMFORT_WIDTH_PX - 1)
    expect(r.arrastavel).toBe(false)
    expect(r.contentMinimum).toBe(0)
    expect(r.toolMinimum).toBe(0)
  })

  test('coluna no conforto exato já arrasta', () => {
    expect(split(SPLIT_COMFORT_WIDTH_PX).arrastavel).toBe(true)
  })

  test('os pisos viram % da sobra depois do handle, não da coluna inteira', () => {
    const r = split(1080)
    const sobra = 1080 - HANDLE_KIDS
    expect(r.contentMinimum).toBeCloseTo((CONTENT_MIN_WIDTH_PX / sobra) * 100, 6)
    expect(r.toolMinimum).toBeCloseTo((TOOL_MIN_WIDTH_PX / sobra) * 100, 6)
  })

  test('largura zero (SSR, antes de medir) não divide por zero', () => {
    const r = split(0)
    expect(r.arrastavel).toBe(false)
    expect(Number.isFinite(r.contentMinimum)).toBe(true)
  })
})

describe('as invariantes que a lib não perdoa', () => {
  // A `react-resizable-panels` recebe `minSize` de um painel e `maxSize={100 − o piso
  // do outro}`. Uma combinação de constantes que some mais de 100% entrega à lib um
  // intervalo VAZIO (maxSize abaixo de minSize) e ela resolve isso em silêncio.
  const COLUNAS = [SPLIT_COMFORT_WIDTH_PX, ...COLUNAS_REAIS, 1856, 3000]

  test.each(COLUNAS)('em %ipx os dois pisos somam menos de 100 por cento', (coluna) => {
    const r = split(coluna)
    expect(r.contentMinimum + r.toolMinimum).toBeLessThan(100)
  })

  test.each(COLUNAS)('em %ipx cada painel tem intervalo de verdade', (coluna) => {
    const r = split(coluna)
    expect(100 - r.toolMinimum).toBeGreaterThan(r.contentMinimum)
    expect(100 - r.contentMinimum).toBeGreaterThan(r.toolMinimum)
  })

  test.each(COLUNAS)('em %ipx o padrão de abertura cabe entre os pisos', (coluna) => {
    // ⚠️ Padrão fora do intervalo é clampado pela lib SEM avisar, e a aula nasceria
    // num layout que ninguém escolheu. O caso apertado é a coluna no limiar — e era
    // o que acontecia com o padrão antigo: 30% ficava ABAIXO do piso do conteúdo
    // (30,9%) em 1080px, ou seja o "30/70" já era mentira ali.
    const r = split(coluna)
    expect(SPLIT_DEFAULT_SIZE).toBeGreaterThanOrEqual(r.contentMinimum)
    expect(SPLIT_DEFAULT_SIZE).toBeLessThanOrEqual(100 - r.toolMinimum)
    expect(SPLIT_DEFAULT_SIZE).toBeGreaterThanOrEqual(r.toolMinimum)
    expect(SPLIT_DEFAULT_SIZE).toBeLessThanOrEqual(100 - r.contentMinimum)
  })
})

describe('o curso de arrasto — a queixa que esta régua existe para consertar', () => {
  test.each(COLUNAS_REAIS)('coluna de %ipx move a divisória mais de 300px', (coluna) => {
    // ⚠️ ANTI-VÁCUO: com o piso antigo da ferramenta (640px) a coluna de 1108 dá
    // 104px de curso e este caso REPROVA. É ele que impede o número de voltar a
    // subir sem ninguém medir o que a criança sente.
    expect(split(coluna).arrastavel).toBe(true)
    expect(faixaDoConteudoPx(coluna).curso).toBeGreaterThan(300)
  })

  test('no limiar do conforto a divisória já nasce com curso de verdade', () => {
    // Divisória que mal anda é pior que divisória nenhuma: foi o "às vezes funciona,
    // às vezes não". O conforto é MAIOR que a soma dos pisos justamente por isso.
    expect(SPLIT_COMFORT_WIDTH_PX).toBeGreaterThan(
      CONTENT_MIN_WIDTH_PX + TOOL_MIN_WIDTH_PX + HANDLE_KIDS,
    )
    expect(faixaDoConteudoPx(SPLIT_COMFORT_WIDTH_PX).curso).toBeGreaterThan(330)
  })

  test.each(COLUNAS_REAIS)('em %ipx o vídeo passa da metade da coluna', (coluna) => {
    // O defeito relatado era o teto do vídeo (`coluna − piso da ferramenta`): ele
    // ficava ABAIXO da metade, então arrastar "para o vídeo" nem chegava ao meio.
    expect(faixaDoConteudoPx(coluna).max).toBeGreaterThan(coluna / 2)
  })

  test.each(COLUNAS_REAIS)('em %ipx o conteúdo ainda tem piso de leitura', (coluna) => {
    // Fecha o OUTRO lado da faixa: sem isto, uma régua que devolvesse `contentMinimum`
    // zerado passaria em todos os casos de CURSO acima (curso enorme, piso nenhum) —
    // e a criança poderia espremer o vídeo até virar um selo.
    // ⚠️ O número é LITERAL de propósito. A primeira versão deste caso comparava com
    // `CONTENT_MIN_WIDTH_PX` e era tautológica: zerar a constante mantinha os 35
    // casos verdes. Piso de leitura é decisão de produto e baixá-lo tem de reprovar
    // aqui, não passar despercebido.
    expect(faixaDoConteudoPx(coluna).min).toBeGreaterThanOrEqual(300)
  })

  test('a régua não liga o lado a lado numa coluna de 792px', () => {
    // É a coluna do app ADULTO, travada pelo `max-w-6xl` do layout dele em qualquer
    // monitor. O caso mora aqui porque baixar os pisos poderia ter ligado o split num
    // app que não pediu a mudança — mas quem garante os 792 é o layout de lá, não
    // este teste.
    expect(
      resolveLessonSplit({ contentWidth: 792, handleWidth: 24, hasWorkspace: true }).arrastavel,
    ).toBe(false)
  })
})

describe('o tipo LessonSplit', () => {
  test('a régua devolve exatamente os três campos que o componente consome', () => {
    // Campo a mais é campo que ninguém usa; a menos, e o componente quebra no build.
    const r: LessonSplit = split(1200)
    expect(Object.keys(r).sort()).toEqual(['arrastavel', 'contentMinimum', 'toolMinimum'])
  })
})

/**
 * Quem mora em cada coluna, e se vale dividir.
 *
 * Duas coisas que a régua de largura sozinha não decide: (1) a CENA — demonstração e
 * experimentação — também é bancada e vai para a direita, junto do Estúdio e do Pinta;
 * (2) dividir só faz sentido com conteúdo dos DOIS lados. Antes bastava haver ferramenta,
 * e uma seção cujo único bloco era o Estúdio abria ao meio com metade da tela vazia.
 */
const editor = { id: 'projeto', kind: 'studio', content: { kind: 'studio' } }
const texto = { id: 'fala', kind: 'dialogue', content: { kind: 'dialogue', text: 'Oi!' } }
function cena(type: 'experimentation' | 'demonstration', id = 'cena') {
  return {
    id,
    kind: 'interactive',
    content: {
      kind: 'interactive',
      title: 'O salto',
      instructions: 'Mexa no impulso.',
      hints: [],
      required: false,
      activity: { type, scene: 'impulse' },
    },
  }
}

describe('a partição da seção', () => {
  test('a cena vai para a mesma coluna do editor', () => {
    const r = partirSecao({
      blocks: [texto, cena('experimentation'), cena('demonstration', 'demo')],
    })
    expect(r.toolIds).toEqual(['cena', 'demo'])
    expect(r.contentIds).toEqual(['fala'])
    expect(r.podeDividir).toBe(true)
    // ⚠️ Sem editor não há abas: "Ver exemplo"/"Criar" é o par de um EDITOR, e a cena é a
    // própria aula. Numa coluna estreita ela empilha em vez de virar aba para o vazio.
    expect(r.temEditor).toBe(false)
  })

  test('os MATERIAIS complementares são conteúdo — ficam na coluna da esquerda', () => {
    // É metade do pedido que criou o bloco: "embaixo do vídeo, no mesmo card da coluna da
    // esquerda". Ele não é bancada; se um dia cair na direita, a lista de arquivos vai parar ao
    // lado da cena e a ordem que a autora montou deixa de existir na tela.
    const materiais = {
      id: 'materiais',
      kind: 'materials',
      content: {
        kind: 'materials',
        title: 'Arquivos do Pinta',
        items: [{ id: 'i1', kind: 'file', attachmentId: 'a1' }],
      },
    }
    const r = partirSecao({ blocks: [texto, materiais, cena('experimentation')] })
    expect(r.contentIds).toEqual(['fala', 'materiais'])
    expect(r.toolIds).toEqual(['cena'])
  })

  test('pergunta curta e experiência em HTML ficam no conteúdo', () => {
    // As três são `kind: 'interactive'`, então classificar pelo kind mandaria as duas para a
    // bancada — e elas são de ler e responder, no meio da aula.
    const pergunta = {
      id: 'pergunta',
      kind: 'interactive',
      content: {
        kind: 'interactive',
        title: 'Antes de testar',
        instructions: 'Escolha uma ideia.',
        hints: [],
        required: false,
        activity: { type: 'question' },
      },
    }
    const html = {
      ...pergunta,
      id: 'html',
      content: { ...pergunta.content, activity: { type: 'html', html: '<p>oi</p>' } },
    }
    const r = partirSecao({ blocks: [pergunta, html, editor] })
    expect(r.contentIds).toEqual(['pergunta', 'html'])
    expect(r.toolIds).toEqual(['projeto'])
    expect(r.temEditor).toBe(true)
  })

  test('a ferramenta SOZINHA na seção não divide — ela ocupa a largura toda', () => {
    for (const bloco of [editor, cena('experimentation')]) {
      const r = partirSecao({ blocks: [bloco] })
      expect(r.toolIds).toHaveLength(1)
      expect(r.contentIds).toEqual([])
      expect(r.podeDividir).toBe(false)
    }
    // E o mesmo pela seção VAZIA à esquerda (o caso `blockIds: []` com `workspaceBlockId`,
    // que reservava 320px de piso para um painel que não renderiza nada).
    expect(
      resolveLessonSplit({ contentWidth: 1400, handleWidth: 44, hasWorkspace: false }),
    ).toHaveProperty('arrastavel', false)
  })

  test('ferramenta + texto divide, e a ação da plataforma conta como conteúdo', () => {
    expect(partirSecao({ blocks: [texto, editor] }).podeDividir).toBe(true)
    // A ação da plataforma e o atalho da ferramenta moram no painel da esquerda, então uma
    // seção com eles tem os dois lados mesmo sem um bloco de texto.
    expect(partirSecao({ blocks: [editor], extraContent: true }).podeDividir).toBe(true)
  })

  test('o Estúdio de ENTREGA (galeria) é conteúdo, não bancada', () => {
    // O mesmo `kind` é bancada numa seção e vitrine noutra; por isso `gallery` é contexto da
    // aula, calculado pelo componente, e não algo que a régua adivinhe do bloco.
    const r = partirSecao({ blocks: [{ ...editor, gallery: true }, texto] })
    expect(r.toolIds).toEqual([])
    expect(r.podeDividir).toBe(false)
  })

  test('seção sem nada à direita nunca divide', () => {
    expect(partirSecao({ blocks: [texto], extraContent: true }).podeDividir).toBe(false)
  })
})
