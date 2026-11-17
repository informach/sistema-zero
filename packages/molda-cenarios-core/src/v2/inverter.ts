import { type ComandoDeCenario, igual } from './comandos'
import { type DocumentoDeCenario, type GrupoDeCenario, LIMITES_CENARIO_V2 } from './documento'
import { type EntidadeOrganizavel, entidadesDoCenario, referenciaDeModelo } from './organizacao'

type Travavel = { id: string; bloqueado: boolean; grupo: string | null; camada?: string | null }
const ENTIDADES = [
  ['instancias', 'instancia'],
  ['caminhos', 'caminho'],
  ['aguas', 'agua'],
  ['marcadores', 'marcador'],
] as const

function definir(tipo: (typeof ENTIDADES)[number][1], valor: Travavel): ComandoDeCenario {
  return { tipo: `${tipo}.definir`, [tipo]: valor } as unknown as ComandoDeCenario
}
function remover(tipo: (typeof ENTIDADES)[number][1] | 'grupo', id: string): ComandoDeCenario {
  return { tipo: `${tipo}.remover`, id } as ComandoDeCenario
}
function profundidade(grupos: ReadonlyMap<string, GrupoDeCenario>, id: string): number {
  let n = 0,
    pai = grupos.get(id)?.grupo ?? null
  while (pai && n < 64) {
    n++
    pai = grupos.get(pai)?.grupo ?? null
  }
  return n
}

/**
 * Comandos que levam `depois` de volta a `antes`. É a base do desfazer: funciona para a
 * edição pela mão e pelos agentes, e não depende de como a mudança foi feita.
 *
 * Os cadeados são respeitados sem atalho: o que está trancado é destrancado, devolvido ao
 * estado anterior e trancado de novo, sempre pelos mesmos comandos que qualquer um usaria.
 * A ordem das listas não é restaurada; ela não tem significado no documento.
 */
