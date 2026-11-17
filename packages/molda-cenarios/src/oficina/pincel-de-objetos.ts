import {
  type ComandoDeCenario,
  type DocumentoDeCenario,
  type FormaDeCenario,
  igual,
  LIMITES_ESPALHAMENTO,
  type ModeloDoCenario,
  type PrototipoDeEspalhamento,
  referenciarModelo,
  type TexturaDoCenario,
  type VolumeDeComposicao,
} from '@sistemazero/molda-cenarios-core/v2'
import type { GestoDeEspalhamento } from '@sistemazero/molda-cenarios-motor'
import { novoIdAleatorio, referenciaDeBiblioteca } from './acoes'
import type { ModeloDeBiblioteca } from './portas'

export interface EscolhaDoPincel {
  chave: string
  miniatura?: string | null
  prototipo: PrototipoDeEspalhamento
  modelo?: ModeloDoCenario
  forma?: FormaDeCenario
  textura?: TexturaDoCenario
}

export function escolhaDaBiblioteca(modelo: ModeloDeBiblioteca): EscolhaDoPincel {
  return {
    chave: `biblioteca:${modelo.bibliotecaId}:${modelo.id}:${modelo.digest}`,
    miniatura: modelo.miniatura,
    modelo: referenciaDeBiblioteca(modelo),
    prototipo: {
      nome: modelo.nome.slice(0, 120),
      modelo: modelo.id,
      colisao: 'malha',
      rotacao: { x: 0, y: 0, z: 0 },
      escala: { x: 1, y: 1, z: 1 },
    },
  }
}

export function escolhasDaSelecao(
  doc: DocumentoDeCenario,
  selecao: readonly string[],
  medir?: (id: string) => VolumeDeComposicao | null,
): EscolhaDoPincel[] {
  const ids = new Set(selecao),
    resultado: EscolhaDoPincel[] = []
  const comparar = (p: PrototipoDeEspalhamento) => {
    const { nome: _nome, ...resto } = p
    return {
      ...resto,
      rotacao: p.rotacao.x === 0 && p.rotacao.z === 0 ? { x: 0, y: 0, z: 0 } : p.rotacao,
    }
  }
  for (const o of doc.instancias) {
    if (!ids.has(o.id)) continue
    const prototipo: PrototipoDeEspalhamento = {
      nome: o.nome,
      modelo: o.modelo,
      colisao: o.colisao,
      rotacao: o.transformacao.rotacao,
      escala: o.transformacao.escala,
      ...(o.aparencia ? { aparencia: o.aparencia } : {}),
      ...(o.espelho ? { espelho: o.espelho } : {}),
      ...(o.propriedades ? { propriedades: o.propriedades } : {}),
    }
    if (resultado.some((e) => igual(comparar(e.prototipo), comparar(prototipo)))) continue
    if (resultado.length >= LIMITES_ESPALHAMENTO.prototipos)
      throw new Error('Escolha até oito modelos ou variações para o pincel')
    let modelo = doc.modelos.find((m) => m.id === o.modelo)
    const forma = doc.formas?.find((f) => f.id === o.modelo)
    if (modelo && !modelo.volume) {
      const volume = medir?.(modelo.id)
      if (!volume) throw new Error(`Aguarde as medidas de ${o.nome}`)
      modelo = { ...modelo, volume }
    }
    if (!modelo && !forma) throw new Error('Um modelo da escolha não está disponível')
    const textura = o.aparencia?.textura
      ? doc.texturas?.find((t) => t.id === o.aparencia!.textura!.id)
      : undefined
    if (o.aparencia?.textura && !textura)
      throw new Error('A textura da escolha não está disponível')
    resultado.push(
      structuredClone({
        chave: `objeto:${o.id}`,
        prototipo,
        ...(modelo ? { modelo } : {}),
        ...(forma ? { forma } : {}),
        ...(textura ? { textura } : {}),
      }),
    )
  }
  if (!resultado.length)
    throw new Error('Escolha objetos no cenário para usar como modelos do pincel')
  return resultado
}

