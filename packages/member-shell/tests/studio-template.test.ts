import { describe, expect, test } from 'bun:test'
import { documentFixture } from '../../studio/src/state/fixtures/projectDocuments'
import { isInitialTemplateProject } from '../src/lib/studio-template'

for (const kind of ['classic', 'pro'] as const) {
  test(`Python ${kind}: the overwrite warning compares actual Python files`, () => {
    const initial = documentFixture('python', kind)
    if (initial.programmingLanguage !== 'python') throw new Error('fixture')
    expect(isInitialTemplateProject({ ...initial, id: 'saved' }, initial)).toBe(true)
    const edited = structuredClone(initial)
    if (edited.programmingLanguage !== 'python') throw new Error('fixture')
    if (edited.kind === 'classic') edited.files[edited.python.entrypoint] += '\nprint(42)'
    else edited.tree[edited.python.entrypoint] = { kind: 'file', content: 'print(42)' }
    expect(isInitialTemplateProject(edited, initial)).toBe(false)
    expect(isInitialTemplateProject(initial, documentFixture('javascript', kind))).toBe(false)
    expect(
      isInitialTemplateProject(
        { ...initial, python: { ...initial.python, entrypoint: 'other.py' } },
        initial,
      ),
    ).toBe(false)
  })
}

/**
 * O detector do aviso anti-sobrescrita ("você está reenviando o projeto INICIAL da aula").
 * O custo de errar tem dois lados: falso negativo = a criança sobrescreve o jogo entregue com o
 * template sem aviso; falso positivo = aviso assustando quem trabalhou (e aviso errado ensina a
 * ignorar avisos).
 */

function projeto(files: Record<string, string>, extra: Record<string, unknown> = {}) {
  return {
    id: 'x',
    name: 'Projeto',
    files: { 'index.html': '', 'style.css': '', 'script.js': '', ...files },
    assets: [],
    ...extra,
  }
}

