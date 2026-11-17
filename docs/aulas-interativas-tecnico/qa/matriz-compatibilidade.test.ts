/**
 * Proteção dos dois cursos gravados (Cadê Todo Mundo? e A Chave do Farol) contra mudanças no
 * Estúdio. Três redes, da mais larga à mais explícita:
 *
 * 1. o RETRATO inteiro (blocos, paleta de cada aula, projetos) igual ao guardado;
 * 2. cada gesto de paleta do ROTEIRO resolvido na paleta de verdade daquela aula: a categoria
 *    existe naquele caminho e o bloco citado está dentro dela, com o texto que a fala diz;
 * 3. uma tabela escrita à mão com o que as aulas MOSTRAM (texto, caminho e valor que o bloco
 *    traz), que não se regrava: é o que impede aceitar uma mudança ensinada por engano.
 */
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import {
  ARQUIVO_DA_MATRIZ,
  ARQUIVO_LEGIVEL,
  blocosDoCurso,
  CURSOS_PROTEGIDOS,
  caminhosNaPaleta,
  estudiosDaAula,
  gestosDoRoteiro,
  manifestoDe,
  montarMatriz,
  paletaDaAula,
  projetosDosCursos,
  retratoDoBloco,
  textoDaMatriz,
  textoLegivel,
  tiposEnsinados,
} from './matriz-compatibilidade'

type No = ReturnType<typeof paletaDaAula>[number]

/** O emoji da frente não faz parte do nome (a gravação também o ignora ao procurar). */
const semEmoji = (texto: string) => texto.replace(/^[^\p{L}\p{N}]+/u, '').trim()

/** O texto do bloco como a criança lê na paleta, com os valores que ele traz. */
function textoNaPaleta(no: No): string {
  const retrato = retratoDoBloco(no.type as string) as Record<string, unknown>
  const campos = (no.fields ?? {}) as Record<string, unknown>
  const entradas = (no.inputs ?? {}) as Record<
    string,
    { shadow?: { fields?: Record<string, unknown> }; block?: { fields?: Record<string, unknown> } }
  >
  let saida = ''
  for (let i = 0; i <= 9; i += 1) {
    const mensagem = retrato[`message${i}`]
    if (typeof mensagem !== 'string') continue
    const args = (retrato[`args${i}`] ?? []) as Record<string, unknown>[]
    saida += ` ${mensagem.replace(/%(\d+)/g, (_, n: string) => {
      const arg = args[Number(n) - 1]
      if (!arg) return ''
      const nome = arg.name as string
      if (arg.type === 'input_value') {
        const dentro = entradas[nome]?.shadow?.fields ?? entradas[nome]?.block?.fields
        return dentro ? String(Object.values(dentro)[0] ?? '') : ''
      }
      if (typeof arg.type === 'string' && arg.type.startsWith('input_')) return ''
      if (campos[nome] !== undefined) return String(campos[nome])
      if (Array.isArray(arg.options)) {
        const opcoes = arg.options as [string, string][]
        return String(opcoes[0]?.[0] ?? '')
      }
      return String(arg.text ?? arg.value ?? '')
    })}`
  }
  return saida.replace(/\s+/g, ' ').trim()
}

function categoriaEm(nos: readonly No[], nome: string): No | undefined {
  return nos.find((no) => no.kind === 'category' && semEmoji(no.name ?? '') === semEmoji(nome))
}

function blocosDe(no: No): No[] {
  return (no.contents ?? []).flatMap((filho) =>
    filho.kind === 'block' ? [filho] : filho.kind === 'category' ? blocosDe(filho) : [],
  )
}

describe('retrato dos cursos protegidos', () => {
  const matriz = montarMatriz()

  test('o retrato de hoje é igual ao guardado', () => {
    // Diferença aqui = o Estúdio mudou algo que as aulas gravadas mostram ou leem. Leia o
    // cabeçalho de `matriz-compatibilidade.ts` antes de regravar.
    expect(textoDaMatriz(matriz)).toBe(readFileSync(ARQUIVO_DA_MATRIZ, 'utf8'))
    expect(textoLegivel(matriz)).toBe(readFileSync(ARQUIVO_LEGIVEL, 'utf8'))
  })

  test('cobre os 23 tipos do Cadê e os 28 do Farol', () => {
    const [cade, farol] = CURSOS_PROTEGIDOS
    if (!cade || !farol) throw new Error('cursos ausentes')
    expect(blocosDoCurso(cade)).toHaveLength(23)
    expect(blocosDoCurso(farol)).toHaveLength(28)
    expect(tiposEnsinados()).toHaveLength(35)
    for (const tipo of tiposEnsinados()) expect(() => retratoDoBloco(tipo), tipo).not.toThrow()
  })
})

