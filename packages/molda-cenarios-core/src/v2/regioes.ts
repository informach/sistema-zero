import type { BaseDeCenario } from './documento'
import type { CaixaDeRegiao, RegiaoDeCenario } from './regioes-schema'

export * from './regioes-schema'

/** Folga das comparações de borda: duas regiões que só encostam não se sobrepõem. */
const FOLGA = 1e-6

/** O retângulo da base no chão (`null` no relevo de perfil, que só existe para abrir v1). */
export function retanguloDaBase(base: BaseDeCenario): CaixaDeRegiao | null {
  if (base.tipo === 'plano')
    return {
      x0: -base.largura / 2,
      z0: -base.comprimento / 2,
      x1: base.largura / 2,
      z1: base.comprimento / 2,
    }
  if (base.tipo === 'terreno')
    return {
      x0: base.origem.x,
      z0: base.origem.z,
      x1: base.origem.x + base.colunas * base.passo,
      z1: base.origem.z + base.linhas * base.passo,
    }
  return null
}

/** As duas caixas dividem área (encostar pela borda não conta). */
export function caixasSobrepoem(a: CaixaDeRegiao, b: CaixaDeRegiao): boolean {
  return (
    Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > FOLGA &&
    Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0) > FOLGA
  )
}

/** A caixa cabe inteira no retângulo. */
export function caixaDentro(caixa: CaixaDeRegiao, limite: CaixaDeRegiao): boolean {
  return (
    caixa.x0 >= limite.x0 - FOLGA &&
    caixa.z0 >= limite.z0 - FOLGA &&
    caixa.x1 <= limite.x1 + FOLGA &&
    caixa.z1 <= limite.z1 + FOLGA
  )
}

const nomeComparavel = (nome: string) => nome.trim().toLocaleLowerCase('pt-BR')

/**
 * Os problemas das regiões de um documento, com os recados em português que a oficina mostra:
 * ids e nomes únicos, caixa com área e dentro da base, vizinhas que existem, sem repetir, sem a
 * própria região e SEMPRE em par (se a Vila é vizinha da Floresta, a Floresta é vizinha da Vila),
 * e nenhuma sobreposição de área (borda comum pode).
 */
export function errosDasRegioes(
  regioes: readonly RegiaoDeCenario[] | undefined,
  base: BaseDeCenario,
): string[] {
  if (!regioes?.length) return []
  const limite = retanguloDaBase(base)
  if (!limite) return ['Converta o relevo em terreno antes de desenhar regiões.']
  return errosDasRegioesNoRetangulo(regioes, limite)
}

/**
 * A mesma régua de `errosDasRegioes`, com o retângulo do chão já calculado. A cena compilada usa
 * esta (ela guarda o piso plano ou o terreno, não a base do documento); sem retângulo (`null`), só
 * não confere se a caixa cabe no chão.
 */
export function errosDasRegioesNoRetangulo(
  regioes: readonly RegiaoDeCenario[],
  limite: CaixaDeRegiao | null,
): string[] {
  const erros: string[] = []
  const porId = new Map<string, RegiaoDeCenario>()
  const nomes = new Set<string>()
  for (const r of regioes) {
    if (porId.has(r.id)) erros.push(`Região duplicada: ${r.id}`)
    porId.set(r.id, r)
    const nome = nomeComparavel(r.nome)
    if (!nome) erros.push(`A região ${r.id} precisa de um nome.`)
    else if (nomes.has(nome)) erros.push(`Já existe uma região chamada ${r.nome.trim()}.`)
    nomes.add(nome)
    if (!(r.caixa.x1 - r.caixa.x0 > FOLGA && r.caixa.z1 - r.caixa.z0 > FOLGA))
      erros.push(`A região ${r.nome} precisa ter largura e comprimento.`)
    else if (limite && !caixaDentro(r.caixa, limite))
      erros.push(`A região ${r.nome} sai da base do cenário.`)
  }
  for (const r of regioes) {
    const vistas = new Set<string>()
    for (const v of r.vizinhas) {
      if (v === r.id) {
        erros.push(`A região ${r.nome} não pode ser vizinha dela mesma.`)
        continue
      }
      if (vistas.has(v)) erros.push(`A região ${r.nome} repete a vizinha ${v}.`)
      vistas.add(v)
      const outra = porId.get(v)
      if (!outra) erros.push(`A região ${r.nome} cita uma vizinha que não existe: ${v}`)
      else if (!outra.vizinhas.includes(r.id))
        erros.push(
          `A região ${r.nome} tem ${outra.nome} como vizinha, mas ${outra.nome} não tem ${r.nome}.`,
        )
    }
  }
  for (let i = 0; i < regioes.length; i++)
    for (let j = i + 1; j < regioes.length; j++) {
      const a = regioes[i]!,
        b = regioes[j]!
      if (caixasSobrepoem(a.caixa, b.caixa))
        erros.push(`As regiões ${a.nome} e ${b.nome} se sobrepõem. Elas podem encostar pela borda.`)
    }
  return erros
}

/** As regiões sem `id`: quem a cita como vizinha deixa de citar (o que `regiao.remover` faz). */
export function regioesSem(regioes: readonly RegiaoDeCenario[], id: string): RegiaoDeCenario[] {
  return regioes
    .filter((r) => r.id !== id)
    .map((r) =>
      r.vizinhas.includes(id) ? { ...r, vizinhas: r.vizinhas.filter((v) => v !== id) } : r,
    )
}
