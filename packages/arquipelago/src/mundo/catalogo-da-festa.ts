import {
  type AnimationClip,
  AnimationMixer,
  Group,
  type Mesh,
  MeshStandardMaterial,
  type Object3D,
  Vector3,
} from 'three'
import type { PecaDaFesta } from './arranjo-da-festa'
import { configurarAcao, iniciarClipe } from './arte-animada'

export const luzDaFesta = (nome: string) =>
  ['luz', 'fogo', 'brasa', 'estrela'].includes(nome) ||
  nome.startsWith('lanterna') ||
  nome.startsWith('fogoArtificio')

/** O arquivo é um catálogo: conserva os referenciais animados dentro de uma origem corrigida. */
export function copiarPecaDaFesta(
  catalogo: Object3D,
  clipes: readonly AnimationClip[],
  p: PecaDaFesta,
) {
  const base = catalogo.getObjectByName(p.nos[0] ?? '')
  if (!base) throw new Error(`Peça de festa ausente: ${p.id}`)
  const raiz = new Group(),
    animada = new Group()
  raiz.name = `festa-${p.id}`
  raiz.position.fromArray(p.posicao)
  raiz.rotation.y = p.giro ?? 0
  raiz.add(animada)
  animada.position.copy(base.position).negate()
  const materiais = new Map<MeshStandardMaterial, MeshStandardMaterial>()
  const luzes: { material: MeshStandardMaterial; forca: number }[] = []
  for (const nome of p.nos) {
    const no = catalogo.getObjectByName(nome)
    if (!no) throw new Error(`Nó da festa ausente: ${nome}`)
    const copia = no.clone(true)
    copia.traverse((o) => {
      const m = o as Mesh
      if (!m.isMesh) return
      const preparar = (material: import('three').Material) => {
        if (!(material instanceof MeshStandardMaterial) || !luzDaFesta(material.name))
          return material
        let proprio = materiais.get(material)
        if (!proprio) {
          proprio = material.clone()
          materiais.set(material, proprio)
          luzes.push({ material: proprio, forca: material.emissiveIntensity })
        }
        return proprio
      }
      m.material = Array.isArray(m.material) ? m.material.map(preparar) : preparar(m.material)
    })
    animada.add(copia)
  }
  const mixer = new AnimationMixer(animada)
  if (p.clipe) {
    const clipe = clipes.find((c) => c.name === p.clipe)
    if (!clipe) throw new Error(`Clipe da festa ausente: ${p.clipe}`)
    const acao = mixer.clipAction(clipe)
    configurarAcao(acao, [])
    iniciarClipe(acao, `festa-${p.id}`, 0)
  }
  return {
    raiz,
    mixer,
    luzes,
    soltar() {
      mixer.stopAllAction()
      mixer.uncacheRoot(animada)
      for (const m of materiais.values()) m.dispose()
    },
  }
}

/** Os vazios do catálogo são irmãos do trecho. Usa a diferença real entre as pontas. */
export function emendasDoVaral(catalogo: Object3D, peca: PecaDaFesta): PecaDaFesta[] {
  if (!peca.varal) return [peca]
  const esquerda = catalogo.getObjectByName('ponta-esq'),
    direita = catalogo.getObjectByName('ponta-dir')
  if (!esquerda || !direita) throw new Error('Varal sem pontas de emenda')
  const passo = direita.position
    .clone()
    .sub(esquerda.position)
    .applyAxisAngle(new Vector3(0, 1, 0), peca.giro ?? 0)
  return Array.from({ length: peca.varal }, (_, i) => ({
    ...peca,
    id: `${peca.id}-${i}`,
    varal: undefined,
    posicao: [
      peca.posicao[0] + passo.x * i,
      peca.posicao[1] + passo.y * i,
      peca.posicao[2] + passo.z * i,
    ] as [number, number, number],
  }))
}

/** Só para o GLB carregado por esta montagem, nunca para caches de outros componentes. */
export function soltarCatalogo(raiz: Object3D) {
  const geometrias = new Set<import('three').BufferGeometry>(),
    materiais = new Set<import('three').Material>()
  raiz.traverse((o) => {
    const m = o as Mesh
    if (!m.isMesh) return
    geometrias.add(m.geometry)
    for (const a of Array.isArray(m.material) ? m.material : [m.material]) materiais.add(a)
  })
  for (const g of geometrias) g.dispose()
  for (const m of materiais) m.dispose()
}

/** Leitura do desenho real, chamada só pelo medidor opcional. */
export function medirFesta(cena: Object3D) {
  let grupo: Object3D | undefined
  cena.traverse((o) => {
    if (o.name.startsWith('festa-da-vila-')) grupo = o
  })
  const fogo = grupo?.getObjectByName('fogo')
  const emissao: number[] = []
  fogo?.traverse((o) => {
    const m = o as Mesh
    if (!m.isMesh) return
    for (const a of Array.isArray(m.material) ? m.material : [m.material])
      if (a instanceof MeshStandardMaterial && a.name === 'fogo') emissao.push(a.emissiveIntensity)
  })
  return {
    nome: grupo?.name ?? null,
    pecas: grupo?.children.filter((c) => c.name.startsWith('festa-')).length ?? 0,
    emissao,
    escalaDoFogo: fogo?.scale.toArray() ?? [],
  }
}
