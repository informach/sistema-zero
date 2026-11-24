/** Fixture privada de QA: monta peças reais com o mesmo encaixe da plataforma; não entra no motor. */

import { Box3, Group, Matrix4, SkinnedMesh, SRGBColorSpace, TextureLoader } from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import {
  copiarEsqueletoDoPack,
  prepararPecaDoPack,
} from '../../../avatar-quarto/src/avatar/pack-instance'
import { AVATAR_CATALOG as catalogo, withBaseBottom, withEars } from '../../../core/src/avatar'

export async function avatarCuteParaEnsaio() {
  const ler = new GLTFLoader(),
    url = (arquivo: string) => `/qa-cute/${arquivo}`
  const esqueleto = await ler.loadAsync(url(catalogo.base.skeleton.file))
  const movimento = await ler.loadAsync(url(catalogo.base.skeleton.game!.file))
  const montagem = copiarEsqueletoDoPack(esqueleto.scene),
    raiz = new Group()
  raiz.add(montagem.cena)
  const texturas = new Map()
  for (const [id, arquivo] of Object.entries(catalogo.base.textures)) {
    const textura = await new TextureLoader().loadAsync(url(arquivo))
    textura.colorSpace = SRGBColorSpace
    textura.flipY = false
    texturas.set(id, textura)
  }
  const slots = withBaseBottom(
    catalogo,
    withEars(catalogo, {
      ...catalogo.rules.default,
      roupa_cima: 'roupa_cima_camiseta_branca_pacote',
      bermuda: 'bermuda_verde_pacote',
      cabelo: 'cabelo_curto_castanho_pacote',
    }),
  )
  const pecas = []
  for (const [slot, id] of Object.entries(slots)) {
    const parte = catalogo.parts[id]
    if (!parte) throw new Error(`Peça de QA ausente: ${id}`)
    const modelo = await ler.loadAsync(url(parte.file))
    const presa = prepararPecaDoPack(
      modelo.scene,
      montagem.ossos,
      texturas,
      undefined,
      slot === 'corpo' || slot === 'orelhas' ? 0 : 1,
    )
    if (presa.faltando.length) throw new Error(`Ossos ausentes: ${presa.faltando.join(', ')}`)
    for (const [indice, p] of presa.pecas.entries()) {
      const malha = new SkinnedMesh(p.geometry, p.material)
      malha.name = `${slot}_${indice}`
      malha.skeleton = p.skeleton
      malha.bindMatrix.copy(new Matrix4())
      malha.bindMatrixInverse.identity()
      malha.morphTargetDictionary = p.morphTargetDictionary
      malha.morphTargetInfluences = p.morphTargetInfluences
      raiz.add(malha)
    }
    pecas.push(presa)
  }
  raiz.updateMatrixWorld(true)
  const caixa = new Box3().setFromObject(raiz)
  let triangulos = 0
  raiz.traverse((no) => {
    if (no instanceof SkinnedMesh)
      triangulos += (no.geometry.index?.count ?? no.geometry.getAttribute('position').count) / 3
  })
  const nomes = ['parado_relaxado', 'andar_frente', 'correr_frente', 'pulo_no_ar']
  const clipes = nomes.map((nome) => {
    const clipe = [...esqueleto.animations, ...movimento.animations].find((c) => c.name === nome)
    if (!clipe) throw new Error(`Clipe de QA ausente: ${nome}`)
    return clipe
  })
  try {
    const bytes = await new GLTFExporter().parseAsync(raiz, { binary: true, animations: clipes })
    if (!(bytes instanceof ArrayBuffer)) throw new Error('A fixture precisa sair como GLB')
    return {
      bytes,
      altura: caixa.max.y - caixa.min.y,
      min: caixa.min.toArray(),
      max: caixa.max.toArray(),
      triangulos,
      clipes: nomes,
    }
  } finally {
    for (const p of pecas) p.soltar()
    for (const t of texturas.values()) t.dispose()
  }
}
