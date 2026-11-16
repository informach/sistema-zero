import { literalResourcePath } from '@sistemazero/molda/arquivos'
import { conferirGlb, digestDosBytes } from '@sistemazero/molda-cenarios-core/v2'
import { Box3, Loader, LoadingManager, Mesh, type Object3D, Texture, Vector3 } from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import { abrirConjunto, LIMITE_DO_CONJUNTO } from './conjunto'
import { ArquivoDoConjunto, RecursosDoConjunto, recursosDoGltf } from './recursos'

export interface ModeloConvertido {
  caminho: string
  bytes: Uint8Array<ArrayBuffer>
  digest: string
  min: [number, number, number]
  max: [number, number, number]
  triangulos: number
}
export interface ImportacaoConvertida {
  modelos: ModeloConvertido[]
  recusados: { arquivo: string; motivo: string }[]
}

/** No worker, imagens são ImageBitmap; nada cria elementos HTML nem busca recursos fora do pacote. */
class LeitorDeTexturas extends Loader<Texture> {
  constructor(
    manager: LoadingManager,
    private readonly pendentes: Promise<void>[],
    private readonly recursos: RecursosDoConjunto,
    private readonly erros: unknown[],
  ) {
    super(manager)
  }
  load(
    url: string,
    pronto?: (t: Texture) => void,
    _andamento?: (e: ProgressEvent) => void,
    falhou?: (e: unknown) => void,
  ): Texture {
    const textura = new Texture()
    const p = Promise.resolve()
      .then(async () => {
        const imagem = await createImageBitmap(this.recursos.ler(url), {
          imageOrientation: 'flipY',
          premultiplyAlpha: 'none',
        })
        textura.image = imagem
        textura.flipY = false
        textura.needsUpdate = true
        pronto?.(textura)
      })
      .catch((erro) => {
        falhou?.(erro)
        this.erros.push(erro)
      })
    this.pendentes.push(p)
    return textura
  }
}

function soltar(raiz: Object3D) {
  const recursos = new Set<{ dispose(): void }>(),
    imagens = new Set<ImageBitmap>()
  raiz.traverse((no) => {
    if (!(no instanceof Mesh)) return
    const mesh = no
    recursos.add(mesh.geometry)
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      recursos.add(m)
      for (const t of Object.values(m))
        if (t instanceof Texture) {
          recursos.add(t)
          if (typeof ImageBitmap !== 'undefined' && t.image instanceof ImageBitmap)
            imagens.add(t.image)
        }
    }
  })
  for (const r of recursos) r.dispose()
  for (const i of imagens) i.close()
}

