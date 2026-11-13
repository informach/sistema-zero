/**
 * Onde os arquivos do avatar ficam: os buckets PRIVADOS da plataforma no R2, na pasta `avatar/`
 * (decisão da dona, 13/11/2026: o pack é pago e a licença não deixa as peças soltas num endereço
 * público). Sem endereço público: a plataforma entrega cada arquivo só a quem está logado, por um
 * link assinado que vence (`r2PresignGetPrivate` do member-shell). Esses buckets já têm a regra de
 * leitura para os apps dos alunos (`packages/admin/scripts/r2-cors-private.ts`).
 *
 * São dois buckets, um por ambiente (os mesmos do `R2_PRIVATE_BUCKET` de cada um), e o envio grava
 * nos dois. Quem envia é o `wrangler` desta máquina, com o login dele (`wrangler login`): nenhuma
 * chave passa por aqui. `pasta:<caminho>` grava numa pasta com as mesmas chaves, para ensaiar.
 *
 * ⚠️ Nada daqui pode ir para o bucket público (`comunidade-sistema-zero`, cdn.sistemazero.com.br).
 */
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'

/** O bucket privado de cada ambiente: desenvolvimento e staging, e produção. */
export const BUCKETS_DO_AVATAR = ['testes-privado', 'comunidade-sistema-zero-privado'] as const
/** A pasta do avatar dentro do bucket. */
export const PASTA_NO_BUCKET = 'avatar'
/** O nome do arquivo leva a impressão digital: o conteúdo de uma chave nunca muda. */
const CACHE = 'private, max-age=31536000, immutable'

const TIPOS: Record<string, string> = {
  glb: 'model/gltf-binary',
  webp: 'image/webp',
  png: 'image/png',
  json: 'application/json',
}

export interface Balde {
  gravar(chave: string, bytes: Uint8Array): Promise<void>
}

function tipoDe(chave: string): string {
  const tipo = TIPOS[chave.slice(chave.lastIndexOf('.') + 1)]
  if (!tipo) throw new Error(`Tipo de arquivo sem regra: ${chave}`)
  return tipo
}

function baldeDaPasta(raiz: string): Balde {
  const caminho = (chave: string) => {
    const alvo = resolve(raiz, chave)
    if (!alvo.startsWith(resolve(raiz) + sep)) throw new Error('Chave fora da pasta.')
    return alvo
  }
  return {
    async gravar(chave, bytes) {
      tipoDe(chave)
      await mkdir(dirname(caminho(chave)), { recursive: true })
      await writeFile(caminho(chave), bytes)
    },
  }
}

/** O wrangler é dependência do pacote do jogo, não da raiz. */
const WRANGLER = resolve(
  import.meta.dirname,
  '../../packages/arquipelago/node_modules/wrangler/bin/wrangler.js',
)

function rodarWrangler(args: readonly string[]): Promise<void> {
  return new Promise((ok, falha) => {
    const filho = spawn(process.execPath, [WRANGLER, ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let saida = ''
    filho.stdout.on('data', (d) => {
      saida += d
    })
    filho.stderr.on('data', (d) => {
      saida += d
    })
    filho.on('error', falha)
    filho.on('close', (codigo) =>
      codigo === 0
        ? ok()
        : falha(new Error(`wrangler ${args.slice(0, 4).join(' ')} falhou:\n${saida.slice(-800)}`)),
    )
  })
}

async function comBaldeR2<T>(usar: (balde: Balde) => Promise<T>): Promise<T> {
  const pasta = await mkdtemp(join(tmpdir(), 'sz-avatar-'))
  let n = 0
  try {
    return await usar({
      async gravar(chave, bytes) {
        const arquivo = join(pasta, `${n++}`)
        await writeFile(arquivo, bytes)
        try {
          for (const bucket of BUCKETS_DO_AVATAR) {
            await rodarWrangler([
              'r2',
              'object',
              'put',
              `${bucket}/${chave}`,
              '--file',
              arquivo,
              '--content-type',
              tipoDe(chave),
              '--cache-control',
              CACHE,
              '--remote',
            ])
          }
        } finally {
          await rm(arquivo, { force: true })
        }
      },
    })
  } finally {
    await rm(pasta, { recursive: true, force: true })
  }
}

export function comBalde<T>(destino: string, usar: (balde: Balde) => Promise<T>): Promise<T> {
  if (destino === 'r2') return comBaldeR2(usar)
  if (destino.startsWith('pasta:')) return usar(baldeDaPasta(resolve(destino.slice(6))))
  throw new Error('Destino: r2 ou pasta:<caminho>.')
}

/** A chave de um arquivo do avatar no bucket. */
export function chaveNoBucket(arquivo: string): string {
  return `${PASTA_NO_BUCKET}/${arquivo}`
}

/** Lê o que o ensaio gravou (para conferência). */
export async function lerDaPasta(raiz: string, chave: string): Promise<Uint8Array> {
  return new Uint8Array(await readFile(resolve(raiz, chave)))
}
