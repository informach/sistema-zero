import {
  type EntidadeCompilada,
  EntidadeCompiladaSchema,
  type MarcadorCompilado,
  MarcadorCompiladoSchema,
  type PreparacaoDaCena,
} from '@sistemazero/molda-cenarios-core/compilar'
import {
  type DocumentoDeCenario,
  type EntidadeOrganizavel,
  indiceDaOrganizacao,
  type VolumeDeComposicao,
} from '@sistemazero/molda-cenarios-core/v2'
import { Matrix4 } from 'three'
import { matrizDaTransformacao } from '../matematica'

export interface AncoraDaEntidadeCompilada {
  matriz: readonly number[]
  volume?: VolumeDeComposicao
}

/** Registro lógico conserva associações, mesmo quando a geometria está oculta ou agrupada. */
export function compilarMetadadosDaCena(
  original: DocumentoDeCenario,
  preparada: PreparacaoDaCena,
  ancoras: ReadonlyMap<string, AncoraDaEntidadeCompilada>,
) {
  if (original.id !== preparada.fonte.cenario)
    throw Error('Os metadados pertencem a outra fonte de cenário.')
  const d = preparada.documento,
    flags = indiceDaOrganizacao(d).flags,
    montagens = new Map(preparada.montagens.map((m) => [m.id, m])),
    raizes = new Set(original.montagens?.map((m) => m.id)),
    entidades: EntidadeCompilada[] = []
  const adicionar = (
    e: EntidadeOrganizavel,
    tipo: EntidadeCompilada['tipo'],
    ancora?: AncoraDaEntidadeCompilada,
  ) => {
    const a = ancoras.get(e.id) ?? ancora
    entidades.push(
      EntidadeCompiladaSchema.parse({
        id: e.id,
        nome: e.nome,
        tipo,
        grupo: e.grupo,
        oculto: flags.get(e.id)?.oculto ?? e.oculto,
        ...(e.propriedades ? { propriedades: e.propriedades } : {}),
        ...(a ? { matriz: [...a.matriz], ...(a.volume ? { volume: a.volume } : {}) } : {}),
      }),
    )
  }
  for (const e of d.grupos) {
    const m = montagens.get(e.id)
    adicionar(
      e,
      raizes.has(e.id) ? 'montagem' : 'grupo',
      m ? { matriz: matrizDaTransformacao(m.transformacao, new Matrix4()).elements } : undefined,
    )
  }
  for (const e of d.instancias) adicionar(e, 'objeto')
  for (const e of d.aguas) adicionar(e, 'agua')
  for (const e of d.caminhos) adicionar(e, 'caminho')
  const pontos = new Map(preparada.marcadores.map((m) => [m.marcador.id, m]))
  for (const e of d.marcadores) {
    const m = pontos.get(e.id)
    adicionar(
      e,
      'marcador',
      m ? { matriz: matrizDaTransformacao(m.transformacao, new Matrix4()).elements } : undefined,
    )
  }
  const marcadores: MarcadorCompilado[] = preparada.marcadores.map((m) =>
    MarcadorCompiladoSchema.parse({
      id: m.marcador.id,
      nome: m.marcador.nome,
      posicao: m.transformacao.posicao,
      giro: m.transformacao.rotacao.y,
      objeto: m.marcador.objeto,
      ...(m.marcador.propriedades ? { propriedades: m.marcador.propriedades } : {}),
      ...(m.marcador.configuracao ? { configuracao: m.marcador.configuracao } : {}),
      ...(m.rota ? { rota: m.rota } : {}),
      ...(m.camera ? { camera: m.camera } : {}),
    }),
  )
  const definicoes = new Map(original.definicoesConjuntos?.map((d) => [d.id, d])),
    usadas = new Set(preparada.montagens.map((m) => m.definicao)),
    conjuntos = [...usadas].map((id) => {
      const d = definicoes.get(id)
      if (!d) throw Error('A procedência de uma montagem não está disponível na fonte.')
      return { id: d.id, biblioteca: d.biblioteca, conjunto: d.conjunto, revisao: d.revisao }
    })
  return {
    entidades,
    marcadores,
    fontes: { modelos: preparada.modelos, texturas: preparada.texturas, conjuntos },
  }
}
