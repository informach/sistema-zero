import type { PreparacaoDaCena } from '@sistemazero/molda-cenarios-core/compilar'
import type { InstanciaDeCenario } from '@sistemazero/molda-cenarios-core/v2'
import { Group, Matrix4, Vector3 } from 'three'
import { matrizDaTransformacao } from '../matematica'
import type { ModeloCarregado } from '../modelos'
import { RepresentacoesDoModelo } from '../representacoes'
import type { SuperficieDoObjeto } from '../superficies'
import { prepararColisoesDoTeste } from '../teste/fontes'
import { gravarColisaoLocal } from './colisoes'
import {
  cederDuranteCompilacao,
  type MontagemDaCompilacao,
  type TemplateVisualCompilado,
} from './montagem'
import { prepararObjetoEstatico } from './objeto-estatico'
import { normalizarRaizAnimavel, temAnimacaoOuDeformacao } from './raiz-animavel'
import type { carregarRecursosDaCompilacao, ProgressoDaCompilacao } from './recursos'

export type RecursosCarregadosDaCompilacao = Awaited<
  ReturnType<typeof carregarRecursosDaCompilacao>
>
export interface OpcoesDosObjetosCompilados {
  progresso?: (p: ProgressoDaCompilacao) => void
  /** O perfil identifica seus atores sem inserir regras do jogo no motor. Callback puro. */
  preservarHierarquia?: (objeto: Readonly<InstanciaDeCenario>) => boolean
}
function precisaHierarquia(
  o: InstanciaDeCenario,
  m: ModeloCarregado,
  opcoes: OpcoesDosObjetosCompilados,
) {
  return temAnimacaoOuDeformacao(m.raiz, m.animacoes) || Boolean(opcoes.preservarHierarquia?.(o))
}
function acabamentoDoObjeto(o: InstanciaDeCenario, r: RecursosCarregadosDaCompilacao) {
  const a = o.aparencia?.textura
  if (!a) return undefined
  const t = r.texturas.get(a.id)?.textura
  if (!t) throw Error(`Falta a textura de “${o.nome}”.`)
  return { textura: t, repeticaoMetros: a.repeticaoMetros }
}

/** Itens transitórios para o recorte do piso plano. A cópia de cada variante
 * vive até o consumidor avançar o iterador; atores móveis não abrem furos no chão. */
export function* superficiesDosObjetosParaSolo(
  p: PreparacaoDaCena,
  r: RecursosCarregadosDaCompilacao,
  opcoes: OpcoesDosObjetosCompilados,
  sinal: AbortSignal,
): IterableIterator<SuperficieDoObjeto> {
  for (const o of p.objetos) {
    sinal.throwIfAborted()
    const m = r.modelos.get(o.modelo)
    if (!m) throw Error(`Falta o modelo de “${o.nome}”.`)
    if (precisaHierarquia(o, m, opcoes)) continue
    const rep = new RepresentacoesDoModelo(new Group(), m),
      mundo = matrizDaTransformacao(o.transformacao, new Matrix4())
    try {
      for (const parte of rep.obter(o.espelho, acabamentoDoObjeto(o, r)).fontes())
        yield {
          id: o.id,
          geometria: parte.geometria,
          material: parte.material,
          matriz: new Matrix4().multiplyMatrices(mundo, parte.matriz),
        }
    } finally {
      rep.descartar()
    }
  }
}

export async function compilarObjetosDaCena(
  p: PreparacaoDaCena,
  r: RecursosCarregadosDaCompilacao,
  saida: MontagemDaCompilacao,
  opcoes: OpcoesDosObjetosCompilados = {},
) {
  const visuais = new Map<string, TemplateVisualCompilado>(),
    colisoes = new Map<string, TemplateVisualCompilado | null>(),
    idsModelos = new Map<ModeloCarregado, number>()
  let feitos = 0,
    numeroDeColisao = 0
  for (const o of p.objetos) {
    saida.sinal.throwIfAborted()
    opcoes.progresso?.({ etapa: 'geometria', feitos, total: p.objetos.length, nome: o.nome })
    const m = r.modelos.get(o.modelo)
    if (!m) throw Error(`Falta o modelo de “${o.nome}”.`)
    if (!idsModelos.has(m)) idsModelos.set(m, idsModelos.size)
    const idModelo = idsModelos.get(m)!,
      espelho = `${o.espelho?.x ? 1 : 0}${o.espelho?.y ? 1 : 0}${o.espelho?.z ? 1 : 0}`,
      preservar = precisaHierarquia(o, m, opcoes),
      acabamento = acabamentoDoObjeto(o, r),
      escala = o.transformacao.escala,
      chave = JSON.stringify([
        idModelo,
        espelho,
        preservar,
        o.aparencia?.cor?.toLowerCase() ?? '#ffffff',
        acabamento?.textura.uuid,
        acabamento?.repeticaoMetros,
        acabamento ? escala : null,
      ]),
      mundo = matrizDaTransformacao(o.transformacao, new Matrix4())
    let template = visuais.get(chave)
    if (!template) {
      const copia = preservar
        ? normalizarRaizAnimavel(m.raiz, m.animacoes ?? [], {
            caixa: m.caixa,
            espelho: o.espelho,
            cor: o.aparencia?.cor,
            ...(acabamento
              ? {
                  textura: {
                    mapa: acabamento.textura,
                    repeticaoMetros: acabamento.repeticaoMetros,
                    escala: new Vector3(escala.x, escala.y, escala.z),
                  },
                }
              : {}),
          })
        : prepararObjetoEstatico(o, m, acabamento?.textura)
      try {
        template = await saida.gravar(
          copia.raiz,
          'modelo',
          'animacoes' in copia ? copia.animacoes : [],
        )
        visuais.set(chave, template)
      } finally {
        copia.descartar()
      }
    }
    saida.adicionar(template, mundo, o.id)
    saida.ancora(o.id, mundo)
    if (o.colisao !== 'nenhuma') {
      const chaveFisica = JSON.stringify([
        idModelo,
        o.colisao,
        o.colisao === 'malha' ? espelho : null,
      ])
      if (!colisoes.has(chaveFisica)) {
        const rep = new RepresentacoesDoModelo(new Group(), m)
        try {
          const fontes = rep
              .obter(o.espelho)
              .fontes()
              .map((s) => ({ objeto: o.id, geometria: s.geometria, matriz: s.matriz })),
            preparadas = prepararColisoesDoTeste(
              { ...p.documento, instancias: [o] },
              fontes,
              new Map([[o.id, { caixa: m.caixa, matriz: new Matrix4() }]]),
              [],
            )
          try {
            colisoes.set(
              chaveFisica,
              await gravarColisaoLocal(
                preparadas.fontes,
                `colisoes/objeto-${numeroDeColisao++}.glb`,
                saida.arquivos,
                saida.sinal,
              ),
            )
          } finally {
            preparadas.descartar()
          }
        } finally {
          rep.descartar()
        }
      }
      const fisica = colisoes.get(chaveFisica)
      if (fisica) saida.adicionarColisao(fisica, mundo, o.id, o.colisao)
    }
    feitos++
    await cederDuranteCompilacao(saida.sinal)
  }
  opcoes.progresso?.({ etapa: 'geometria', feitos, total: p.objetos.length })
}