describe('a paleta de cada aula', () => {
  for (const curso of CURSOS_PROTEGIDOS)
    for (const aula of curso.aulas) {
      const estudios = estudiosDaAula(manifestoDe(curso, aula))

      test(`${curso.id}/${aula}: as categorias de cima, na ordem, com "Blocos deste jogo" em terceiro`, () => {
        expect(estudios).toHaveLength(1)
        for (const { conteudo } of estudios) {
          const paleta = paletaDaAula(
            conteudo,
            (conteudo.initialProject as { blocksState: unknown }).blocksState,
          )
          // A pesquisa vem antes e não é categoria de blocos; a ordem de cima é a das telas gravadas.
          expect(paleta.filter((no) => no.kind === 'category').map((no) => no.name)).toEqual([
            '🗂️ Áreas do projeto',
            '🧰 Blocos deste jogo',
            'Programação',
            'Jogo 2D',
          ])
          expect(paleta.findIndex((no) => no.name === '🧰 Blocos deste jogo')).toBe(2)
          expect(conteudo.level).toBe('iniciante-2d')
          expect(conteudo.allowedModes).toEqual(['blocks'])
          expect([...(conteudo.allowBlocks ?? [])].sort()).toEqual(blocosDoCurso(curso))
        }
      })

      test(`${curso.id}/${aula}: todo bloco da lista da aula está na paleta, e nada de fora dela`, () => {
        for (const { conteudo } of estudios) {
          const paleta = paletaDaAula(
            conteudo,
            (conteudo.initialProject as { blocksState: unknown }).blocksState,
          )
          const oferecidos = new Set(caminhosNaPaleta(paleta).keys())
          const lista = new Set(conteudo.allowBlocks ?? [])
          expect([...oferecidos].filter((tipo) => !lista.has(tipo))).toEqual([])
          expect([...lista].filter((tipo) => !oferecidos.has(tipo)).sort()).toEqual([])
        }
      })

      test(`${curso.id}/${aula}: cada gesto de paleta do roteiro existe na paleta de verdade`, () => {
        const [estudio] = estudios
        if (!estudio) throw new Error('aula sem Estúdio')
        const paleta = paletaDaAula(
          estudio.conteudo,
          (estudio.conteudo.initialProject as { blocksState: unknown }).blocksState,
        )
        const falhas: string[] = []
        let conferidos = 0
        for (const [clipe, gestos] of Object.entries(gestosDoRoteiro(curso, aula))) {
          let nivel: readonly No[] = paleta
          let aberta: No | null = null
          for (const gesto of gestos) {
            // O roteiro escreve `categoria X` (apontar) e `abrir categoria X` (clicar).
            const categoria = /^(?:abrir )?categoria (.+)$/.exec(gesto)
            if (categoria) {
              const nome = categoria[1] ?? ''
              // Uma categoria de cima recomeça o caminho; uma de dentro desce um nível.
              const achada: No | undefined = categoriaEm(nivel, nome) ?? categoriaEm(paleta, nome)
              if (!achada)
                falhas.push(`${clipe}: [${gesto}] não existe em ${aberta?.name ?? 'paleta'}`)
              else {
                aberta = achada
                nivel = achada.contents ?? []
              }
              conferidos += 1
              continue
            }
            const tirar = /^(?:encaixar|soltar) "([^"]+)"/.exec(gesto)
            if (tirar) {
              const rotulo = tirar[1] ?? ''
              conferidos += 1
              if (!aberta) {
                falhas.push(`${clipe}: [${gesto}] sem categoria aberta antes`)
                continue
              }
              const textos = blocosDe(aberta).map((bloco) => semEmoji(textoNaPaleta(bloco)))
              if (!textos.some((texto) => texto.startsWith(rotulo)))
                falhas.push(
                  `${clipe}: [${gesto}] não está em "${aberta.name}". Lá tem: ${textos.join(' | ')}`,
                )
            }
          }
        }
        expect(falhas).toEqual([])
        // Rede de segurança do próprio teste: se o leitor de roteiros parar de achar gestos, isto cai.
        expect(conferidos).toBeGreaterThanOrEqual(3)
      })
    }
})

