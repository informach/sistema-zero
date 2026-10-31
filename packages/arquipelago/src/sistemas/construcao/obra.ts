import type { Abertura, Obra, PisoDaCasa, TipoDeAbertura } from '@sistemazero/arquipelago-contracts'
import { ocupadasDentro, PISO_PADRAO, type Planta, planta } from './comodos'
import {
  celulasDoRetangulo,
  type Entrada,
  entradaDaObra,
  ladoDeFora,
  loteDaObra,
  mesmaEntrada,
  NOME_DA_VARANDA,
  retanguloDaVaranda,
  VARANDA,
} from './entrada'
import {
  type Aresta,
  aberturaNaAresta,
  adiante,
  arestaDaChave,
  arestasDaAbertura,
  arestasDoArrasto,
  chaveDaAresta,
  chavesDosTrechos,
  LARGURA_DA_ABERTURA,
  ladosDaAresta,
  type Ponto,
  pontasDaAresta,
  trechosDasChaves,
} from './grade'
import { type Celula, chaveDaCelula, type Lote, naArea, noFixo, ocupante } from './lote'
import {
  celulasDoMovel,
  ehDeParede,
  lerMovel,
  moveisDaObra,
  movelNoLugar,
  pecasNaAresta,
} from './moveis'
import { celulasDoObjeto, LUGAR_DO_OBJETO, objetoEm } from './projeto-azul'

/**
 * As mudanças que a criança faz na obra no modo Construir. Cada uma devolve a obra nova ou o
 * motivo de não dar (o Zappy explica). Nada aqui muda a obra recebida.
 */
export type Recusa =
  | { motivo: 'fora-do-lote' }
  | { motivo: 'ocupado'; nome: string }
  | { motivo: 'dentro-do-quarto' }
  | { motivo: 'fecha-ocupado'; nome: string }
  | { motivo: 'parede-do-quarto' }
  | { motivo: 'sem-parede' }
  | { motivo: 'quadro-do-quarto'; abertura: 'porta' | 'janela' }
  | { motivo: 'encontro-de-paredes' }
  | { motivo: 'ja-tem-abertura' }
  | { motivo: 'fora-de-comodo' }
  | { motivo: 'no-quarto' }
  | { motivo: 'limite' }
  | { motivo: 'dentro-de-casa' }
  | { motivo: 'tem-parede' }
  | { motivo: 'tem-caminho' }
  | { motivo: 'canteiro-com-planta' }
  | { motivo: 'sem-projeto' }
  | { motivo: 'tem-objeto' }
  | { motivo: 'objeto-fora-de-comodo' }
  | { motivo: 'objeto-no-quarto' }
  | { motivo: 'tem-movel' }
  | { motivo: 'movel-fora-de-comodo' }
  | { motivo: 'movel-no-quarto' }
  | { motivo: 'sem-parede-atras' }
  | { motivo: 'movel-na-parede' }
  | { motivo: 'entrada-fora' }
  | { motivo: 'varanda-nao-cabe' }
  | { motivo: 'entrada' }
  | { motivo: 'nada' }

/** O que deu certo e merece uma palavra do Zappy (`falaDoAviso`). */
export type Aviso = 'janela-virou-porta'

export type Resultado = { ok: true; obra: Obra; aviso?: Aviso } | ({ ok: false } & Recusa)

const recusa = (r: Recusa): Resultado => ({ ok: false, ...r })

/** A aresta pode virar parede? (dentro do lote, sem encostar no que está ocupado nem no quarto) */
export function arestaLivre(lote: Lote, a: Aresta): Recusa | null {
  const { x0, z0, x1, z1 } = lote.area
  const [p, q] = pontasDaAresta(a)
  const dentroDoLote = (pt: Ponto) => pt.x >= x0 && pt.x <= x1 && pt.z >= z0 && pt.z <= z1
  if (!dentroDoLote(p) || !dentroDoLote(q)) return { motivo: 'fora-do-lote' }
  const [menos, mais] = ladosDaAresta(a)
  for (const c of [menos, mais]) {
    const nome = naArea(lote.area, c) ? ocupante(lote, c) : null
    if (nome) return { motivo: 'ocupado', nome }
  }
  if (noFixo(lote, menos) && noFixo(lote, mais)) return { motivo: 'dentro-do-quarto' }
  return null
}

