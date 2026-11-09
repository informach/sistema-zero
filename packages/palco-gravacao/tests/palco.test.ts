import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { arrumacao, sobrepostas } from '../src/lib/arrumacao'
import { enviada } from '../src/lib/aula-enviada'
import { bffAnswer } from '../src/lib/bff'
import { lessonPathOf } from '../src/lib/lesson-address'
import type { PaginaDoPalco } from '../src/lib/pagina'
import { projetoDaParte } from '../src/lib/projeto-da-parte'
import { projetoAntes } from '../src/lib/projeto-gravado'
import { safeReturn } from '../src/lib/safe-return'
import { staffFromClaims } from '../src/lib/staff'
import {
  agir,
  agirNaPagina,
  type JogoDaAula,
  jogoPara,
  novoJogoNoEstudio,
  ocupado,
  VERBOS,
  ZOOM_SEM_JOGO,
} from '../src/lib/verbos'

/** Uma página do palco com o Estúdio aberto: pré-visualização de 800 × 600 e blocos achados. */
const pagina = (patch: Partial<PaginaDoPalco> = {}): PaginaDoPalco => ({
  previa: () => ({ width: 800, height: 600 }),
  jogo: () => ({ width: 960, height: 720 }),
  areaPronta: () => true,
  campo: () => ({
    alvo: { seletor: '[data-palco-alvo="a1"]', u: 0.5, v: 0.5 },
    tipo: 'menu',
    bloco: 'Deixar o sprite',
  }),
  perto: () => ({ seletor: '[data-palco-alvo="a7"]', u: 0.9, v: 0.1 }),
  aberto: () => 'lista',
  encaixe: () => ({ seletor: '[data-palco-alvo="a2"]', u: 0.6, v: 0.2 }),
  rolagem: () => ({
    de: { seletor: '[data-palco-alvo="a3"]', u: 0.5, v: 0.5 },
    para: { seletor: '[data-palco-alvo="a3"]', u: 0.4, v: 0.2 },
  }),
  rolagemDoCampo: () => 'visivel',
  organizar: async () => true,
  temBotao: () => false,
  categoria: () => 'fechada',
  bloco: (texto, onde) => ({ seletor: `[data-palco-alvo="${onde}:${texto}"]`, u: 0.1, v: 0.5 }),
  abaixo: () => ({ seletor: '[data-palco-alvo="a5"]', u: 0.3, v: 0.6 }),
  lugarLivre: (pegar) => ({ seletor: '[data-palco-alvo="a8"]', u: pegar ? 0.6 : 0.65, v: 0.7 }),
  dentro: () => ({ seletor: '[data-palco-alvo="a9"]', u: 0.62, v: 0.74 }),
  sobre: () => ({ seletor: '[data-palco-alvo="a10"]', u: 0.4, v: 0.3 }),
  palcoDoJogo: () => null,
  desembolar: () => null,
  posicoes: () => 'parado',
  fundoLivre: () => ({ seletor: '[data-palco-alvo="a13"]', u: 0.6, v: 0.5 }),
  rolagemDeVarios: () => 'visivel',
  mais: () => ({ seletor: '[data-palco-alvo="a14"]', u: 0.5, v: 0.5 }),
  lixeira: () => ({ seletor: '[data-palco-alvo="a15"]', u: 0.5, v: 0.65 }),
  opcaoNaLista: () => ({
    dy: 0,
    lista: { seletor: '[data-palco-alvo="a16"]', u: 0.5, v: 0.5 },
    posicao: { x: 100, y: 100, scroll: 0 },
  }),
  jogoAVista: () => null,
  alternarJogo: async () => false,
  zoom: async () => {},
  ...patch,
})

/** O jogo pronto da Aula 1 do Cadê Todo Mundo, como o manifesto publica. */
const manifesto = JSON.parse(
  readFileSync(
    new URL(
      '../../../docs/aulas-interativas/faisca/cade-todo-mundo/cade-todo-mundo-aula-1.manifesto.json',
      import.meta.url,
    ),
    'utf8',
  ),
) as { blocks: { key: string; content: { activity?: JogoDaAula } }[] }
const jogo = manifesto.blocks.find((b) => b.key === 'jogo-pronto')?.content.activity as JogoDaAula
const jogos = [jogo]