export function inverterLote(
  antes: DocumentoDeCenario,
  depois: DocumentoDeCenario,
): ComandoDeCenario[] {
  const comandos: ComandoDeCenario[] = [],
    gruposAntes = new Map(antes.grupos.map((g) => [g.id, g])),
    gruposDepois = new Map(depois.grupos.map((g) => [g.id, g]))

  // 1. O que muda, por lista.
  const mudancas = ENTIDADES.map(([lista, tipo]) => {
    const a = new Map((antes[lista] as Travavel[]).map((e) => [e.id, e])),
      d = new Map((depois[lista] as Travavel[]).map((e) => [e.id, e]))
    return {
      tipo,
      restaurar: [...a.values()].filter((e) => !igual(e, d.get(e.id))),
      apagar: [...d.values()].filter((e) => !a.has(e.id)),
      atual: d,
    }
  })
  const gruposARestaurar = antes.grupos.filter((g) => !igual(g, gruposDepois.get(g.id))),
    gruposAApagar = depois.grupos.filter((g) => !gruposAntes.has(g.id))

  // 2. Grupos que ficam no caminho de alguma mudança, antes ou depois dela.
  const tocados = new Set<string>()
  const subir = (inicio: string | null, grupos: ReadonlyMap<string, GrupoDeCenario>) => {
    let pai = inicio
    while (pai && !tocados.has(`${grupos === gruposAntes ? 'a' : 'd'}:${pai}`)) {
      tocados.add(`${grupos === gruposAntes ? 'a' : 'd'}:${pai}`)
      pai = grupos.get(pai)?.grupo ?? null
    }
  }
  const marcar = (e: Travavel | undefined) => {
    if (!e) return
    subir(e.grupo, gruposAntes)
    subir(e.grupo, gruposDepois)
  }
  const formasDepois = new Map(depois.formas?.map((f) => [f.id, f]))
  const formasARestaurar = (antes.formas ?? []).filter((f) => !igual(f, formasDepois.get(f.id)))
  const modelosDepois = new Map(depois.modelos.map((m) => [m.id, m]))
  const modelosARestaurar = antes.modelos.filter((m) => !igual(m, modelosDepois.get(m.id)))
  const fontesAlteradas = new Set([
    ...formasARestaurar.map((f) => f.id),
    ...modelosARestaurar.map((m) => m.id),
  ])
  const texturasDepois = new Map(depois.texturas?.map((t) => [t.id, t]))
  const texturasARestaurar = (antes.texturas ?? []).filter(
    (t) => !igual(t, texturasDepois.get(t.id)),
  )
  const texturasAlteradas = new Set(texturasARestaurar.map((t) => t.id))
  const definicaoMudou = (o: EntidadeOrganizavel) => {
    const modelo = referenciaDeModelo(o)
    return (
      Boolean(modelo && fontesAlteradas.has(modelo)) ||
      Boolean(
        'aparencia' in o && o.aparencia?.textura && texturasAlteradas.has(o.aparencia.textura.id),
      )
    )
  }
  for (const o of [...entidadesDoCenario(antes), ...entidadesDoCenario(depois)])
    if (definicaoMudou(o)) marcar(o)
  for (const m of mudancas) {
    for (const e of m.restaurar) {
      marcar(e)
      marcar(m.atual.get(e.id))
    }
    for (const e of m.apagar) marcar(e)
  }
  for (const g of [...gruposARestaurar, ...gruposAApagar]) {
    subir(g.id, gruposAntes)
    subir(g.id, gruposDepois)
  }
  const noCaminho = (id: string) => tocados.has(`a:${id}`) || tocados.has(`d:${id}`)

  // Camadas vêm antes dos grupos/entidades que as referenciam. Abre só as necessárias.
  const camadasAntes = new Map(antes.camadas?.map((c) => [c.id, c]) ?? []),
    camadasDepois = new Map(depois.camadas?.map((c) => [c.id, c]) ?? [])
  const camadasARestaurar = (antes.camadas ?? []).filter((c) => !igual(c, camadasDepois.get(c.id)))
  const camadasTocadas = new Set(camadasARestaurar.map((c) => c.id))
  const incluirCamada = (e: Travavel | undefined) => {
    if (e?.camada) camadasTocadas.add(e.camada)
  }
  for (const c of depois.camadas ?? []) if (!camadasAntes.has(c.id)) camadasTocadas.add(c.id)
  for (const m of mudancas) {
    for (const e of m.restaurar) {
      incluirCamada(e)
      incluirCamada(m.atual.get(e.id))
    }
    for (const e of m.apagar) incluirCamada(e)
  }
  for (const g of [...antes.grupos, ...depois.grupos]) if (noCaminho(g.id)) incluirCamada(g)
  for (const o of [...entidadesDoCenario(antes), ...entidadesDoCenario(depois)])
    if (definicaoMudou(o)) incluirCamada(o)
  const camadasAbertas = new Set<string>()
  for (const c of depois.camadas ?? [])
    if (c.bloqueado && camadasTocadas.has(c.id)) {
      comandos.push({ tipo: 'camada.definir', camada: { ...c, bloqueado: false } })
      camadasAbertas.add(c.id)
    }
  for (const c of camadasARestaurar) {
    comandos.push({ tipo: 'camada.definir', camada: { ...c, bloqueado: false } })
    if (c.bloqueado) camadasAbertas.add(c.id)
  }

  // 3. Abre os cadeados de grupo que impediriam a volta.
  const abertos = new Set<string>()
  for (const g of depois.grupos)
    if (g.bloqueado && noCaminho(g.id)) {
      comandos.push({ tipo: 'grupo.definir', grupo: { ...g, bloqueado: false } })
      abertos.add(g.id)
    }

  // 4. Devolve os grupos, dos pais para os filhos, ainda destrancados.
  const porProfundidade = (a: GrupoDeCenario, b: GrupoDeCenario) =>
    profundidade(gruposAntes, a.id) - profundidade(gruposAntes, b.id)
  for (const g of [...gruposARestaurar].sort(porProfundidade)) {
    comandos.push({ tipo: 'grupo.definir', grupo: { ...g, bloqueado: false } })
    if (g.bloqueado) abertos.add(g.id)
  }

  // 5. Devolve os modelos antes de quem os usa.
  const destrancadosPorDefinicao = new Set<string>()
  for (const [lista, tipo] of ENTIDADES)
    for (const o of depois[lista])
      if (o.bloqueado && definicaoMudou(o)) {
        comandos.push(definir(tipo, { ...o, bloqueado: false }))
        destrancadosPorDefinicao.add(o.id)
      }
  for (const m of modelosARestaurar) comandos.push({ tipo: 'modelo.definir', modelo: m })
  for (const f of formasARestaurar) comandos.push({ tipo: 'forma.definir', forma: f })
  for (const t of texturasARestaurar) comandos.push({ tipo: 'textura.definir', textura: t })

  // 6. Devolve e apaga as entidades.
  for (const m of mudancas) {
    for (const e of m.restaurar) {
      const atual = m.atual.get(e.id)
      if (atual?.bloqueado) comandos.push(definir(m.tipo, { ...atual, bloqueado: false }))
      const livre = { ...e, bloqueado: false }
      if (!igual(livre, atual && { ...atual, bloqueado: false }))
        comandos.push(definir(m.tipo, livre))
      if (e.bloqueado) comandos.push(definir(m.tipo, e))
    }
    for (const e of m.apagar) {
      if (e.bloqueado) comandos.push(definir(m.tipo, { ...e, bloqueado: false }))
      comandos.push(remover(m.tipo, e.id))
    }
  }

  // 7. Apaga os grupos novos, dos filhos para os pais, e os modelos que sobraram.
  for (const g of [...gruposAApagar].sort(
    (a, b) => profundidade(gruposDepois, b.id) - profundidade(gruposDepois, a.id),
  ))
    comandos.push(remover('grupo', g.id))
  for (const c of depois.camadas ?? [])
    if (!camadasAntes.has(c.id)) comandos.push({ tipo: 'camada.remover', id: c.id })
  const modelosAntes = new Set(antes.modelos.map((m) => m.id))
  for (const m of depois.modelos)
    if (!modelosAntes.has(m.id)) comandos.push({ tipo: 'modelo.remover', id: m.id })
  const formasAntes = new Set(antes.formas?.map((f) => f.id))
  for (const f of depois.formas ?? [])
    if (!formasAntes.has(f.id)) comandos.push({ tipo: 'forma.remover', id: f.id })
  const texturasAntes = new Set(antes.texturas?.map((t) => t.id))
  for (const t of depois.texturas ?? [])
    if (!texturasAntes.has(t.id)) comandos.push({ tipo: 'textura.remover', id: t.id })

  const entidadesRestauradas = new Set(mudancas.flatMap((m) => m.restaurar.map((o) => o.id)))
  for (const [lista, tipo] of ENTIDADES)
    for (const o of antes[lista])
      if (o.bloqueado && destrancadosPorDefinicao.has(o.id) && !entidadesRestauradas.has(o.id))
        comandos.push(definir(tipo, o))

  // 8. Fecha de novo os cadeados de grupo, dos filhos para os pais.
  for (const g of antes.grupos
    .filter((g) => g.bloqueado && abertos.has(g.id))
    .sort((a, b) => porProfundidade(b, a)))
    comandos.push({ tipo: 'grupo.definir', grupo: g })
  for (const c of antes.camadas ?? [])
    if (c.bloqueado && camadasAbertas.has(c.id))
      comandos.push({ tipo: 'camada.definir', camada: c })

  // 9. O que é do cenário inteiro.
  if (!igual(antes.base, depois.base)) comandos.push({ tipo: 'base.definir', base: antes.base })
  if (!igual(antes.iluminacao, depois.iluminacao))
    comandos.push({ tipo: 'iluminacao.definir', iluminacao: antes.iluminacao })
  if (antes.nome !== depois.nome) comandos.push({ tipo: 'cenario.renomear', nome: antes.nome })
  // Restaurar uma versão grande continua sendo uma ação atômica, sem exceder o teto de
  // comandos nem criar dezenas de revisões artificiais para um único desfazer.
  return comandos.length > LIMITES_CENARIO_V2.comandos
    ? [{ tipo: 'cenario.restaurar', documento: structuredClone(antes) }]
    : comandos
}