function conferirFechamento(obra: Obra, lote: Lote): Recusa | null {
  const p = planta(obra, lote)
  const nomes = ocupadasDentro(p, lote)
  if (obra.canteiros.some((c) => p.dentro.has(chaveDaCelula(c))))
    return { motivo: 'fecha-ocupado', nome: 'o canteiro' }
  return nomes[0] ? { motivo: 'fecha-ocupado', nome: nomes[0] } : null
}

/** Esticar a parede de `a` até `b`. A parede que já existe no caminho continua igual. */
export function esticarParede(obra: Obra, loteDoLugar: Lote, a: Ponto, b: Ponto): Resultado {
  const arestas = arestasDoArrasto(a, b)
  if (arestas.length === 0) return recusa({ motivo: 'nada' })
  // A varanda da entrada ocupa o lugar (ela segue a porta de entrada da obra).
  const lote = loteDaObra(loteDoLugar, obra)
  // As do quarto já estão de pé (o fundo e a esquerda nem precisam estar na obra salva).
  const travadas = chavesDosTrechos(lote.paredesTravadas)
  const chaves = chavesDosTrechos(obra.paredes)
  const canteiros = new Set(obra.canteiros.map(chaveDaCelula))
  const moveisDeChao = moveisDaObra(obra)
    .filter((m) => !ehDeParede(m.id))
    .map((m) => new Set(celulasDoMovel(m).map(chaveDaCelula)))
  const antes = chaves.size
  for (const aresta of arestas) {
    const k = chaveDaAresta(aresta)
    if (chaves.has(k) || travadas.has(k)) continue
    const r = arestaLivre(lote, aresta)
    if (r) return recusa(r)
    if (ladosDaAresta(aresta).some((c) => canteiros.has(chaveDaCelula(c))))
      return recusa({ motivo: 'ocupado', nome: 'o canteiro' })
    // A parede não corta um objeto ao meio (encostar nele pode: a geladeira fica na parede).
    const [l1, l2] = ladosDaAresta(aresta)
    const o1 = objetoEm(obra, l1)
    if (o1 >= 0 && o1 === objetoEm(obra, l2)) return recusa({ motivo: 'tem-objeto' })
    // Nem um móvel de chão (o sofá de três células fica inteiro).
    if (moveisDeChao.some((cs) => cs.has(chaveDaCelula(l1)) && cs.has(chaveDaCelula(l2))))
      return recusa({ motivo: 'tem-movel' })
    chaves.add(k)
  }
  if (chaves.size === antes) return recusa({ motivo: 'nada' })
  if (chaves.size > lote.limites.arestasDeParede) return recusa({ motivo: 'limite' })
  const paredes = trechosDasChaves(chaves)
  if (paredes.length > lote.limites.trechosDeParede) return recusa({ motivo: 'limite' })
  const nova: Obra = { ...obra, paredes }
  const r = conferirFechamento(nova, lote)
  if (r) return recusa(r)
  // A porta de entrada continua a mesma (a varanda ocupada já garante; isto só confere).
  if (lote.varanda && !mesmaEntrada(entradaDaObra(obra, lote), entradaDaObra(nova, lote)))
    return recusa({ motivo: 'fecha-ocupado', nome: NOME_DA_VARANDA })
  return { ok: true, obra: arrumar(nova, lote) }
}

/**
 * Apagar arrastando: as paredes no caminho somem (as do quarto ficam), e as portas e janelas
 * delas também. Uma parede só (sem arrastar) é o caminho de uma aresta. A porta de entrada não sai
 * nem deixa de ser a entrada (31/10/2026): apagar a parede dela, ou abrir o cômodo dela para fora,
 * é recusado (ela muda de lugar com a Porta).
 */