describe('verbos do palco', () => {
  test('achar toca no meio do esconderijo, pelo id ou pelo nome', () => {
    const [passo] = agir('achar arbusto', jogos)
    expect(passo).toEqual({
      fazer: 'clicar',
      alvo: {
        seletor: '.sz-project-play-stage',
        u: (56.5 + 161 / 2) / 640,
        v: (137 + 144 / 2) / 360,
      },
    })
    expect(agir('achar "nas pedras"', jogos)).toEqual(agir('achar pedras', jogos))
    expect(() => agir('achar lago', jogos)).toThrow(/arbusto, pedras, flores/)
  })

  test('apontar jogo aponta um ponto do palco, o meio sem números', () => {
    expect(agir('apontar jogo 75 26', jogos)[0]).toEqual({
      fazer: 'apontar',
      alvo: { seletor: '.sz-project-play-stage', u: 75 / 640, v: 26 / 360 },
    })
    expect(agir('apontar jogo', jogos)[0]).toMatchObject({ alvo: { u: 0.5, v: 0.5 } })
    expect(() => agir('apontar jogo', [])).toThrow(/jogo pronto/)
  })

  test('navegação, ampliação, livro e materiais pelos nomes da tela', () => {
    expect(agir('Próxima parte', jogos)).toEqual([
      { fazer: 'clicar', alvo: { texto: 'Próxima parte' } },
    ])
    expect(agir('ampliar jogo', jogos)[0]).toMatchObject({ alvo: { texto: 'Ampliar jogo' } })
    expect(agir('voltar à aula', jogos)[0]).toMatchObject({ alvo: { texto: 'Voltar à aula' } })
    expect(agir('livro próxima', jogos)[0]).toMatchObject({ alvo: { rotulo: 'Próxima página' } })
    expect(() => agir('livro voar', jogos)).toThrow(/tela cheia/)
    expect(agir('apontar baixar', jogos)[0]).toMatchObject({ fazer: 'apontar' })
    expect(agir('tocar "Ligar a reação"', jogos)[0]).toMatchObject({
      alvo: { rotulo: 'Ligar a reação' },
    })
  })

  test('expandir e reduzir o Estúdio só terminam com ele no outro estado', () => {
    // Farol, Parte 6: a seta segurada logo depois de expandir mediu a prévia ainda no lugar antigo.
    expect(agir('expandir estúdio', jogos)).toEqual([
      { fazer: 'clicar', alvo: { texto: 'Expandir' } },
      { fazer: 'esperar', alvo: { texto: 'Reduzir' }, estado: 'aparecer', maximo: 10 },
    ])
    expect(agir('reduzir estúdio', jogos)).toEqual([
      { fazer: 'clicar', alvo: { texto: 'Reduzir' } },
      { fazer: 'esperar', alvo: { texto: 'Expandir' }, estado: 'aparecer', maximo: 10 },
    ])
  })

  test('Estúdio: categorias em sequência, arrastar para baixo de um bloco, verificar e esperar', () => {
    expect(agir('categoria Jogo 2D > Sprites', jogos)).toEqual([
      { fazer: 'clicar', alvo: { bloco: { texto: 'Jogo 2D', area: 'toolbox' } } },
      { fazer: 'clicar', alvo: { bloco: { texto: 'Sprites', area: 'toolbox' } } },
    ])
    expect(agir('encaixar "mover" abaixo de "quando começar"', jogos)).toEqual([
      {
        fazer: 'arrastar',
        alvo: { bloco: { texto: 'mover', area: 'flyout' } },
        para: { bloco: { texto: 'quando começar', area: 'workspace', abaixo: true } },
      },
    ])
    const verificar = agir('verificar projeto', jogos)
    expect(verificar.map((p) => p.fazer)).toEqual(['clicar', 'esperar'])
    expect(verificar[1]).toMatchObject({ maximo: 180 })
  })

  test('um verbo desconhecido diz o que fazer; todo verbo listado tem exemplo que funciona', () => {
    expect(() => agir('voar', jogos)).toThrow(/Não conheço "voar"/)
    for (const v of VERBOS) expect(() => agir(v.exemplo, jogos, pagina())).not.toThrow()
  })

  test('pré-visualização: o jogo cabe inteiro, centrado, e o alvo vira o ponto certo', () => {
    // 640 × 360 numa prévia de 800 × 600: escala 1,25, 75 px de faixa em cima e embaixo.
    const [toque] = agir('tocar prévia arbusto', jogos, pagina())
    expect(toque).toEqual({
      fazer: 'clicar',
      alvo: {
        seletor: 'iframe[title="Pré-visualização"]',
        u: ((56.5 + 161 / 2) * 1.25) / 800,
        v: (75 + (137 + 144 / 2) * 1.25) / 600,
      },
    })
    expect(agir('apontar prévia 75 26', jogos, pagina())[0]).toMatchObject({ fazer: 'apontar' })
    // Sem a prévia ainda (o Estúdio acabou de expandir): espera ela aparecer e pergunta de novo.
    // Logo depois de expandir: os gestos de bloco esperam a área de trabalho.
    expect(agir('arrastar até "Ao iniciar"', jogos, pagina({ areaPronta: () => false }))).toEqual([
      {
        fazer: 'esperar',
        alvo: { seletor: 'svg.blocklySvg .blocklyBlockCanvas .blocklyDraggable' },
        estado: 'aparecer',
        maximo: 30,
      },
      { fazer: 'continuar', acao: 'arrastar até "Ao iniciar"' },
    ])
    expect(agir('tocar prévia', jogos, pagina({ previa: () => null })).map((p) => p.fazer)).toEqual(
      ['esperar', 'continuar'],
    )
  })

  test('Estúdio: rolar, encaixar ao lado de fazer, trocar campo de menu e número', async () => {
    expect(agir('arrastar até "Quando acontecer"', jogos, pagina())[0]).toMatchObject({
      fazer: 'arrastar',
    })
    expect(
      agir('arrastar até "Quando acontecer"', jogos, pagina({ rolagem: () => 'visivel' })),
    ).toEqual([
      // Já à vista: a mão só aponta, ao lado dele, no fundo da área (não em cima do bloco).
      {
        fazer: 'apontar',
        alvo: { seletor: '[data-palco-alvo="a7"]', u: 0.9, v: 0.1 },
        exato: true,
      },
    ])
    expect(agir('encaixar "Deixar o sprite" em "Quando clicar ou tocar"', jogos, pagina())).toEqual(
      [
        {
          fazer: 'arrastar',
          alvo: { seletor: '[data-palco-alvo="paleta:Deixar o sprite"]', u: 0.1, v: 0.5 },
          para: { seletor: '[data-palco-alvo="a2"]', u: 0.6, v: 0.2 },
        },
        // Encaixado, a mão sai de cima do bloco (parada em cima, aparece a dica dele).
        { fazer: 'continuar', acao: 'afastar de "Deixar o sprite"' },
      ],
    )
    expect(agir('afastar de "Deixar o sprite"', jogos, pagina())).toEqual([
      {
        fazer: 'apontar',
        alvo: { seletor: '[data-palco-alvo="a7"]', u: 0.9, v: 0.1 },
        exato: true,
      },
    ])
    expect(() =>
      agir('encaixar "Voar" em "Quando clicar ou tocar"', jogos, pagina({ bloco: () => null })),
    ).toThrow(/Abra a categoria/)
    expect(agir('encaixar "Somar 1" abaixo de "Deixar o sprite"', jogos, pagina())).toEqual([
      {
        fazer: 'arrastar',
        alvo: { seletor: '[data-palco-alvo="paleta:Somar 1"]', u: 0.1, v: 0.5 },
        para: { seletor: '[data-palco-alvo="a5"]', u: 0.3, v: 0.6 },
      },
      { fazer: 'continuar', acao: 'afastar de "Somar 1"' },
    ])
    expect(agir('apontar zappy', jogos, pagina())[0]).toMatchObject({ fazer: 'apontar' })
    expect(agir('trocar "jogador" por "escolhido"', jogos, pagina())).toEqual([
      { fazer: 'clicar', alvo: { seletor: '[data-palco-alvo="a1"]', u: 0.5, v: 0.5 } },
      { fazer: 'clicar', alvo: { texto: 'escolhido', dentro: '.blocklyDropDownDiv' } },
      { fazer: 'esperar', alvo: { seletor: '.blocklyDropDownDiv' }, estado: 'sumir', maximo: 5 },
      // Trocado, a mão clica fora do bloco, ao lado dele: a mudança vale.
      { fazer: 'continuar', acao: 'afastar de "Deixar o sprite" clicando' },
    ])
    const numero = agir(
      'trocar "50" por "0"',
      jogos,
      pagina({
        campo: () => ({
          alvo: { seletor: '[data-palco-alvo="a4"]' },
          tipo: 'numero',
          bloco: 'Deixar o sprite',
        }),
      }),
    )
    expect(numero.map((p) => p.fazer)).toEqual(['clicar', 'digitar', 'tecla', 'continuar'])
    expect(numero[1]).toMatchObject({ texto: '0', substituir: true })
    // Um seletor do Estúdio herda do campo de texto: o robô clica e a página decide no que abriu.
    const outro = pagina({
      campo: () => ({
        alvo: { seletor: '[data-palco-alvo="a6"]' },
        tipo: 'outro',
        bloco: 'Deixar o sprite',
      }),
    })
    expect(agir('trocar "jogador" por "escolhido"', jogos, outro)).toEqual([
      { fazer: 'clicar', alvo: { seletor: '[data-palco-alvo="a6"]' } },
      { fazer: 'continuar', acao: 'escolher "escolhido" em "Deixar o sprite"' },
    ])
    expect(agir('escolher "escolhido"', jogos, pagina())).toEqual([
      { fazer: 'clicar', alvo: { texto: 'escolhido', dentro: '.blocklyDropDownDiv' } },
      { fazer: 'esperar', alvo: { seletor: '.blocklyDropDownDiv' }, estado: 'sumir', maximo: 5 },
      { fazer: 'continuar', acao: 'clicar fora dos blocos' },
    ])
    expect(agir('clicar fora dos blocos', jogos, pagina())).toEqual([
      { fazer: 'clicar', alvo: { seletor: '[data-palco-alvo="a13"]', u: 0.6, v: 0.5 } },
    ])
    // Depois de mudar um campo, a mão clica ao lado do bloco, fora dele.
    expect(agir('afastar de "Deixar o sprite" clicando', jogos, pagina())).toEqual([
      { fazer: 'clicar', alvo: { seletor: '[data-palco-alvo="a7"]', u: 0.9, v: 0.1 } },
    ])
    expect(
      agir('escolher "Achei!"', jogos, pagina({ aberto: () => 'caixa' })).map((p) => p.fazer),
    ).toEqual(['digitar', 'tecla', 'continuar'])
    expect(() => agir('escolher "x"', jogos, pagina({ aberto: () => null }))).toThrow(/não abriu/)
    // Em duas falas: o clique no campo numa, a escolha na outra, e a mão sai do bloco no fim.
    expect(agir('abrir campo "jogador" em "Deixar o sprite"', jogos, pagina())).toEqual([
      { fazer: 'clicar', alvo: { seletor: '[data-palco-alvo="a1"]', u: 0.5, v: 0.5 } },
    ])
    expect(agir('escolher "escolhido" em "Deixar o sprite"', jogos, pagina())).toEqual([
      { fazer: 'clicar', alvo: { texto: 'escolhido', dentro: '.blocklyDropDownDiv' } },
      { fazer: 'esperar', alvo: { seletor: '.blocklyDropDownDiv' }, estado: 'sumir', maximo: 5 },
      { fazer: 'continuar', acao: 'afastar de "Deixar o sprite" clicando' },
    ])
    // Organizar blocos: a página faz pelo menu, e a mão só espera.
    let organizou = 0
    const arrumavel = pagina({ organizar: async () => ++organizou > 0 })
    expect(await agirNaPagina('organizar blocos', jogos, arrumavel)).toEqual([
      { fazer: 'esperar', alvo: { seletor: 'svg.blocklySvg' }, estado: 'aparecer', maximo: 5 },
    ])
    expect(organizou).toBe(1)
    await expect(
      agirNaPagina('organizar blocos', jogos, pagina({ organizar: async () => false })),
    ).rejects.toThrow(/não abriu/)
    // Depois de um bloco cair, o afastar só mede quando as pilhas param (o empurrão do Blockly).
    let medidas = 0
    const andando = pagina({ posicoes: () => (++medidas < 4 ? `andando ${medidas}` : 'parou') })
    const inicio = Date.now()
    await agirNaPagina('afastar de "Criar variável"', jogos, andando)
    expect(medidas).toBeGreaterThanOrEqual(5)
    expect(Date.now() - inicio).toBeGreaterThanOrEqual(340)
    // A galeria que a roda rolou ainda anda: a escolha espera a imagem ficar parada.
    let olhadas = 0
    const lista = { seletor: '[data-palco-alvo="a16"]', u: 0.5, v: 0.5 }
    const rolando = pagina({
      aberto: () => 'lista',
      opcaoNaLista: () => ({
        dy: 0,
        lista,
        posicao: { x: 100, y: ++olhadas < 4 ? 120 - olhadas * 10 : 80, scroll: 0 },
      }),
    })
    const comeco = Date.now()
    const passos = await agirNaPagina(
      'escolher "pirata" em "Criar sprite personagem"',
      jogos,
      rolando,
    )
    expect(passos[0]?.fazer).toBe('clicar')
    expect(olhadas).toBeGreaterThanOrEqual(6)
    expect(Date.now() - comeco).toBeGreaterThanOrEqual(450)
    // Um bloco que ainda não mostra o nome escolhido é procurado de novo por um instante.
    let procuras = 0
    const atrasada = pagina({
      perto: () => (++procuras < 3 ? null : { seletor: '[data-palco-alvo="a7"]' }),
      bloco: () => null,
    })
    expect(await agirNaPagina('apontar bloco "Alterar variável aviso"', jogos, atrasada)).toEqual([
      { fazer: 'apontar', alvo: { seletor: '[data-palco-alvo="a7"]' }, exato: true },
    ])
    expect(procuras).toBe(3)
    await expect(
      agirNaPagina(
        'apontar bloco "Sumiu"',
        jogos,
        pagina({ perto: () => null, bloco: () => null }),
      ),
    ).rejects.toThrow(/Não achei o bloco "Sumiu"/)
    // Os outros verbos são os mesmos do agir.
    expect(await agirNaPagina('próxima parte', jogos, arrumavel)).toEqual(
      agir('próxima parte', jogos, arrumavel),
    )
    // Fora da vista ou coberto, o campo vem para o centro antes do clique.
    const longe = pagina({
      rolagemDoCampo: () => ({
        de: { seletor: '[data-palco-alvo="a3"]', u: 0.2, v: 0.8 },
        para: { seletor: '[data-palco-alvo="a3"]', u: 0.5, v: 0.5 },
      }),
    })
    expect(agir('abrir campo "coelho" em "Criar sprite"', jogos, longe)).toEqual([
      {
        fazer: 'arrastar',
        alvo: { seletor: '[data-palco-alvo="a3"]', u: 0.2, v: 0.8 },
        para: { seletor: '[data-palco-alvo="a3"]', u: 0.5, v: 0.5 },
      },
      { fazer: 'continuar', acao: 'abrir campo "coelho" em "Criar sprite"' },
    ])
    expect(agir('trocar "50" por "0"', jogos, longe).map((p) => p.fazer)).toEqual([
      'arrastar',
      'continuar',
    ])
    expect(() => agir('abrir campo "x"', jogos, pagina({ campo: () => null }))).toThrow(
      /Não achei o campo/,
    )
    expect(() => agir('trocar "x" por "y"', jogos, pagina({ campo: () => null }))).toThrow(
      /Não achei o campo/,
    )
  })

  test('trocar um campo sem rótulo fixo não produz uma continuação inválida', () => {
    for (const tipo of ['numero', 'menu', 'outro'] as const) {
      const atual = pagina({
        campo: () => ({ alvo: { seletor: '[data-palco-alvo="sem-rotulo"]' }, tipo, bloco: '' }),
      })
      const passos = agir('trocar "50" por "0"', jogos, atual)
      for (const passo of passos)
        if (passo.fazer === 'continuar') expect(() => agir(passo.acao, jogos, atual)).not.toThrow()
      expect(passos).not.toContainEqual({ fazer: 'continuar', acao: 'afastar de ""' })
    }
  })

  test('enviar projeto confirma o envio, e reenviar confirma o reenvio', () => {
    expect(agir('enviar projeto', jogos, pagina())).toEqual([
      { fazer: 'clicar', alvo: { texto: 'Enviar meu projeto' } },
      { fazer: 'clicar', alvo: { papel: 'button', nome: 'Enviar', dentro: '[role="dialog"]' } },
    ])
    const denovo = agir('enviar projeto', jogos, pagina({ temBotao: () => true }))
    expect(denovo.map((p) => ('alvo' in p ? p.alvo : null))).toEqual([
      { texto: 'Enviar de novo' },
      { papel: 'button', nome: 'Reenviar', dentro: '[role="dialog"]' },
    ])
  })

  test('área nova num lugar sem blocos, bloco dentro dela e valor solto em cima de outro', () => {
    const p = pagina()
    // O mesmo lugar para apontar e para soltar: a mão mostra onde a área vai cair.
    expect(agir('apontar lugar sem blocos', jogos, p)).toEqual([
      {
        fazer: 'apontar',
        alvo: { seletor: '[data-palco-alvo="a8"]', u: 0.65, v: 0.7 },
        exato: true,
      },
    ])
    expect(agir('soltar "Quando acontecer" no lugar sem blocos', jogos, p)).toEqual([
      {
        fazer: 'arrastar',
        alvo: { seletor: '[data-palco-alvo="paleta:Quando acontecer"]', u: 0.1, v: 0.5 },
        para: { seletor: '[data-palco-alvo="a8"]', u: 0.6, v: 0.7 },
      },
      { fazer: 'continuar', acao: 'afastar de "Quando acontecer"' },
    ])
    expect(agir('encaixar "Quando o sprite" dentro de "Quando acontecer"', jogos, p)[0]).toEqual({
      fazer: 'arrastar',
      alvo: { seletor: '[data-palco-alvo="paleta:Quando o sprite"]', u: 0.1, v: 0.5 },
      para: { seletor: '[data-palco-alvo="a9"]', u: 0.62, v: 0.74 },
    })
    expect(
      agir('soltar "verdadeiro" em cima do "0" em "Criar variável temChave"', jogos, p),
    ).toEqual([
      {
        fazer: 'arrastar',
        alvo: { seletor: '[data-palco-alvo="paleta:verdadeiro"]', u: 0.1, v: 0.5 },
        para: { seletor: '[data-palco-alvo="a10"]', u: 0.4, v: 0.3 },
      },
      { fazer: 'continuar', acao: 'afastar de "Criar variável temChave"' },
    ])
    // Abaixo de Ao iniciar: a página recebe a pilha, para alinhar a área nova com ela.
    const pedidos: (string | undefined)[][] = []
    const alinhada = pagina({
      lugarLivre: (pegar, abaixoDe) => {
        pedidos.push([pegar, abaixoDe])
        return { seletor: '[data-palco-alvo="a11"]', u: 0.2, v: 0.8 }
      },
    })
    agir('apontar lugar sem blocos abaixo de "Ao iniciar"', jogos, alinhada)
    agir('soltar "Quando acontecer" no lugar sem blocos abaixo de "Ao iniciar"', jogos, alinhada)
    expect(pedidos).toEqual([
      [undefined, 'Ao iniciar'],
      ['Quando acontecer', 'Ao iniciar'],
    ])
    expect(() =>
      agir(
        'apontar lugar sem blocos abaixo de "Ao iniciar"',
        jogos,
        pagina({ lugarLivre: () => null }),
      ),
    ).toThrow(/logo abaixo de "Ao iniciar"/)
    // Sem lugar à vista, o roteiro precisa arrastar a área antes.
    expect(() =>
      agir('apontar lugar sem blocos', jogos, pagina({ lugarLivre: () => null })),
    ).toThrow(/arraste um espaço vazio/)
    expect(() =>
      agir(
        'soltar "texto" em cima do "1" em "Alterar variável aviso"',
        jogos,
        pagina({ sobre: () => null }),
      ),
    ).toThrow(/Não achei o valor "1"/)
  })

  test('bloco nunca em cima de bloco: a área de baixo desce antes de a mão se afastar', () => {
    const desembolo = {
      de: { seletor: '[data-palco-alvo="a12"]', u: 0.1, v: 0.6 },
      para: { seletor: '[data-palco-alvo="a12"]', u: 0.1, v: 0.7 },
    }
    expect(
      agir('afastar de "Criar variável"', jogos, pagina({ desembolar: () => desembolo })),
    ).toEqual([
      { fazer: 'arrastar', alvo: desembolo.de, para: desembolo.para },
      { fazer: 'continuar', acao: 'afastar de "Criar variável" depois de desembolar' },
    ])
    // Depois de desembolar, a mão só se afasta: nunca desembola duas vezes no mesmo gesto.
    expect(
      agir(
        'afastar de "Criar variável" depois de desembolar',
        jogos,
        pagina({ desembolar: () => desembolo }),
      ),
    ).toEqual([
      {
        fazer: 'apontar',
        alvo: { seletor: '[data-palco-alvo="a7"]', u: 0.9, v: 0.1 },
        exato: true,
      },
    ])
    // Sem nada embolado, o afastar é o de sempre.
    expect(agir('afastar de "Criar variável"', jogos, pagina())).toEqual([
      {
        fazer: 'apontar',
        alvo: { seletor: '[data-palco-alvo="a7"]', u: 0.9, v: 0.1 },
        exato: true,
      },
    ])
  })

  test('conferir: todos os blocos ditos ficam bem à vista juntos', () => {
    const pedidos: string[][] = []
    const longe = pagina({
      rolagemDeVarios: (blocos) => {
        pedidos.push([...blocos])
        return {
          de: { seletor: '[data-palco-alvo="a3"]', u: 0.5, v: 0.8 },
          para: { seletor: '[data-palco-alvo="a3"]', u: 0.5, v: 0.4 },
        }
      },
    })
    expect(agir('mostrar blocos "Quando o sprite", "Destruir o sprite"', jogos, longe)).toEqual([
      {
        fazer: 'arrastar',
        alvo: { seletor: '[data-palco-alvo="a3"]', u: 0.5, v: 0.8 },
        para: { seletor: '[data-palco-alvo="a3"]', u: 0.5, v: 0.4 },
      },
    ])
    expect(pedidos).toEqual([['Quando o sprite', 'Destruir o sprite']])
    // Já bem à vista: a mão aponta o primeiro, sem mexer na área.
    expect(agir('mostrar blocos "Quando o sprite"', jogos, pagina())[0]).toMatchObject({
      fazer: 'apontar',
    })
    expect(() =>
      agir('mostrar blocos "Sumiu"', jogos, pagina({ rolagemDeVarios: () => null })),
    ).toThrow(/Não achei todos/)
    // Mais longe do que um arrasto alcança (Ao iniciar a uma tela de distância): a mão arrasta
    // até onde dá e a página é perguntada de novo.
    const muitoLonge = pagina({
      rolagemDeVarios: () => ({
        de: { seletor: '[data-palco-alvo="a3"]', u: 0.1, v: 0.5 },
        para: { seletor: '[data-palco-alvo="a3"]', u: 0.99, v: 0.5 },
        falta: true,
      }),
    })
    const acao = 'mostrar blocos "Criar sprite personagem", "Criar sprite farol"'
    expect(agir(acao, jogos, muitoLonge).map((p) => p.fazer)).toEqual(['arrastar', 'continuar'])
    expect(agir(acao, jogos, muitoLonge)[1]).toEqual({ fazer: 'continuar', acao })
  })

  test('a imagem fora da parte que a galeria mostra vem à vista com a roda antes do clique', () => {
    const longe = pagina({
      opcaoNaLista: () => ({
        dy: 180,
        lista: { seletor: '[data-palco-alvo="a16"]', u: 0.5, v: 0.5 },
        posicao: { x: 100, y: 300, scroll: 0 },
      }),
    })
    expect(agir('escolher "pirata" em "Criar sprite personagem"', jogos, longe)).toEqual([
      { fazer: 'rolar', alvo: { seletor: '[data-palco-alvo="a16"]', u: 0.5, v: 0.5 }, dy: 180 },
      { fazer: 'continuar', acao: 'escolher "pirata" em "Criar sprite personagem"' },
    ])
    // À vista: clica, espera a lista fechar e clica fora do bloco.
    expect(
      agir('escolher "pirata" em "Criar sprite personagem"', jogos, pagina()).map((p) => p.fazer),
    ).toEqual(['clicar', 'esperar', 'continuar'])
  })

  test('Se: a pergunta pronta vai para a lixeira e o mais abre o senão', () => {
    expect(agir('jogar na lixeira ">" em "Se"', jogos, pagina())).toEqual([
      {
        fazer: 'arrastar',
        alvo: { seletor: '[data-palco-alvo="a1"]', u: 0.5, v: 0.5 },
        para: { seletor: '[data-palco-alvo="a15"]', u: 0.5, v: 0.65 },
      },
    ])
    expect(agir('abrir "senão" em "Se"', jogos, pagina())).toEqual([
      { fazer: 'clicar', alvo: { seletor: '[data-palco-alvo="a14"]', u: 0.5, v: 0.5 } },
      { fazer: 'continuar', acao: 'afastar de "Se"' },
    ])
    expect(agir('apontar mais de "senão se" em "Se"', jogos, pagina())).toEqual([
      { fazer: 'apontar', alvo: { seletor: '[data-palco-alvo="a14"]', u: 0.5, v: 0.5 } },
    ])
    expect(() => agir('abrir "senão" em "Se"', jogos, pagina({ mais: () => null }))).toThrow(
      /botão de mais/,
    )
    expect(() =>
      agir('jogar na lixeira ">" em "Se"', jogos, pagina({ lixeira: () => null })),
    ).toThrow(/lixeira/)
  })

  test('a prévia mede o jogo do projeto aberto, não o jogo pronto da aula', () => {
    // Aula 2 do Farol: sem jogo pronto, o jogo de 480 × 360 vem do bloco que prepara a tela.
    const p = pagina({
      previa: () => ({ width: 660, height: 640 }),
      palcoDoJogo: () => ({ width: 480, height: 360 }),
    })
    const [passo] = agir('apontar prévia 120 24', [], p)
    const scale = 660 / 480
    const top = (640 - 360 * scale) / 2
    expect(passo).toMatchObject({
      fazer: 'apontar',
      alvo: {
        seletor: 'iframe[title="Pré-visualização"]',
        u: (120 * scale) / 660,
        v: (top + 24 * scale) / 640,
      },
    })
  })

  test('abrir categoria nunca recolhe: a que já está aberta só é apontada', () => {
    const toolbox = (texto: string) => ({ bloco: { texto, area: 'toolbox' as const } })
    // Fechada: clica, e a de dentro é perguntada depois, quando já aparece.
    expect(
      agir('abrir categoria Jogo 2D > Movimento > Movimentos prontos', jogos, pagina()),
    ).toEqual([
      { fazer: 'clicar', alvo: toolbox('Jogo 2D') },
      { fazer: 'continuar', acao: 'abrir categoria Movimento > Movimentos prontos' },
    ])
    // Aberta de um encaixe anterior: a mão passa por ela sem clicar.
    const aberta = pagina({ categoria: (nome) => (nome === 'Jogo 2D' ? 'aberta' : 'fechada') })
    expect(agir('abrir categoria Jogo 2D', jogos, aberta)).toEqual([
      { fazer: 'apontar', alvo: toolbox('Jogo 2D'), exato: true },
    ])
    expect(agir('abrir categoria Movimentos prontos', jogos, aberta)).toEqual([
      { fazer: 'clicar', alvo: toolbox('Movimentos prontos') },
    ])
  })

  test('setas da tela: segurar e apontar no canto de baixo do jogo pronto e da prévia', () => {
    // Jogo pronto de 960 × 720: a seta da direita tem o centro a 130 px da esquerda e 30 de baixo.
    expect(agir('segurar seta da direita por 1,5 s', jogos, pagina())).toEqual([
      {
        fazer: 'segurar',
        alvo: { seletor: '.sz-project-play-stage', u: 130 / 960, v: (720 - 30) / 720 },
        segundos: 1.5,
      },
    ])
    // Na prévia de 800 × 600, sem tempo: 1 segundo.
    expect(agir('segurar seta de cima na prévia', jogos, pagina())).toEqual([
      {
        fazer: 'segurar',
        alvo: { seletor: 'iframe[title="Pré-visualização"]', u: 80 / 800, v: (600 - 80) / 600 },
        segundos: 1,
      },
    ])
    expect(
      agir('segurar seta para baixo na previa por 2 segundos', jogos, pagina())[0],
    ).toMatchObject({ segundos: 2, alvo: { u: 80 / 800, v: (600 - 30) / 600 } })
    expect(agir('apontar as setas', jogos, pagina())).toEqual([
      {
        fazer: 'apontar',
        alvo: { seletor: '.sz-project-play-stage', u: 80 / 960, v: (720 - 55) / 720 },
        exato: true,
      },
    ])
    // A prévia ainda não está na tela: espera ela e pergunta de novo.
    expect(
      agir('segurar seta da esquerda na prévia', jogos, pagina({ previa: () => null })).map(
        (p) => p.fazer,
      ),
    ).toEqual(['esperar', 'continuar'])
    expect(agir('apontar selo', jogos, pagina())[0]).toMatchObject({
      alvo: { seletor: '.slow-seta' },
    })
    expect(agir('apontar faixa fora da tela', jogos, pagina())[0]).toMatchObject({
      alvo: { seletor: '[data-fora-da-tela]' },
      exato: true,
    })
  })

  test('ocupado: Estúdio carregando, conferência em curso, livro preparando', () => {
    const doc = (hit: string | null, text = '') => ({
      body: { textContent: text } as HTMLElement,
      querySelector: (selector: string) =>
        selector === hit ? ({ offsetParent: {} } as unknown as Element) : null,
    })
    expect(ocupado(doc(null))).toBe(false)
    expect(ocupado(doc('[aria-busy="true"]'))).toBe(true)
    expect(ocupado(doc('.sz-lesson-objectives-action:disabled'))).toBe(true)
    expect(ocupado(doc(null, 'Carregando o livro 3D…'))).toBe(true)
  })
})

