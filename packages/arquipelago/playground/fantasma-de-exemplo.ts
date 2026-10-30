import { type Fantasma, FantasmaSchema } from '@sistemazero/arquipelago-contracts'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import vilaGlb from '../src/assets/ilhas/vila-doce.glb'
import { percursoNoMundo } from '../src/mundo/bosque'
import { liberarObjeto } from '../src/mundo/carregar-ilha'
import { giroDaIlha, ilhasEmVolta } from '../src/mundo/medidas'
import {
  type AncorasDosTelhados,
  NOMES_DAS_ANCORAS_DOS_TELHADOS,
  telhadosNoModelo,
} from '../src/mundo/telhados'
import { CORPO } from '../src/sistemas/corpo'

/** Massa explícita do playground. É um trajeto simulado pelas âncoras, não uma corrida humana. */
export async function fantasmaDeExemplo(): Promise<Fantasma> {
  const g = await new GLTFLoader().loadAsync(new URL(vilaGlb, import.meta.url).href)
  try {
    const vila = ilhasEmVolta().find((i) => i.ilha.id === 'vila-doce')
    if (!vila) throw new Error('Vila ausente do mapa')
    const ancoras = Object.fromEntries(
      NOMES_DAS_ANCORAS_DOS_TELHADOS.map((nome) => {
        const p = g.scene.getObjectByName(nome)?.position
        if (!p) throw new Error(`Vila sem âncora ${nome}`)
        return [nome, { x: p.x, y: p.y, z: p.z }]
      }),
    )
    // O conversor pede cada âncora conhecida e o laço acima recusa a ausência de qualquer uma.
    const ler = (nome: keyof AncorasDosTelhados) => {
      const p = ancoras[nome]
      if (!p) throw new Error(`Âncora ausente: ${nome}`)
      return p
    }
    const pontos = percursoNoMundo(
      telhadosNoModelo({
        fonte: ler('fonte'),
        'telhados-inicio': ler('telhados-inicio'),
        'telhados-1': ler('telhados-1'),
        'telhados-2': ler('telhados-2'),
        'telhados-3': ler('telhados-3'),
        'telhados-fim': ler('telhados-fim'),
      }),
      { ...vila.centro, y: 0 },
      giroDaIlha(vila.ilha),
    )
    const caminho = [pontos.largada, ...pontos.deques, pontos.chegada]
    const tempoMs = 25900
    const amostras: Fantasma['amostras'] = []
    for (let t = 0; t <= tempoMs; t += 100) {
      const f = (t / tempoMs) * (caminho.length - 1),
        i = Math.min(caminho.length - 2, Math.floor(f))
      const a = caminho[i]!,
        b = caminho[i + 1]!,
        p = f - i
      const giro = (Math.atan2(b.x - a.x, b.z - a.z) / (2 * Math.PI) + 1) % 1
      amostras.push([
        Math.round((a.x + (b.x - a.x) * p) * 100),
        Math.round((a.y + (b.y - a.y) * p + CORPO.doCentroAoPe) * 100),
        Math.round((a.z + (b.z - a.z) * p) * 100),
        Math.round(giro * 65536) % 65536,
      ])
    }
    return FantasmaSchema.parse({
      versao: 1,
      percurso: 'vila-telhados',
      tempoMs,
      passoMs: 100,
      amostras,
    })
  } finally {
    liberarObjeto(g.scene)
  }
}