export function apagarParede(obra: Obra, lote: Lote, arestas: readonly Aresta[]): Resultado {
  const travadas = chavesDosTrechos(lote.paredesTravadas)
  const chaves = chavesDosTrechos(obra.paredes)
  let tirou = 0
  let doQuarto = 0
  for (const a of arestas) {
    const k = chaveDaAresta(a)
    if (travadas.has(k)) {
      doQuarto++
      continue
    }
    if (!chaves.has(k)) continue
    chaves.delete(k)
    tirou++
  }
  if (tirou === 0) return recusa({ motivo: doQuarto > 0 ? 'parede-do-quarto' : 'nada' })
  // A porta e a janela das paredes do quarto ficam (o fundo e a esquerda não estão na obra salva).
  const aberturas = obra.aberturas.filter((ab) =>
    arestasDaAbertura(ab).every(
      (a) => chaves.has(chaveDaAresta(a)) || travadas.has(chaveDaAresta(a)),
    ),
  )
  const nova = arrumar({ ...obra, paredes: trechosDasChaves(chaves), aberturas }, lote)
  if (lote.varanda) {
    const antes = entradaDaObra(obra, lote)
    if (antes && !mesmaEntrada(antes, entradaDaObra(nova, lote)))
      return recusa({ motivo: 'entrada' })
  }
  return { ok: true, obra: nova }
}

/** A abertura (porta ou janela) que passa por esta aresta, se houver. */
export function aberturaEm(obra: Obra, a: Aresta): number {
  const k = chaveDaAresta(a)
  return obra.aberturas.findIndex((ab) => arestasDaAbertura(ab).some((x) => chaveDaAresta(x) === k))
}

/**
 * Pôr uma porta ou janela com o meio na aresta tocada. Ela precisa caber inteira numa parede do
 * kit (as quatro do quarto inclusive), sem parede chegando no meio dela (a porta não abre numa
 * emenda em T), sem peça pendurada no caminho (nem um quadro do Meu quarto) e sem outra abertura no
 * caminho. A porta em cima de uma janela troca a janela (31/10/2026, pedido dela).
 */
export function porAbertura(obra: Obra, lote: Lote, tipo: TipoDeAbertura, a: Aresta): Resultado {
  const nova = aberturaNaAresta(tipo, a)
  const p = planta(obra, lote)
  const arestas = arestasDaAbertura(nova)
  const vao = conferirVao(obra, lote, p, nova)
  if (vao) return recusa(vao)
  const minhas = new Set(arestas.map(chaveDaAresta))
  const iguais = (x: typeof nova) =>
    x.tipo === nova.tipo && x.eixo === nova.eixo && x.x === nova.x && x.z === nova.z
  if (obra.aberturas.some(iguais)) return recusa({ motivo: 'nada' })
  const noCaminho = obra.aberturas.filter((ab) =>
    arestasDaAbertura(ab).some((x) => minhas.has(chaveDaAresta(x))),
  )
  let r: Resultado
  if (noCaminho.length > 0) {
    // Só a porta troca, e só janela: porta em cima de porta e janela em cima de qualquer uma, não.
    if (tipo !== 'porta' || noCaminho.some((ab) => ab.tipo === 'porta'))
      return recusa({ motivo: 'ja-tem-abertura' })
    const outras = obra.aberturas.filter((ab) => !noCaminho.includes(ab))
    r = { ok: true, obra: { ...obra, aberturas: [...outras, nova] }, aviso: 'janela-virou-porta' }
  } else {
    if (obra.aberturas.length >= lote.limites.aberturas) return recusa({ motivo: 'limite' })
    r = { ok: true, obra: { ...obra, aberturas: [...obra.aberturas, nova] } }
  }
  // Numa obra sem porta de entrada (uma salva antes, sem porta para fora), a primeira porta de fora
  // vira a entrada: a varanda dela precisa caber.
  if (r.ok && tipo === 'porta' && lote.varanda && !entradaDaObra(obra, lote, p)) {
    const e = entradaDaObra(r.obra, lote, p)
    const cabe = e ? varandaCabe(r.obra, lote, p, e) : null
    if (cabe) return recusa(cabe)
  }
  return r
}