describe('rotas da aula no palco', () => {
  test('as escritas respondem sucesso sem ir à conta; só a conferência vai ao servidor', () => {
    expect(bffAnswer('POST', ['navigation'])).toEqual({ kind: 'json', status: 200, body: {} })
    expect(bffAnswer('POST', ['blocks', 'b1', 'learning-progress'])).toMatchObject({ status: 200 })
    expect(bffAnswer('POST', ['sections', 's1', 'project-check'])).toEqual({
      kind: 'project-check',
      sectionId: 's1',
    })
    expect(bffAnswer('POST', ['blocks', 'b1', 'studio-context'])).toEqual({
      kind: 'studio-context',
      blockId: 'b1',
    })
    const now = new Date('2026-11-01T12:00:00Z')
    expect(bffAnswer('POST', ['blocks', 'b1', 'studio-submission'], undefined, now)).toEqual({
      kind: 'json',
      status: 200,
      body: { submittedAt: '2026-11-01T12:00:00.000Z', gamification: null },
    })
  })

  test('o vídeo e o quiz recebem a resposta que a tela lê, sem guardar nada', () => {
    const now = new Date('2026-11-01T12:00:00Z')
    expect(
      bffAnswer(
        'POST',
        ['blocks', 'v1', 'learning-progress'],
        { revision: 'r1', answers: { watched: [[0, 10]] }, hintsUsed: 0, positionSeconds: 10 },
        now,
      ),
    ).toEqual({
      kind: 'json',
      status: 200,
      body: {
        blockId: 'v1',
        revision: 'r1',
        positionSeconds: 10,
        answers: { watched: [[0, 10]] },
        hintsUsed: 0,
        attemptsCount: 0,
        result: null,
        updatedAt: '2026-11-01T12:00:00.000Z',
      },
    })
    const quiz = bffAnswer('POST', ['blocks', 'q1', 'quiz-attempts'], { answers: { p1: ['a'] } })
    expect(quiz).toMatchObject({
      body: {
        passed: true,
        questions: [
          { questionId: 'p1', correct: true, correctChoiceIds: ['a'], explanation: null },
        ],
      },
    })
  })

  test('enviado=1 abre o Estúdio com o projeto já enviado, e só ele muda', () => {
    const now = new Date('2026-11-01T12:00:00Z')
    const lesson = {
      id: 'a',
      blocks: [
        { id: 'e', kind: 'studio', sortOrder: 1, content: {} },
        { id: 'v', kind: 'video', sortOrder: 2, content: {} },
      ],
    } as unknown as Parameters<typeof enviada>[0]
    const aula = enviada(lesson, now)
    expect(aula.blocks[0]?.studioState).toEqual({
      submitted: true,
      submittedAt: '2026-11-01T12:00:00.000Z',
    })
    expect(aula.blocks[1]).toBe(lesson.blocks[1])
    expect(lesson.blocks[0]?.studioState).toBeUndefined()
  })

  test('a parte continua do projeto da tomada mais recente da parte de antes mais perto', () => {
    const g = (parte: number, at: number) => ({ parte, at, project: { de: `${parte}@${at}` } })
    const gravados = [g(3, 1), g(4, 2), g(4, 5), g(5, 9)]
    expect(projetoAntes(gravados, 5)).toEqual({ de: '4@5' })
    expect(projetoAntes(gravados, 4)).toEqual({ de: '3@1' })
    // Gravar a parte 5 depois não muda o que a 5 recebe; nada antes da 3, nada a continuar.
    expect(projetoAntes(gravados, 3)).toBeNull()
  })

  test('sem tomada de antes, a parte abre no projeto de entrada dela ou na solução de antes', () => {
    const aula2 = JSON.parse(
      readFileSync(
        new URL(
          '../../../docs/aulas-interativas/faisca/cade-todo-mundo/cade-todo-mundo-aula-2.manifesto.json',
          import.meta.url,
        ),
        'utf8',
      ),
    )
    const studio = aula2.blocks.find((b: { content?: { projectExamples?: unknown } }) =>
      Boolean(b.content?.projectExamples),
    ).content.projectExamples
    // Na aula publicada, as partes têm ids; o manifesto as chama pela chave.
    const chaves = ['retomada', 'variavel-achados', 'contar-achados', 'personalizar', 'conclusao']
    const id = (i: number) => `00000000-0000-4000-8000-00000000000${i + 1}`
    const publicada = {
      ...studio,
      sections: Object.fromEntries(
        Object.entries(studio.sections).map(([k, v]) => [id(chaves.indexOf(k)), v]),
      ),
    }
    const ids = chaves.map((_, i) => id(i))
    const [entrada, solucao] = [
      studio.sections['contar-achados'].entryExampleId,
      studio.sections['contar-achados'].solutionExampleId,
    ]
    expect(projetoDaParte(publicada, ids, 3)).toEqual(studio.examples[entrada])
    expect(projetoDaParte(publicada, ids, 4)).toEqual(studio.examples[solucao])
    expect(projetoDaParte(publicada, ids, 5)).toEqual(studio.examples[solucao])
    expect(projetoDaParte(publicada, ids, 2)).toBeNull()
    expect(projetoDaParte(publicada, ids, ids.length + 1)).toBeNull()
    expect(projetoDaParte(publicada, ids, Number.MAX_SAFE_INTEGER)).toBeNull()
    expect(projetoDaParte(publicada, ids, Number.POSITIVE_INFINITY)).toBeNull()
    expect(projetoDaParte(publicada, ids, Number.NaN)).toBeNull()
    expect(projetoDaParte(undefined, ids, 4)).toBeNull()
  })

  test('cada tomada começa do projeto inicial: nada enviado nem trazido', () => {
    expect(bffAnswer('GET', ['blocks', 'b1', 'studio-submission'])).toMatchObject({
      body: { project: null },
    })
    expect(bffAnswer('GET', ['blocks', 'b1', 'art-slots'])).toMatchObject({ body: { slots: [] } })
    // O certificado aparece pronto para baixar, e baixar entrega o PDF de exemplo.
    expect(bffAnswer('GET', ['blocks', 'c1', 'certificate'])).toMatchObject({
      body: { eligible: true, issued: false },
    })
    expect(bffAnswer('POST', ['blocks', 'c1', 'certificate'])).toEqual({ kind: 'certificate' })
    expect(bffAnswer('GET', ['blocks', 'b1', 'outra'])).toMatchObject({ status: 404 })
    expect(bffAnswer('DELETE', ['navigation'])).toMatchObject({ status: 404 })
  })
})

