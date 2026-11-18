import {
  type ComandoDeCenario,
  type DocumentoDeCenario,
  entidadesDoCenario,
  igual,
  type MarcadorDeCenario,
  PropriedadesSchema,
} from '@sistemazero/molda-cenarios-core/v2'

export type Propriedades = NonNullable<MarcadorDeCenario['propriedades']>
export interface LinhaDePropriedade {
  chave: string
  tipo: 'texto' | 'numero' | 'booleano'
  valor: string | number | boolean
}
export function linhasDasPropriedades(p: Propriedades = {}): LinhaDePropriedade[] {
  return Object.entries(p).map(([chave, valor]) => ({
    chave,
    valor,
    tipo: typeof valor === 'number' ? 'numero' : typeof valor === 'boolean' ? 'booleano' : 'texto',
  }))
}
export function propriedadesDasLinhas(linhas: readonly LinhaDePropriedade[]): Propriedades {
  const usadas = new Set<string>(),
    pares: [string, string | number | boolean][] = []
  for (const l of linhas) {
    const chave = l.chave.trim()
    if (usadas.has(chave)) throw Error(`A propriedade “${chave}” está repetida.`)
    usadas.add(chave)
    if (l.tipo === 'numero') {
      if (
        (typeof l.valor !== 'number' && typeof l.valor !== 'string') ||
        String(l.valor).trim() === ''
      )
        throw Error(`Preencha um número em “${chave}”.`)
      const numero = typeof l.valor === 'number' ? l.valor : Number(l.valor.replace(',', '.'))
      if (!Number.isFinite(numero)) throw Error(`Confira o número em “${chave}”.`)
      pares.push([chave, numero])
    } else if (l.tipo === 'booleano') {
      if (typeof l.valor !== 'boolean') throw Error(`Confira o valor de “${chave}”.`)
      pares.push([chave, l.valor])
    } else {
      if (l.tipo !== 'texto' || typeof l.valor !== 'string')
        throw Error(`Confira o texto de “${chave}”.`)
      pares.push([chave, l.valor])
    }
  }
  return PropriedadesSchema.parse(Object.fromEntries(pares))
}

/** A mesma propriedade tipada, nos comandos existentes de cada entidade. */
export function comandosParaPropriedades(
  doc: DocumentoDeCenario,
  id: string,
  propriedades: Propriedades,
): ComandoDeCenario[] {
  const p = PropriedadesSchema.parse(propriedades),
    e = entidadesDoCenario(doc).find((e) => e.id === id)
  if (!e) throw Error('Este elemento não está mais no cenário.')
  if (igual(e.propriedades ?? {}, p)) return []
  if (doc.instancias.some((o) => o.id === id))
    return [{ tipo: 'instancia.atualizar', id, alteracoes: { propriedades: p } }]
  if (doc.montagens?.some((o) => o.id === id))
    return [{ tipo: 'montagem.atualizar', id, alteracoes: { propriedades: p } }]
  const grupo = doc.grupos.find((o) => o.id === id)
  if (grupo) return [{ tipo: 'grupo.definir', grupo: { ...grupo, propriedades: p } }]
  const agua = doc.aguas.find((o) => o.id === id)
  if (agua) return [{ tipo: 'agua.definir', agua: { ...agua, propriedades: p } }]
  const caminho = doc.caminhos.find((o) => o.id === id)
  if (caminho) return [{ tipo: 'caminho.definir', caminho: { ...caminho, propriedades: p } }]
  const marcador = doc.marcadores.find((o) => o.id === id)
  if (marcador) return [{ tipo: 'marcador.definir', marcador: { ...marcador, propriedades: p } }]
  throw Error('Este elemento não possui propriedades editáveis.')
}