/**
 * A porta ou a janela cabe neste vão? Inteira numa parede do kit (as quatro do quarto inclusive),
 * sem parede chegando no meio dela (a porta não abre numa emenda em T), sem peça pendurada no
 * caminho e sem quadro do Meu quarto. Não olha as outras aberturas.
 */
function conferirVao(obra: Obra, lote: Lote, p: Planta, nova: Abertura): Recusa | null {
  const arestas = arestasDaAbertura(nova)
  for (const x of arestas) if (!p.paredes.has(chaveDaAresta(x))) return { motivo: 'sem-parede' }
  // Os pontos de dentro da abertura (entre a primeira e a última aresta) não podem ter parede
  // chegando de lado.
  for (let i = 1; i < arestas.length; i++) {
    const meio = pontasDaAresta(arestas[i] as Aresta)[0]
    const lado: Aresta[] =
      nova.eixo === 'x'
        ? [
            { eixo: 'z', x: meio.x, z: meio.z },
            { eixo: 'z', x: meio.x, z: meio.z - 1 },
          ]
        : [
            { eixo: 'x', x: meio.x, z: meio.z },
            { eixo: 'x', x: meio.x - 1, z: meio.z },
          ]
    if (lado.some((l) => p.paredes.has(chaveDaAresta(l)))) return { motivo: 'encontro-de-paredes' }
  }
  // A porta não abre no quadro: a peça de parede sai primeiro (de qualquer lado da parede).
  if (arestas.some((x) => pecasNaAresta(obra, x).length > 0)) return { motivo: 'movel-na-parede' }
  // O quadro e a prateleira do Meu quarto ficam onde a criança pôs: a abertura vai do lado.
  const pendurados = lote.penduradosDoQuarto
  if (pendurados && arestas.some((x) => pendurados.has(chaveDaAresta(x))))
    return { motivo: 'quadro-do-quarto', abertura: nova.tipo === 'porta' ? 'porta' : 'janela' }
  return null
}

/**
 * A varanda de uma entrada cabe na obra? Ela encosta na parede em toda a largura (as 5 arestas da
 * linha da porta são parede: a porta e uma de cada lado, onde fica o lampião; assim ela não dobra
 * uma quina). As 5 × 2 células do lado de fora ficam no lote, fora de casa e do que ocupa o lote (o
 * farol), sem canteiro, caminho nem objeto, e nenhuma outra parede nem cerca encosta nelas.
 */
export function varandaCabe(
  obra: Obra,
  lote: Lote,
  p: Planta,
  e: Pick<Entrada, 'abertura' | 'fora'>,
): Recusa | null {
  const nao: Recusa = { motivo: 'varanda-nao-cabe' }
  // A varanda de agora não conta (ela sai de onde está).
  const ocupadas = lote.ocupadas.filter((o) => o.nome !== NOME_DA_VARANDA)
  const ocupada = (c: Celula) => ocupadas.some((o) => naArea(o.ret, c))
  const celulas = celulasDoRetangulo(retanguloDaVaranda(e))
  const canteiros = new Set(obra.canteiros.map(chaveDaCelula))
  const caminhos = new Set(obra.caminhos.map(chaveDaCelula))
  const cercas = chavesDosTrechos(obra.cercas)
  // A linha da porta: as arestas no mesmo eixo e na mesma linha dela.
  const naLinhaDaPorta = (x: Aresta) =>
    x.eixo === e.abertura.eixo && (x.eixo === 'x' ? x.z === e.abertura.z : x.x === e.abertura.x)
  const recuo = (VARANDA.largura - LARGURA_DA_ABERTURA.porta) / 2
  const encosto = Array.from({ length: VARANDA.largura }, (_, i) =>
    adiante({ eixo: e.abertura.eixo, x: e.abertura.x, z: e.abertura.z }, i - recuo),
  )
  if (!encosto.every((x) => p.paredes.has(chaveDaAresta(x)))) return nao
  for (const c of celulas) {
    const k = chaveDaCelula(c)
    if (!naArea(lote.area, c) || ocupada(c) || noFixo(lote, c) || p.dentro.has(k)) return nao
    if (canteiros.has(k) || caminhos.has(k) || objetoEm(obra, c) >= 0) return nao
    const lados: Aresta[] = [
      { eixo: 'x', x: c.x, z: c.z },
      { eixo: 'x', x: c.x, z: c.z + 1 },
      { eixo: 'z', x: c.x, z: c.z },
      { eixo: 'z', x: c.x + 1, z: c.z },
    ]
    for (const x of lados) {
      const kx = chaveDaAresta(x)
      if (cercas.has(kx)) return nao
      if (p.paredes.has(kx) && !naLinhaDaPorta(x)) return nao
    }
  }
  return null
}