describe('entrada e endereço', () => {
  test('só a equipe ativa, sem impersonação nem sessão de perfil', () => {
    const base = { sub: 'u1', email: 'e@x', role: 'staff', status: 'active', typ: 'access' }
    expect(staffFromClaims(base)).toEqual({ id: 'u1', email: 'e@x', role: 'staff' })
    expect(staffFromClaims({ ...base, role: 'admin' })?.role).toBe('admin')
    expect(staffFromClaims({ ...base, role: 'student' })).toBeNull()
    expect(staffFromClaims({ ...base, status: 'suspended' })).toBeNull()
    expect(staffFromClaims({ ...base, act: { sub: 'a', mode: 'readonly' } })).toBeNull()
    expect(staffFromClaims({ ...base, kids: { kind: 'parent' } })).toBeNull()
    expect(staffFromClaims({ ...base, typ: 'refresh' })).toBeNull()
    expect(staffFromClaims({ ...base, typ: undefined })).toBeNull()
    expect(staffFromClaims({ ...base, desktop: { sessionId: 'd1' } })).toBeNull()
  })

  test('depois de entrar, volta só para um caminho do próprio palco', () => {
    const origin = 'https://palco.example'
    expect(safeReturn('/aulas/c/a?tomada=1', origin)).toBe('/aulas/c/a?tomada=1')
    const evils = ['//evil.com', '/\\evil.com', '/\t/evil.com', '/\n/evil.com', 'https://evil.com']
    for (const evil of evils) expect(safeReturn(evil, origin)).toBe('/')
  })

  test('o endereço de uma aula do Kids vira a mesma aula no palco', () => {
    expect(
      lessonPathOf('https://kids-staging.up.railway.app/cursos/cade-todo-mundo/aulas/abc-123?x=1'),
    ).toBe('/aulas/cade-todo-mundo/abc-123')
    expect(lessonPathOf('/cursos/c%C3%A1/aulas/a1')).toBe('/aulas/c%C3%A1/a1')
    expect(lessonPathOf('https://kids/cursos/x')).toBeNull()
  })
})

