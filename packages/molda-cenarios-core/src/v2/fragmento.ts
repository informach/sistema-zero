import { VetorSchema } from '../documento'
import { CenarioInvalido } from '../validacao'
import { posicaoNoMundo } from './chao'
import { criarDocumentoVazio, type DocumentoDeCenario, LIMITES_CENARIO_V2 } from './documento'
import {
  type FragmentoDeCenario,
  FragmentoDeCenarioSchema,
  PrefixoDeColagemSchema,
} from './fragmento-schema'
import { igual } from './igual'
import { entidadesDoCenario, indiceDaOrganizacao, raizesDaSelecao } from './organizacao'
import { volumeNoMundo } from './organizar'
import type { FonteDeAlturas } from './terreno'
import { validarDocumento } from './validacao'

type Ponto = FragmentoDeCenario['ancora']
const falhar = (texto: string): never => {
  throw new CenarioInvalido([texto])
}

export function validarFragmento(valor: unknown): FragmentoDeCenario {
  if (typeof valor === 'string') {
    if (new TextEncoder().encode(valor).length > LIMITES_CENARIO_V2.bytes)
      falhar('O conteúdo copiado excede 8 MB')
    try {
      valor = JSON.parse(valor)
    } catch {
      falhar('O conteúdo copiado não é um fragmento de cenário')
    }
  }
  const lido = FragmentoDeCenarioSchema.safeParse(valor)
  if (!lido.success) falhar('O conteúdo copiado não é um fragmento de cenário válido')
  const f = lido.data!
  if (!f.instancias.length && !f.grupos.length) falhar('O conteúdo copiado está vazio')
  const entidades = new Set([...f.instancias, ...f.grupos].map((e) => e.id))
  if (f.raizes.some((id) => !entidades.has(id))) falhar('A escolha copiada contém uma raiz ausente')
  if (new TextEncoder().encode(JSON.stringify(f)).length > LIMITES_CENARIO_V2.bytes)
    falhar('O conteúdo copiado excede 8 MB')
  // Reusa a validação de vínculos, ciclos, profundidade, referências e orçamento autorais.
  validarDocumento({
    ...criarDocumentoVazio(f.origem.cenario, 'Conteúdo copiado'),
    modelos: f.modelos,
    instancias: f.instancias,
    grupos: f.grupos,
    ...(f.formas.length ? { formas: f.formas } : {}),
    ...(f.texturas.length ? { texturas: f.texturas } : {}),
    ...(f.camadas.length ? { camadas: f.camadas } : {}),
  })
  if (f.instancias.some((o) => o.apoio.tipo !== 'absoluto' && o.apoio.tipo !== 'objeto'))
    falhar('O conteúdo copiado depende de terreno ou água externos')
  return f
}

/** Captura não altera a origem. Apoios que saem da escolha viram posições mundiais. */
export function capturarFragmento(
  documento: DocumentoDeCenario,
  escolha: readonly string[],
  espaco: string,
  fonte?: FonteDeAlturas,
): FragmentoDeCenario {
  const doc = validarDocumento(documento),
    indice = indiceDaOrganizacao(doc),
    ids = new Set<string>(),
    raizes = raizesDaSelecao(doc, escolha),
    fila = [...raizes]
  for (let i = 0; i < fila.length; i++) {
    const id = fila[i]!
    if (ids.has(id)) continue
    ids.add(id)
    if (indice.grupos.has(id)) for (const filho of indice.filhos.get(id) ?? []) fila.push(filho.id)
  }
  if (!ids.size) falhar('Escolha objetos ou uma pasta para copiar')
  const permitidos = new Set([...doc.grupos, ...doc.instancias].map((e) => e.id))
  if ([...ids].some((id) => !permitidos.has(id)))
    falhar('Esta pasta contém elementos que ainda não podem ser copiados como objetos')
  // Conserva as pastas ancestrais necessárias, sem copiar seus outros filhos.
  for (const id of [...ids]) {
    let pai = indice.entidades.get(id)!.grupo
    while (pai) {
      ids.add(pai)
      pai = indice.grupos.get(pai)!.grupo
    }
  }
  const objetos = doc.instancias.filter((o) => ids.has(o.id)),
    volumes = objetos.map((o) => volumeNoMundo(doc, o, fonte))
  const ancora: Ponto = volumes.length
    ? {
        x:
          (Math.min(...volumes.map((v) => v.min.x)) + Math.max(...volumes.map((v) => v.max.x))) / 2,
        y: Math.min(...volumes.map((v) => v.min.y)),
        z:
          (Math.min(...volumes.map((v) => v.min.z)) + Math.max(...volumes.map((v) => v.max.z))) / 2,
      }
    : { x: 0, y: 0, z: 0 }
  const modelos = new Set(objetos.map((o) => o.modelo)),
    texturas = new Set(objetos.map((o) => o.aparencia?.textura?.id)),
    camadas = new Set([...doc.grupos, ...objetos].filter((e) => ids.has(e.id)).map((e) => e.camada))
  return validarFragmento({
    formato: 'molda-cenario-fragmento',
    versao: 1,
    origem: { espaco, cenario: doc.id },
    ancora,
    raizes,
    modelos: doc.modelos.filter((m) => modelos.has(m.id)),
    formas: doc.formas?.filter((f) => modelos.has(f.id)) ?? [],
    texturas: doc.texturas?.filter((t) => texturas.has(t.id)) ?? [],
    camadas: doc.camadas?.filter((c) => camadas.has(c.id)) ?? [],
    grupos: doc.grupos.filter((g) => ids.has(g.id)),
    instancias: objetos.map((o) => ({
      ...o,
      transformacao: { ...o.transformacao, posicao: posicaoNoMundo(doc, o, fonte) },
      apoio: o.apoio.tipo === 'objeto' && ids.has(o.apoio.objeto) ? o.apoio : { tipo: 'absoluto' },
    })),
  })
}

