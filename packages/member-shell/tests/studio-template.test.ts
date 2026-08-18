import { describe, expect, test } from 'bun:test'
import { isInitialTemplateProject } from '../src/lib/studio-template'

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
  })
})
