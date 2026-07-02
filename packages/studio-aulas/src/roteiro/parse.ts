import { readFileSync } from 'node:fs'
import { parse as parseYaml } from 'yaml'
import { type Roteiro, RoteiroSchema } from './schema'

/** Faz o parse + validação de um texto YAML de roteiro. Lança com erro legível. */
export function parseRoteiro(text: string): Roteiro {
  let raw: unknown
  try {
    raw = parseYaml(text)
  } catch (err) {
    throw new Error(`Roteiro não é YAML válido: ${(err as Error).message}`)
  }
  const result = RoteiroSchema.safeParse(raw)
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join('.') || '(raiz)'}: ${i.message}`)
      .join('\n')
    throw new Error(`Roteiro inválido:\n${issues}`)
  }
  // Invariante extra: ids de cena únicos (o schema garante o formato, não a unicidade).
  const vistos = new Set<string>()
  for (const cena of result.data.cenas) {
    if (vistos.has(cena.id)) throw new Error(`Roteiro inválido: id de cena repetido "${cena.id}"`)
    vistos.add(cena.id)
  }
  return result.data
}

/** Lê e valida um `roteiro.yaml` do disco. */
export function loadRoteiroFile(path: string): Roteiro {
  return parseRoteiro(readFileSync(path, 'utf8'))
}