describe('arrumação de quando o Estúdio abre', () => {
  const caixa = (left: number, top: number, w = 100, h = 40) => ({
    left,
    top,
    right: left + w,
    bottom: top + h,
  })
  const juntas = [caixa(0, 0), caixa(50, 20), caixa(300, 0)]
  const separadas = [caixa(0, 0), caixa(0, 60), caixa(300, 0)]

  test('acha pilhas uma por cima da outra, e encostadas não contam', () => {
    expect(sobrepostas(juntas)).toBe(true)
    expect(sobrepostas(separadas)).toBe(false)
    expect(sobrepostas([caixa(0, 0), caixa(100, 0)])).toBe(false)
  })

  test('organiza uma vez quando os blocos pararam de chegar, e a página fica ocupada até lá', async () => {
    const arrumar = arrumacao<object>()
    const area = {}
    let vezes = 0
    const organizar = async () => {
      vezes++
      return true
    }
    expect(arrumar.pendente(area, juntas)).toBe(true)
    await arrumar.passo(area, juntas.slice(0, 2), organizar)
    await arrumar.passo(area, juntas, organizar)
    expect(vezes).toBe(0)
    await arrumar.passo(area, juntas, organizar)
    expect(vezes).toBe(1)
    expect(arrumar.pendente(area, juntas)).toBe(false)
    // Depois disso o que o robô faz na área fica como ele fez.
    await arrumar.passo(area, juntas, organizar)
    await arrumar.passo(area, juntas, organizar)
    expect(vezes).toBe(1)
    // Uma área nova (o Estúdio expandido) passa de novo.
    expect(arrumar.pendente({}, separadas)).toBe(true)
  })

  test('sem blocos sobrepostos não mexe, e sem blocos não segura a página', async () => {
    const arrumar = arrumacao<object>()
    const area = {}
    let vezes = 0
    const organizar = async () => {
      vezes++
      return true
    }
    expect(arrumar.pendente(area, [])).toBe(false)
    await arrumar.passo(area, separadas, organizar)
    await arrumar.passo(area, separadas, organizar)
    expect(vezes).toBe(0)
    expect(arrumar.pendente(area, separadas)).toBe(false)
  })

  test('um menu que não abre é tentado de novo e depois deixado, sem prender a gravação', async () => {
    const arrumar = arrumacao<object>()
    const area = {}
    let vezes = 0
    const organizar = async () => {
      vezes++
      if (vezes === 2) throw new Error('sem menu')
      return false
    }
    for (let i = 0; i < 8; i++) await arrumar.passo(area, juntas, organizar)
    expect(vezes).toBe(3)
    expect(arrumar.pendente(area, juntas)).toBe(false)
  })
})

