import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

export interface BundleDependencyLicense {
  nome: string
  versao: string
  licenca: string
  texto: string
}

/** Notices from the actual bundle graph; shared by the standalone and Studio runtimes. */
export function collectBundleLicenses(
  root: string,
  inputs: readonly string[],
): BundleDependencyLicense[] {
  const dependencies = new Map<string, BundleDependencyLicense>(),
    directories = new Set<string>()
  for (const file of inputs) {
    let directory = dirname(resolve(root, file))
    if (!directory.replaceAll('\\', '/').includes('/node_modules/')) continue
    for (;;) {
      if (directories.has(directory)) break
      directories.add(directory)
      const manifest = resolve(directory, 'package.json')
      if (existsSync(manifest)) {
        const p = JSON.parse(readFileSync(manifest, 'utf8')) as {
          name?: string
          version?: string
          license?: string
        }
        if (p.name && p.version && !p.name.startsWith('@sistemazero/')) {
          const license = [
            'LICENSE',
            'LICENSE.md',
            'LICENSE.txt',
            'license',
            'license.md',
            'LICENSE-MIT',
          ]
            .map((n) => resolve(directory, n))
            .find(existsSync)
          if (!license || !p.license) throw Error(`Falta a licença redistribuível de ${p.name}.`)
          dependencies.set(`${p.name}@${p.version}`, {
            nome: p.name,
            versao: p.version,
            licenca: p.license,
            texto: readFileSync(license, 'utf8').replaceAll('\r\n', '\n'),
          })
          break
        }
      }
      const parent = dirname(directory)
      if (parent === directory) break
      directory = parent
    }
  }
  if (!dependencies.size) throw Error('Não identifiquei as licenças das dependências empacotadas.')
  return [...dependencies.values()].sort((a, b) => (a.nome < b.nome ? -1 : a.nome > b.nome ? 1 : 0))
}
