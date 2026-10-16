import type { ProAssetManifestEntry } from './proAssets'
import type { ProjectTree } from './proProject'

export interface ProExample {
  id: string
  name: string
  label: string
  explanation: string
  code: string
  asset?: Pick<ProAssetManifestEntry, 'id' | 'url' | 'sha256'>
}

function usesThree(tree: ProjectTree): boolean {
  const file = tree['package.json']
  if (file?.kind !== 'file') return false
  try {
    const value = JSON.parse(file.content)
    return typeof value?.dependencies?.three === 'string'
  } catch {
    return false
  }
}

/** Explicit top-level helpers, never guesses about a game's player/scene or insertion cursor. */
export function proAssetExample(
  asset: ProAssetManifestEntry,
  path: string,
  tree: ProjectTree,
): ProExample | null {
  if (!/\.[cm]?[jt]sx?$/.test(path)) return null
  const url = JSON.stringify(asset.url)
  if (asset.kind === 'image')
    return {
      id: 'image',
      name: 'carregarImagem',
      label: `carregar a imagem ${asset.name}`,
      explanation:
        'Cria uma imagem que você pode desenhar no Canvas ou adicionar à página. Para sprites, use as dimensões de quadro mostradas acima.',
      code: `// Uso dentro de uma função async: const imagem = await carregarImagem()\n// Canvas: contexto.drawImage(imagem, 20, 20)\nasync function carregarImagem() {\n  const imagem = new Image()\n  imagem.src = ${url}\n  await imagem.decode()\n  return imagem\n}`,
    }
  if (asset.kind === 'audio')
    return {
      id: 'audio',
      name: 'criarSom',
      label: `carregar o som ${asset.name}`,
      explanation:
        'Prepara o som. Chame play após um clique ou uma tecla para respeitar os controles de áudio do navegador.',
      code: `// Uso: const som = criarSom()\n// Dentro de um clique/tecla: som.play().catch(console.error)\nfunction criarSom() {\n  const som = new Audio(${url})\n  som.volume = 0.5\n  return som\n}`,
    }
  if (!usesThree(tree)) return null
  if (asset.kind === 'model3d')
    return {
      id: 'model',
      name: 'carregarModelo',
      label: `carregar o modelo ${asset.name}`,
      explanation:
        'Usa Three.js, declarado neste projeto. Retorna cena e animações; você escolhe posição, escala e como adicionar ao jogo.',
      code: `// Uso dentro de uma função async: const modelo = await carregarModelo()\n// Na sua cena Three.js: cena.add(modelo.scene)\n// Animações ficam em modelo.animations; não começam automaticamente.\nasync function carregarModelo() {\n  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js')\n  return new GLTFLoader().loadAsync(${url})\n}`,
    }
  if (asset.kind === 'environment3d')
    return {
      id: 'environment',
      name: 'carregarCeu',
      label: `carregar o céu ${asset.name}`,
      explanation:
        'Usa Three.js, declarado neste projeto. Retorna a textura HDR para o fundo ou a iluminação da sua cena.',
      code: `// Uso dentro de uma função async: const ceu = await carregarCeu()\n// Na sua cena Three.js: cena.background = ceu; cena.environment = ceu\nasync function carregarCeu() {\n  const { RGBELoader } = await import('three/addons/loaders/RGBELoader.js')\n  const { EquirectangularReflectionMapping } = await import('three')\n  const textura = await new RGBELoader().loadAsync(${url})\n  textura.mapping = EquirectangularReflectionMapping\n  return textura\n}`,
    }
  return null
}

export function proCodeExamples(path: string): ProExample[] {
  if (!/\.[cm]?[jt]sx?$/.test(path)) return []
  const typed = /\.[cm]?tsx?$/.test(path)
  return [
    {
      id: 'counter',
      name: 'criarPlacar',
      label: 'um placar',
      explanation: 'Guarda os pontos. Você decide quando somar e onde mostrar o resultado.',
      code: `// Uso: const placar = criarPlacar()\n// Ao ganhar um ponto: placar.somar(); console.log(placar.ler())\nfunction criarPlacar() {\n  let pontos = 0\n  return {\n    somar: () => { pontos += 1 },\n    ler: () => pontos,\n    reiniciar: () => { pontos = 0 },\n  }\n}`,
    },
    {
      id: 'keyboard',
      name: 'escutarTecla',
      label: 'uma ação de teclado',
      explanation:
        'Observa uma tecla sem capturá-la enquanto alguém digita num campo. Devolve uma função para parar de escutar.',
      code: `// Uso: const parar = escutarTecla('Space', () => console.log('Pular!'))\n// Quando sair desta cena: parar()\nfunction escutarTecla(codigo${typed ? ': string' : ''}, agir${typed ? ': () => void' : ''}) {\n  function aoPressionar(evento${typed ? ': KeyboardEvent' : ''}) {\n    const alvo = evento.target\n    if (alvo instanceof HTMLElement && alvo.closest('input, textarea, select, [contenteditable="true"]')) return\n    if (evento.code === codigo && !evento.repeat) agir()\n  }\n  window.addEventListener('keydown', aoPressionar)\n  return () => window.removeEventListener('keydown', aoPressionar)\n}`,
    },
  ]
}