describe('isInitialTemplateProject', () => {
  test('os 3 arquivos canônicos idênticos → é o template', () => {
    const template = projeto({ 'index.html': '<h1>Oi</h1>', 'script.js': 'let x = 1' })
    const atual = projeto({ 'index.html': '<h1>Oi</h1>', 'script.js': 'let x = 1' })
    expect(isInitialTemplateProject(atual, template)).toBe(true)
  })

  test('id/nome/timestamps diferentes não importam — só os arquivos contam', () => {
    const template = projeto({ 'script.js': 'let x = 1' }, { id: 't', updatedAt: 1 })
    const atual = projeto({ 'script.js': 'let x = 1' }, { id: 'aluno', updatedAt: 999 })
    expect(isInitialTemplateProject(atual, template)).toBe(true)
  })

  test('um byte editado em qualquer canônico → não é mais o template', () => {
    const template = projeto({ 'script.js': 'let x = 1' })
    expect(isInitialTemplateProject(projeto({ 'script.js': 'let x = 2' }), template)).toBe(false)
    expect(isInitialTemplateProject(projeto({ 'style.css': 'b{}' }), template)).toBe(false)
    expect(isInitialTemplateProject(projeto({ 'index.html': '<p></p>' }), template)).toBe(false)
  })

  test('arquivo ausente conta como vazio (projeto legado sem a chave)', () => {
    const semStyle = {
      files: { 'index.html': '<h1>Oi</h1>', 'script.js': '' },
      assets: [],
    }
    const template = projeto({ 'index.html': '<h1>Oi</h1>' })
    expect(isInitialTemplateProject(semStyle, template)).toBe(true)
  })

  test('kind pro em qualquer lado → false (os canônicos são vazios dos dois lados — falso positivo garantido)', () => {
    const template = projeto({}, { kind: 'pro' })
    const atual = projeto({}, { kind: 'pro' })
    expect(isInitialTemplateProject(atual, template)).toBe(false)
    expect(isInitialTemplateProject(projeto({}), template)).toBe(false)
    expect(isInitialTemplateProject(atual, projeto({}))).toBe(false)
  })

  test('contagem de assets diferente → false (só adicionar uma imagem já é trabalho)', () => {
    const template = projeto({ 'script.js': 'let x = 1' })
    const comAsset = projeto({ 'script.js': 'let x = 1' }, { assets: [{ name: 'gato' }] })
    expect(isInitialTemplateProject(comAsset, template)).toBe(false)
  })

  test('assets com a mesma quantidade mas conteúdo diferente → false', () => {
    const template = projeto(
      { 'script.js': 'let x = 1' },
      {
        assets: [
          {
            id: 'gato',
            name: 'gato',
            kind: 'image',
            dataUrl: 'data:image/png;base64,TEMPLATE',
            source: 'upload',
          },
        ],
      },
    )
    const editado = projeto(
      { 'script.js': 'let x = 1' },
      {
        assets: [
          {
            id: 'gato',
            name: 'gato',
            kind: 'image',
            dataUrl: 'data:image/png;base64,TRABALHO-DO-ALUNO',
            source: 'upload',
          },
        ],
      },
    )

    expect(isInitialTemplateProject(editado, template)).toBe(false)
  })

  test('assets estruturalmente idênticos continuam sendo o template', () => {
    const template = projeto(
      { 'script.js': 'let x = 1' },
      {
        assets: [
          {
            id: 'gato',
            name: 'gato',
            kind: 'image',
            dataUrl: 'data:image/png;base64,IGUAL',
            source: 'upload',
            sprite: { frameWidth: 16, animations: [{ name: 'andar', from: 0, to: 3 }] },
          },
        ],
      },
    )
    const atual = projeto(
      { 'script.js': 'let x = 1' },
      {
        assets: [
          {
            source: 'upload',
            dataUrl: 'data:image/png;base64,IGUAL',
            kind: 'image',
            name: 'gato',
            id: 'gato',
            sprite: { animations: [{ to: 3, from: 0, name: 'andar' }], frameWidth: 16 },
          },
        ],
      },
    )

    expect(isInitialTemplateProject(atual, template)).toBe(true)
  })

  // O desenho da vaga de arte é posto pelo HOST a cada abertura (`applyLessonArt`), como a
  // impressão do conteúdo do core já trata (`isCourseLibraryAsset`). Contá-lo calava o aviso em
  // toda aula com vaga: o projeto inicial + o desenho nunca era "o projeto inicial".
  const desenho = (id: string, name: string) => ({
    id,
    name,
    kind: 'image',
    dataUrl: 'data:image/png;base64,DESENHO-DA-CRIANCA',
    source: 'lesson-art',
  })
  const chaveDoCurso = {
    id: 'chave',
    name: 'chave-dourada',
    kind: 'image',
    dataUrl: 'data:image/png;base64,CURSO',
    source: 'library',
  }

  test('vaga "add": o projeto inicial com o desenho da aula ainda é o projeto inicial', () => {
    const template = projeto({ 'script.js': 'let x = 1' }, { assets: [chaveDoCurso] })
    const recomecado = projeto(
      { 'script.js': 'let x = 1' },
      { assets: [chaveDoCurso, desenho('lesson-art-minha-chave', 'minha-chave')] },
    )
    expect(isInitialTemplateProject(recomecado, template)).toBe(true)
  })

  test('vaga "replace": a imagem trocada pelo desenho ainda é a do projeto inicial', () => {
    const template = projeto({ 'script.js': 'let x = 1' }, { assets: [chaveDoCurso] })
    const recomecado = projeto(
      { 'script.js': 'let x = 1' },
      { assets: [desenho('chave', 'chave-dourada')] },
    )
    expect(isInitialTemplateProject(recomecado, template)).toBe(true)
  })

  test('com o desenho da aula, uma imagem a mais da criança continua sendo trabalho', () => {
    const template = projeto({ 'script.js': 'let x = 1' }, { assets: [chaveDoCurso] })
    const trabalhado = projeto(
      { 'script.js': 'let x = 1' },
      {
        assets: [
          chaveDoCurso,
          desenho('lesson-art-minha-chave', 'minha-chave'),
          { id: 'gato', name: 'gato', kind: 'image', dataUrl: 'data:,x', source: 'upload' },
        ],
      },
    )
    expect(isInitialTemplateProject(trabalhado, template)).toBe(false)
  })

  test('com o desenho da aula, o código mudado continua sendo trabalho', () => {
    const template = projeto({ 'script.js': 'let x = 1' }, { assets: [chaveDoCurso] })
    const trabalhado = projeto(
      { 'script.js': 'let x = 2' },
      { assets: [chaveDoCurso, desenho('lesson-art-minha-chave', 'minha-chave')] },
    )
    expect(isInitialTemplateProject(trabalhado, template)).toBe(false)
  })

  test('o projeto inicial não pode esconder imagens dizendo que são desenho da aula', () => {
    // Só o lado da CRIANÇA tira os desenhos: um template com `lesson-art` não é dado de aula.
    const template = projeto(
      { 'script.js': 'let x = 1' },
      { assets: [chaveDoCurso, desenho('lesson-art-minha-chave', 'minha-chave')] },
    )
    const semDesenho = projeto({ 'script.js': 'let x = 1' }, { assets: [chaveDoCurso] })
    expect(isInitialTemplateProject(semDesenho, template)).toBe(false)
  })

  // O projeto inicial dos manifestos guarda os blocos SEM id, e o código dele usa nomes de evento
  // escritos à mão. Ao abrir, o Blockly sorteia os ids, e o código regerado leva esses ids: os
  // arquivos nunca batiam, e o aviso não aparecia em nenhuma aula montada por manifesto.
  const blocosDoModelo = {
    blocks: {
      languageVersion: 0,
      blocks: [
        {
          type: 'sz_frame_events',
          inputs: {
            CHILDREN: {
              block: {
                type: 'sz_g2d_on_overlap',
                fields: { A: 'personagem', B: 'chave' },
                inputs: { DO: { block: { type: 'sz_set_var', fields: { NAME: 'temChave' } } } },
              },
            },
          },
        },
      ],
    },
  }
  const blocosAbertos = (opcoes: { x?: number; alvo?: string } = {}) => ({
    szBehaviorAreasVersion: 7,
    blocks: {
      languageVersion: 0,
      blocks: [
        {
          type: 'sz_frame_events',
          id: 'b]Q-w8)*eX;|',
          ...(opcoes.x === undefined ? {} : { x: opcoes.x, y: 40 }),
          inputs: {
            CHILDREN: {
              block: {
                type: 'sz_g2d_on_overlap',
                id: '+2-)v%WJ)T|*',
                fields: { A: 'personagem', B: opcoes.alvo ?? 'chave' },
                inputs: {
                  DO: {
                    block: { type: 'sz_set_var', id: 'B;*q;s7X', fields: { NAME: 'temChave' } },
                  },
                },
              },
            },
          },
        },
      ],
    },
  })
  const modeloComBlocos = () =>
    projeto(
      {
        'index.html': '<canvas></canvas>',
        'script.js': 'SZGame2D.onOverlap(a, b, () => {}, "eventoDeContato");',
      },
      { blocksState: blocosDoModelo },
    )
  const abertoComBlocos = (opcoes: { x?: number; alvo?: string; html?: string } = {}) =>
    projeto(
      {
        'index.html': opcoes.html ?? '<canvas></canvas>',
        'script.js': 'SZGame2D.onOverlap(a, b, () => {}, "+2-)v%WJ)T|*");',
      },
      { blocksState: blocosAbertos(opcoes) },
    )

  test('blocos: os ids que o editor sorteia ao abrir não fazem o projeto inicial virar trabalho', () => {
    expect(isInitialTemplateProject(abertoComBlocos(), modeloComBlocos())).toBe(true)
  })

  test('blocos: arrastar um bloco não é trabalho', () => {
    expect(isInitialTemplateProject(abertoComBlocos({ x: 220 }), modeloComBlocos())).toBe(true)
  })

  test('blocos: mudar um campo de um bloco é trabalho', () => {
    expect(isInitialTemplateProject(abertoComBlocos({ alvo: 'farol' }), modeloComBlocos())).toBe(
      false,
    )
  })

  test('blocos: a página mudada é trabalho, mesmo com os mesmos blocos', () => {
    expect(
      isInitialTemplateProject(
        abertoComBlocos({ html: '<canvas id="x"></canvas>' }),
        modeloComBlocos(),
      ),
    ).toBe(false)
  })

  test('blocos: código ainda sendo lido pela Ponte não passa por projeto inicial', () => {
    const aberto = { ...abertoComBlocos(), bridgeCodeAhead: true }
    expect(isInitialTemplateProject(aberto, modeloComBlocos())).toBe(false)
  })

  test('blocos: o id sorteado dos parâmetros de um método não é trabalho, o nome é', () => {
    const metodo = (params: Array<Record<string, string>>) => ({
      blocks: {
        languageVersion: 0,
        blocks: [{ type: 'sz_class_method', extraState: { params }, fields: { NAME: 'andar' } }],
      },
    })
    const modelo = projeto(
      { 'script.js': 'class A { andar(passo) {} }' },
      { blocksState: metodo([{ name: 'passo' }]) },
    )
    const aberto = projeto(
      { 'script.js': 'class A { andar(passo) {} } // regerado' },
      { blocksState: metodo([{ name: 'passo', id: 'sorteado-ao-abrir' }]) },
    )
    const renomeado = projeto(
      { 'script.js': 'class A { andar(salto) {} }' },
      { blocksState: metodo([{ name: 'salto', id: 'sorteado-ao-abrir' }]) },
    )
    expect(isInitialTemplateProject(aberto, modelo)).toBe(true)
    expect(isInitialTemplateProject(renomeado, modelo)).toBe(false)
  })

  test('blocos com variável do Blockly (referência por id) seguem a régua dos arquivos', () => {
    const comVariavel = (blocks: object) => ({ ...blocks, variables: [{ name: 'v', id: 'v1' }] })
    const modelo = projeto(
      { 'script.js': 'let v = 1 // "eventoDeContato"' },
      { blocksState: comVariavel(blocosDoModelo) },
    )
    const aberto = projeto(
      { 'script.js': 'let v = 1 // "+2-)v%WJ)T|*"' },
      { blocksState: comVariavel(blocosAbertos()) },
    )
    expect(isInitialTemplateProject(aberto, modelo)).toBe(false)
  })

  test('assets ausentes contam como zero (compat com projeto sem o campo)', () => {
    const template = { files: { 'script.js': 'a' } }
    const atual = { files: { 'script.js': 'a' }, assets: [] }
    expect(isInitialTemplateProject(atual, template)).toBe(true)
  })

  test('entrada nula ou torta → false, sem lançar', () => {
    const template = projeto({})
    expect(isInitialTemplateProject(null, template)).toBe(false)
    expect(isInitialTemplateProject(undefined, template)).toBe(false)
    expect(isInitialTemplateProject(projeto({}), null)).toBe(false)
    expect(isInitialTemplateProject('texto', template)).toBe(false)
    expect(isInitialTemplateProject({ files: 'não é objeto' }, { files: 'não é objeto' })).toBe(
      false,
    )
    expect(
      isInitialTemplateProject({ files: template.files, assets: 'não é uma lista' }, template),
    ).toBe(false)
  })
})
