import type * as THREE from 'three'
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js'

/**
 * A cena do jogo da Ilha do Farol (o `.glb` de `gerar-ilha-artes.ts`, com a ilha, o farol, o barco,
 * as pedras, o personagem, a chave e a bancada), lida pelo three.js. É a MESMA para as experiências
 * das aulas 1 e 2 (`IslandWorld`) e para a porta da aula 3 (`IlhaDoJogo`): as duas carregam daqui,
 * para o jeito de ler o arquivo não divergir.
 *
 * Tudo é importado na hora (three.js e o `.glb` só pesam em quem abre uma experiência 3D).
 */
export async function carregarIlhaDoJogo(): Promise<{ T: typeof THREE; gltf: GLTF }> {
  const [T, { GLTFLoader }, { ILHA_SCENE_GLB }] = await Promise.all([
    import('three'),
    import('three/addons/loaders/GLTFLoader.js'),
    import('@sistemazero/studio/ilha-farol-scene'),
  ])
  // As texturas de dentro do .glb (o céu em degradê): no Chrome o GLTFLoader as lê com
  // fetch(blob:), que a CSP dos apps não libera em connect-src. Pela <img> (o caminho que
  // ele usa no Safari) o img-src blob: deixa. O arquivo em si é decodificado aqui.
  const loader = new GLTFLoader()
  loader.register((parser) => {
    const p = parser as unknown as {
      textureLoader: THREE.Loader
      options: { manager: THREE.LoadingManager }
    }
    p.textureLoader = new T.TextureLoader(p.options.manager)
    return { name: 'sz_textures_by_img' }
  })
  const glb = Uint8Array.from(atob(ILHA_SCENE_GLB.slice(ILHA_SCENE_GLB.indexOf(',') + 1)), (c) =>
    c.charCodeAt(0),
  )
  return { T, gltf: await loader.parseAsync(glb.buffer, '') }
}