export async function converterConjunto(
  entradas: readonly { caminho: string; arquivo: File }[],
  andamento: (feitos: number, total: number) => void,
): Promise<ImportacaoConvertida> {
  const arquivos = await abrirConjunto(entradas),
    principais = [...arquivos.keys()].filter((p) => /\.(glb|gltf|obj|fbx)$/i.test(p)),
    modelos: ModeloConvertido[] = [],
    recusados: ImportacaoConvertida['recusados'] = []
  let totalConvertido = 0
  for (const [i, caminho] of principais.entries()) {
    const pendentes: Promise<void>[] = [],
      erros: unknown[] = []
    const recursos = new RecursosDoConjunto(arquivos, caminho)
    let raiz: Object3D | null = null
    try {
      const fonte = arquivos.get(caminho)!
      if (fonte.size > 64 * 1024 * 1024) throw Error('O modelo passa de 64 MB')
      let bytes = new Uint8Array(await fonte.arrayBuffer())
      if (!/\.glb$/i.test(caminho)) {
        const manager = new LoadingManager()
        if (/\.gltf$/i.test(caminho)) {
          const loader = new GLTFLoader(manager)
          loader.register((parser) => {
            recursosDoGltf(parser, recursos, erros)
            return { name: 'sz_recursos_locais' }
          })
          const gltf = await loader.parseAsync(new TextDecoder().decode(bytes), '')
          raiz = gltf.scene
          raiz.animations = gltf.animations
        } else {
          manager.addHandler(/.*/, new LeitorDeTexturas(manager, pendentes, recursos, erros))
          if (/\.obj$/i.test(caminho)) {
            const texto = new TextDecoder().decode(bytes),
              loader = new OBJLoader(manager),
              materiais = [...texto.matchAll(/^\s*mtllib\s+(.+)$/gm)].map((m) => m[1]!.trim())
            const info: MTLLoader.MaterialCreator['materialsInfo'] = {}
            for (const material of materiais) {
              const path = literalResourcePath(material, caminho, 'material'),
                arquivo = arquivos.get(path)
              if (!arquivo) throw Error(`Falta o material ${path}`)
              const pasta = path.split('/').slice(0, -1).join('/')
              const mtl = new MTLLoader(manager).parse(
                await arquivo.text(),
                `__pacote__/${pasta ? `${pasta}/` : ''}`,
              )
              // Guarda o caminho completo de cada textura antes de juntar as bibliotecas MTL.
              for (const value of Object.values(mtl.materialsInfo))
                for (const [key, raw] of Object.entries(value))
                  if (/^(map_|bump|disp|decal|norm)/i.test(key) && typeof raw === 'string') {
                    const url = mtl.getTextureParams(raw, {}).url
                    Object.assign(value, {
                      [key]: raw.replace(
                        url,
                        `__pacote__/${literalResourcePath(url, path, 'textura')}`,
                      ),
                    })
                  }
              Object.assign(info, mtl.materialsInfo)
            }
            if (materiais.length) {
              const mtl = new MTLLoader(manager).parse('', '')
              mtl.setMaterials(info)
              mtl.preload()
              loader.setMaterials(mtl)
            }
            raiz = loader.parse(texto)
          } else {
            // FBXLoader usa apenas window.URL para imagens binárias embutidas. O adaptador
            // do worker guarda esses Blobs no mesmo conjunto local, sem DOM nem rede.
            if (typeof document === 'undefined')
              Object.defineProperty(globalThis, 'window', {
                configurable: true,
                value: { URL: { createObjectURL: recursos.embutir } },
              })
            raiz = new FBXLoader(manager).parse(bytes.buffer, '')
            // O FBX declara centímetros por unidade; o documento de cenário usa metros.
            const unidade: unknown = raiz.userData.unitScaleFactor
            if (typeof unidade === 'number' && Number.isFinite(unidade) && unidade > 0)
              raiz.scale.multiplyScalar(unidade / 100)
          }
          await Promise.all(pendentes)
        }
        if (erros.length) throw erros[0]
        raiz.updateMatrixWorld(true)
        const caixa = new Box3().setFromObject(raiz)
        if (caixa.isEmpty() || !Number.isFinite(caixa.getSize(new Vector3()).length()))
          throw Error('O modelo não contém geometria válida')
        const glb = await new GLTFExporter().parseAsync(raiz, {
          binary: true,
          onlyVisible: false,
          animations: raiz.animations,
        })
        if (!(glb instanceof ArrayBuffer)) throw Error('A conversão não produziu um GLB')
        bytes = new Uint8Array(glb)
      }
      conferirGlb(bytes)
      if (totalConvertido + bytes.byteLength > LIMITE_DO_CONJUNTO)
        throw Error('Os modelos convertidos passam de 512 MB. Traga o pacote em partes')
      // Para medir, basta a geometria; imagens serão decodificadas uma vez ao fotografar.
      const medidor = new GLTFLoader()
      medidor.register((parser) => {
        parser.fileLoader = new ArquivoDoConjunto(parser.options.manager, recursos)
        return {
          name: 'sz_medida_sem_imagens',
          loadTexture: () => Promise.resolve(new Texture()),
        }
      })
      const medido = await medidor.parseAsync(bytes.buffer, '')
      let triangulos = 0
      medido.scene.updateMatrixWorld(true)
      const caixa = new Box3().setFromObject(medido.scene)
      medido.scene.traverse((o) => {
        if (o instanceof Mesh)
          triangulos += (o.geometry.index?.count ?? o.geometry.getAttribute('position').count) / 3
      })
      if (
        caixa.isEmpty() ||
        ![...caixa.min.toArray(), ...caixa.max.toArray()].every(Number.isFinite)
      ) {
        soltar(medido.scene)
        throw Error('O modelo não contém geometria')
      }
      const min: [number, number, number] = [caixa.min.x, caixa.min.y, caixa.min.z],
        max: [number, number, number] = [caixa.max.x, caixa.max.y, caixa.max.z]
      soltar(medido.scene)
      totalConvertido += bytes.byteLength
      modelos.push({
        caminho: caminho.replace(/\.(gltf|obj|fbx)$/i, '.glb'),
        bytes,
        digest: await digestDosBytes(bytes),
        min,
        max,
        triangulos,
      })
    } catch (e) {
      recusados.push({
        arquivo: caminho,
        motivo: e instanceof Error ? e.message : 'Não consegui converter este modelo',
      })
    } finally {
      await Promise.all(pendentes)
      if (raiz) soltar(raiz)
      recursos.limpar()
    }
    andamento(i + 1, principais.length)
  }
  if (!principais.length)
    recusados.push({
      arquivo: '',
      motivo: 'Escolha modelos GLB, GLTF, OBJ, FBX ou um ZIP com modelos',
    })
  return { modelos, recusados }
}
