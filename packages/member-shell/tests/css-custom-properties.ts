import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

/**
 * Resolve os valores hexadecimais finais de uma propriedade CSS através das
 * folhas locais e dos pacotes do monorepo importados pelo arquivo de entrada.
 *
 * O objetivo não é implementar o cascade inteiro. Os testes de contraste só
 * precisam acompanhar contratos de tokens no formato `var(--token)` e recolher
 * todas as variantes literais declaradas (por exemplo, tema padrão e Pink).
 */
export function cssHexValuesForCustomProperty(entryPath: string, property: string): string[] {
  const declarations = new Map<string, string[]>()
  const visited = new Set<string>()

  const visit = (stylesheetPath: string) => {
    const absolutePath = resolve(stylesheetPath)
    if (visited.has(absolutePath)) return
    visited.add(absolutePath)

    const css = readFileSync(absolutePath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    for (const match of css.matchAll(/@import\s+(?:url\(\s*)?["']([^"']+)["']\s*\)?[^;]*;/gi)) {
      const specifier = match[1]
      if (!specifier) continue

      if (specifier.startsWith('.') || specifier.startsWith('/')) {
        visit(resolve(dirname(absolutePath), specifier))
      } else if (specifier.startsWith('@sistemazero/')) {
        visit(Bun.resolveSync(specifier, dirname(absolutePath)))
      }
    }

    for (const match of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;{}]+);/gi)) {
      const name = match[1]
      const value = match[2]?.trim()
      if (!name || !value) continue
      declarations.set(name, [...(declarations.get(name) ?? []), value])
    }
  }

  visit(entryPath)

  const resolveProperty = (name: string, resolving: Set<string>): string[] => {
    if (resolving.has(name)) return []
    const nextResolving = new Set(resolving).add(name)

    return (declarations.get(name) ?? []).flatMap((value) => {
      const literal = value.match(/^#[0-9a-f]{6}$/i)?.[0]
      if (literal) return [literal.toLowerCase()]

      const alias = value.match(/^var\(\s*(--[a-z0-9-]+)(?:\s*,\s*([^)]*))?\s*\)$/i)
      if (!alias?.[1]) return []

      const resolvedAlias = resolveProperty(alias[1], nextResolving)
      if (resolvedAlias.length || !alias[2]) return resolvedAlias
      const fallback = alias[2].trim().match(/^#[0-9a-f]{6}$/i)?.[0]
      return fallback ? [fallback.toLowerCase()] : []
    })
  }

  return [...new Set(resolveProperty(property, new Set()))]
}
