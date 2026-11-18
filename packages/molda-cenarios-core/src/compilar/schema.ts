import { z } from 'zod'
import {
  AguaSchema,
  CaminhoSchema,
  IdentificadorDeCenarioSchema,
  ModeloDoCenarioSchema,
  TexturaDoCenarioSchema,
} from '../v2/entidades-schema'
import { IluminacaoSchema } from '../v2/iluminacao'
import { FonteDaCompilacaoSchema } from './fonte'
import { LicencaDaBibliotecaSchema } from './licencas'
import { LIMITES_DA_EXPORTACAO } from './limites'
import {
  ArquivoCompiladoSchema,
  CaminhoCompiladoSchema,
  ColisaoCompiladaSchema,
  DigestCompiladoSchema,
  NoCompiladoSchema,
} from './schema-arquivos'
import {
  EntidadeCompiladaSchema,
  MarcadorCompiladoSchema,
  TerrenoCompiladoSchema,
} from './schema-metadados'

export const MAX_BYTES_DO_MANIFESTO = 16 * 1024 * 1024
const id = IdentificadorDeCenarioSchema
export const CenaCompiladaSchema = z
  .object({
    formato: z.literal('molda-cena-compilada'),
    versao: z.literal(1),
    nome: z.string().min(1).max(120),
    unidade: z.literal('metro'),
    eixoVertical: z.literal('y'),
    fonte: FonteDaCompilacaoSchema.extend({ digest: DigestCompiladoSchema }),
    arquivos: z.array(ArquivoCompiladoSchema).max(LIMITES_DA_EXPORTACAO.arquivos),
    entidades: z.array(EntidadeCompiladaSchema).max(32768),
    nos: z.array(NoCompiladoSchema).max(32768),
    colisoes: z.array(ColisaoCompiladaSchema).max(32768),
    terreno: TerrenoCompiladoSchema.optional(),
    aguas: z.array(AguaSchema).max(4096),
    caminhos: z.array(CaminhoSchema).max(4096),
    marcadores: z.array(MarcadorCompiladoSchema).max(4096),
    texturas: z.array(z.object({ id, arquivo: CaminhoCompiladoSchema }).strict()).max(256),
    /** Procedência, sem presumir que todo GLB original precise viajar junto de sua geometria derivada. */
    fontes: z
      .object({
        modelos: z.array(ModeloDoCenarioSchema).max(5000),
        texturas: z.array(TexturaDoCenarioSchema).max(256),
        conjuntos: z
          .array(
            z
              .object({
                id,
                biblioteca: id,
                conjunto: id,
                revisao: z.number().int().positive().max(2147483647),
              })
              .strict(),
          )
          .max(128),
      })
      .strict(),
    licencas: z.array(LicencaDaBibliotecaSchema).max(8192),
    ambiente: IluminacaoSchema,
  })
  .strict()
  .superRefine((d, ctx) => {
    const falhar = (message: string) => ctx.addIssue({ code: 'custom', message }),
      unicos = (ids: readonly string[], tipo: string) => {
        if (new Set(ids).size !== ids.length) falhar(`Há um identificador repetido em ${tipo}.`)
      },
      arquivos = new Map(d.arquivos.map((a) => [a.caminho, a])),
      entidades = new Map(d.entidades.map((e) => [e.id, e])),
      licencas = new Map(d.licencas.map((l) => [l.id, l])),
      texturas = new Map(d.texturas.map((t) => [t.id, t])),
      modelosFonte = new Set(d.fontes.modelos.map((m) => m.id)),
      texturasFonte = new Set(d.fontes.texturas.map((t) => t.id))
    unicos(
      d.arquivos.map((a) => a.caminho.toLowerCase()),
      'arquivos',
    )
    for (const [tipo, ids] of [
      ['entidades', d.entidades.map((e) => e.id)],
      ['nós', d.nos.map((n) => n.id)],
      ['colisões', d.colisoes.map((c) => c.id)],
      ['águas', d.aguas.map((a) => a.id)],
      ['caminhos', d.caminhos.map((c) => c.id)],
      ['marcadores', d.marcadores.map((m) => m.id)],
      ['texturas', d.texturas.map((t) => t.id)],
      ['modelos de origem', d.fontes.modelos.map((m) => m.id)],
      ['texturas de origem', d.fontes.texturas.map((t) => t.id)],
      ['conjuntos de origem', d.fontes.conjuntos.map((c) => c.id)],
      ['licenças', d.licencas.map((l) => l.id)],
    ] as const)
      unicos(ids, tipo)
    const bytes = d.arquivos.reduce((s, a) => s + a.bytes, 0)
    if (bytes > LIMITES_DA_EXPORTACAO.bytesDoPacote)
      falhar('Os arquivos excedem o orçamento do pacote compilado.')
    const conferirEntidade = (valor: string | null) => {
      if (valor !== null && !entidades.has(valor))
        falhar(`A entidade “${valor}” não existe na cena compilada.`)
    }
    const conferirModelo = (valor: string) => {
      if (!modelosFonte.has(valor))
        falhar(`O modelo de origem “${valor}” não está na procedência da cena.`)
    }
    const conferirTexturaDeOrigem = (valor: string) => {
      if (!texturasFonte.has(valor))
        falhar(`A textura de origem “${valor}” não está na procedência da cena.`)
    }
    for (const e of d.entidades) {
      if (e.grupo === null) continue
      const grupo = entidades.get(e.grupo)
      if (!grupo || !['grupo', 'montagem'].includes(grupo.tipo))
        falhar(`O grupo de “${e.id}” não existe ou não é uma pasta/montagem.`)
      const cadeia = new Set([e.id])
      let atual: string | null = e.grupo
      while (atual !== null) {
        if (cadeia.has(atual) || cadeia.size > 64) {
          falhar('A organização da cena compilada contém ciclo ou grupos demais.')
          break
        }
        cadeia.add(atual)
        atual = entidades.get(atual)?.grupo ?? null
      }
    }
    let malhas = 0
    for (const n of d.nos) {
      conferirEntidade(n.entidade)
      const a = arquivos.get(n.arquivo)
      if (a?.mime !== 'model/gltf-binary' || a.papel === 'colisao')
        falhar(`O arquivo visual “${n.arquivo}” está ausente ou é incompatível.`)
      malhas += a?.malhas ?? 0
    }
    if (malhas > 32768) falhar('A cena compilada tem malhas demais para ser carregada.')
    for (const c of d.colisoes) {
      conferirEntidade(c.entidade)
      const a = arquivos.get(c.arquivo)
      if (a?.mime !== 'model/gltf-binary' || a.papel !== 'colisao')
        falhar(`O arquivo de colisão “${c.arquivo}” está ausente ou é incompatível.`)
    }
    for (const r of [...d.fontes.modelos, ...d.fontes.texturas, ...d.fontes.conjuntos])
      if (!licencas.has(r.biblioteca))
        falhar(`A biblioteca “${r.biblioteca}” não tem licença no pacote.`)
    for (const t of d.texturas) {
      const a = arquivos.get(t.arquivo)
      if (!a || !['image/png', 'image/webp'].includes(a.mime))
        falhar(`A textura “${t.id}” não possui um arquivo de imagem válido.`)
    }
    const ceu = d.ambiente.ceu
    if (ceu?.tipo === 'panorama') {
      const ref = texturas.get(ceu.textura),
        a = ref ? arquivos.get(ref.arquivo) : undefined
      if (!a?.largura || a.largura !== a.altura! * 2)
        falhar('O panorama do céu precisa de uma textura presente com proporção 2:1.')
    }
    let pontos = 0,
      luzes = 0,
      sombras = 0,
      principais = 0
    for (const m of d.marcadores) {
      if (entidades.get(m.id)?.tipo !== 'marcador')
        falhar('Um marcador não possui a entidade correspondente.')
      conferirEntidade(m.objeto)
      if (
        m.objeto !== null &&
        !['objeto', 'montagem'].includes(entidades.get(m.objeto)?.tipo ?? '')
      )
        falhar('A associação do marcador precisa apontar para um objeto ou montagem.')
      if (m.configuracao?.tipo === 'inicio' && m.configuracao.principal) principais++
      if (m.configuracao?.tipo === 'luz') {
        luzes++
        if (m.configuracao.luz.sombra) sombras++
      }
      pontos += m.rota?.pontos.length ?? 0
    }
    if (principais > 1) falhar('A cena compilada tem mais de um início principal.')
    if (luzes > 32 || sombras > 4)
      falhar('A cena compilada excede o orçamento de luzes locais e sombras.')
    for (const a of d.aguas) {
      if (entidades.get(a.id)?.tipo !== 'agua')
        falhar('Uma água não possui a entidade correspondente.')
      if ((a.tipo === 'lago' || a.tipo === 'represa') && a.modelo) conferirModelo(a.modelo)
      pontos +=
        a.tipo === 'lago' || a.tipo === 'represa'
          ? a.contorno.length + a.recorte.length + (a.ilhas ?? []).reduce((s, p) => s + p.length, 0)
          : a.tipo === 'rio'
            ? a.pontos.length
            : 0
    }
    for (const c of d.caminhos) {
      if (entidades.get(c.id)?.tipo !== 'caminho')
        falhar('Um caminho não possui a entidade correspondente.')
      if (c.acabamento) conferirModelo(c.acabamento)
      if (c.aparencia?.textura) conferirTexturaDeOrigem(c.aparencia.textura.id)
      pontos += c.pontos.length
    }
    if (d.terreno) {
      const t = d.terreno,
        a = arquivos.get(t.alturas),
        png = arquivos.get(t.pngAlturas)
      if (
        a?.mime !== 'application/octet-stream' ||
        a.papel !== 'alturas' ||
        a.bytes !== (t.colunas + 1) * (t.linhas + 1) * 4
      )
        falhar('O arquivo de alturas não corresponde às dimensões do terreno.')
      if (
        png?.mime !== 'image/png' ||
        png.papel !== 'alturas' ||
        png.largura !== t.colunas + 1 ||
        png.altura !== t.linhas + 1
      )
        falhar('O PNG de alturas não corresponde às dimensões do terreno.')
      if (t.buracos) {
        const b = arquivos.get(t.buracos)
        if (
          b?.mime !== 'application/octet-stream' ||
          b.papel !== 'buracos' ||
          b.bytes !== t.colunas * t.linhas
        )
          falhar('O arquivo de buracos do terreno está ausente ou é incompatível.')
      }
      unicos(
        t.pecas.map((p) => `${p.coluna}/${p.linha}`),
        'peças do terreno',
      )
      if (t.pecas.some((p) => p.coluna >= t.colunas / 64 || p.linha >= t.linhas / 64))
        falhar('Uma peça está fora das dimensões do terreno.')
      pontos += t.recortes.reduce((s, p) => s + p.length, 0)
    }
    if (pontos > 262144) falhar('Os metadados excedem o orçamento de pontos da cena compilada.')
  })
export type CenaCompilada = z.infer<typeof CenaCompiladaSchema>

/** Leitura completa antes de oferecer qualquer nó aos consumidores. Arquivos são conferidos à parte. */
export function lerCenaCompilada(entrada: unknown): CenaCompilada {
  let valor = entrada
  try {
    const texto = typeof entrada === 'string' ? entrada : JSON.stringify(entrada)
    if (
      typeof texto !== 'string' ||
      texto.length > MAX_BYTES_DO_MANIFESTO ||
      new TextEncoder().encode(texto).length > MAX_BYTES_DO_MANIFESTO
    )
      throw Error('O manifesto excede o limite de bytes.')
    if (typeof entrada === 'string') valor = JSON.parse(entrada)
  } catch (erro) {
    throw Error(
      `Não consegui ler o JSON da cena compilada: ${erro instanceof Error ? erro.message : 'conteúdo inválido'}`,
    )
  }
  const r = CenaCompiladaSchema.safeParse(valor)
  if (!r.success)
    throw Error(
      `Cena compilada inválida: ${r.error.issues
        .slice(0, 8)
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')}`,
    )
  return r.data
}
