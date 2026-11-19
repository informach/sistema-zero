const entrada = __ENTRADA_DE_ENSAIO__
const sdk = window.SZScene3D,
  cenas = []
Object.defineProperty(window, 'SZScene3D', {
  configurable: true,
  value: Object.freeze({
    ...sdk,
    carregar(...args) {
      return sdk.carregar(...args).then((r) => {
        cenas.push(r)
        return r
      })
    },
  }),
})
const api = window.SZWorld3D
let quadros = 0,
  tempo = 0,
  pronto = false
window.__qaWorld = {
  entrada,
  pronto: () => pronto && quadros > 5,
  estado: () => ({
    x: api.playerPos('x'),
    y: api.playerPos('y'),
    z: api.playerPos('z'),
    quadros,
    tempo,
    recursos: { ...window.__qaRenderers[0]?.info.memory },
    cenas: cenas.map((r) => ({
      nos: r.dados.nos.length,
      arvores: r.colisoes.arvores,
      filhos: r.cena.children.length,
      pai: !!r.cena.parent,
    })),
  }),
  trocar: () => api.loadScene(entrada.id),
  descartar: () => {
    api.disposeAll()
    return { ...window.__qaRenderers[0].info.memory }
  },
  alturas: (pontos) =>
    pontos.map(({ x, z }) => {
      const r = cenas.at(-1),
        chao = !!r.alturas?.temChao?.({ x, z })
      return { x, z, chao, altura: chao ? r.alturas(x, z) : null, mundo: api.groundHeight(x, z) }
    }),
}
api.setup({ style: 'floresta', world: 80 })
api.loadScene(entrada.id).then((r) => {
  pronto = r
})
api.person('#448855', 'nenhum')
api.personStats(1.5, 3.4, 7)
api.personPlace(entrada.x, entrada.z, 0)
if (entrada.avatar) {
  api.personModel(entrada.avatar, 1.16)
  for (const [estado, clip] of [
    ['parado', 'parado_relaxado'],
    ['andando', 'andar_frente'],
    ['correndo', 'correr_frente'],
    ['pulando', 'pulo_no_ar'],
  ])
    api.modelAnim('personagem', '', estado, clip)
}
api.onUpdate((dt) => {
  quadros++
  tempo += dt
})
api.start()
