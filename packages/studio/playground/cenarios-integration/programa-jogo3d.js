window.__qaIniciarJogo3D = (cena, personagem) => {
  const partida = (window.__qaPartidasJogo3D || 0) + 1
  window.__qaPartidasJogo3D = partida
  const entrada = __ENTRADA_DE_ENSAIO__,
    api = window.SZGame3D,
    THREE = api.THREE,
    cameraOriginal = cena.camera,
    rendererOriginal = cena.renderer,
    cenas = []
  let pronto = false,
    quadros = 0,
    tempo = 0,
    geracao = 0,
    chegada = null
  function capturar() {
    const r = cena._sceneHandle
    if (r && r !== cenas.at(-1)) {
      cenas.push(r)
      geracao++
      for (const ator of r.instancias.values())
        if (ator.animacoes.length) ator.mixer.clipAction(ator.animacoes[0]).play()
    }
  }
  function iniciarPercurso() {
    const r = cena._sceneHandle,
      s = personagem.userData.sz
    chegada = personagem.position.toArray()
    // The measured movement starts on a known partial bridge stretch, as in the other proofs.
    let apoio = null
    const raio = Math.min(s.hw, s.hh, s.hd)
    for (let i = 0; i < 9; i++) {
      const angulo = ((i - 1) * Math.PI) / 4,
        x = entrada.x + (i ? Math.cos(angulo) * raio * 0.75 : 0),
        z = entrada.z + (i ? Math.sin(angulo) * raio * 0.75 : 0),
        hit = r.colisoes.rastrear(new THREE.Vector3(x, 50, z), new THREE.Vector3(x, -100, z))
      if (hit && hit.normal.y > 0 && (apoio === null || hit.ponto.y > apoio)) apoio = hit.ponto.y
    }
    if (apoio === null) throw Error('O começo do percurso medido não tem apoio real.')
    api.setPosition(personagem, entrada.x, apoio + s.hh, entrada.z)
    api.setCameraPosition(cena, entrada.x + 4, personagem.position.y + 3, entrada.z + 6)
    api.cameraMode(cena, 'longe', personagem)
    api.body(personagem, 22)
    if (entrada.avatar) api.walkAnimations(personagem, 'parado_relaxado', 'andar_frente')
    pronto = true
  }
  api.animate(cena, (dt) => {
    capturar()
    if (!pronto && (!entrada.avatar || personagem.userData.sz.modelLoaded)) iniciarPercurso()
    if (pronto) {
      if (api.keyPressed('Space')) api.jump(personagem, 7)
      api.topDown(personagem, api.keyDown('ShiftLeft') ? 3.4 : 1.5)
      tempo += dt
    }
    quadros++
  })
  window.__qaJogo3D = {
    pronto: () =>
      pronto && quadros > 8 && cena._budget.decided && !(window.__szModelosPendentes > 0),
    estado: () => ({
      x: personagem.position.x,
      y: personagem.position.y,
      z: personagem.position.z,
      vy: personagem.userData.sz.vy * 60,
      grounded: personagem.userData.sz.grounded,
      quadros,
      tempo,
      geracao,
      chegada,
      partida,
      proprio: cena.camera === cameraOriginal && cena.renderer === rendererOriginal,
      recursos: { ...cena.renderer.info.memory },
      orcamento: {
        nivel: cena._budget.tier,
        decidido: cena._budget.decided,
        sonda: cena._budget.probeT,
      },
      cenas: cenas.map((r) => ({
        arvores: r.colisoes.arvores,
        pai: !!r.cena.parent,
        ativa: r.fisica.active(),
      })),
      clipes: [...(cenas.at(-1)?.instancias.values() ?? [])]
        .filter((a) => a.animacoes.length)
        .map((a) => ({ quantidade: a.animacoes.length, tempo: a.mixer.time })),
      modelo: !!personagem.userData.sz.modelLoaded,
      desenhos: cena.renderer.info.render.frame,
    }),
    alturas: (pontos) =>
      pontos.map(({ x, z }) => {
        const r = cenas.at(-1),
          chao = !!r.alturas?.temChao({ x, z })
        return { x, z, chao, altura: chao ? r.alturas(x, z) : null }
      }),
    trocar: () => api.loadScene(cena, entrada.id),
    descartar: () => {
      api.disposeAll()
      return { ...cena.renderer.info.memory }
    },
  }
}
