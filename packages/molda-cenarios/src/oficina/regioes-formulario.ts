import { LIMITES_DA_EXPORTACAO } from '@sistemazero/molda-cenarios-core/compilar'
import {
  type CaixaDeRegiao,
  comandosParaDefinirRegiao,
  type DocumentoDeCenario,
  encaixarCaixa,
  errosDasRegioes,
  LIMITES_REGIOES,
  type RegiaoDeCenario,
  retanguloDaBase,
  vizinhasSugeridas,
} from '@sistemazero/molda-cenarios-core/v2'

/**
 * O formulário da ferramenta Regiões da aba Jogo (lote 7 da conclusão, 22/11/2026). Puro: o hook
 * `useRegioes` e o agente usam as mesmas funções. Uma região é um retângulo no chão com nome e
 * vizinhas; o lote que a grava mantém as vizinhas em par (`comandosParaDefinirRegiao` do núcleo).
 */

/** O menor lado de uma região nova (m): dois cliques no mesmo lugar ainda dão uma área visível. */
export const MENOR_LADO_DE_REGIAO = 4

type PontoNoChao = { x: number; z: number }

const arredondar = (v: number) => Math.round(v * 100) / 100

/** A caixa entre dois cliques, com o menor lado garantido e presa dentro da base. */
export function caixaDeDoisPontos(
  doc: Pick<DocumentoDeCenario, 'base'>,
  a: PontoNoChao,
  b: PontoNoChao,
): CaixaDeRegiao {
  let x0 = Math.min(a.x, b.x),
    x1 = Math.max(a.x, b.x),
    z0 = Math.min(a.z, b.z),
    z1 = Math.max(a.z, b.z)
  if (x1 - x0 < MENOR_LADO_DE_REGIAO) {
    const meio = (x0 + x1) / 2
    x0 = meio - MENOR_LADO_DE_REGIAO / 2
    x1 = meio + MENOR_LADO_DE_REGIAO / 2
  }
  if (z1 - z0 < MENOR_LADO_DE_REGIAO) {
    const meio = (z0 + z1) / 2
    z0 = meio - MENOR_LADO_DE_REGIAO / 2
    z1 = meio + MENOR_LADO_DE_REGIAO / 2
  }
  return prenderNaBase(doc, { x0, z0, x1, z1 })
}

/** A caixa cortada pelo retângulo da base (o terreno ou o plano), com centímetros redondos. */
export function prenderNaBase(
  doc: Pick<DocumentoDeCenario, 'base'>,
  caixa: CaixaDeRegiao,
): CaixaDeRegiao {
  const limite = retanguloDaBase(doc.base)
  const c = limite
    ? {
        x0: Math.max(limite.x0, Math.min(caixa.x0, limite.x1)),
        z0: Math.max(limite.z0, Math.min(caixa.z0, limite.z1)),
        x1: Math.min(limite.x1, Math.max(caixa.x1, limite.x0)),
        z1: Math.min(limite.z1, Math.max(caixa.z1, limite.z0)),
      }
    : caixa
  return { x0: arredondar(c.x0), z0: arredondar(c.z0), x1: arredondar(c.x1), z1: arredondar(c.z1) }
}

/** "Região 1", "Região 2"…: o primeiro nome que o cenário ainda não usa. */
export function nomeLivreDeRegiao(regioes: readonly RegiaoDeCenario[] | undefined): string {
  const usados = new Set((regioes ?? []).map((r) => r.nome.trim().toLocaleLowerCase('pt-BR')))
  for (let n = 1; ; n++) {
    const nome = `Região ${n}`
    if (!usados.has(nome.toLocaleLowerCase('pt-BR'))) return nome
  }
}

/**
 * Uma região nova a partir de dois cliques no chão: nome livre e, como vizinhas, as regiões que
 * encostam nela (até 8). A criança confere e muda antes de guardar.
 */
export function novaRegiao(
  doc: Pick<DocumentoDeCenario, 'base' | 'regioes'>,
  id: string,
  a: PontoNoChao,
  b: PontoNoChao,
): RegiaoDeCenario {
  const caixa = caixaDeDoisPontos(doc, a, b)
  return {
    id,
    nome: nomeLivreDeRegiao(doc.regioes),
    caixa,
    vizinhas: vizinhasSugeridas(doc.regioes, caixa, id)
      .slice(0, LIMITES_REGIOES.vizinhas)
      .map((r) => r.id),
  }
}

/** A largura (x) e o comprimento (z) em metros; o canto de menor x e z fica onde está. */
export function medidasDaRegiao(r: RegiaoDeCenario): { largura: number; comprimento: number } {
  return {
    largura: arredondar(r.caixa.x1 - r.caixa.x0),
    comprimento: arredondar(r.caixa.z1 - r.caixa.z0),
  }
}

