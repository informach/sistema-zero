import { z } from 'zod'
import { VetorSchema } from '../documento'
import { CenarioInvalido } from '../validacao'
import { alturaDoChao } from './chao'
import type { DocumentoDeCenario, MarcadorDeCenario } from './documento'
import { MarcadorSchema } from './documento'
import { pontoDoMarcador, pontoLocalDoMarcador, transformacaoDoMarcador } from './marcadores'
import type { FonteDeAlturas } from './terreno'

export const VistaDeCameraSchema = z
  .object({
    posicao: VetorSchema,
    alvo: VetorSchema,
    campoDeVisao: z.number().finite().min(15).max(100),
  })
  .strict()
  .refine(
    (v) =>
      Math.hypot(v.alvo.x - v.posicao.x, v.alvo.y - v.posicao.y, v.alvo.z - v.posicao.z) > 1e-6,
    { message: 'A câmera precisa olhar para um ponto diferente de sua posição.' },
  )
export type VistaDeCamera = z.infer<typeof VistaDeCameraSchema>

export function cameraDoMarcador(
  doc: Pick<DocumentoDeCenario, 'base'>,
  m: MarcadorDeCenario,
  fonte?: FonteDeAlturas,
): VistaDeCamera {
  const c = m.configuracao
  if (c?.tipo !== 'camera') throw new CenarioInvalido(['Escolha um marcador de câmera.'])
  return VistaDeCameraSchema.parse({
    posicao: transformacaoDoMarcador(doc, m, fonte).posicao,
    alvo: pontoDoMarcador(doc, m, c.alvo, fonte),
    campoDeVisao: c.campoDeVisao,
  })
}
/** Guardar a vista não muda a órbita nem confunde o alvo mundial com um vetor local. */
export function alteracoesDaCamera(
  doc: Pick<DocumentoDeCenario, 'base'>,
  m: MarcadorDeCenario,
  vista: VistaDeCamera,
  fonte?: FonteDeAlturas,
) {
  if (m.configuracao?.tipo !== 'camera')
    throw new CenarioInvalido(['Escolha um marcador de câmera.'])
  const v = VistaDeCameraSchema.parse(vista),
    posicao = {
      ...v.posicao,
      y: v.posicao.y - (m.noChao ? alturaDoChao(doc.base, v.posicao.x, v.posicao.z, fonte) : 0),
    },
    configuracao = {
      tipo: 'camera' as const,
      alvo: pontoLocalDoMarcador(doc, { ...m, posicao }, v.alvo, fonte),
      campoDeVisao: v.campoDeVisao,
    }
  const validado = MarcadorSchema.parse({ ...m, posicao, configuracao })
  return { posicao: validado.posicao, configuracao: validado.configuracao }
}
