import { mkdir, rename, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { lerCenaCompilada } from '@sistemazero/molda-cenarios-core/compilar'
import {
  type PerfilDePublicacao,
  PerfilDePublicacaoSchema,
  type PublicacaoParaOJogo,
  PublicacaoParaOJogoSchema,
} from '@sistemazero/molda-cenarios-core/publicacao'
import { digestDosBytes } from '@sistemazero/molda-cenarios-core/v2'
import { z } from 'zod'
import type { ClienteDaOficina } from './cliente'

/**
 * Leva ao `/macro` a publicação que está no ar numa ilha: lê pelas MESMAS rotas que o jogo usa
 * (perfil, manifesto e arquivos em lote), confere o hash de cada arquivo e grava na pasta que o
 * playground lê (`CENARIOS_PUBLICADOS_QA_DIR`, formato de `arquipelago/playground/publicacoes-do-ensaio.ts`):
 *
 *   perfis/<ilha>.json · publicacoes/<id>/publicacao.json · blobs/<digest>
 *
 * Assim o personagem de verdade anda nos mesmos bytes que o servidor publicou.
 */
export interface PublicacaoLevada {
  publicacao: PublicacaoParaOJogo
  arquivos: number
  baixados: number
  bytes: number
  pasta: string
}

type Leitor = Pick<ClienteDaOficina, 'lerJson' | 'baixarAssinado'>

const Endereco = z.object({ url: z.string(), bytes: z.number().int().nonnegative() }).loose()
const Lote = z.object({
  arquivos: z.array(
    z
      .object({ digest: z.string(), url: z.string(), bytes: z.number().int().nonnegative() })
      .loose(),
  ),
})
const POR_LOTE = 100
const SIMULTANEOS = 4

async function existeIgual(caminho: string, digest: string, bytes: number): Promise<boolean> {
  const f = Bun.file(caminho)
  if (!(await f.exists()) || f.size !== bytes) return false
  return (await digestDosBytes(new Uint8Array(await f.arrayBuffer()))) === digest
}

/** Grava por cima só depois de escrito inteiro: um `/macro` aberto nunca lê meio arquivo. */
async function gravar(caminho: string, conteudo: Uint8Array | string): Promise<void> {
  const temporario = `${caminho}.${crypto.randomUUID()}.parcial`
  await writeFile(temporario, conteudo)
  await rename(temporario, caminho)
}

export async function levarPublicacaoAoMacro(
  leitor: Leitor,
  opcoes: { ilha: PerfilDePublicacao['ilha']; pasta: string },
): Promise<PublicacaoLevada> {
  const perfil = PerfilDePublicacaoSchema.parse({ tipo: 'arquipelago-v2', ilha: opcoes.ilha })
  const pasta = resolve(opcoes.pasta)
  const lido = z
    .object({ publicacao: PublicacaoParaOJogoSchema.nullable() })
    .parse(await leitor.lerJson(`jogo/perfis/${perfil.ilha}`))
  const publicacao = lido.publicacao
  if (!publicacao) throw Error(`A ilha ${perfil.ilha} ainda não tem publicação no ar.`)
  if (publicacao.perfil.ilha !== perfil.ilha) throw Error('A publicação é de outra ilha.')

  for (const p of ['blobs', 'perfis', join('publicacoes', publicacao.id)])
    await mkdir(join(pasta, p), { recursive: true })
  let baixados = 0
  let bytes = 0
  const baixar = async (digest: string, tamanho: number, url: string): Promise<Uint8Array> => {
    const conteudo = await leitor.baixarAssinado(url)
    if (conteudo.byteLength !== tamanho || (await digestDosBytes(conteudo)) !== digest)
      throw Error(`O arquivo ${digest.slice(0, 12)} chegou diferente do publicado.`)
    baixados++
    bytes += conteudo.byteLength
    return conteudo
  }

  // O manifesto primeiro: é ele que diz quais arquivos a cena usa.
  const m = publicacao.manifesto
  const caminhoDoManifesto = join(pasta, 'blobs', m.digest)
  let manifesto: Uint8Array
  if (await existeIgual(caminhoDoManifesto, m.digest, m.bytes))
    manifesto = new Uint8Array(await Bun.file(caminhoDoManifesto).arrayBuffer())
  else {
    const e = Endereco.parse(
      await leitor.lerJson(`jogo/publicacoes/${publicacao.id}/arquivos/${m.digest}?como=endereco`),
    )
    manifesto = await baixar(m.digest, m.bytes, e.url)
    await gravar(caminhoDoManifesto, manifesto)
  }
  const cena = lerCenaCompilada(new TextDecoder('utf-8', { fatal: true }).decode(manifesto))

  // Dois caminhos da cena podem ter o mesmo conteúdo: cada hash é baixado e gravado uma vez só.
  const unicos = [...new Map(cena.arquivos.map((a) => [a.digest, a])).values()]
  const faltam: { digest: string; bytes: number }[] = []
  for (const a of unicos)
    if (!(await existeIgual(join(pasta, 'blobs', a.digest), a.digest, a.bytes))) faltam.push(a)
  for (let i = 0; i < faltam.length; i += POR_LOTE) {
    const lote = faltam.slice(i, i + POR_LOTE)
    const r = Lote.parse(
      await leitor.lerJson(
        `jogo/publicacoes/${publicacao.id}/arquivos?digests=${lote.map((a) => a.digest).join(',')}`,
      ),
    )
    const enderecos = new Map(r.arquivos.map((a) => [a.digest, a.url]))
    let proximo = 0
    const trabalhar = async () => {
      while (proximo < lote.length) {
        const a = lote[proximo++]!
        const url = enderecos.get(a.digest)
        if (!url) throw Error(`O servidor não deu o endereço de ${a.digest.slice(0, 12)}.`)
        await gravar(join(pasta, 'blobs', a.digest), await baixar(a.digest, a.bytes, url))
      }
    }
    await Promise.all(Array.from({ length: Math.min(SIMULTANEOS, lote.length) }, trabalhar))
  }

  // Por último o recibo e o perfil: o `/macro` só passa a ver a versão com tudo no lugar.
  const recibo = `${JSON.stringify(publicacao, null, 2)}\n`
  await gravar(join(pasta, 'publicacoes', publicacao.id, 'publicacao.json'), recibo)
  await gravar(join(pasta, 'perfis', `${perfil.ilha}.json`), recibo)
  return { publicacao, arquivos: unicos.length + 1, baixados, bytes, pasta }
}
