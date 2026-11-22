import {
  type ContextoDeLicencas,
  calcularPertencaDasRegioes,
  digestDoDocumentoDeCenario,
  type FonteDaCompilacao,
  type PacoteCompilado,
} from '@sistemazero/molda-cenarios-core/compilar'
import {
  conferirImagemDeCenario,
  type DocumentoDeCenario,
  validarDocumento,
} from '@sistemazero/molda-cenarios-core/v2'
import { compilarAguasDaCena } from './aguas'
import { ArquivosDaCompilacao } from './arquivos'
import { compilarChaoECaminhos, type SuperficiesDaCompilacao } from './chao-caminhos'
import { conferirConteudoCompilado } from './conteudo'
import { pixelsDaTexturaCompilada } from './imagens'
import {
  juntarEstaticosDoPacote,
  type OpcoesDaJuncaoEstatica,
  tamanhoDaRegiaoDaJuncao,
} from './juncao'
import { compilarMetadadosDaCena } from './metadados'
import { cederDuranteCompilacao, MontagemDaCompilacao } from './montagem'
import {
  compilarObjetosDaCena,
  type OpcoesDosObjetosCompilados,
  type RecursosCarregadosDaCompilacao,
  superficiesDosObjetosParaSolo,
} from './objetos'
import type { PixelsDaTextura } from './pintura'
import { type ConteudoDaCompilacao, carregarRecursosDaCompilacao } from './recursos'
import { montarSuperficiesDaCompilacao } from './superficies'
import { gravarDadosDoTerreno } from './terreno'

export interface OpcoesDaCompilacao extends OpcoesDosObjetosCompilados {
  juncaoEstatica?: Pick<OpcoesDaJuncaoEstatica, 'tamanhoDaRegiao'>
}
export interface ResultadoDaCompilacao extends PacoteCompilado {
  /** Avisos do gerador original, sem esconder decisões de implantação da estrutura. */
  avisos: readonly { id: string; mensagem: string }[]
}

/** Uma compilação completa e isolada. As portas leem conteúdo autorizado da revisão;
 * o resultado pertence ao chamador e não mantém o palco nem recursos GPU vivos. */
export async function compilarCenario(
  entrada: DocumentoDeCenario,
  fonte: FonteDaCompilacao,
  contexto: ContextoDeLicencas,
  conteudo: ConteudoDaCompilacao,
  sinal: AbortSignal,
  opcoes: OpcoesDaCompilacao = {},
): Promise<ResultadoDaCompilacao> {
  sinal.throwIfAborted()
  if (opcoes.juncaoEstatica) tamanhoDaRegiaoDaJuncao(opcoes.juncaoEstatica.tamanhoDaRegiao)
  const base = await compilarBase(entrada, fonte, contexto, conteudo, sinal, opcoes)
  if (!opcoes.juncaoEstatica) return base
  const unida = await juntarEstaticosDoPacote(base, sinal, {
    ...opcoes.juncaoEstatica,
    progresso: opcoes.progresso,
  })
  return { ...unida, avisos: base.avisos }
}

