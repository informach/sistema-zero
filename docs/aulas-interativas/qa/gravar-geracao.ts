import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const raiz = resolve(import.meta.dir, '../../..')

/** O mesmo JSON, com as chaves na mesma ordem? O desenho (espaços e quebras) não conta. */
function mesmoJson(caminho: string, conteudo: unknown): boolean {
  if (!existsSync(caminho)) return false
  try {
    return JSON.stringify(JSON.parse(readFileSync(caminho, 'utf8'))) === JSON.stringify(conteudo)
  } catch {
    return false
  }
}

/**
 * Grava os arquivos de uma geração. Texto (roteiro, HTML) é gravado como veio; JSON só é regravado quando
 * o conteúdo muda, e então passa pelo Biome do repositório.
 *
 * ⚠️⚠️ Por que não regravar o JSON igual: os manifestos passam pelo `biome ci .` da raiz, e o Biome
 * preserva o desenho de cada objeto (aberto em várias linhas ou fechado numa só) como o arquivo já tinha.
 * Os blocos de cena que entraram à mão estão fechados numa linha; o gerador escreve tudo aberto. O
 * conteúdo e a ordem das chaves saíam iguais, e mesmo assim o `git diff` depois de gerar nunca ficava
 * vazio. A comparação respeita a ordem das chaves: mudar a ordem é mudar o arquivo.
 */
export function gravarGeracao(
  arquivos: ReadonlyArray<readonly [caminho: string, conteudo: unknown]>,
) {
  const json: string[] = []
  for (const [caminho, conteudo] of arquivos) {
    mkdirSync(dirname(caminho), { recursive: true })
    if (typeof conteudo === 'string') writeFileSync(caminho, conteudo)
    else if (!mesmoJson(caminho, conteudo)) {
      writeFileSync(caminho, `${JSON.stringify(conteudo, null, 2)}\n`)
      json.push(caminho)
    }
  }
  if (!json.length) return
  const biome = Bun.spawnSync([process.execPath, 'x', 'biome', 'format', '--write', ...json], {
    cwd: raiz,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  if (biome.exitCode !== 0)
    throw new Error(`O Biome não formatou os JSON gerados:\n${biome.stderr.toString()}`)
}
