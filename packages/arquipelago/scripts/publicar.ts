import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve, sep } from 'node:path'
import { CANAIS_DO_CLIENTE, type CanalDoCliente } from '@sistemazero/arquipelago-contracts'
import {
  type BaldeDoCliente,
  enviarPublicacao,
  PlanoDaPublicacaoSchema,
  prepararPublicacao,
  promoverVersao,
} from './publicacao'

/**
 * A publicação separada do jogo no CDN (lacunas, 01/11/2026). Uso:
 *
 *   bun run build
 *   bun scripts/publicar.ts preparar --dist dist/cliente --plano plano.json
 *   bun scripts/publicar.ts enviar --dist dist/cliente --plano plano.json --destino r2
 *   bun scripts/publicar.ts promover --canal teste --versao <versao> --destino r2
 *
 * `--destino r2` usa o balde de `ARQUIPELAGO_R2_BUCKET` na conta `ARQUIPELAGO_R2_ACCOUNT_ID`, pela
 * ligação remota do wrangler (sem chave no código). `--destino pasta:<caminho>` grava numa pasta
 * com as mesmas chaves: é o ensaio local. Voltar uma versão é `promover` a anterior.
 */
function argumentos(lista: readonly string[], permitidos: readonly string[]) {
  const valores = new Map<string, string>()
  for (let i = 0; i < lista.length; i += 2) {
    const chave = lista[i]
    const valor = lista[i + 1]
    if (!chave || !valor || !permitidos.includes(chave) || valores.has(chave))
      throw new Error(`Argumentos: ${permitidos.join(' ')}`)
    valores.set(chave, valor)
  }
  return (chave: string) => {
    const v = valores.get(chave)
    if (!v) throw new Error(`Falta ${chave}.`)
    return v
  }
}

function baldeDaPasta(raiz: string): BaldeDoCliente {
  const caminho = (chave: string) => {
    const alvo = resolve(raiz, chave)
    if (!alvo.startsWith(resolve(raiz) + sep)) throw new Error('Chave fora da pasta.')
    return alvo
  }
  return {
    async ler(chave) {
      try {
        return new Uint8Array(await readFile(caminho(chave)))
      } catch (erro) {
        if (erro instanceof Error && 'code' in erro && erro.code === 'ENOENT') return null
        throw erro
      }
    },
    async gravar(chave, bytes) {
      await mkdir(dirname(caminho(chave)), { recursive: true })
      await writeFile(caminho(chave), bytes)
    },
  }
}

interface LigacaoR2 {
  get(chave: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer> } | null>
  put(
    chave: string,
    corpo: Uint8Array,
    opcoes: { httpMetadata: { contentType: string; cacheControl: string } },
  ): Promise<unknown>
}

/** O R2 pela ligação remota do wrangler, com uma configuração só para isto (sem outros segredos). */
async function comBaldeR2<T>(usar: (balde: BaldeDoCliente) => Promise<T>): Promise<T> {
  const conta = process.env.ARQUIPELAGO_R2_ACCOUNT_ID
  const nome = process.env.ARQUIPELAGO_R2_BUCKET
  if (!conta || !nome) throw new Error('Defina ARQUIPELAGO_R2_ACCOUNT_ID e ARQUIPELAGO_R2_BUCKET.')
  const pasta = await mkdtemp(join(tmpdir(), 'sz-arquipelago-publicacao-'))
  const { getPlatformProxy } = await import('wrangler')
  const config = join(pasta, 'wrangler.json')
  await writeFile(
    config,
    JSON.stringify({
      name: 'sistemazero-arquipelago-publicacao',
      account_id: conta,
      compatibility_date: '2026-07-01',
      r2_buckets: [{ binding: 'CLIENTE', bucket_name: nome, remote: true }],
    }),
    { flag: 'wx' },
  )
  const plataforma = await getPlatformProxy<{ CLIENTE: LigacaoR2 }>({
    configPath: config,
    remoteBindings: true,
    persist: false,
    envFiles: [],
  })
  try {
    const r2 = plataforma.env.CLIENTE
    return await usar({
      async ler(chave) {
        const objeto = await r2.get(chave)
        return objeto ? new Uint8Array(await objeto.arrayBuffer()) : null
      },
      async gravar(chave, bytes, tipo, cache) {
        await r2.put(chave, bytes, { httpMetadata: { contentType: tipo, cacheControl: cache } })
      },
    })
  } finally {
    await plataforma.dispose()
    await rm(pasta, { recursive: true, force: true })
  }
}

function comDestino<T>(destino: string, usar: (balde: BaldeDoCliente) => Promise<T>) {
  if (destino === 'r2') return comBaldeR2(usar)
  if (destino.startsWith('pasta:')) return usar(baldeDaPasta(resolve(destino.slice(6))))
  throw new Error('Destino: r2 ou pasta:<caminho>.')
}

export async function publicar(args: readonly string[], agora = new Date()) {
  const [comando, ...resto] = args
  if (comando === 'preparar') {
    const arg = argumentos(resto, ['--dist', '--plano'])
    const plano = await prepararPublicacao(resolve(arg('--dist')))
    await writeFile(resolve(arg('--plano')), `${JSON.stringify(plano, null, 2)}\n`, { flag: 'wx' })
    return { versao: plano.manifesto.versao, arquivos: plano.arquivos.length }
  }
  if (comando === 'enviar') {
    const arg = argumentos(resto, ['--dist', '--plano', '--destino'])
    const plano = PlanoDaPublicacaoSchema.parse(
      JSON.parse(await readFile(resolve(arg('--plano')), 'utf8')),
    )
    const dist = resolve(arg('--dist'))
    return comDestino(arg('--destino'), (balde) =>
      enviarPublicacao(
        plano,
        async (nome) => new Uint8Array(await readFile(join(dist, nome))),
        balde,
      ),
    )
  }
  if (comando === 'promover') {
    const arg = argumentos(resto, ['--canal', '--versao', '--destino'])
    const canal = arg('--canal')
    if (!CANAIS_DO_CLIENTE.includes(canal as CanalDoCliente))
      throw new Error('Canal: estavel ou teste.')
    return comDestino(arg('--destino'), (balde) =>
      promoverVersao(balde, canal as CanalDoCliente, arg('--versao'), agora),
    )
  }
  throw new Error('Comandos: preparar, enviar, promover.')
}

if (import.meta.main) {
  try {
    console.log(JSON.stringify(await publicar(process.argv.slice(2))))
  } catch (erro) {
    // Erros do SDK podem trazer cabeçalhos; só a mensagem de quem chamou sai daqui.
    console.error(
      erro instanceof Error && !/authorization|token|secret/i.test(erro.message)
        ? erro.message
        : 'Publicação não concluída.',
    )
    process.exitCode = 1
  }
}