describe('o que as aulas mostram (tabela escrita à mão, não regravável)', () => {
  // [tipo, começo do texto que a fala diz, caminho na paleta, campos que o bloco traz]
  const ENSINADO: [string, string, string[], Record<string, unknown>][] = [
    [
      'sz_g2d_set_opacity',
      'Deixar o sprite %1 com %2 % de visibilidade',
      ['Jogo 2D', 'Sprites', 'Aparência'],
      { SPRITE: 'jogador' },
    ],
    [
      'sz_g2d_on_group_click',
      'Quando clicar/tocar num sprite do grupo %1 chamá-lo de %2',
      ['Jogo 2D', 'Controles', 'Teclado, ações e toque'],
      {},
    ],
    [
      'sz_g2d_enable_classic_controls',
      'Ativar controles clássicos %1',
      ['Jogo 2D', 'Controles', 'Teclado, ações e toque'],
      {},
    ],
    [
      'sz_g2d_top_down',
      'Mover sprite %1 em 4 direções com setas, velocidade %2',
      ['Jogo 2D', 'Movimento', 'Movimentos prontos'],
      { SPRITE: 'heroi' },
    ],
    [
      'sz_g2d_clamp_to_screen',
      'Manter o sprite %1 dentro da tela',
      ['Jogo 2D', 'Movimento', 'Bordas e rebatidas'],
      { SPRITE: 'heroi' },
    ],
    [
      'sz_g2d_on_overlap',
      'Quando o sprite %1 começar a encostar no sprite %2',
      ['Jogo 2D', 'Colisões', 'Encostar e bloquear'],
      { A: 'jogador', B: 'inimigo' },
    ],
    [
      'sz_g2d_destroy_sprite',
      'Destruir o sprite %1',
      ['Jogo 2D', 'Sprites', 'Criar e trocar aparência'],
      { SPRITE: 'resposta' },
    ],
    [
      'sz_g2d_set_image',
      'Trocar imagem do sprite %1 para %2',
      ['Jogo 2D', 'Sprites', 'Criar e trocar aparência'],
      { SPRITE: 'heroi' },
    ],
    [
      'sz_g2d_create_image_sprite',
      'Criar sprite %1 em x %2 y %3 largura %4 altura %5 com imagem %6',
      ['Jogo 2D', 'Sprites', 'Criar e trocar aparência'],
      {},
    ],
    [
      'sz_js_var_increment',
      'Somar %1 em variável %2',
      ['Programação', '🏷️ Variáveis'],
      { NAME: 'contador', DELTA: 1 },
    ],
    [
      'sz_js_var_create',
      'Criar variável %1 com valor %2',
      ['Programação', '🏷️ Variáveis'],
      { NAME: 'contador' },
    ],
    [
      'sz_js_var_assign',
      'Alterar variável %1 para %2',
      ['Programação', '🏷️ Variáveis'],
      { NAME: 'contador' },
    ],
    ['sz_js_if_else', 'Se %1', ['Programação', '❓ Lógica & Se'], {}],
    ['sz_val_bool', '%1', ['Programação', '❓ Lógica & Se'], {}],
    ['sz_val_text', 'texto %1', ['Programação', '🔣 Valores'], { TEXT: 'Olá' }],
    ['sz_val_variable', 'valor da variável %1', ['Programação', '🔣 Valores'], { NAME: 'x' }],
    ['sz_frame_start', '⚙️ Ao iniciar %1', ['🗂️ Áreas do projeto'], {}],
    ['sz_frame_events', '⚡ Quando acontecer %1', ['🗂️ Áreas do projeto'], {}],
    ['sz_frame_loops', '🔁 Enquanto estiver rodando %1', ['🗂️ Áreas do projeto'], {}],
  ]

  test.each(ENSINADO)('%s', (tipo, texto, caminho, campos) => {
    const retrato = retratoDoBloco(tipo) as {
      message0: string
      caminhoNaPaleta: string[]
      args0?: { name?: string; text?: unknown; value?: unknown }[]
    }
    expect(retrato.message0.startsWith(texto)).toBe(true)
    expect(retrato.caminhoNaPaleta).toEqual(caminho)
    for (const [nome, valor] of Object.entries(campos)) {
      const arg = (retrato.args0 ?? []).find((a) => a.name === nome)
      expect(arg, `${tipo}.${nome}`).toBeDefined()
      expect(arg?.text ?? arg?.value, `${tipo}.${nome}`).toBe(valor)
    }
  })

  test('as opções do Ativar controles clássicos, com "só as quatro direções" valendo `directions`', () => {
    const retrato = retratoDoBloco('sz_g2d_enable_classic_controls') as {
      args0: { name: string; options: [string, string][] }[]
    }
    expect(retrato.args0.find((a) => a.name === 'MODE')?.options).toEqual([
      ['automáticos no celular', 'auto'],
      ['sempre visíveis', 'always'],
      ['só as quatro direções', 'directions'],
      ['sem botões na tela', 'off'],
    ])
  })

  test('verdadeiro e falso guardam `true` e `false` no campo VALUE (as verificações leem isso)', () => {
    const retrato = retratoDoBloco('sz_val_bool') as {
      args0: { name: string; options: [string, string][] }[]
    }
    expect(retrato.args0.find((a) => a.name === 'VALUE')?.options).toEqual([
      ['verdadeiro', 'true'],
      ['falso', 'false'],
    ])
  })

  test('os valores que os blocos trazem encaixados na paleta: 50, 3, 0, 1 e a condição x > 0', () => {
    const [cade, farol] = CURSOS_PROTEGIDOS
    if (!cade || !farol) throw new Error('cursos ausentes')
    const paletaDe = (curso: typeof cade, aula: string) => {
      const [estudio] = estudiosDaAula(manifestoDe(curso, aula))
      if (!estudio) throw new Error('aula sem Estúdio')
      return paletaDaAula(
        estudio.conteudo,
        (estudio.conteudo.initialProject as { blocksState: unknown }).blocksState,
      )
    }
    const textoDe = (paleta: readonly No[], tipo: string) => {
      const jogo = categoriaEm(paleta, 'Jogo 2D')
      const programacao = categoriaEm(paleta, 'Programação')
      const bloco = [
        ...(jogo ? blocosDe(jogo) : []),
        ...(programacao ? blocosDe(programacao) : []),
      ].find((no) => no.type === tipo)
      if (!bloco) throw new Error(`${tipo} fora da paleta`)
      return textoNaPaleta(bloco)
    }
    const cadeA1 = paletaDe(cade, 'aula-1')
    const farolD1 = paletaDe(farol, 'dia-1')
    const farolD3 = paletaDe(farol, 'dia-3')
    expect(textoDe(cadeA1, 'sz_g2d_set_opacity')).toBe(
      'Deixar o sprite jogador com 50 % de visibilidade',
    )
    expect(textoDe(cadeA1, 'sz_js_var_increment')).toBe('Somar 1 em variável contador')
    expect(textoDe(farolD1, 'sz_g2d_top_down')).toBe(
      'Mover sprite heroi em 4 direções com setas, velocidade 3',
    )
    expect(textoDe(farolD3, 'sz_js_var_create')).toBe('Criar variável contador com valor 0')
    expect(textoDe(farolD3, 'sz_js_var_assign')).toBe('Alterar variável contador para 1')
    // O Se chega com a condição de exemplo "x > 0", que a aula manda arrastar para a lixeira.
    const se = blocosDe(categoriaEm(farolD3, 'Programação') as No).find(
      (no) => no.type === 'sz_js_if_else',
    )
    expect(JSON.stringify(se?.inputs)).toContain('sz_val_compare')
    expect(JSON.stringify(se?.inputs)).toContain('"x"')
  })
})

