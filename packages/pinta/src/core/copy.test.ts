import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'

/**
 * Lê os TEXTOS do arquivo (strings e pedaços de template) pela árvore do TypeScript: os
 * comentários ficam de fora sozinhos, e o que sobra é exatamente o que pode chegar à tela.
 */
function textosDoArquivo(source: string): string[] {
  const file = ts.createSourceFile('copy.ts', source, ts.ScriptTarget.Latest, true)
  const textos: string[] = []
  const visitar = (node: ts.Node): void => {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    )
      textos.push(node.text)
    ts.forEachChild(node, visitar)
  }
  visitar(file)
  return textos
}

const comTravessao = (textos: string[]) => textos.filter((texto) => texto.includes('—'))

describe('a copy do Pinta', () => {
  it('a régua acha o travessão num texto e ignora o de comentário', () => {
    const exemplo = [
      '// comentário — pode',
      "const a = { ok: 'Pronto.', ruim: 'Pronto — feito.' }",
      // O `$` e a chave vão separados só para o lint não ler isto como template esquecido.
      'const b = (n: number) => `$' + '{n} desenhos — guardados`',
    ].join('\n')
    expect(comTravessao(textosDoArquivo(exemplo))).toEqual([
      'Pronto — feito.',
      ' desenhos — guardados',
    ])
  })

  it('nenhum texto que vai para a tela tem travessão', () => {
    const textos = textosDoArquivo(readFileSync(join(import.meta.dir, 'copy.ts'), 'utf8'))
    // Anti-vácuo: o arquivo inteiro foi lido, não um pedaço vazio.
    expect(textos.length).toBeGreaterThan(300)
    expect(comTravessao(textos)).toEqual([])
  })
})
