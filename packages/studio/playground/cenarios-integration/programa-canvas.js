// Author-owned ordinary Three.js program. Only the generated recipes load/update/link the scene.
const entrada = __ENTRADA_DE_ENSAIO__
let pronto = false,
  falha = null,
  encerrado = false,
  quadros = 0,
  tempo = 0,
  geracao = 0
const cenas = [],
  teclas = new Set(),
  cameraOriginal = camera,
  rendererOriginal = renderizador
renderizador.shadowMap.enabled = true
renderizador.outputColorSpace = THREE.SRGBColorSpace
renderizador.toneMapping = THREE.ACESFilmicToneMapping
personagem.castShadow = true
function receberCenario(cenario) {
  cenas.push(cenario)
  for (const ator of cenario.instancias.values())
    if (ator.animacoes.length) ator.mixer.clipAction(ator.animacoes[0]).play()
  if (!pronto) {
    // Arrival covers the physical foot area: the center ray can pass through a plank joint.
    let apoio = null
    for (let i = 0; i < 9; i++) {
      const angulo = ((i - 1) * Math.PI) / 4,
        x = entrada.x + (i ? Math.cos(angulo) * 0.25 * 0.75 : 0),
        z = entrada.z + (i ? Math.sin(angulo) * 0.25 * 0.75 : 0),
        hit = cenario.colisoes.rastrear(new THREE.Vector3(x, 50, z), new THREE.Vector3(x, -100, z))
      if (hit && hit.normal.y > 0 && (apoio === null || hit.ponto.y > apoio)) apoio = hit.ponto.y
    }
    if (apoio === null) throw Error('O ponto inicial do ensaio não tem apoio real.')
    fisica.teleport('criador', entrada.x, apoio + 0.58, entrada.z)
  }
  pronto = true
  geracao++
}
function tecla(e, ativa) {
  if (ativa) teclas.add(e.code)
  else teclas.delete(e.code)
  if (e.code === 'Space' && ativa) fisica.jump('criador', 7)
}
const pressionar = (e) => tecla(e, true),
  soltar = (e) => tecla(e, false)
window.addEventListener('keydown', pressionar)
window.addEventListener('keyup', soltar)
let anterior = null,
  raf
function quadro(agora) {
  if (encerrado) return
  const dt = anterior === null ? 0 : Math.min(0.05, (agora - anterior) / 1000)
  anterior = agora
  if (pronto) {
    const x = (teclas.has('KeyD') ? 1 : 0) - (teclas.has('KeyA') ? 1 : 0),
      z = (teclas.has('KeyW') ? 1 : 0) - (teclas.has('KeyS') ? 1 : 0)
    fisica.moveCharacter('criador', x, z, teclas.has('ShiftLeft') ? 3.4 : 1.5)
    atualizarCenario(dt)
    camera.position.copy(personagem.position).add(new THREE.Vector3(0, 3, -6))
    camera.lookAt(personagem.position)
    tempo += dt
  }
  renderizador.render(cena, camera)
  quadros++
  raf = requestAnimationFrame(quadro)
}
function descartar() {
  if (encerrado) return { ...renderizador.info.memory }
  encerrado = true
  cancelAnimationFrame(raf)
  window.removeEventListener('keydown', pressionar)
  window.removeEventListener('keyup', soltar)
  window.SZScene3D.instalado(cena)?.descartar()
  fisica.clear()
  personagem.removeFromParent()
  const geometrias = new Set(),
    materiais = new Set()
  personagem.traverse((o) => {
    if (o.geometry) geometrias.add(o.geometry)
    if (o.material) for (const m of [o.material].flat()) materiais.add(m)
  })
  for (const g of geometrias) g.dispose()
  for (const m of materiais) m.dispose()
  renderizador.dispose()
  renderizador.forceContextLoss()
  return { ...renderizador.info.memory }
}
window.addEventListener('pagehide', descartar, { once: true })
window.__qaCanvas = {
  receberCenario,
  pronto: () => pronto && quadros > 5,
  estado: () => ({
    ...fisica.body('criador'),
    quadros,
    tempo,
    geracao,
    falha,
    clipes: cenas.at(-1)
      ? [...cenas.at(-1).instancias.values()]
          .filter((a) => a.animacoes.length)
          .map((a) => ({ quantidade: a.animacoes.length, tempo: a.mixer.time }))
      : [],
    recursos: { ...renderizador.info.memory },
    proprio: camera === cameraOriginal && renderizador === rendererOriginal,
    cenas: cenas.map((r) => ({
      arvores: r.colisoes.arvores,
      pai: !!r.cena.parent,
      ativa: r.fisica.active(),
    })),
    fisica: fisica.stats(),
  }),
  alturas: (pontos) =>
    pontos.map(({ x, z }) => {
      const r = cenas.at(-1),
        chao = !!r.alturas?.temChao({ x, z })
      return { x, z, chao, altura: chao ? r.alturas(x, z) : null }
    }),
  trocar: carregarBase,
  descartar,
}
carregarBase()
raf = requestAnimationFrame(quadro)
