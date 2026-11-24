import { CenarioInvalido } from '../validacao'
import { prepararConsultaDaAgua } from './consulta-de-agua'
import type { DocumentoDeCenario, InstanciaDeCenario, Transformacao } from './documento'
import { ApoioSchema } from './entidades-schema'
import { lembrar } from './memoria-da-validacao'
import { girarNaVertical } from './rotacao'

type DocumentoComAgua = Partial<Pick<DocumentoDeCenario, 'aguas'>>
type ApoioDeAgua = Extract<InstanciaDeCenario['apoio'], { tipo: 'agua' }>

function referencial(doc: DocumentoComAgua, id: string, local: { x: number; z: number }) {
  const agua = doc.aguas?.find((a) => a.id === id)
  if (!agua) throw new CenarioInvalido([`Água de apoio ausente: ${id}`])
  if (agua.tipo === 'cachoeira')
    throw new CenarioInvalido(['Uma cachoeira não tem superfície horizontal para apoiar objetos.'])
  if (agua.tipo === 'lago' || agua.tipo === 'represa')
    return { centro: agua.centro, giro: agua.giro, escala: agua.escala, nivel: agua.nivel }
  if (agua.tipo === 'mar') return { centro: { x: 0, z: 0 }, giro: 0, escala: 1, nivel: agua.nivel }
  const nivel = lembrar(agua, 'consulta', () => prepararConsultaDaAgua(agua)).em(
    local.x,
    local.z,
  )?.nivel
  if (nivel === undefined)
    throw new CenarioInvalido(['O ponto de apoio está fora da superfície do rio.'])
  return { centro: { x: 0, z: 0 }, giro: 0, escala: 1, nivel }
}

/** Os campos do apoio pertencem à água; a transformação gravada é uma projeção de autoria. */
export function transformacaoDoApoioNaAgua(
  doc: DocumentoComAgua,
  apoio: ApoioDeAgua,
): Transformacao {
  const a = referencial(doc, apoio.agua, apoio.local),
    c = Math.cos(a.giro),
    s = Math.sin(a.giro),
    pose = apoio.pose ?? {
      rotacao: { x: 0, y: apoio.giro, z: 0 },
      escala: { x: apoio.escala, y: apoio.escala, z: apoio.escala },
    }
  return {
    posicao: {
      x: a.centro.x + (apoio.local.x * c + apoio.local.z * s) * a.escala,
      y: a.nivel + apoio.deslocamento * a.escala,
      z: a.centro.z + (-apoio.local.x * s + apoio.local.z * c) * a.escala,
    },
    rotacao: girarNaVertical(pose.rotacao, a.giro),
    escala: {
      x: pose.escala.x * a.escala,
      y: pose.escala.y * a.escala,
      z: pose.escala.z * a.escala,
    },
  }
}

/** Inversa do mesmo referencial: gizmo, números, duplicação e agente conservam pose XYZ. */
export function apoioNaAgua(
  doc: DocumentoComAgua,
  agua: string,
  mundo: Transformacao,
): ApoioDeAgua {
  // No rio, as coordenadas locais são mundiais; no lago o nível independe do ponto consultado.
  const a = referencial(doc, agua, mundo.posicao),
    c = Math.cos(a.giro),
    s = Math.sin(a.giro),
    x = mundo.posicao.x - a.centro.x,
    z = mundo.posicao.z - a.centro.z,
    rotacao = girarNaVertical(mundo.rotacao, -a.giro),
    escala = {
      x: mundo.escala.x / a.escala,
      y: mundo.escala.y / a.escala,
      z: mundo.escala.z / a.escala,
    }
  const r = ApoioSchema.parse({
    tipo: 'agua',
    agua,
    local: { x: (x * c - z * s) / a.escala, z: (x * s + z * c) / a.escala },
    deslocamento: (mundo.posicao.y - a.nivel) / a.escala,
    giro: rotacao.y,
    escala: escala.x,
    pose: { rotacao, escala },
  })
  if (r.tipo !== 'agua') throw new CenarioInvalido(['Apoio de água inválido'])
  return r
}
