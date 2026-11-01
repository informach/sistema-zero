import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { ILHA_IDS } from '@sistemazero/arquipelago-contracts'

/**
 * A lista das versões médias das ilhas (lacunas, 01/11/2026, as ilhas em três versões). O código
 * entra atrás da presença do arquivo: só a ilha com `src/assets/ilhas/<ilha>-media.glb` ganha a
 * versão média; sem a arte, a lista fica vazia e o jogo segue como antes. O build chama esta
 * função; o teste confere que o arquivo gerado bate com os arquivos da pasta.
 *
 *   bun scripts/gerar-ilhas-medias.ts
 */
const PASTA = resolve(import.meta.dir, '../src/assets/ilhas')
export const ARQUIVO_GERADO = resolve(import.meta.dir, '../src/mundo/ilhas-medias.gerado.ts')

const nomeDaImportacao = (ilha: string) =>
  `${ilha.replace(/-(\w)/g, (_, letra: string) => letra.toUpperCase())}Media`

export function codigoDasIlhasMedias(ilhas: readonly string[]): string {
  const linhas = [
    '// Gerado por scripts/gerar-ilhas-medias.ts. Não edite.',
    "import type { IlhaId } from '@sistemazero/arquipelago-contracts'",
    ...ilhas.map(
      (ilha) => `import ${nomeDaImportacao(ilha)} from '../assets/ilhas/${ilha}-media.glb'`,
    ),
    '',
    '/** O endereço da versão média de cada ilha que tem a arte dela. */',
    // O formato que o Biome já aceita: objeto vazio numa linha e aspas só onde precisa.
    ...(ilhas.length === 0
      ? ['export const ARQUIVOS_DAS_ILHAS_MEDIAS: Partial<Record<IlhaId, string>> = {}']
      : [
          'export const ARQUIVOS_DAS_ILHAS_MEDIAS: Partial<Record<IlhaId, string>> = {',
          ...ilhas.map(
            (ilha) =>
              `  ${ilha.includes('-') ? `'${ilha}'` : ilha}: new URL(${nomeDaImportacao(ilha)}, import.meta.url).href,`,
          ),
          '}',
        ]),
    '',
  ]
  return linhas.join('\n')
}

export function ilhasComMedia(pasta = PASTA): string[] {
  return ILHA_IDS.filter((ilha) => existsSync(resolve(pasta, `${ilha}-media.glb`)))
}

/** Grava a lista só quando muda (o build não suja a árvore à toa). */
export async function gerarIlhasMedias(): Promise<string[]> {
  const ilhas = ilhasComMedia()
  const codigo = codigoDasIlhasMedias(ilhas)
  const atual = existsSync(ARQUIVO_GERADO) ? await readFile(ARQUIVO_GERADO, 'utf8') : ''
  if (atual !== codigo) await writeFile(ARQUIVO_GERADO, codigo)
  return ilhas
}

if (import.meta.main)
  console.log(`Ilhas com versão média: ${(await gerarIlhasMedias()).join(', ') || 'nenhuma'}`)
