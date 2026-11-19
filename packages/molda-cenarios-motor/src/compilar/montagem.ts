import type {
  ArquivoCompilado,
  CenaCompilada,
  PreparacaoDaCena,
} from '@sistemazero/molda-cenarios-core/compilar'
import { type AnimationClip, Box3, Matrix4, type Object3D } from 'three'
import { matrizDaTransformacao } from '../matematica'
import type { ArquivosDaCompilacao } from './arquivos'
import { gravarGlbCompilado } from './arquivos-glb'
import type { AncoraDaEntidadeCompilada } from './metadados'

export const volumeDaCaixa = (v: Box3) => ({
  min: { x: v.min.x, y: v.min.y, z: v.min.z },
  max: { x: v.max.x, y: v.max.y, z: v.max.z },
})
export interface TemplateVisualCompilado {
  arquivo: ArquivoCompilado
  volume: Box3
}

/** Registra instâncias sem assar posição em cópias de templates. Não conhece o palco. */
export class MontagemDaCompilacao {
  readonly nos: CenaCompilada['nos'] = []
  readonly colisoes: CenaCompilada['colisoes'] = []
  private readonly volumes = new Map<string, Box3>()
  private readonly matrizes = new Map<string, Matrix4>()
  private numero = 0
  constructor(
    readonly arquivos: ArquivosDaCompilacao,
    readonly sinal: AbortSignal,
  ) {}
  async gravar(
    raiz: Object3D,
    papel: 'modelo' | 'terreno' | 'agua' | 'caminho',
    animacoes: readonly AnimationClip[] = [],
  ): Promise<TemplateVisualCompilado> {
    this.sinal.throwIfAborted()
    const diretorio = { modelo: 'modelos', terreno: 'terreno', agua: 'aguas', caminho: 'caminhos' }[
        papel
      ],
      volume = new Box3().setFromObject(raiz),
      arquivo = await gravarGlbCompilado(
        raiz,
        `${diretorio}/${papel}-${this.numero++}.glb`,
        papel,
        this.arquivos,
        this.sinal,
        animacoes,
      )
    return { arquivo, volume }
  }
  adicionar(
    template: TemplateVisualCompilado,
    matriz: Matrix4,
    entidade: string | null,
    efeito?: 'agua',
    preservarHierarquia?: boolean,
  ) {
    if (this.nos.length >= 32768) throw Error('A cena compilada excede o limite de nós visuais.')
    const caixa = template.volume.clone().applyMatrix4(matriz)
    this.nos.push({
      id: `visual-${this.nos.length}`,
      entidade,
      arquivo: template.arquivo.caminho,
      matriz: matriz.elements.slice(),
      volume: volumeDaCaixa(caixa),
      ...(efeito ? { efeito } : {}),
      ...(preservarHierarquia ? { preservarHierarquia: true as const } : {}),
    })
    if (entidade !== null) {
      const atual = this.volumes.get(entidade)
      if (atual) atual.union(caixa)
      else this.volumes.set(entidade, caixa)
    }
  }
  adicionarColisao(
    template: TemplateVisualCompilado,
    matriz: Matrix4,
    entidade: string | null,
    tipo: CenaCompilada['colisoes'][number]['tipo'],
  ) {
    if (this.colisoes.length >= 32768) throw Error('A cena compilada excede o limite de colisões.')
    const no = {
      id: `colisao-${this.colisoes.length}`,
      entidade,
      tipo,
      arquivo: template.arquivo.caminho,
      matriz: matriz.elements.slice(),
      volume: volumeDaCaixa(template.volume.clone().applyMatrix4(matriz)),
    }
    this.colisoes.push(no)
    return no
  }
  ancora(id: string, matriz: Matrix4) {
    this.matrizes.set(id, matriz.clone())
  }
  ancoras(preparada: PreparacaoDaCena) {
    const d = preparada.documento,
      pais = new Map(
        [...d.grupos, ...d.instancias, ...d.aguas, ...d.caminhos, ...d.marcadores].map((e) => [
          e.id,
          e.grupo,
        ]),
      )
    for (const [id, caixa] of [...this.volumes]) {
      let pai = pais.get(id),
        passos = 0
      while (pai) {
        if (++passos > 64) throw Error('A organização excede o limite de pais na compilação.')
        const v = this.volumes.get(pai)
        if (v) v.union(caixa)
        else this.volumes.set(pai, caixa.clone())
        pai = pais.get(pai)
      }
    }
    for (const m of preparada.montagens)
      this.ancora(m.id, matrizDaTransformacao(m.transformacao, new Matrix4()))
    const saida = new Map<string, AncoraDaEntidadeCompilada>()
    for (const id of new Set([...this.matrizes.keys(), ...this.volumes.keys()])) {
      const volume = this.volumes.get(id)
      saida.set(id, {
        matriz: (this.matrizes.get(id) ?? new Matrix4()).elements.slice(),
        ...(volume ? { volume: volumeDaCaixa(volume) } : {}),
      })
    }
    return saida
  }
}

/** Entre partes de trabalho, permite processar a UI e o cancelamento. */
export async function cederDuranteCompilacao(sinal: AbortSignal) {
  sinal.throwIfAborted()
  await new Promise<void>((resolver) => setTimeout(resolver, 0))
  sinal.throwIfAborted()
}
