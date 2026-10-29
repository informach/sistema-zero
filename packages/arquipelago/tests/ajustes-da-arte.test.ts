import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { ilha } from '@sistemazero/arquipelago-contracts'
import { AnimationMixer, Box3, Group, LoopOnce } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import {
  animarBocas,
  configurarAcao,
  copiarArteAnimada,
  iluminarArte,
  iniciarClipe,
} from '../src/mundo/arte-animada'
import { prepararIlha, soltarExtras } from '../src/mundo/ilha-completa'
import {
  alturaDoVoo,
  bocaDaIris,
  capsulaDoPinguim,
  ELEVACAO_DOS_PATINS,
  PE_PARADO_ACIMA_DA_SOLA,
  RODAS_ABAIXO_DA_SOLA,
  faseDaAnimacao,
} from '../src/sistemas/ajustes-da-arte'
import { momentoDoDia } from '../src/sistemas/tempo-do-dia'

async function modelo(nome: string) {
  const b = readFileSync(`${import.meta.dir}/../src/assets/${nome}.glb`)
  return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '')
}

test('carregador de ilhas prepara pérolas e cristais do Recife sem ativar a ilha', async () => {
  const g = await modelo('ilhas/recife')
  const p = prepararIlha(g.scene, ilha('recife'))
  expect(p.luzesNoturnas.some((l) => l.material.name === 'perolaLuz')).toBe(true)
  expect(p.luzesNoturnas.some((l) => l.material.name === 'cristalLuz')).toBe(true)
  iluminarArte(p.luzesNoturnas, false)
  expect(p.luzesNoturnas.every((l) => l.material.emissiveIntensity === 0)).toBe(true)
  iluminarArte(p.luzesNoturnas, true)
  expect(p.luzesNoturnas.every((l) => l.material.emissiveIntensity === l.forca)).toBe(true)
  soltarExtras(p)
})

test('fase estável por id e clipe, sem depender da ordem ou do relógio', () => {
  const ids = ['capi', 'nico', 'estrelinha', 'buzio', 'bosque-gato', 'adotado-gato']
  const fases = ids.map((id) => faseDaAnimacao(id, 'parado'))
  expect(new Set(fases).size).toBe(ids.length)
  expect(
    [...ids]
      .reverse()
      .map((id) => faseDaAnimacao(id, 'parado'))
      .reverse(),
  ).toEqual(fases)
  for (const fase of fases) {
    expect(fase).toBeGreaterThanOrEqual(0)
    expect(fase).toBeLessThan(1)
  }
  expect(faseDaAnimacao('nico', 'andar')).not.toBe(fases[1])
})

for (const arquivo of ['lumis/estrelinha', 'lumis/buzio', 'ilhas/recife', 'festas/lanternas']) {
  test(`${arquivo}: brilho segue a noite real sem modificar outra cópia ou o arquivo`, async () => {
    const original = await modelo(arquivo)
    const a = copiarArteAnimada(original.scene)
    const b = copiarArteAnimada(original.scene)
    expect(a.luzes.length).toBeGreaterThan(0)
    const iniciais = b.luzes.map((l) => l.material.emissiveIntensity)
    iluminarArte(a.luzes, momentoDoDia(5 * 60_000, 0).noite)
    expect(a.luzes.every((l) => l.material.emissiveIntensity === 0)).toBe(true)
    expect(b.luzes.map((l) => l.material.emissiveIntensity)).toEqual(iniciais)
    iluminarArte(a.luzes, momentoDoDia(13 * 60_000, 0).noite)
    expect(a.luzes.map((l) => l.material.emissiveIntensity)).toEqual(iniciais)
    let liberados = 0
    for (const l of a.luzes) l.material.addEventListener('dispose', () => liberados++)
    a.soltar()
    expect(liberados).toBe(a.luzes.length)
    b.soltar()
  })
}

for (const [arquivo, nome] of [
  ['lumis/borrao', 'virar'],
  ['itens/bau', 'abrir'],
  ['festas/fim-de-ano', 'estourar'],
]) {
  test(`${arquivo}: ${nome} termina e mantém o último quadro, repetição explícita recomeça do zero`, async () => {
    const g = await modelo(arquivo as string)
    const copia = copiarArteAnimada(g.scene)
    const clipe = g.animations.find((a) => a.name === nome)
    expect(clipe).toBeDefined()
    if (!clipe) throw Error('Clipe ausente')
    const mixer = new AnimationMixer(copia.cena)
    const acao = mixer.clipAction(clipe)
    configurarAcao(acao, [])
    iniciarClipe(acao, 'teste-1', 0)
    expect(acao.time).toBe(0)
    expect(acao.loop).toBe(LoopOnce)
    mixer.update(clipe.duration + 0.1)
    expect(acao.paused).toBe(true)
    expect(acao.enabled).toBe(true)
    expect(acao.time).toBe(clipe.duration)
    copia.cena.updateMatrixWorld(true)
    const fim: number[][] = []
    copia.cena.traverse((o) => fim.push(o.matrix.toArray()))
    mixer.update(20)
    copia.cena.updateMatrixWorld(true)
    const depois: number[][] = []
    copia.cena.traverse((o) => depois.push(o.matrix.toArray()))
    expect(depois).toEqual(fim)
    iniciarClipe(acao, 'teste-2', 0)
    expect(acao.time).toBe(0)
    expect(acao.paused).toBe(false)
    mixer.stopAllAction()
    mixer.uncacheRoot(copia.cena)
    copia.soltar()
  })
}