export function regiaoComMedidas(
  doc: Pick<DocumentoDeCenario, 'base'>,
  r: RegiaoDeCenario,
  largura: number,
  comprimento: number,
): RegiaoDeCenario {
  const l = Math.max(MENOR_LADO_DE_REGIAO, Number.isFinite(largura) ? largura : 0),
    c = Math.max(MENOR_LADO_DE_REGIAO, Number.isFinite(comprimento) ? comprimento : 0)
  return {
    ...r,
    caixa: prenderNaBase(doc, {
      x0: r.caixa.x0,
      z0: r.caixa.z0,
      x1: r.caixa.x0 + l,
      z1: r.caixa.z0 + c,
    }),
  }
}

/** Os quatro cantos no chão, nesta ordem: (x0, z0), (x1, z0), (x1, z1), (x0, z1). */
export function cantosDaRegiao(caixa: CaixaDeRegiao): PontoNoChao[] {
  return [
    { x: caixa.x0, z: caixa.z0 },
    { x: caixa.x1, z: caixa.z0 },
    { x: caixa.x1, z: caixa.z1 },
    { x: caixa.x0, z: caixa.z1 },
  ]
}

/**
 * A caixa depois de arrastar um canto: o canto `selecionado` leva as duas bordas que ele toca, e a
 * caixa continua alinhada aos eixos. Sem canto escolhido, a caixa que envolve os quatro pontos.
 */
export function caixaPelosCantos(
  doc: Pick<DocumentoDeCenario, 'base'>,
  antes: CaixaDeRegiao,
  cantos: readonly PontoNoChao[],
  selecionado: number | null,
): CaixaDeRegiao {
  const c = { ...antes }
  const p = selecionado === null ? undefined : cantos[selecionado]
  if (p && selecionado !== null) {
    if (selecionado === 0 || selecionado === 3) c.x0 = p.x
    else c.x1 = p.x
    if (selecionado === 0 || selecionado === 1) c.z0 = p.z
    else c.z1 = p.z
  } else if (cantos.length) {
    c.x0 = Math.min(...cantos.map((q) => q.x))
    c.x1 = Math.max(...cantos.map((q) => q.x))
    c.z0 = Math.min(...cantos.map((q) => q.z))
    c.z1 = Math.max(...cantos.map((q) => q.z))
  }
  const x0 = Math.min(c.x0, c.x1),
    x1 = Math.max(c.x0, c.x1),
    z0 = Math.min(c.z0, c.z1),
    z1 = Math.max(c.z0, c.z1)
  return prenderNaBase(doc, {
    x0,
    z0,
    x1: Math.max(x1, x0 + MENOR_LADO_DE_REGIAO),
    z1: Math.max(z1, z0 + MENOR_LADO_DE_REGIAO),
  })
}

/** Liga ou desliga uma vizinha no rascunho (até 8). */
export function alternarVizinha(r: RegiaoDeCenario, id: string, ligar: boolean): RegiaoDeCenario {
  const sem = r.vizinhas.filter((v) => v !== id)
  return {
    ...r,
    vizinhas: ligar && sem.length < LIMITES_REGIOES.vizinhas ? [...sem, id] : sem,
  }
}

/** "Encaixar na vizinha": as bordas a até 2 m de outra região encostam nela. */
export function encaixarRegiao(
  doc: Pick<DocumentoDeCenario, 'regioes'>,
  r: RegiaoDeCenario,
): RegiaoDeCenario {
  return { ...r, caixa: encaixarCaixa(doc.regioes, r.caixa, r.id) }
}

/** O lote que guarda o rascunho, com as vizinhas em par. */
export function comandosParaGuardarRegiao(doc: DocumentoDeCenario, r: RegiaoDeCenario) {
  return comandosParaDefinirRegiao(doc.regioes, { ...r, nome: r.nome.trim() })
}

/**
 * O que impede guardar o rascunho, com os recados do núcleo (nome repetido, sobreposição, fora da
 * base). Confere as regiões como ficariam depois do lote, então a vizinha em par não acusa.
 */
export function problemasDaRegiao(doc: DocumentoDeCenario, r: RegiaoDeCenario): string[] {
  const depois = new Map((doc.regioes ?? []).map((q) => [q.id, q]))
  for (const c of comandosParaGuardarRegiao(doc, r)) depois.set(c.regiao.id, c.regiao)
  if ((doc.regioes ?? []).length >= LIMITES_REGIOES.max && !doc.regioes?.some((q) => q.id === r.id))
    return [`Um cenário tem no máximo ${LIMITES_REGIOES.max} regiões.`]
  // O campo de alturas é carregado em toda janela: acima do teto da janela, o Estúdio recusaria a
  // cena (revisão do lote 5). Avisa aqui, antes de guardar.
  const b = doc.base
  if (
    b.tipo === 'terreno' &&
    (b.colunas + 1) * (b.linhas + 1) * 8 > LIMITES_DA_EXPORTACAO.janela.bytesDecodificados
  )
    return [
      'Este relevo é grande demais para dividir em regiões. Use um relevo menor (menos colunas e linhas, ou um passo maior).',
    ]
  return errosDasRegioes([...depois.values()], doc.base)
}