/** Paleta é só leitura até soltar o gesto. Aliases não sobrescrevem definições do cenário. */
export function prepararPaleta(doc: DocumentoDeCenario, escolhas: readonly EscolhaDoPincel[]) {
  const trabalho = {
    ...doc,
    modelos: [...doc.modelos],
    formas: [...(doc.formas ?? [])],
    texturas: [...(doc.texturas ?? [])],
  }
  const modelos: ModeloDoCenario[] = [],
    formas: FormaDeCenario[] = [],
    texturas: TexturaDoCenario[] = []
  const prototipos: PrototipoDeEspalhamento[] = []
  const livre = (base: string, usados: ReadonlySet<string>) => {
    let id = base
    for (let i = 0; usados.has(id); i++) id = `${base.slice(0, 200)}/pincel/${i}`
    return id
  }
  if (escolhas.length > LIMITES_ESPALHAMENTO.prototipos)
    throw new Error('O pincel aceita até oito modelos ou variações')
  for (const escolha of escolhas) {
    const p = structuredClone(escolha.prototipo)
    if (escolha.modelo) {
      const ref = referenciarModelo(trabalho, escolha.modelo)
      p.modelo = ref.id
      for (const c of ref.comandos)
        if (c.tipo === 'modelo.definir') {
          modelos.push(c.modelo)
          trabalho.modelos.push(c.modelo)
        }
    } else if (escolha.forma) {
      const f = escolha.forma,
        atual = trabalho.formas.find((e) => igual({ ...e, id: f.id }, f))
      if (atual) p.modelo = atual.id
      else {
        p.modelo = livre(f.id, new Set([...trabalho.modelos, ...trabalho.formas].map((e) => e.id)))
        const nova = { ...f, id: p.modelo }
        formas.push(nova)
        trabalho.formas.push(nova)
      }
    } else throw new Error('O modelo do pincel não está disponível')
    if (p.aparencia?.textura) {
      const t = escolha.textura
      if (!t) throw new Error('A textura do pincel não está disponível')
      const igual = trabalho.texturas.find(
        (e) => e.biblioteca === t.biblioteca && e.textura === t.textura && e.digest === t.digest,
      )
      let id = igual?.id
      if (!id) {
        id = livre(t.id, new Set(trabalho.texturas.map((e) => e.id)))
        const nova = { ...t, id }
        texturas.push(nova)
        trabalho.texturas.push(nova)
      }
      p.aparencia.textura.id = id
    }
    prototipos.push(p)
  }
  if (
    trabalho.modelos.length > 5000 ||
    trabalho.formas.length > 2000 ||
    trabalho.texturas.length > 256
  )
    throw new Error('Não há espaço para mais definições de modelos ou texturas neste cenário')
  return { modelos, formas, texturas, prototipos }
}

export function comandosParaEspalhar(
  doc: DocumentoDeCenario,
  gesto: GestoDeEspalhamento,
  novoId: () => string = novoIdAleatorio,
) {
  if (gesto.documentoDeOrigem !== doc)
    throw new Error('O cenário mudou durante o traço. Faça uma nova pincelada.')
  const ids = gesto.amostras.map(() => novoId())
  const comandos: ComandoDeCenario[] = [
    ...gesto.modelos.map((modelo): ComandoDeCenario => ({ tipo: 'modelo.definir', modelo })),
    ...gesto.formas.map((forma): ComandoDeCenario => ({ tipo: 'forma.definir', forma })),
    ...gesto.texturas.map((textura): ComandoDeCenario => ({ tipo: 'textura.definir', textura })),
    {
      tipo: 'objetos.espalhar',
      pincelada: {
        receita: gesto.receita,
        amostras: gesto.amostras.map((a, i) => ({ ...a, id: ids[i]! })),
      },
    },
  ]
  return { comandos, ids }
}