describe('os projetos que os cursos carregam', () => {
  const projetos = projetosDosCursos()

  test('são sete: o inicial de cada aula e o jogo final de cada curso', () => {
    expect(projetos.map((p) => `${p.curso}:${p.origem}`)).toEqual([
      'cade-todo-mundo:aula-1/projeto/inicial',
      'cade-todo-mundo:aula-2/projeto/inicial',
      'cade-todo-mundo:projeto-final',
      'desafio-primeiro-jogo:dia-1/projeto/inicial',
      'desafio-primeiro-jogo:dia-2/projeto/inicial',
      'desafio-primeiro-jogo:dia-3/projeto/inicial',
      'desafio-primeiro-jogo:projeto-final',
    ])
  })

  test('todos passam pelo portão de importação sem perder nem mudar um bloco', () => {
    const matriz = montarMatriz() as {
      projetos: { origem: string; sobreviveAoSaneamento: boolean; saneamentoNaoMudaNada: boolean }[]
    }
    for (const projeto of matriz.projetos) {
      expect(projeto.sobreviveAoSaneamento, projeto.origem).toBe(true)
      expect(projeto.saneamentoNaoMudaNada, projeto.origem).toBe(true)
    }
  })

  test('só usam blocos da lista do curso (mais as áreas internas)', () => {
    const matriz = montarMatriz() as {
      projetos: { curso: string; origem: string; blocos: Record<string, number> }[]
    }
    for (const projeto of matriz.projetos) {
      const curso = CURSOS_PROTEGIDOS.find((c) => c.id === projeto.curso)
      if (!curso) throw new Error('curso ausente')
      const lista = new Set([...blocosDoCurso(curso), 'sz_frame_structure', 'sz_frame_appearance'])
      expect(
        Object.keys(projeto.blocos).filter((tipo) => !lista.has(tipo)),
        projeto.origem,
      ).toEqual([])
    }
  })

  test('declaram o Jogo 2D na versão 1.2.0 (a extensão hoje é mais nova; fica registrado, sem migrar)', () => {
    for (const projeto of projetos)
      expect(
        (projeto.projeto.installedExtensions ?? []).map((e) => `${e.id}@${e.version}`),
        projeto.origem,
      ).toEqual(['game-2d@1.2.0'])
  })
})
