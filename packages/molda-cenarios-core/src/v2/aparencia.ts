import { CenarioInvalido } from '../validacao'
import type { ComandoDeCenario } from './comandos'
import {
  type DocumentoDeCenario,
  InstanciaSchema,
  LIMITES_CENARIO_V2,
  type TexturaDoCenario,
  TexturaDoCenarioSchema,
} from './documento'

/** Alias de catálogo sem redefinir uma textura que outra peça já utiliza. */
export function referenciarTextura(
  doc: DocumentoDeCenario,
  entrada: TexturaDoCenario,
): { id: string; comandos: ComandoDeCenario[] } {
  const ref = TexturaDoCenarioSchema.parse(entrada),
    existente = doc.texturas?.find(
      (t) =>
        t.digest === ref.digest && t.biblioteca === ref.biblioteca && t.textura === ref.textura,
    )
  if (existente) return { id: existente.id, comandos: [] }
  const usados = new Set(doc.texturas?.map((t) => t.id) ?? [])
  let id = ref.id
  for (let n = 0; usados.has(id); n++) id = `${ref.id.slice(0, 165)}/${ref.digest}/${n}`
  return { id, comandos: [{ tipo: 'textura.definir', textura: { ...ref, id } }] }
}

/** Uma escolha de acabamento, compartilhada pela interface e pelos clientes de comandos. */
export function aplicarTexturaAosObjetos(
  doc: DocumentoDeCenario,
  ids: readonly string[],
  entrada: TexturaDoCenario | null,
  repeticaoMetros = 2,
): ComandoDeCenario[] {
  const escolhidos = new Set(ids)
  const objetos = doc.instancias.filter((o) => escolhidos.has(o.id))
  if (!objetos.length || objetos.length !== escolhidos.size)
    throw new CenarioInvalido(['Escolha objetos existentes para editar a textura'])
  let id: string | null = null
  const comandos: ComandoDeCenario[] = []
  if (entrada) {
    const referencia = referenciarTextura(doc, entrada)
    id = referencia.id
    comandos.push(...referencia.comandos)
  }
  const antigas = new Set<string>()
  for (const o of objetos) {
    const aparencia = { ...o.aparencia }
    if (aparencia.textura) antigas.add(aparencia.textura.id)
    if (id) aparencia.textura = { id, repeticaoMetros }
    else delete aparencia.textura
    // Validação inclusive para clientes sem interface: NaN, zero e escalas não permitidas.
    InstanciaSchema.parse({ ...o, aparencia })
    comandos.push({ tipo: 'instancia.atualizar', id: o.id, alteracoes: { aparencia } })
  }
  const aindaUsadas = new Set(
    doc.instancias
      .filter((o) => !escolhidos.has(o.id))
      .flatMap((o) => (o.aparencia?.textura ? [o.aparencia.textura.id] : [])),
  )
  for (const caminho of doc.caminhos)
    if (caminho.aparencia?.textura) aindaUsadas.add(caminho.aparencia.textura.id)
  if (doc.base.tipo === 'terreno')
    for (const camada of doc.base.solo?.camadas ?? [])
      if (camada.textura) aindaUsadas.add(camada.textura.id)
  for (const antiga of antigas)
    if (antiga !== id && !aindaUsadas.has(antiga))
      comandos.push({ tipo: 'textura.remover', id: antiga })
  if (comandos.length > LIMITES_CENARIO_V2.comandos)
    throw new CenarioInvalido(['Divida a edição da textura em seleções menores'])
  return comandos
}