/**
 * Mudar a porta de entrada de lugar (31/10/2026, pedido dela): a porta e a varanda vão para a
 * parede tocada, e a parede de antes fica inteira, sem porta. A parede nova precisa dar para fora
 * (um lado dentro de casa, o outro fora), aceitar uma porta (as recusas de sempre) e ter lugar para
 * a varanda do lado de fora. A porta nova entra como a primeira de `obra.aberturas` (a entrada é a
 * primeira porta de fora); uma janela no caminho vira porta e uma porta de fora no mesmo lugar vira
 * a entrada.
 */
export function moverEntrada(obra: Obra, lote: Lote, a: Aresta): Resultado {
  const p = planta(obra, lote)
  const atual = entradaDaObra(obra, lote, p)
  if (!atual) return recusa({ motivo: 'nada' })
  const nova = aberturaNaAresta('porta', a)
  const iguais = (x: Abertura) => x.eixo === nova.eixo && x.x === nova.x && x.z === nova.z
  if (iguais(atual.abertura)) return recusa({ motivo: 'nada' })
  const vao = conferirVao(obra, lote, p, nova)
  if (vao) return recusa(vao)
  const fora = ladoDeFora(nova, p)
  if (fora === null) return recusa({ motivo: 'entrada-fora' })
  const minhas = new Set(arestasDaAbertura(nova).map(chaveDaAresta))
  const outras = obra.aberturas.filter((_, i) => i !== atual.indice)
  const noCaminho = outras.filter((ab) =>
    arestasDaAbertura(ab).some((x) => minhas.has(chaveDaAresta(x))),
  )
  // Uma porta no caminho só se for exatamente ali (ela vira a entrada); janela vira porta.
  if (noCaminho.some((ab) => ab.tipo === 'porta' && !iguais(ab)))
    return recusa({ motivo: 'ja-tem-abertura' })
  const resto = outras.filter((ab) => !noCaminho.includes(ab))
  const movida: Obra = { ...obra, aberturas: [nova, ...resto] }
  const cabe = varandaCabe(movida, lote, p, { abertura: nova, fora })
  if (cabe) return recusa(cabe)
  return noCaminho.some((ab) => ab.tipo !== 'porta')
    ? { ok: true, obra: movida, aviso: 'janela-virou-porta' }
    : { ok: true, obra: movida }
}

/**
 * Tirar a porta ou janela que passa pela aresta (a parede fica). Com o lote, a porta de entrada não
 * sai (ela muda de lugar com a Porta); as outras portas de fora são portas comuns.
 */
export function tirarAbertura(obra: Obra, a: Aresta, lote?: Lote): Resultado {
  const i = aberturaEm(obra, a)
  if (i < 0) return recusa({ motivo: 'nada' })
  if (lote?.varanda && entradaDaObra(obra, lote)?.indice === i) return recusa({ motivo: 'entrada' })
  return { ok: true, obra: { ...obra, aberturas: obra.aberturas.filter((_, j) => j !== i) } }
}

