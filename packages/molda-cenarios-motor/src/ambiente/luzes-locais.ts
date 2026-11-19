import type { MarcadorCompilado } from '@sistemazero/molda-cenarios-core/compilar'
import {
  type DocumentoDeCenario,
  type FonteDeAlturas,
  indiceDaOrganizacao,
  LuzLocalSchema,
  pontoDoMarcador,
  transformacaoDoMarcador,
} from '@sistemazero/molda-cenarios-core/v2'
import { Group, MathUtils, PointLight, SpotLight } from 'three'
import { configurarSombra } from './sombras'

function conferirLuzes(
  marcadores: readonly { configuracao?: MarcadorCompilado['configuracao'] }[],
) {
  const sombras = marcadores.filter(
    (m) => m.configuracao?.tipo === 'luz' && m.configuracao.luz.sombra,
  ).length
  if (marcadores.length > 32 || sombras > 4)
    throw Error('Use no máximo 32 luzes locais, com até quatro sombras locais.')
  return sombras
}

export class LuzesLocaisDoPalco {
  readonly grupo = new Group()
  private readonly luzes = new Map<string, PointLight | SpotLight>()
  private destruido = false
  definir(doc: DocumentoDeCenario, fonte?: FonteDeAlturas, resolucao = 512) {
    if (this.destruido) return { luzes: 0, sombras: 0, carregando: 0 }
    const flags = indiceDaOrganizacao(doc).flags,
      marcadores = doc.marcadores.filter(
        (m) => m.configuracao?.tipo === 'luz' && !flags.get(m.id)?.oculto,
      ),
      resolvidos = () =>
        marcadores.map((m) => ({
          id: m.id,
          posicao: transformacaoDoMarcador(doc, m, fonte).posicao,
          configuracao: m.configuracao!,
          alvo:
            m.configuracao?.tipo === 'luz' && m.configuracao.luz.tipo === 'foco'
              ? pontoDoMarcador(doc, m, m.configuracao.luz.alvo, fonte)
              : undefined,
        }))
    conferirLuzes(marcadores)
    if (doc.base.tipo === 'terreno' && !fonte) {
      this.limpar()
      return { luzes: 0, sombras: 0, carregando: marcadores.length }
    }
    return this.aplicar(resolvidos(), resolucao)
  }
  /** O compilador já resolveu os apoios; somente o alvo local precisa do giro do marcador. */
  definirCompiladas(marcadores: readonly MarcadorCompilado[], resolucao = 512) {
    return this.aplicar(
      marcadores
        .filter((m) => m.configuracao?.tipo === 'luz')
        .map((m) => {
          const luz = m.configuracao?.tipo === 'luz' ? m.configuracao.luz : undefined,
            a = luz?.tipo === 'foco' ? luz.alvo : undefined,
            c = Math.cos(m.giro),
            s = Math.sin(m.giro)
          return {
            id: m.id,
            posicao: m.posicao,
            configuracao: m.configuracao!,
            alvo: a
              ? {
                  x: m.posicao.x + a.x * c + a.z * s,
                  y: m.posicao.y + a.y,
                  z: m.posicao.z - a.x * s + a.z * c,
                }
              : undefined,
          }
        }),
      resolucao,
    )
  }
  private aplicar(
    marcadores: readonly {
      id: string
      posicao: { x: number; y: number; z: number }
      configuracao: NonNullable<MarcadorCompilado['configuracao']>
      alvo?: { x: number; y: number; z: number }
    }[],
    resolucao: number,
  ) {
    if (this.destruido) return { luzes: 0, sombras: 0, carregando: 0 }
    const sombras = conferirLuzes(marcadores)
    const vivos = new Set<string>()
    for (const m of marcadores) {
      if (m.configuracao?.tipo !== 'luz') continue
      const c = LuzLocalSchema.parse(m.configuracao.luz),
        posicao = m.posicao
      let luz = this.luzes.get(m.id)
      if (luz && luz instanceof SpotLight !== (c.tipo === 'foco')) {
        this.remover(m.id)
        luz = undefined
      }
      if (!luz) {
        luz = c.tipo === 'foco' ? new SpotLight() : new PointLight()
        luz.name = m.id
        this.luzes.set(m.id, luz)
        this.grupo.add(luz)
        if (luz instanceof SpotLight) this.grupo.add(luz.target)
      }
      vivos.add(m.id)
      luz.position.set(posicao.x, posicao.y, posicao.z)
      luz.color.set(c.cor)
      luz.intensity = c.intensidade
      luz.distance = c.alcance
      luz.decay = c.decaimento
      configurarSombra(luz, c.sombra, Math.min(512, resolucao))
      luz.shadow.camera.near = Math.max(0.001, Math.min(0.1, c.alcance / 100))
      luz.shadow.camera.far = c.alcance
      luz.shadow.camera.updateProjectionMatrix()
      luz.shadow.bias = -0.0002
      luz.shadow.normalBias = 0.02
      if (luz instanceof SpotLight && c.tipo === 'foco') {
        const alvo = m.alvo!
        luz.target.position.set(alvo.x, alvo.y, alvo.z)
        luz.angle = MathUtils.degToRad(c.angulo)
        luz.penumbra = c.penumbra
        luz.target.updateMatrixWorld()
      }
    }
    for (const id of this.luzes.keys()) if (!vivos.has(id)) this.remover(id)
    return { luzes: this.luzes.size, sombras, carregando: 0 }
  }
  private remover(id: string) {
    const luz = this.luzes.get(id)
    if (!luz) return
    if (luz instanceof SpotLight) this.grupo.remove(luz.target)
    this.grupo.remove(luz)
    luz.dispose()
    this.luzes.delete(id)
  }
  limpar() {
    for (const id of this.luzes.keys()) this.remover(id)
  }
  descartar() {
    if (this.destruido) return
    this.destruido = true
    this.limpar()
    this.grupo.clear()
  }
}
