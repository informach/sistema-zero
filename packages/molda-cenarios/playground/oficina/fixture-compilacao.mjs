/** Fonte real compartilhada dos ensaios; bytes/artes chegam pelo argumento, fora do Git. */
export async function montarCenaDeCompilacaoDoEnsaio(u) {
  const C = await import(u.core),
    M = await import(u.motor),
    host = window.__cenarios.host,
    espaco = u.espaco ?? 'conta',
    dados = structuredClone(u.autoria),
    recursos = u.recursos.map((r) => ({
      ...r,
      bytes: Uint8Array.from(atob(r.base64), (c) => c.charCodeAt(0)),
    })),
    bibliotecas = new Map(),
    modelos = new Map(),
    texturas = new Map(),
    criadas = new Map(),
    origens = [
      ['reino', 'Reino', 'restrita'],
      ['cute', 'Cute Characters', 'restrita'],
      ['adventure', 'Adventure Land', 'restrita'],
      ['propria', 'Texturas próprias', 'propria'],
    ]
  for (const [id, nome, licenca] of origens)
    bibliotecas.set(id, await host.criarBiblioteca(espaco, { nome, licenca }))
  try {
    for (const ref of dados.modelos) {
      const r = recursos.find((r) => r.tipo === 'modelo' && r.digest === ref.digest)
      if (!r) throw Error('Fixture sem fonte original de modelo')
      C.conferirGlb(r.bytes)
      if ((await C.digestDosBytes(r.bytes)) !== ref.digest)
        throw Error('Hash original de modelo divergente')
      const foto = await M.fotografarModelo(r.bytes.slice().buffer, 128),
        b = bibliotecas.get(ref.biblioteca),
        [modelo] = await host.importarModelos(b.id, [
          {
            nome: ref.nome ?? ref.id,
            pasta: '',
            etiquetas: [],
            conteudo: r.bytes,
            digest: ref.digest,
            miniatura: foto.miniatura,
            min: foto.min,
            max: foto.max,
            triangulos: foto.triangulos,
          },
        ])
      modelos.set(ref.id, modelo)
      criadas.set(ref.biblioteca, b.id)
      ref.biblioteca = b.id
      ref.modelo = modelo.id
    }
  } finally {
    await M.encerrarFotografo()
  }
  for (const ref of dados.texturas ?? []) {
    const r = recursos.find((r) => r.tipo === 'textura' && r.digest === ref.digest),
      dimensoes = C.conferirImagemDeCenario(r.bytes, 'image/png'),
      b = bibliotecas.get(ref.biblioteca),
      [t] = await host.importarTexturas(b.id, [
        {
          nome: 'Padrão do ensaio',
          pasta: '',
          etiquetas: [],
          digest: ref.digest,
          largura: dimensoes.largura,
          altura: dimensoes.altura,
          repeticaoMetros: 2,
          conteudo: new Blob([r.bytes], { type: 'image/png' }),
        },
      ])
    texturas.set(ref.id, t)
    criadas.set(ref.biblioteca, b.id)
    ref.biblioteca = b.id
    ref.textura = t.id
  }
  for (const d of dados.definicoesConjuntos ?? []) {
    d.biblioteca = bibliotecas.get(d.biblioteca).id
    d.conteudo.origem.espaco = espaco
  }
  const mundo = await host.criarMundo(espaco, 'Mundo de exportação'),
    cenario = await host.criarCenario(mundo.id, 'Praça, lago e caminhos')
  await host.editarMundo(mundo.id, {
    bibliotecas: [...bibliotecas.values()].map((b) => b.id),
  })
  dados.id = cenario.id
  dados.nome = cenario.nome
  const terrenos = recursos
      .filter((r) => r.tipo === 'terreno')
      .map((r) => ({ digest: r.digest, conteudo: r.bytes })),
    guardados = await host.guardarRecursos(cenario.id, terrenos)
  await host.editarCenario(
    cenario.id,
    0,
    [{ tipo: 'cenario.restaurar', documento: dados }],
    'ensaio-exportar',
    guardados,
  )
  window.__qaCena = {
    mundo: mundo.id,
    cenario: cenario.id,
    documento: JSON.stringify((await host.abrirCenario(cenario.id)).documento),
    preparar: host.prepararExportacao.bind(host),
  }
  return { mundo: mundo.id, cenario: cenario.id, nome: cenario.nome }
}
