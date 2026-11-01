import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ILHAS, ilhaAberta } from '@sistemazero/arquipelago-contracts'
import { Box3, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { soParaOCorpo } from '../src/mundo/colisores-da-ilha'
import { COLISOR_DA_LUNETA, LUNETA, vistaDaLuneta } from '../src/mundo/luneta-medidas'
import { PIER } from '../src/mundo/medidas'
import {
  ACENO_DA_LUNETA,
  artigoDaIlha,
  BICHO_DA_LUNETA,
  bichoDaLuneta,
  deveAcenar,
  falaDaLuneta,
  ilhaDaLuneta,
  moradorDaLuneta,
  passoDaPrevia,
  recadoDaPlaca,
  SEGREDO_DA_LUNETA,
  segredoDaLuneta,
} from '../src/sistemas/luneta'
import { criarPesos, passoDosPesos, perfilDaVez } from '../src/sistemas/perfis-de-camera'

describe('luneta', () => {
  test('cada ilha com o artigo do nome (a Vila Doce, a Ilha das Nuvens, o Bosque dos Bichos)', () => {
    const artigos = Object.fromEntries(
      ILHAS.filter((i) => i.angulo !== null).map((i) => [i.id, artigoDaIlha(i)]),
    )
    expect(artigos).toEqual({
      bosque: 'o',
      'vila-doce': 'a',
      recife: 'o',
      pico: 'o',
      'vale-dos-dinos': 'o',
      nuvens: 'a',
    })
  })

  test('mostra a primeira ilha ainda fechada e depois o Farol', () => {
    const esperadas = [
      'bosque',
      'vila-doce',
      'recife',
      'pico',
      'vale-dos-dinos',
      'nuvens',
      'farol',
      'farol',
    ] as const
    for (let p = 1; p <= 8; p++) {
      const alvo = ilhaDaLuneta(p)
      expect(alvo.id).toBe(esperadas[p - 1]!)
      if (alvo.id !== 'farol') expect(ilhaAberta(alvo.id, p)).toBe(false)
    }
    expect(ilhaDaLuneta(Number.NaN).id).toBe('bosque')
    expect(ilhaDaLuneta(-1).id).toBe('bosque')
    expect(ilhaDaLuneta(99).id).toBe('farol')
  })
  test('Zappy usa o nome da ilha e o posto, sem números, cobrança ou pontuação proibida', () => {
    expect(falaDaLuneta(ilhaDaLuneta(2))).toBe(
      'Lá é a Vila Doce. A ponte abre quando você chegar a Inventor(a).',
    )
    expect(falaDaLuneta(ilhaDaLuneta(1))).toContain('o Bosque dos Bichos')
    expect(falaDaLuneta(ilhaDaLuneta(7))).not.toContain('ponte')
    for (const ilha of ILHAS.filter((i) => i.angulo !== null)) {
      for (const texto of [falaDaLuneta(ilha), recadoDaPlaca(ilha)]) {
        expect(texto).not.toMatch(/[\d!?—]/)
        expect(texto).not.toMatch(/falta|bloquead|precisa|obrigat/i)
      }
    }
  })
  test('o perfil é exclusivo e participa dos pesos sem perder a soma', () => {
    expect(
      perfilDaVez({ luneta: true, conversa: true, dentroDeCasa: true, correndoPercurso: true }),
    ).toBe('luneta')
    const pesos = criarPesos()
    for (let i = 0; i < 60; i++) passoDosPesos(pesos, 'luneta', 1 / 60)
    expect(pesos.luneta).toBeGreaterThan(0.99)
    expect(Object.values(pesos).reduce((a, b) => a + b, 0)).toBeCloseTo(1)
  })
  test('a vista cabe em paisagem e retrato, e o Farol tem seu próprio alvo', () => {
    for (let p = 1; p <= 8; p++) {
      const ilha = ilhaDaLuneta(p)
      const larga = vistaDaLuneta(ilha, 16 / 9)
      const estreita = vistaDaLuneta(ilha, 390 / 844)
      const distancia = (v: typeof larga) =>
        Math.hypot(v.posicao.x - v.alvo.x, v.posicao.z - v.alvo.z)
      expect(distancia(estreita)).toBeGreaterThan(distancia(larga))
      expect(
        distancia(estreita) * Math.tan((estreita.campo * Math.PI) / 360) * (390 / 844),
      ).toBeGreaterThanOrEqual(16.99)
    }
    expect(vistaDaLuneta(ilhaDaLuneta(8), 1).alvo).toEqual({ x: -12, y: 5, z: -13 })
  })
  test('a prévia tem movimento lento e vira imagem estável com menos movimento', () => {
    const p = { x: 0, brilho: 0, rumo: 0 }
    passoDaPrevia(0, false, p)
    const antes = { ...p }
    // Indo para +x, virado para +x; na volta, para -x; na ponta, de frente para a luneta.
    expect(p.rumo).toBeCloseTo(Math.PI / 2)
    passoDaPrevia(1.5, false, p)
    expect(p.x).not.toBe(antes.x)
    expect(p.brilho).toBeGreaterThanOrEqual(0.65)
    expect(p.rumo).toBeCloseTo(0)
    passoDaPrevia(3, false, p)
    expect(p.rumo).toBeCloseTo(-Math.PI / 2)
    passoDaPrevia(0, true, p)
    const parado = { ...p }
    expect(parado.rumo).toBe(0)
    passoDaPrevia(1000, true, p)
    expect(p).toEqual(parado)
  })
  test('modelos prontos têm tubo e face texto; o colisor é simples e só segura o corpo', async () => {
    for (const nome of ['luneta', 'placa-quadro']) {
      const b = readFileSync(`${import.meta.dir}/../src/assets/itens/${nome}.glb`)
      const g = await new GLTFLoader().parseAsync(
        b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
        '',
      )
      expect(g.scene.getObjectByName(nome === 'luneta' ? 'tubo' : 'texto')).toBeDefined()
      const tamanho = new Box3().setFromObject(g.scene).getSize(new Vector3())
      expect(tamanho.y).toBeGreaterThan(0.9)
    }
    expect(COLISOR_DA_LUNETA).toHaveLength(1)
    expect(COLISOR_DA_LUNETA[0]?.forma).toBe('cilindro')
    expect(soParaOCorpo(COLISOR_DA_LUNETA[0]?.nome ?? '')).toBe(true)
    expect(LUNETA.x).toBe(PIER.x)
    expect(LUNETA.z).toBeGreaterThan(PIER.z + PIER.comprimento - 2)
    expect(LUNETA.z).toBeLessThan(PIER.z + PIER.comprimento)
  })
})

describe('o morador acenando pela luneta (§6.28, A18)', () => {
  test('cada ilha do anel mostra o morador dela; o Farol, nenhum', () => {
    expect(moradorDaLuneta({ id: 'bosque' })).toBe('capi')
    expect(moradorDaLuneta({ id: 'vila-doce' })).toBe('bento')
    expect(moradorDaLuneta({ id: 'recife' })).toBe('mare')
    expect(moradorDaLuneta({ id: 'pico' })).toBe('floco')
    expect(moradorDaLuneta({ id: 'vale-dos-dinos' })).toBe('jade')
    expect(moradorDaLuneta({ id: 'nuvens' })).toBe('irie')
    expect(moradorDaLuneta({ id: 'farol' })).toBeNull()
  })

  test('acena de tempos em tempos, nunca antes de o aceno terminar, e não com menos movimento', () => {
    expect(deveAcenar(0, -Infinity, 2, false)).toBe(true)
    expect(deveAcenar(3, 0, 2, false)).toBe(false)
    expect(deveAcenar(ACENO_DA_LUNETA.aCada, 0, 2, false)).toBe(true)
    expect(deveAcenar(ACENO_DA_LUNETA.aCada, 0, 9, false)).toBe(false)
    expect(deveAcenar(100, 0, 2, true)).toBe(false)
  })
})

/** Os nomes dos clipes de um GLB (lidos do JSON do arquivo, sem montar a cena). */
function clipesDoGlb(caminho: string): string[] {
  const buf = readFileSync(caminho)
  const json = JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString('utf8')) as {
    animations?: { name?: string }[]
  }
  return (json.animations ?? []).map((a) => a.name ?? '')
}

