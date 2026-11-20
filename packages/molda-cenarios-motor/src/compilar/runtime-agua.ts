import {
  type ConsultaDeAgua,
  type FonteDeAlturas,
  prepararConsultaDaAgua,
} from '@sistemazero/molda-cenarios-core/v2'
import { Box3, type BufferGeometry, type Mesh, type Object3D, Vector3 } from 'three'
import { AlturasDaAgua } from '../agua/alturas'
import { MaterialDaAgua } from '../agua/material'
import { AguasDoTeste } from '../teste/agua'
import { type FonteDeColisao, MundoDoTeste } from '../teste/colisoes'
import type { ConteudoConferidoDaCena } from './conteudo'

/** Restaura apenas o efeito; as malhas, margens e colisões já vieram prontas do compilador. */
export class AguaDaCenaCompilada {
  readonly consulta: AguasDoTeste
  private readonly alturas?: AlturasDaAgua
  private readonly materiais = new Map<string, MaterialDaAgua>()
  private readonly geometrias = new Set<BufferGeometry>()
  private readonly fundos: MundoDoTeste[] = []
  private descartado = false
  constructor(
    dados: ConteudoConferidoDaCena,
    fisicas: ReadonlyMap<string, readonly FonteDeColisao[]>,
    fonte: FonteDeAlturas | undefined,
    maxTextura: number,
    dinamica = true,
    marExterno = false,
  ) {
    const cena = dados.cena,
      consultas = new Map<string, ConsultaDeAgua>()
    try {
      if (dinamica && cena.terreno && dados.terreno) {
        const t = cena.terreno,
          largura = t.colunas / 64,
          pecas = new Set(t.pecas.map((p) => p.linha * largura + p.coluna))
        this.alturas = new AlturasDaAgua(
          t,
          { ...t, alturas: dados.terreno.alturas },
          maxTextura,
          (x, z) => pecas.has(z * largura + x),
        )
      }
      const aguas = marExterno ? cena.aguas.filter((a) => a.tipo !== 'mar') : cena.aguas
      for (const a of aguas) {
        const modelo = (a.tipo === 'lago' || a.tipo === 'represa') && a.modelo
        let fundoDoModelo: ((x: number, z: number) => number) | undefined
        if (modelo && (a.tipo === 'lago' || a.tipo === 'represa')) {
          const fontes = fisicas.get(a.id) ?? [],
            mundo = new MundoDoTeste(fontes),
            caixa = new Box3(),
            de = new Vector3(),
            ate = new Vector3()
          this.fundos.push(mundo)
          for (const f of fontes) {
            if (!f.geometria.boundingBox) f.geometria.computeBoundingBox()
            caixa.union(f.geometria.boundingBox!.clone().applyMatrix4(f.matriz))
          }
          const alto = caixa.isEmpty() ? a.nivel + 1 : caixa.max.y + 1,
            baixo = caixa.isEmpty() ? a.nivel - a.profundidade - 1 : caixa.min.y - 1,
            padrao = a.nivel - a.profundidade
          fundoDoModelo = (x, z) =>
            mundo.rastrear(de.set(x, alto, z), ate.set(x, baixo, z))?.ponto.y ?? padrao
        }
        consultas.set(a.id, prepararConsultaDaAgua(a, fundoDoModelo))
        if (dinamica)
          this.materiais.set(
            a.id,
            new MaterialDaAgua(a.aparencia, {
              fundo: modelo || a.tipo === 'cachoeira' ? null : (this.alturas ?? null),
              plano: !modelo && a.tipo !== 'cachoeira' && cena.plano ? 0 : undefined,
              profundidade: a.tipo === 'mar' ? 100000 : a.tipo === 'cachoeira' ? 1 : a.profundidade,
              movimento: a.tipo === 'rio' ? 'rio' : a.tipo === 'cachoeira' ? 'queda' : 'horizontal',
              largura: a.tipo === 'rio' || a.tipo === 'cachoeira' ? a.largura : 1,
              correnteza: a.tipo === 'rio' ? a.correnteza : 0,
              profundidadePorVertice: Boolean(modelo),
            }),
          )
      }
      this.consulta = new AguasDoTeste(aguas, fonte, consultas)
    } catch (erro) {
      this.descartar()
      throw erro
    }
  }
  aplicar(raiz: Object3D, entidade: string) {
    const material = this.materiais.get(entidade)
    if (!material) return
    raiz.traverse((no) => {
      const m = no as Mesh
      if (!m.isMesh) return
      const original = m.geometry,
        uv = original.getAttribute('_mcnaguauv') ?? original.getAttribute('mcnAguaUv'),
        profundidade =
          original.getAttribute('_mcnprofundidademodelo') ??
          original.getAttribute('mcnProfundidadeModelo')
      if (uv || profundidade) {
        const g = original.clone()
        this.geometrias.add(g)
        if (uv) g.setAttribute('uv', uv.clone())
        if (profundidade) g.setAttribute('mcnProfundidadeModelo', profundidade.clone())
        m.geometry = g
      }
      m.material = material.material
    })
  }
  atualizar(segundos: number, movimentoReduzido = false) {
    for (const m of this.materiais.values()) m.atualizar(segundos, movimentoReduzido)
  }
  descartar() {
    if (this.descartado) return
    this.descartado = true
    for (const m of this.materiais.values()) m.descartar()
    for (const g of this.geometrias) g.dispose()
    for (const f of this.fundos) f.descartar()
    this.alturas?.descartar()
    this.materiais.clear()
    this.geometrias.clear()
    this.fundos.length = 0
  }
}
