// Observations belong to this author-owned proof, never to the delivered runtime API.
window.__qaPrepararAvancado = () => {
  const entrada = __ENTRADA_DE_ENSAIO__,
    api = window.SZGameKit3D,
    partida = (window.__qaPartidasAvancado || 0) + 1,
    cenas = [],
    clipes = new Set()
  window.__qaPartidasAvancado = partida
  let personagem = null,
    scene = null,
    renderer = null,
    cameraOriginal = null,
    pronto = false,
    quadros = 0,
    tempo = 0,
    chegada = null
  window.__qaEntrarAvancado = (e) => {
    personagem = e
    scene = e.mesh.parent
  }
  api.onUpdate((dt) => {
    const base = scene && window.SZScene3D.instalado(scene)
    if (!base || !personagem) return
    renderer = window.__qaRenderers.at(-1)
    const camera = renderer.__qaVistas?.get(scene)
    if (camera && !cameraOriginal) cameraOriginal = camera
    if (base !== cenas.at(-1)) {
      cenas.push(base)
      for (const ator of base.instancias.values())
        if (ator.animacoes.length) ator.mixer.clipAction(ator.animacoes[0]).play()
    }
    if (!pronto) {
      chegada = personagem.mesh.position.toArray()
      let apoio = null
      for (let i = 0; i < 9; i++) {
        const angulo = ((i - 1) * Math.PI) / 4,
          x = entrada.x + (i ? Math.cos(angulo) * 0.1875 : 0),
          z = entrada.z + (i ? Math.sin(angulo) * 0.1875 : 0),
          de = personagem.mesh.position.clone().set(x, 50, z),
          ate = de.clone().set(x, -100, z),
          hit = base.colisoes.rastrear(de, ate)
        if (hit && hit.normal.y > 0.64 && (apoio === null || hit.ponto.y > apoio))
          apoio = hit.ponto.y
      }
      if (apoio === null) throw Error('O início medido não tem apoio real.')
      api.place(
        personagem,
        entrada.x,
        apoio - (personagem._resourceOwner?.col.minY ?? 0),
        entrada.z,
      )
      api.setYaw(personagem, 180)
      api.cameraSmooth(20)
      pronto = true
    }
    if (api.keyPressed('Space')) api.jump(personagem, 7)
    const andando = ['w', 'a', 's', 'd'].some((k) => api.keyDown(k)),
      correndo = api.keyDown('ShiftLeft'),
      estado = !api.onGround(personagem)
        ? 'pulando'
        : andando
          ? correndo
            ? 'correndo'
            : 'andando'
          : 'parado'
    api.setEntityState(personagem, estado)
    api.moveWithKeys(personagem, correndo ? 3.4 : 1.5)
    if (personagem._action) clipes.add(personagem._action.getClip().name)
    quadros++
    tempo += dt
  })
  window.__qaAvancado = {
    pronto: () => pronto && quadros > 10 && !!cameraOriginal,
    estado: () => ({
      x: personagem?.mesh.position.x,
      y: personagem?.mesh.position.y,
      z: personagem?.mesh.position.z,
      vx: personagem?.vx,
      vy: personagem?.vy,
      vz: personagem?.vz,
      grounded: personagem?.grounded,
      quadros,
      tempo,
      geracao: cenas.length,
      chegada,
      partida,
      corpo: personagem?._resourceOwner?.col,
      proprio:
        !!renderer &&
        renderer === window.__qaRenderers[0] &&
        renderer.__qaVistas?.get(scene) === cameraOriginal,
      recursos: renderer ? { ...renderer.info.memory } : null,
      cenas: cenas.map((r) => ({
        arvores: r.colisoes.arvores,
        pai: !!r.cena.parent,
        ativa: r.fisica.active(),
      })),
      clipes: [...(cenas.at(-1)?.instancias.values() ?? [])]
        .filter((a) => a.animacoes.length)
        .map((a) => ({ quantidade: a.animacoes.length, tempo: a.mixer.time })),
      estadosTocados: [...clipes],
      acao: personagem?._action?.getClip().name,
      modelo: !!personagem?._mixer,
      desenhos: renderer?.info.render.frame,
      estado: api.state(),
    }),
    alturas: (pontos) =>
      pontos.map(({ x, z }) => {
        const r = cenas.at(-1),
          chao = !!r.alturas?.temChao({ x, z })
        return { x, z, chao, altura: chao ? r.alturas(x, z) : null }
      }),
    trocar: () => api.loadScene(entrada.id),
    descartar: () => api.disposeAll(),
  }
}
