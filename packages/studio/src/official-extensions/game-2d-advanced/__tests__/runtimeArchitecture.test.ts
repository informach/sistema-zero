import { describe, expect, it } from 'bun:test'
import ts from 'typescript'
import { gameKitRuntime } from '../runtime'

/**
 * Os DOMÍNIOS do runtime da gk: quem registra o próprio reset, e se o reset que
 * ele registra é um que alguém de fato dispara.
 *
 * ⚠️⚠️ A segunda pergunta é a que importa aqui, e o irmão g2d não a faz. A gk
 * dispara TRÊS hooks e só três — `resetGame`, `resetProject` e `projectReady`.
 * Um domínio que declare `reset:` (o nome que o g2d usa) passa no typecheck,
 * passa na suíte inteira, e simplesmente NÃO LIMPA NADA. O comentário do próprio
 * runtime registra que isso já aconteceu:
 *
 *   "resetProject, NAO 'reset': a gk so dispara resetGame/resetProject/
 *    projectReady. Um hook com nome que ninguem chama nao limpa nada e ainda
 *    parece que limpa."
 *
 * Uma varredura por regex acha o NOME do domínio mas não enxerga dentro do
 * objeto de hooks. Por isso aqui se lê a AST — a máquina já está no
 * `runtimeTypecheck.test.ts`, sobre esta mesma string.
 */
interface RegistroDeDominio {
  name: string
  hooks: string[]
}

function lerDominios(source: string): { registros: RegistroDeDominio[]; disparados: Set<string> } {
  const file = ts.createSourceFile(
    'gk-runtime.js',
    source,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.JS,
  )
  const registros: RegistroDeDominio[] = []
  const disparados = new Set<string>()
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const [arg0, arg1] = node.arguments
      if (node.expression.text === '_registerRuntimeDomain' && arg0 && ts.isStringLiteral(arg0)) {
        registros.push({
          name: arg0.text,
          hooks:
            arg1 && ts.isObjectLiteralExpression(arg1)
              ? arg1.properties.map((p) => (p.name && ts.isIdentifier(p.name) ? p.name.text : '?'))
              : ['?'],
        })
      }
      if (node.expression.text === '_runRuntimeDomainHook' && arg0 && ts.isStringLiteral(arg0)) {
        disparados.add(arg0.text)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(file)
  return { registros, disparados }
}

const orfaosDe = (source: string): string[] => {
  const { registros, disparados } = lerDominios(source)
  return registros.flatMap((r) =>
    r.hooks.filter((h) => !disparados.has(h)).map((h) => `${r.name}.${h}`),
  )
}

describe('gameKitRuntime — arquitetura dos domínios', () => {
  it('a lista sai do runtime COMPOSTO: domínio novo entra sozinho na conta', () => {
    // ⚠️ Derivada, nunca escrita à mão. A do irmão g2d era manual e fixava NOVE
    // domínios enquanto o runtime já registrava treze — o que ficou de fora foi
    // justo o que zera o teclado, e o sintoma seria a segunda partida nascendo
    // com uma tecla presa.
    expect(
      lerDominios(gameKitRuntime)
        .registros.map((r) => r.name)
        .sort(),
    ).toEqual([
      'campaign',
      'cards',
      'core',
      'luta',
      'nave',
      'project-resources',
      'rpg',
      'stage-backdrop',
      'tower-defense',
    ])
  })

  it('nenhum domínio é registrado DUAS vezes', () => {
    // `_registerRuntimeDomain` sobrescreve: o segundo apaga o reset do primeiro,
    // em silêncio, e o sintoma aparece só na segunda partida, suja.
    const nomes = lerDominios(gameKitRuntime).registros.map((r) => r.name)
    expect(nomes).toEqual([...new Set(nomes)])
  })

  it('⭐ nenhum hook DECLARADO fica órfão de quem o dispara', () => {
    expect(orfaosDe(gameKitRuntime)).toEqual([])
  })

  it('⚠️ as três regras MORDEM', () => {
    // ANTI-VÁCUO, um por asserção: sem eles, um leitor de AST que devolvesse
    // listas vazias passaria nas três e daria a impressão de estar protegendo.
    const duplicado = gameKitRuntime.replace(
      "_registerRuntimeDomain('luta',",
      "_registerRuntimeDomain('rpg',",
    )
    const nomes = lerDominios(duplicado).registros.map((r) => r.name)
    expect(nomes).not.toEqual([...new Set(nomes)])

    const semLuta = lerDominios(duplicado).registros.map((r) => r.name)
    expect(semLuta).not.toContain('luta')

    // O hook com nome que ninguém chama: o defeito que o comentário do runtime
    // registra, e que só a leitura por AST enxerga.
    const orfao = gameKitRuntime.replace(
      "_registerRuntimeDomain('luta', { resetGame:",
      "_registerRuntimeDomain('luta', { reset:",
    )
    expect(orfao).not.toBe(gameKitRuntime)
    expect(orfaosDe(orfao)).toContain('luta.reset')
  })

  it('os três hooks disparados são exatamente os que a gk conhece', () => {
    expect([...lerDominios(gameKitRuntime).disparados].sort()).toEqual([
      'projectReady',
      'resetGame',
      'resetProject',
    ])
  })
})