describe('roteiros gravados pelo robô', () => {
  /** Os verbos do EdiAula (qualquer página) e os trechos da edição não passam pela ponte. */
  const doEdiAula =
    /^(na edi[cç][aã]o:|(apontar|clicar|passar o mouse|clique duplo|clique direito|esperar|segurar|rolar até|arrastar) ["“]|segurar tecla |tecla |digitar |rolar para )/i

  const pasta = '../../../docs/aulas-interativas/faisca/desafio-primeiro-jogo/'
  /** Os colchetes do Na tela de um roteiro e os jogos prontos do manifesto da aula. */
  const doRoteiro = (aula: string) => {
    const roteiro = readFileSync(new URL(`${pasta}${aula}.roteiro.md`, import.meta.url), 'utf8')
    const farol = JSON.parse(
      readFileSync(new URL(`${pasta}${aula}.manifesto.json`, import.meta.url), 'utf8'),
    ) as typeof manifesto
    const jogosDoFarol = farol.blocks
      .map((b) => b.content?.activity)
      .filter((a): a is JogoDaAula => !!a?.stage && Array.isArray(a.targets))
    const colchetes = [...roteiro.matchAll(/^\*\*Na tela:\*\*(.+)$/gm)].flatMap((linha) =>
      [...(linha[1] ?? '').matchAll(/\[([^\]\n]+)\]/g)].map((m) => (m[1] ?? '').trim()),
    )
    return { colchetes, jogosDoFarol }
  }

  test('todo colchete do Na tela da Aula 1 do Desafio do Primeiro Jogo é um verbo do palco', () => {
    const { colchetes, jogosDoFarol } = doRoteiro('desafio-dia-1')
    expect(colchetes.length).toBeGreaterThan(90)
    for (const colchete of colchetes.filter((c) => !doEdiAula.test(c)))
      expect(() => agir(colchete, jogosDoFarol, pagina()), colchete).not.toThrow()
  })

  test('todo colchete do Na tela da Aula 3 do Desafio do Primeiro Jogo é um verbo do palco', () => {
    const { colchetes, jogosDoFarol } = doRoteiro('desafio-dia-3')
    expect(colchetes.length).toBeGreaterThan(150)
    for (const colchete of colchetes.filter((c) => !doEdiAula.test(c)))
      expect(() => agir(colchete, jogosDoFarol, pagina()), colchete).not.toThrow()
  })

  test('todo colchete do Na tela da Aula 2 do Desafio do Primeiro Jogo é um verbo do palco', () => {
    const { colchetes, jogosDoFarol } = doRoteiro('desafio-dia-2')
    expect(jogosDoFarol).toEqual([])
    expect(colchetes.length).toBeGreaterThan(100)
    for (const colchete of colchetes.filter((c) => !doEdiAula.test(c)))
      expect(() => agir(colchete, jogosDoFarol, pagina()), colchete).not.toThrow()
  })
})

describe('o jogo ao lado dos blocos', () => {
  /** Uma página que lembra o que a ponte fez com o jogo e com o zoom. */
  const comJogo = (aVista = true) => {
    const feito: string[] = []
    let jogoAVista = aVista
    const p = pagina({
      jogoAVista: () => jogoAVista,
      alternarJogo: async () => {
        jogoAVista = !jogoAVista
        feito.push(jogoAVista ? 'mostrou' : 'escondeu')
        return true
      },
      zoom: async (passos) => {
        feito.push(`zoom ${passos}`)
      },
    })
    return { p, feito }
  }

  test('montar esconde, testar no jogo mostra, o resto tanto faz', () => {
    expect(jogoPara('encaixar "Deixar o sprite" em "Quando clicar ou tocar"')).toBe(false)
    expect(jogoPara('categoria Jogo 2D > Sprites')).toBe(false)
    expect(jogoPara('apontar bloco "Ao iniciar"')).toBe(false)
    expect(jogoPara('apontar paleta')).toBe(false)
    expect(jogoPara('tocar prévia arbusto')).toBe(true)
    expect(jogoPara('apontar prévia 75 26')).toBe(true)
    expect(jogoPara('segurar seta da direita na prévia por 1 s')).toBe(true)
    expect(jogoPara('reduzir estúdio')).toBe(true)
    // O escolher continua o abrir campo: trocar o jogo ali fecharia a lista aberta.
    expect(jogoPara('escolher "escolhido" em "Deixar o sprite"')).toBeNull()
    expect(jogoPara('afastar de "Deixar o sprite"')).toBeNull()
    expect(jogoPara('verificar projeto')).toBeNull()
    expect(jogoPara('expandir estúdio')).toBeNull()
    expect(jogoPara('rodar de novo')).toBe(true)
  })

  test('rodar de novo clica no Rodar da barra, com o nome que ele tiver', () => {
    expect(agir('rodar de novo', jogos)).toEqual([
      { fazer: 'clicar', alvo: { seletor: '[data-live-target="studio-run"]' } },
    ])
    expect(agir('parar', jogos)).toEqual([
      { fazer: 'clicar', alvo: { seletor: '[data-live-target="studio-stop"]' } },
    ])
  })

  test('o zoom sai mesmo quando o Estúdio já trouxe o jogo de volta', async () => {
    const { p, feito } = comJogo()
    const jogo = novoJogoNoEstudio()
    await agirNaPagina('apontar paleta', jogos, p, jogo)
    // O Rodar com o jogo escondido: o Estúdio mostra o jogo sozinho.
    await p.alternarJogo()
    feito.length = 0
    await agirNaPagina('tocar prévia arbusto', jogos, p, jogo)
    expect(feito).toEqual([`zoom ${-ZOOM_SEM_JOGO}`])
    expect(jogo.zoom).toBe(0)
  })

  test('esconder dá o zoom depois, mostrar desfaz o zoom antes', async () => {
    const { p, feito } = comJogo()
    const jogo = novoJogoNoEstudio()
    await agirNaPagina('apontar bloco "Ao iniciar"', jogos, p, jogo)
    await agirNaPagina('categoria Jogo 2D', jogos, p, jogo)
    expect(feito).toEqual(['escondeu', `zoom ${ZOOM_SEM_JOGO}`])
    expect(jogo.zoom).toBe(ZOOM_SEM_JOGO)
    await agirNaPagina('tocar prévia arbusto', jogos, p, jogo)
    expect(feito).toEqual([
      'escondeu',
      `zoom ${ZOOM_SEM_JOGO}`,
      `zoom ${-ZOOM_SEM_JOGO}`,
      'mostrou',
    ])
    expect(jogo.zoom).toBe(0)
  })

  test('o roteiro fixa o jogo até "jogo automático"', async () => {
    const { p, feito } = comJogo()
    const jogo = novoJogoNoEstudio()
    expect(agir('mostrar o jogo', jogos)).toHaveLength(1)
    await agirNaPagina('mostrar o jogo', jogos, p, jogo)
    await agirNaPagina('encaixar "Deixar o sprite" em "Quando clicar ou tocar"', jogos, p, jogo)
    expect(feito).toEqual([])
    await agirNaPagina('jogo automático', jogos, p, jogo)
    await agirNaPagina('apontar paleta', jogos, p, jogo)
    expect(feito).toEqual(['escondeu', `zoom ${ZOOM_SEM_JOGO}`])
    await agirNaPagina('esconder o jogo', jogos, p, jogo)
    await agirNaPagina('tocar prévia arbusto', jogos, p, jogo)
    expect(feito).toEqual(['escondeu', `zoom ${ZOOM_SEM_JOGO}`])
  })

  test('sem o Estúdio na tela, ou sem o item no menu, nada muda', async () => {
    const jogo = novoJogoNoEstudio()
    await agirNaPagina('apontar paleta', jogos, pagina(), jogo)
    expect(jogo.zoom).toBe(0)
    let zooms = 0
    const estreito = pagina({
      jogoAVista: () => true,
      alternarJogo: async () => false,
      zoom: async () => {
        zooms++
      },
    })
    await agirNaPagina('apontar paleta', jogos, estreito, jogo)
    expect(zooms).toBe(0)
    expect(jogo.zoom).toBe(0)
  })
})
