import type { CenaNoThree } from '@sistemazero/molda-cenarios-motor/runtime'
import { Box3, type Material, type Mesh, type Object3D, Plane, Vector3 } from 'three'
import type { RegiaoDoCenario } from '../sistemas/regiao-do-cenario'

type Vista = Pick<CenaNoThree, 'raiz' | 'cena'> & {
  nos: readonly (Pick<CenaNoThree['dados']['nos'][number], 'id' | 'volume'> & {
    arquivo?: string
  })[]
}

/**
 * Restringe a apresentação à ilha, sem reexportar ou deformar os modelos originais.
 * Só os materiais de peças que cruzam o limite recebem cópias com planos de recorte.
 *
 * A janela de detalhe (os setores perto, que emendam com o relevo distante do jogo) corta só
 * as SUPERFÍCIES (`superficies`: os arquivos de terreno, água e caminho). Uma casa ou árvore
 * na borda da janela aparece inteira ou some inteira, nunca cortada em linha reta.
 */
export function restringirCenarioARegiao(
  vista: Vista,
  regiao: RegiaoDoCenario,
  pertoInicial?: Box3,
  superficies: ReadonlySet<string> = new Set(),
) {
  const materiais = new Map<Material, Material>(),
    materiaisDaRegiao = new Map<Material, Material>()
  const trocas: {
    malha: Mesh
    original: Material | Material[]
    aplicado: Material | Material[]
  }[] = []
  const grupos: {
    objeto: Object3D
    visivel: boolean
    regiao: ReturnType<RegiaoDoCenario['volume']>
    caixa: Box3
  }[] = []
  const luzes: { objeto: Object3D; visivel: boolean }[] = []
  let descartado = false
  const janela = pertoInicial
    ? [
        new Plane(new Vector3(1, 0, 0)),
        new Plane(new Vector3(-1, 0, 0)),
        new Plane(new Vector3(0, 0, 1)),
        new Plane(new Vector3(0, 0, -1)),
      ]
    : []
  const copiar = (original: Material, comJanela: boolean) => {
    const cache = comJanela ? materiais : materiaisDaRegiao
    let copia = cache.get(original)
    if (copia) return copia
    copia = original.clone()
    // Material.copy não conserva estes hooks: a água deve manter ondas, profundidade e espuma.
    copia.onBeforeCompile = original.onBeforeCompile
    copia.onBeforeRender = original.onBeforeRender
    copia.customProgramCacheKey = original.customProgramCacheKey
    copia.clippingPlanes = [
      ...(original.clippingPlanes ?? []),
      ...regiao.planos,
      ...(comJanela ? janela : []),
    ]
    copia.clipIntersection = false
    copia.clipShadows = true
    copia.needsUpdate = true
    cache.set(original, copia)
    return copia
  }
  const descartar = () => {
    if (descartado) return
    descartado = true
    for (const t of trocas) if (t.malha.material === t.aplicado) t.malha.material = t.original
    for (const g of grupos) g.objeto.visible = g.visivel
    for (const l of luzes) l.objeto.visible = l.visivel
    for (const m of [...materiais.values(), ...materiaisDaRegiao.values()]) m.dispose()
    materiais.clear()
    materiaisDaRegiao.clear()
    trocas.length = 0
    grupos.length = 0
    luzes.length = 0
  }
  try {
    const porId = new Map(vista.raiz.children.map((o) => [o.name, o]))
    for (const n of vista.nos) {
      const objeto = porId.get(n.id)
      if (!objeto) throw Error(`Falta a representação do setor ${n.id}.`)
      const posicao = regiao.volume(n.volume)
      grupos.push({
        objeto,
        visivel: objeto.visible,
        regiao: posicao,
        caixa: new Box3(
          new Vector3(n.volume.min.x, n.volume.min.y, n.volume.min.z),
          new Vector3(n.volume.max.x, n.volume.max.y, n.volume.max.z),
        ),
      })
      if (posicao === 'fora') objeto.visible = false
      const comJanela = janela.length > 0 && n.arquivo !== undefined && superficies.has(n.arquivo)
      if (posicao !== 'fora' && (posicao === 'cruza' || comJanela))
        objeto.traverse((o) => {
          const malha = o as Mesh
          if (!malha.isMesh) return
          const original = malha.material
          const aplicado = Array.isArray(original)
            ? original.map((m) => copiar(m, comJanela))
            : copiar(original, comJanela)
          trocas.push({ malha, original, aplicado })
          malha.material = aplicado
        })
    }
    vista.cena.updateMatrixWorld(true)
    const p = new Vector3()
    vista.cena.traverse((o) => {
      if (!(o as Object3D & { isLight?: boolean }).isLight) return
      luzes.push({ objeto: o, visivel: o.visible })
      o.getWorldPosition(p)
      if (!regiao.contem(p.x, p.z)) o.visible = false
    })
    const controle = {
      atualizar(perto: Box3) {
        if (descartado) return
        if (perto.isEmpty() || ![...perto.min, ...perto.max].every(Number.isFinite))
          throw Error('A janela de detalhe do cenário é inválida.')
        if (janela.length) {
          janela[0]!.constant = -perto.min.x
          janela[1]!.constant = perto.max.x
          janela[2]!.constant = -perto.min.z
          janela[3]!.constant = perto.max.z
        }
        for (const g of grupos)
          g.objeto.visible = g.visivel && g.regiao !== 'fora' && g.caixa.intersectsBox(perto)
      },
      descartar,
    }
    if (pertoInicial) controle.atualizar(pertoInicial)
    return controle
  } catch (erro) {
    descartar()
    throw erro
  }
}