async function compilarBase(
  entrada: DocumentoDeCenario,
  fonte: FonteDaCompilacao,
  contexto: ContextoDeLicencas,
  conteudo: ConteudoDaCompilacao,
  sinal: AbortSignal,
  opcoes: OpcoesDaCompilacao,
): Promise<ResultadoDaCompilacao> {
  sinal.throwIfAborted()
  const original = validarDocumento(entrada),
    arquivos = new ArquivosDaCompilacao(sinal),
    saida = new MontagemDaCompilacao(arquivos, sinal)
  let recursos: RecursosCarregadosDaCompilacao | undefined,
    superficies: SuperficiesDaCompilacao | undefined
  try {
    const digest = await digestDoDocumentoDeCenario(original)
    recursos = await carregarRecursosDaCompilacao(
      original,
      fonte,
      contexto,
      conteudo,
      sinal,
      opcoes.progresso,
    )
    const r = recursos
    superficies = montarSuperficiesDaCompilacao(
      original,
      fonte,
      contexto,
      r.terreno,
      (id) => r.modelos.get(id) ?? null,
      (id) => r.texturas.get(id)?.textura ?? null,
    )
    const s = superficies,
      p = s.preparada,
      imagens = new Map<string, PixelsDaTextura>(),
      texturas: PacoteCompilado['cena']['texturas'] = []
    // Conserva somente texturas realmente usadas e a origem de seus bytes.
    for (const ref of p.texturas) {
      sinal.throwIfAborted()
      const bytes = r.bytesDasTexturas.get(ref.digest)
      if (!bytes) throw Error(`Faltam os bytes da textura “${ref.id}”.`)
      const mime = bytes[0] === 137 ? 'image/png' : 'image/webp',
        medidas = conferirImagemDeCenario(bytes, mime),
        ceu = original.iluminacao.ceu,
        papel = ceu?.tipo === 'panorama' && ceu.textura === ref.id ? 'ceu' : 'textura',
        a = await arquivos.adicionarDeduplicado(
          `${papel}/${ref.digest}.${mime === 'image/png' ? 'png' : 'webp'}`,
          bytes,
          { mime, papel, ...medidas },
        )
      texturas.push({ id: ref.id, arquivo: a.caminho })
    }
    if (original.base.tipo === 'terreno') {
      const porDigest = new Map<string, PixelsDaTextura>()
      for (const camada of original.base.solo?.camadas ?? []) {
        if (!camada.textura) continue
        const id = camada.textura.id,
          ref = p.texturas.find((t) => t.id === id),
          textura = r.texturas.get(id)
        if (!ref || !textura) throw Error('Falta uma textura usada pela pintura do terreno.')
        let pixels = porDigest.get(ref.digest)
        if (!pixels) {
          pixels = pixelsDaTexturaCompilada(textura.textura, sinal)
          porDigest.set(ref.digest, pixels)
        }
        imagens.set(id, pixels)
      }
    }
    await compilarObjetosDaCena(p, r, saida, opcoes)
    const plano = await compilarChaoECaminhos(
      s,
      saida,
      imagens,
      superficiesDosObjetosParaSolo(p, r, opcoes, sinal),
    )
    await compilarAguasDaCena(s, saida)
    const terreno = s.terreno ? await gravarDadosDoTerreno(s.terreno, arquivos, sinal) : undefined,
      meta = compilarMetadadosDaCena(original, p, saida.ancoras(p))
    opcoes.progresso?.({ etapa: 'arquivos', feitos: 0, total: 1 })
    await cederDuranteCompilacao(sinal)
    const { cena } = await conferirConteudoCompilado(
      {
        formato: 'molda-cena-compilada',
        versao: 1,
        nome: original.nome,
        unidade: 'metro',
        eixoVertical: 'y',
        fonte: { ...p.fonte, digest },
        arquivos: arquivos.descrever(),
        ...meta,
        nos: saida.nos,
        colisoes: saida.colisoes,
        ...(terreno ? { terreno } : {}),
        ...(plano ? { plano } : {}),
        aguas: p.aguas,
        caminhos: p.caminhos,
        texturas,
        licencas: p.licencas,
        ambiente: original.iluminacao,
        // As regiões do documento com o que pertence a cada uma; o "Juntar peças", se vier,
        // calcula de novo sobre os lotes (lote 5 da conclusão, 22/11/2026).
        ...(original.regioes
          ? {
              regioes: calcularPertencaDasRegioes(original.regioes, {
                entidades: meta.entidades,
                nos: saida.nos,
                colisoes: saida.colisoes,
                aguas: p.aguas,
                ...(plano ? { plano } : {}),
              }),
            }
          : {}),
      },
      arquivos.arquivos,
      sinal,
    )
    sinal.throwIfAborted()
    opcoes.progresso?.({ etapa: 'arquivos', feitos: 1, total: 1 })
    sinal.throwIfAborted()
    return { cena, arquivos: new Map(arquivos.arquivos), avisos: s.avisos.map((a) => ({ ...a })) }
  } finally {
    superficies?.descartar()
    recursos?.descartar()
    arquivos.descartar()
  }
}