/** O prefixo é fornecido pelo chamador; replay e agentes produzem os mesmos IDs. */
export function idsDoFragmento(f: FragmentoDeCenario, prefixo: string) {
  PrefixoDeColagemSchema.parse(prefixo)
  const instancias = new Map(f.instancias.map((o, i) => [o.id, `${prefixo}/objeto/${i}`])),
    grupos = new Map(f.grupos.map((g, i) => [g.id, `${prefixo}/grupo/${i}`]))
  return { instancias, grupos, raizes: f.raizes.map((id) => instancias.get(id) ?? grupos.get(id)!) }
}

/** Uma única intenção atômica, mesmo para milhares de objetos; não é uma restauração de cena. */
export function colarFragmento(
  documento: DocumentoDeCenario,
  entrada: unknown,
  prefixo: string,
  ponto: Ponto,
): DocumentoDeCenario {
  VetorSchema.parse(ponto)
  const f = validarFragmento(entrada),
    doc = structuredClone(documento),
    ids = idsDoFragmento(f, prefixo),
    ocupados = new Set(entidadesDoCenario(doc).map((e) => e.id))
  for (const id of [...ids.instancias.values(), ...ids.grupos.values()])
    if (ocupados.has(id)) falhar('O identificador desta colagem já foi usado')
  const modelos = new Map<string, string>(),
    texturas = new Map<string, string>(),
    camadas = new Map<string, string>(),
    fontes = new Set([...doc.modelos, ...(doc.formas ?? [])].map((m) => m.id))
  const novoId = (tipo: string, i: number, existentes: Set<string>) => {
    const id = `${prefixo}/${tipo}/${i}`
    if (existentes.has(id)) falhar('O identificador desta colagem já foi usado')
    existentes.add(id)
    return id
  }
  const chaveDoModelo = (m: DocumentoDeCenario['modelos'][number]) =>
    JSON.stringify([m.biblioteca, m.modelo, m.digest, m.volume])
  const acervo = new Map(doc.modelos.map((m) => [chaveDoModelo(m), m.id]))
  for (const [i, m] of f.modelos.entries()) {
    let id = acervo.get(chaveDoModelo(m))
    if (!id) {
      id = novoId('modelo', i, fontes)
      doc.modelos.push({ ...m, id })
      acervo.set(chaveDoModelo(m), id)
    }
    modelos.set(m.id, id)
  }
  const formas = new Map(doc.formas?.map((m) => [m.id, m]) ?? [])
  for (const [i, m] of f.formas.entries()) {
    let id = igual(formas.get(m.id), m) ? m.id : undefined
    if (!id) {
      id = novoId('forma', i, fontes)
      doc.formas ??= []
      doc.formas.push({ ...m, id })
    }
    modelos.set(m.id, id)
  }
  const chaveDaTextura = (t: FragmentoDeCenario['texturas'][number]) =>
      JSON.stringify([t.biblioteca, t.textura, t.digest]),
    imagens = new Map(doc.texturas?.map((t) => [chaveDaTextura(t), t.id]) ?? []),
    idsTexturas = new Set(doc.texturas?.map((t) => t.id))
  for (const [i, t] of f.texturas.entries()) {
    let id = imagens.get(chaveDaTextura(t))
    if (!id) {
      id = novoId('textura', i, idsTexturas)
      doc.texturas ??= []
      doc.texturas.push({ ...t, id })
      imagens.set(chaveDaTextura(t), id)
    }
    texturas.set(t.id, id)
  }
  const camadasExistentes = new Map(doc.camadas?.map((c) => [c.id, c]) ?? []),
    idsCamadas = new Set(camadasExistentes.keys())
  for (const [i, c] of f.camadas.entries()) {
    const atual = camadasExistentes.get(c.id)
    let id: string
    if (igual(atual, c)) {
      if (atual!.bloqueado) falhar('A camada de destino está bloqueada')
      id = c.id
    } else {
      id = novoId('camada', i, idsCamadas)
      doc.camadas ??= []
      doc.camadas.push({ ...c, id })
    }
    camadas.set(c.id, id)
  }
  const organizacao = (e: { grupo: string | null; camada?: string | null }) => ({
    grupo: e.grupo ? ids.grupos.get(e.grupo)! : null,
    ...(e.camada !== undefined ? { camada: e.camada ? camadas.get(e.camada)! : null } : {}),
  })
  doc.grupos.push(...f.grupos.map((g) => ({ ...g, ...organizacao(g), id: ids.grupos.get(g.id)! })))
  const delta = { x: ponto.x - f.ancora.x, y: ponto.y - f.ancora.y, z: ponto.z - f.ancora.z }
  doc.instancias.push(
    ...f.instancias.map((o) => {
      const p = o.transformacao.posicao
      return {
        ...o,
        ...organizacao(o),
        id: ids.instancias.get(o.id)!,
        modelo: modelos.get(o.modelo)!,
        transformacao: {
          ...o.transformacao,
          posicao: { x: p.x + delta.x, y: p.y + delta.y, z: p.z + delta.z },
        },
        apoio:
          o.apoio.tipo === 'objeto'
            ? { ...o.apoio, objeto: ids.instancias.get(o.apoio.objeto)! }
            : o.apoio,
        ...(o.aparencia?.textura
          ? {
              aparencia: {
                ...o.aparencia,
                textura: { ...o.aparencia.textura, id: texturas.get(o.aparencia.textura.id)! },
              },
            }
          : {}),
      }
    }),
  )
  return validarDocumento(doc)
}