const ASSETS = join(import.meta.dir, '..', 'src', 'assets')

describe('o bicho correndo e o segredo brilhando pela luneta (lacunas, 01/11/2026)', () => {
  const doAnel = ILHAS.filter((i) => i.angulo !== null)

  test('cada ilha do anel tem um bicho dela e o Lumi de luz da família; o Farol, nenhum', () => {
    for (const ilha of doAnel) {
      expect(bichoDaLuneta(ilha)).not.toBeNull()
      expect(segredoDaLuneta(ilha)).not.toBeNull()
    }
    expect(bichoDaLuneta({ id: 'farol' })).toBeNull()
    expect(segredoDaLuneta({ id: 'farol' })).toBeNull()
    // A Vila ganhou o bicho dela: a ovelhinha de algodão-doce.
    expect(bichoDaLuneta({ id: 'vila-doce' })?.bicho).toBe('ovelhinha')
  })

  test('os arquivos dos bichos têm os clipes de correr e de ficar parado que a luneta toca', () => {
    for (const { bicho, correr, parado } of Object.values(BICHO_DA_LUNETA)) {
      const clipes = clipesDoGlb(join(ASSETS, 'bichos', `${bicho}.glb`))
      expect(clipes).toContain(correr)
      expect(clipes).toContain(parado)
    }
  })

  test('os Lumis de luz têm o clipe parado (a coroa gira)', () => {
    for (const segredo of Object.values(SEGREDO_DA_LUNETA))
      expect(clipesDoGlb(join(ASSETS, 'lumis', `${segredo}.glb`))).toContain('parado')
  })
})

test('a placa da ponte não leva a assinatura da Íris (lacunas, 01/11/2026)', () => {
  for (const ilha of ILHAS.filter((i) => i.angulo !== null))
    expect(recadoDaPlaca(ilha)).not.toContain('Íris')
})
