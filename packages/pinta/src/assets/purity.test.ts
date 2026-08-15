/**
 * O guarda do subpath PURO: nada alcançável a partir de `assets/index.ts` pode importar React.
 *
 * ⭐ Ele existe porque a promessa "o servidor pode usar isto" não é verificável lendo um arquivo:
 * o `members` é um serviço Bun SEM React, e basta UM import novo em qualquer módulo do caminho —
 * `core/project.ts` puxando um componente, por exemplo — para o boot dele quebrar. E quebraria
 * longe daqui, num deploy, com uma mensagem de resolução de módulo.
 *
 * O teste anda pelo grafo de imports RELATIVOS e reprova ao encontrar React (ou qualquer coisa de
 * `components/`), nomeando o caminho que trouxe o problema.
 */
import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'

const RAIZ = resolve(import.meta.dir, '..')
const ENTRADA = resolve(import.meta.dir, 'index.ts')

/** Casa `import ... from '...'` e `export ... from '...'`, incluindo os de tipo. */
const IMPORT_RE = /(?:^|\n)\s*(?:import|export)\b[^'"\n]*?from\s*['"]([^'"]+)['"]/g

function resolverArquivo(base: string, especificador: string): string | null {
  const bruto = resolve(dirname(base), especificador)
  for (const candidato of [bruto, `${bruto}.ts`, `${bruto}.tsx`, `${bruto}/index.ts`]) {
    try {
      readFileSync(candidato, 'utf8')
      return candidato
    } catch {
      // Próximo candidato.
    }
  }
  return null
}

/** Todo arquivo alcançável a partir da entrada, com o caminho de imports que levou até ele. */
function fechamento(entrada: string): Map<string, string[]> {
  const visto = new Map<string, string[]>([[entrada, [entrada]]])
  const fila = [entrada]
  while (fila.length > 0) {
    const atual = fila.shift()
    if (!atual) break
    const trilha = visto.get(atual) ?? [atual]
    const fonte = readFileSync(atual, 'utf8')
    for (const [, especificador] of fonte.matchAll(IMPORT_RE)) {
      if (!especificador?.startsWith('.')) continue
      const arquivo = resolverArquivo(atual, especificador)
      if (!arquivo || visto.has(arquivo)) continue
      visto.set(arquivo, [...trilha, arquivo])
      fila.push(arquivo)
    }
  }
  return visto
}

function externos(arquivo: string): string[] {
  const fonte = readFileSync(arquivo, 'utf8')
  return [...fonte.matchAll(IMPORT_RE)]
    .map(([, especificador]) => especificador)
    .filter(
      (especificador): especificador is string => !!especificador && !especificador.startsWith('.'),
    )
}

const curto = (caminho: string): string => relative(RAIZ, caminho).replaceAll('\\', '/')

describe('@sistemazero/pinta/assets é puro', () => {
  const alcancavel = fechamento(ENTRADA)

  it('🚨 nenhum módulo alcançável importa React', () => {
    for (const [arquivo, trilha] of alcancavel) {
      const react = externos(arquivo).filter((e) => e === 'react' || e.startsWith('react/'))
      // A trilha inteira vai na mensagem: sem ela, quem quebrar isto no futuro vê só um nome de
      // arquivo e não o import que o trouxe para dentro do subpath.
      expect(react, `${curto(arquivo)} via ${trilha.map(curto).join(' → ')}`).toEqual([])
    }
  })

  it('🚨 nenhum módulo alcançável mora em components/ ou lesson/', () => {
    for (const [arquivo, trilha] of alcancavel) {
      const pasta = curto(arquivo)
      expect(
        pasta.startsWith('components/') || pasta.startsWith('lesson/'),
        `${pasta} via ${trilha.map(curto).join(' → ')}`,
      ).toBe(false)
    }
  })

  it('o grafo é de verdade (anti-vácuo: o caminhador acha os módulos e enxerga React)', () => {
    // Sem isto, um bug no regex ou no resolvedor deixaria os dois testes acima passando vazios.
    const nomes = [...alcancavel.keys()].map(curto)
    expect(nomes).toContain('core/project.ts')
    expect(nomes).toContain('export/assetJson.ts')
    expect(nomes.length).toBeGreaterThan(5)
    // E o detector encontra React quando ele existe: o `PintaLesson` é o contra-exemplo vivo.
    expect(externos(resolve(RAIZ, 'lesson/PintaLesson.tsx'))).toContain('react')
  })
})