/** Trocar o piso do cômodo inteiro onde está a célula (o quarto tem o piso da plataforma). */
export function trocarPiso(obra: Obra, lote: Lote, c: Celula, tipo: PisoDaCasa): Resultado {
  const p = planta(obra, lote)
  const i = p.comodoDe.get(chaveDaCelula(c))
  const comodo = i === undefined ? undefined : p.comodos[i]
  if (i === undefined || !comodo) return recusa({ motivo: 'fora-de-comodo' })
  if (comodo.quarto) return recusa({ motivo: 'no-quarto' })
  if (comodo.piso === tipo) return recusa({ motivo: 'nada' })
  const outros = obra.pisos.filter((x) => p.comodoDe.get(chaveDaCelula(x)) !== i)
  // A tábua é o piso de quem não tem registro: voltar para ela tira o registro.
  if (tipo === PISO_PADRAO) return { ok: true, obra: { ...obra, pisos: outros } }
  if (outros.length >= lote.limites.pisos) return recusa({ motivo: 'limite' })
  return { ok: true, obra: { ...obra, pisos: [...outros, { x: c.x, z: c.z, tipo }] } }
}

/**
 * Deixa a obra arrumada depois de mexer nas paredes: um piso por cômodo (os de cômodo que deixou de
 * existir saem), as portas e janelas só onde ainda há parede, e o quintal fora de casa (caminho que
 * ficou dentro de um cômodo sai; cerca debaixo de parede ou dentro de casa também).
 */
export function arrumar(obra: Obra, lote: Lote, p: Planta = planta(obra, lote)): Obra {
  const vistos = new Set<number>()
  const pisos = obra.pisos.filter((x) => {
    const i = p.comodoDe.get(chaveDaCelula(x))
    if (i === undefined || vistos.has(i) || p.comodos[i]?.quarto) return false
    vistos.add(i)
    return true
  })
  const aberturas = obra.aberturas.filter((ab) =>
    arestasDaAbertura(ab).every((a) => p.paredes.has(chaveDaAresta(a))),
  )
  const caminhos = obra.caminhos.filter((c) => !p.dentro.has(chaveDaCelula(c)))
  // O objeto que perdeu o lugar dele (o cômodo abriu, ou a casa chegou no quintal) volta a ficar
  // guardado: sai da obra, com a função e o que tem dentro.
  const objetos = obra.objetos.filter((o) => {
    const comodos = new Set(celulasDoObjeto(o).map((c) => p.comodoDe.get(chaveDaCelula(c))))
    if (LUGAR_DO_OBJETO[o.id] === 'dentro') return comodos.size === 1 && !comodos.has(undefined)
    return comodos.size === 1 && comodos.has(undefined)
  })
  // O móvel que perdeu o lugar (o cômodo abriu, a parede de trás saiu) sai da obra; o catálogo é
  // livre, então ele não fica guardado: dá para pôr de novo.
  const moveis = obra.moveis.filter((t) => {
    const m = lerMovel(t)
    return m !== null && movelNoLugar(m, obra, p)
  })
  const cercasAntes = chavesDosTrechos(obra.cercas)
  const cercas = [...cercasAntes].filter((k) => {
    if (p.paredes.has(k)) return false
    return !ladosDaAresta(arestaDaChave(k)).every((c) => p.dentro.has(chaveDaCelula(c)))
  })
  return {
    ...obra,
    pisos,
    aberturas,
    caminhos: caminhos.length === obra.caminhos.length ? obra.caminhos : caminhos,
    objetos: objetos.length === obra.objetos.length ? obra.objetos : objetos,
    moveis: moveis.length === obra.moveis.length ? obra.moveis : moveis,
    cercas: cercas.length === cercasAntes.size ? obra.cercas : trechosDasChaves(cercas),
  }
}