test('duas instâncias do mesmo Lumi começam em fases diferentes no mixer real', async () => {
  const g = await modelo('lumis/estrelinha')
  const tempos: number[] = []
  for (const id of ['lumi-1', 'lumi-2']) {
    const copia = copiarArteAnimada(g.scene)
    const mixer = new AnimationMixer(copia.cena)
    const clipe = g.animations.find((a) => a.name === 'parado')
    if (!clipe) throw Error('Clipe ausente')
    const acao = mixer.clipAction(clipe)
    configurarAcao(acao, [])
    iniciarClipe(acao, id, 0)
    mixer.update(0.2)
    tempos.push(acao.time)
    mixer.stopAllAction()
    copia.soltar()
  }
  expect(tempos[0]).not.toBe(tempos[1])
})

for (const tipo of ['bem-te-vi', 'borboleta', 'passaro-das-nuvens'] as const) {
  test(`${tipo}: voo fica acima do chão e de obstáculos sem mudar o modelo de origem`, async () => {
    const g = await modelo(`bichos/${tipo}`)
    const copia = copiarArteAnimada(g.scene)
    const grupo = new Group()
    grupo.position.y = alturaDoVoo(tipo, 4, 7)
    grupo.add(copia.cena)
    const mixer = new AnimationMixer(copia.cena)
    const clipe = g.animations.find((a) => a.name === 'voar')
    if (!clipe) throw Error('Clipe ausente')
    mixer.clipAction(clipe).play()
    for (let i = 0; i < 25; i++) {
      mixer.update(clipe.duration / 24)
      grupo.updateMatrixWorld(true)
      expect(new Box3().setFromObject(grupo, true).min.y).toBeGreaterThan(7)
    }
    expect(g.scene.position.y).toBe(0)
    mixer.stopAllAction()
    copia.soltar()
  })
}

for (const arquivo of ['ilhas/barco', 'movimento/barco']) {
  test(`${arquivo}: balançar não altera a âncora no mundo`, async () => {
    const g = await modelo(arquivo)
    const copia = copiarArteAnimada(g.scene)
    const ancora = new Group()
    ancora.position.set(21, 3, -14)
    ancora.add(copia.cena)
    const mixer = new AnimationMixer(copia.cena)
    const clipe = g.animations.find((a) => a.name === 'balancar')
    if (!clipe) throw Error('Clipe ausente')
    mixer.clipAction(clipe).play()
    const barco = copia.cena.getObjectByName('barco')
    if (!barco) throw Error('Nó barco ausente')
    const inicial = barco.position.clone()
    mixer.update(0.7)
    expect(barco.position.equals(inicial)).toBe(false)
    expect(ancora.position.toArray()).toEqual([21, 3, -14])
    mixer.stopAllAction()
    copia.soltar()
  })
}

test('patins elevam só o desenho, e as rodas ficam na altura da sola parada', async () => {
  const g = await modelo('movimento/patins')
  const caixa = new Box3().setFromObject(g.scene, true)
  expect(caixa.min.y).toBeCloseTo(-RODAS_ABAIXO_DA_SOLA, 3)
  expect(ELEVACAO_DOS_PATINS).toBeCloseTo(RODAS_ABAIXO_DA_SOLA - PE_PARADO_ACIMA_DA_SOLA, 6)
  expect(ELEVACAO_DOS_PATINS).toBeGreaterThan(0.08)
})

describe('Íris', () => {
  test('tempo do texto, pausa na pontuação e boca fechada no fim', () => {
    expect(bocaDaIris('aou', 0.04).forma).toBe('C')
    expect(bocaDaIris('aou', 0.12).forma).toBe('D')
    expect(bocaDaIris(' .', 0.12).forma).toBeNull()
    expect(bocaDaIris('Olá', 30).peso).toBe(0)
    expect(bocaDaIris('', 0).peso).toBe(0)
  })
  test('todas as partes da cabeça movem a mesma boca, smile e outra Íris intactos', async () => {
    const g = await modelo('personagens/iris')
    const a = copiarArteAnimada(g.scene),
      b = copiarArteAnimada(g.scene)
    expect(a.bocas.length).toBe(3)
    for (const m of a.bocas) {
      if (!m.morphTargetDictionary || !m.morphTargetInfluences) throw Error('Morfos ausentes')
      m.morphTargetInfluences[m.morphTargetDictionary.smile as number] = 0.3
    }
    animarBocas(a.bocas, 'Olá', 0.04)
    for (const m of a.bocas) {
      const d = m.morphTargetDictionary as Record<string, number>
      expect(m.morphTargetInfluences?.[d.D as number]).toBeGreaterThan(0)
      expect(m.morphTargetInfluences?.[d.smile as number]).toBe(0.3)
    }
    for (const m of b.bocas) expect(m.morphTargetInfluences?.every((n) => n === 0)).toBe(true)
    animarBocas(a.bocas, '', 0)
    for (const m of a.bocas)
      expect(m.morphTargetInfluences?.[m.morphTargetDictionary?.D as number]).toBe(0)
    a.soltar()
    b.soltar()
  })
})

test('cápsula do pinguim troca para longitudinal e mantém folga do chão nas duas idades', () => {
  for (const filhote of [false, true]) {
    const emPe = capsulaDoPinguim(false, filhote),
      deitado = capsulaDoPinguim(true, filhote)
    expect(emPe.giroX).toBe(0)
    expect(deitado.giroX).toBe(Math.PI / 2)
    expect(deitado.y - deitado.raio).toBeGreaterThanOrEqual(0)
    expect(deitado.y + deitado.raio).toBeLessThan(emPe.y + emPe.meiaAltura + emPe.raio)
    expect(capsulaDoPinguim(false, filhote)).toEqual(emPe)
  }
})
