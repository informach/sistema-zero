import type { CatalogoDeCenario } from '../catalogo'
import type {
  DocumentoDeCenario as DocumentoV1,
  InstanciaDeCenario as InstanciaV1,
} from '../documento'
import { CenarioInvalido, validarDocumento as validarV1 } from '../validacao'
import type {
  Colisao,
  DocumentoDeCenario,
  InstanciaDeCenario,
  ModeloDoCenario,
  Propriedades,
} from './documento'
import { validarDocumento } from './validacao'

/** Diz de qual biblioteca vem um modelo do catálogo v1. Sem resposta, a migração recusa. */
export type ResolverDeModeloV1 = (id: string) => Omit<ModeloDoCenario, 'id'> | undefined

/** O catálogo único do piloto vira uma biblioteca com o mesmo identificador. */
export function resolverPeloCatalogo(
  biblioteca: string,
  catalogo: CatalogoDeCenario,
): ResolverDeModeloV1 {
  return (id) => {
    const m = catalogo.get(id)
    return m && { biblioteca, modelo: id, digest: m.digest, nome: m.nome }
  }
}

/** Prefixo das propriedades que só o perfil do Arquipélago interpreta. */
export const PREFIXO_ARQUIPELAGO = 'arquipelago.'
const COLISAO_V1: Record<InstanciaV1['fisica'], Colisao> = {
  nenhuma: 'nenhuma',
  caixa: 'caixa',
  tronco: 'capsula',
  ponte: 'malha',
  escada: 'malha',
  malha: 'malha',
  solo: 'malha',
}

function propriedadesDaInstancia(o: InstanciaV1): Propriedades | undefined {
  const p: Propriedades = {},
    k = (nome: string) => `${PREFIXO_ARQUIPELAGO}${nome}`
  // A colisão genérica perde o papel que a peça tinha no jogo; o perfil o recupera daqui.
  if (!['nenhuma', 'caixa', 'malha'].includes(o.fisica)) p[k('fisica')] = o.fisica
  if (o.ator) p[k('ator')] = o.ator
  if (o.raioDoTronco !== undefined) p[k('raioDoTronco')] = o.raioDoTronco
  if (o.enterrada !== undefined) p[k('enterrada')] = o.enterrada
  if (o.fundacao)
    for (const canto of ['min', 'max'] as const)
      for (const eixo of ['x', 'y', 'z'] as const)
        p[k(`fundacao.${canto}.${eixo}`)] = o.fundacao[canto][eixo]
  if (o.sinal) {
    p[k('sinal.texto')] = o.sinal.texto
    p[k('sinal.destino')] = o.sinal.destino
    p[k('sinal.via.x')] = o.sinal.via.x
    p[k('sinal.via.z')] = o.sinal.via.z
  }
  return Object.keys(p).length ? p : undefined
}

function instancia(o: InstanciaV1): InstanciaDeCenario {
  const s = o.transformacao.escala,
    propriedades = propriedadesDaInstancia(o)
  return {
    id: o.id,
    nome: o.nome,
    grupo: o.grupo,
    bloqueado: o.bloqueado,
    oculto: o.oculto,
    ...(propriedades && { propriedades }),
    modelo: o.modelo,
    transformacao: {
      posicao: o.transformacao.posicao,
      rotacao: o.transformacao.rotacao,
      escala: { x: s, y: s, z: s },
    },
    apoio: o.apoio,
    colisao: COLISAO_V1[o.fisica],
  }
}

/**
 * Leva um cenário do piloto (v1) para o formato genérico (v2) sem perder informação:
 * o relevo do jogo fica como base `perfil` e o que era do Arquipélago vira propriedade.
 */
export function migrarDaV1(valor: unknown, resolver: ResolverDeModeloV1): DocumentoDeCenario {
  const v1: DocumentoV1 = validarV1(valor)
  const usados = new Set<string>()
  for (const o of v1.instancias) usados.add(o.modelo)
  for (const c of v1.caminhos) usados.add(c.acabamento)
  for (const a of v1.aguas) if (a.modelo) usados.add(a.modelo)

  const modelos: ModeloDoCenario[] = [],
    ausentes: string[] = []
  for (const id of [...usados].sort()) {
    const ref = resolver(id)
    if (ref) modelos.push({ id, ...ref })
    else ausentes.push(`Modelo ausente: ${id}`)
  }
  if (ausentes.length) throw new CenarioInvalido(ausentes)

  return validarDocumento({
    formato: 'molda-cenario',
    versao: 2,
    id: v1.id,
    nome: v1.nome,
    unidade: 'metro',
    eixoVertical: 'y',
    base: { tipo: 'perfil', perfil: v1.base.id, versao: v1.base.versao, carimbos: v1.relevo },
    modelos,
    grupos: v1.grupos,
    instancias: v1.instancias.map(instancia),
    caminhos: v1.caminhos,
    aguas: v1.aguas.map((a) => ({ ...a, tipo: 'lago' as const })),
    marcadores: v1.marcos.map((m) => ({
      id: m.id,
      nome: m.id.slice(0, 120),
      grupo: null,
      bloqueado: false,
      oculto: false,
      posicao: { x: m.posicao.x, y: 0, z: m.posicao.z },
      giro: 0,
      noChao: true,
      objeto: m.objeto,
    })),
    iluminacao: { hora: v1.iluminacao.noite ? 21 : 12 },
  } satisfies DocumentoDeCenario)
}

/** Abre um cenário de qualquer versão conhecida e devolve sempre a atual. */
export function abrirDocumento(valor: unknown, resolver?: ResolverDeModeloV1): DocumentoDeCenario {
  const versao = (valor as { versao?: unknown } | null)?.versao
  if (versao === 1) {
    if (!resolver)
      throw new CenarioInvalido(['Cenário da versão 1: informe de qual biblioteca vêm os modelos'])
    return migrarDaV1(valor, resolver)
  }
  return validarDocumento(valor)
}
