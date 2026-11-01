import { createHash } from 'node:crypto'
import { lstat, readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  ARQUIVO_DO_CLIENTE,
  arquivoDoCanal,
  type CanalDoCliente,
  MARCADOR_DA_VERSAO,
  ManifestoDoClienteSchema,
  type PonteiroDoCanal,
  PonteiroDoCanalSchema,
  pastaDaVersao,
  tipoDoArquivoDoCliente,
  versaoCompativel,
} from '@sistemazero/arquipelago-contracts'
import { z } from 'zod'

/**
 * A publicação separada do jogo (lacunas, 01/11/2026, desfaz a A11), no padrão do runtime Python:
 * 1. `preparar`: lê `dist/cliente` (o `bun run build`), confere cada arquivo e faz o plano com o
 *    hash de cada um;
 * 2. `enviar`: grava a versão em `arquipelago/versoes/<versao>/`, imutável (um arquivo que já
 *    existe só passa se for o mesmo), e por último o marcador `completa.json`;
 * 3. `promover`: aponta o canal (`estavel` ou `teste`) para uma versão completa. Voltar uma versão
 *    é promover a anterior.
 * O destino é um balde (R2 pela ligação do wrangler, ou uma pasta para o ensaio local).
 */
export interface BaldeDoCliente {
  ler(chave: string): Promise<Uint8Array | null>
  gravar(chave: string, bytes: Uint8Array, tipo: string, cache: string): Promise<void>
}

const ArquivoDoPlanoSchema = z.strictObject({
  nome: z.string().regex(ARQUIVO_DO_CLIENTE),
  bytes: z.number().int().min(0).max(64_000_000),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
})
export const PlanoDaPublicacaoSchema = z.strictObject({
  formato: z.literal(1),
  manifesto: ManifestoDoClienteSchema,
  arquivos: z.array(ArquivoDoPlanoSchema).min(1).max(2000),
})
export type PlanoDaPublicacao = z.infer<typeof PlanoDaPublicacaoSchema>

const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
const IMUTAVEL = 'public, max-age=31536000, immutable'
/** O ponteiro muda: a página relê em até um minuto. */
const PONTEIRO = 'public, max-age=60, must-revalidate'

/** O plano da pasta compilada: o manifesto e o hash de cada arquivo que ele publica. */
export async function prepararPublicacao(pasta: string): Promise<PlanoDaPublicacao> {
  const manifesto = ManifestoDoClienteSchema.parse(
    JSON.parse(await readFile(join(pasta, 'manifesto.json'), 'utf8')),
  )
  if (!versaoCompativel(manifesto.versaoContrato))
    throw new Error('A versão do contrato deste build não é aceita.')
  const arquivos: PlanoDaPublicacao['arquivos'] = []
  for (const nome of (await readdir(pasta)).sort()) {
    if (nome === 'manifesto.json') continue
    const info = await lstat(join(pasta, nome))
    if (!info.isFile() || info.isSymbolicLink()) throw new Error(`Não é arquivo: ${nome}`)
    if (!tipoDoArquivoDoCliente(nome)) throw new Error(`Arquivo fora da régua: ${nome}`)
    const bytes = new Uint8Array(await readFile(join(pasta, nome)))
    arquivos.push({ nome, bytes: bytes.length, sha256: sha256(bytes) })
  }
  if (!arquivos.some((a) => a.nome === manifesto.entrada))
    throw new Error('A entrada do manifesto não está na pasta.')
  return PlanoDaPublicacaoSchema.parse({ formato: 1, manifesto, arquivos })
}

/**
 * Grava a versão do plano. Um arquivo que já está no balde só passa se for o mesmo (uma nova
 * tentativa depois de uma queda continua de onde parou); o marcador vai por último.
 */
export async function enviarPublicacao(
  plano: PlanoDaPublicacao,
  lerArquivo: (nome: string) => Promise<Uint8Array>,
  balde: BaldeDoCliente,
): Promise<{ versao: string; enviados: number; jaEstavam: number }> {
  const p = PlanoDaPublicacaoSchema.parse(plano)
  const pasta = pastaDaVersao(p.manifesto.versao)
  const marcador = `${JSON.stringify(p)}\n`
  const anterior = await balde.ler(pasta + MARCADOR_DA_VERSAO)
  if (anterior && new TextDecoder().decode(anterior) !== marcador)
    throw new Error('Esta versão já foi publicada com outros arquivos. Use outra versão.')
  let enviados = 0
  let jaEstavam = 0
  for (const arquivo of p.arquivos) {
    const bytes = await lerArquivo(arquivo.nome)
    if (bytes.length !== arquivo.bytes || sha256(bytes) !== arquivo.sha256)
      throw new Error(`O arquivo mudou depois do plano: ${arquivo.nome}`)
    const existente = await balde.ler(pasta + arquivo.nome)
    if (existente) {
      if (sha256(existente) !== arquivo.sha256)
        throw new Error(`Já existe outro ${arquivo.nome} nesta versão.`)
      jaEstavam++
      continue
    }
    await balde.gravar(
      pasta + arquivo.nome,
      bytes,
      tipoDoArquivoDoCliente(arquivo.nome) ?? 'application/octet-stream',
      IMUTAVEL,
    )
    enviados++
  }
  await balde.gravar(
    pasta + MARCADOR_DA_VERSAO,
    new TextEncoder().encode(marcador),
    'application/json; charset=utf-8',
    IMUTAVEL,
  )
  return { versao: p.manifesto.versao, enviados, jaEstavam }
}

/** Aponta o canal para uma versão completa (todos os arquivos conferidos pelo hash). */
export async function promoverVersao(
  balde: BaldeDoCliente,
  canal: CanalDoCliente,
  versao: string,
  agora: Date,
): Promise<PonteiroDoCanal> {
  const pasta = pastaDaVersao(versao)
  const marcador = await balde.ler(pasta + MARCADOR_DA_VERSAO)
  if (!marcador) throw new Error('Esta versão não está completa no destino.')
  const plano = PlanoDaPublicacaoSchema.parse(JSON.parse(new TextDecoder().decode(marcador)))
  if (plano.manifesto.versao !== versao) throw new Error('O marcador é de outra versão.')
  for (const arquivo of plano.arquivos) {
    const bytes = await balde.ler(pasta + arquivo.nome)
    if (!bytes || sha256(bytes) !== arquivo.sha256)
      throw new Error(`Arquivo ausente ou diferente: ${arquivo.nome}`)
  }
  const ponteiro = PonteiroDoCanalSchema.parse({
    formato: 2,
    canal,
    versao,
    entrada: plano.manifesto.entrada,
    versaoContrato: plano.manifesto.versaoContrato,
    geradoEm: plano.manifesto.geradoEm,
    promovidoEm: agora.toISOString(),
  })
  await balde.gravar(
    arquivoDoCanal(canal),
    new TextEncoder().encode(`${JSON.stringify(ponteiro, null, 2)}\n`),
    'application/json; charset=utf-8',
    PONTEIRO,
  )
  return ponteiro
}
