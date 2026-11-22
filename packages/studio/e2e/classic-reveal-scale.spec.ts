import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, type Page, test } from '@playwright/test'
import { readProjectStorageRecords } from './projectStorageInspection'

/**
 * "Mostrar o bloco" num projeto grande (lote 2 da conclusão, 22/11/2026). O gesto de verdade: o
 * Reino Zero Ultra dos jogos prontos (7 mil blocos, 78 funções recolhidas, quase todas na cauda
 * que nasce sem desenho), "Procurar no programa", "se tecla", o resultado da tecla R. No Chrome
 * conectado esse gesto travava a aba por minutos: cada medida de texto em SVG custa ali cerca de
 * 90 vezes mais. Por isso o que se conta é o TRABALHO do gesto, que não depende da máquina: os
 * blocos redesenhados, as leituras de estilo (`getComputedStyle`, o que o Blockly faz para medir
 * cada texto) e os grupos postos na página, além da maior tarefa.
 *
 * Grava os números em `.cache/classic-reveal-scale/resultado.json`.
 */

const aqui = dirname(fileURLToPath(import.meta.url))
const SAIDA = resolve(aqui, '../.cache/classic-reveal-scale')

async function instrumentar(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as {
      __medindo: boolean
      __estilos: number
      __caminhos: Set<Element>
      __grupos: number
      __longas: number[]
      __mudou: boolean
    }
    w.__medindo = false
    w.__mudou = false
    // O selo "Alterações não salvas" aparece e some em 1 s (o salvamento automático): vigiado
    // durante o gesto, ele diz se mostrar o bloco mudou o projeto salvo.
    setInterval(() => {
      if (!w.__medindo || w.__mudou) return
      const selo = document.evaluate(
        "//*[text()='Alterações não salvas']",
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null,
      ).singleNodeValue
      if (selo) w.__mudou = true
    }, 50)
    w.__estilos = 0
    w.__caminhos = new Set()
    w.__grupos = 0
    w.__longas = []
    const original = window.getComputedStyle.bind(window)
    window.getComputedStyle = ((elt: Element, pseudo?: string | null) => {
      if (w.__medindo) w.__estilos++
      return original(elt, pseudo)
    }) as typeof window.getComputedStyle
    new MutationObserver((mutations) => {
      if (!w.__medindo) return
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'd') {
          const target = mutation.target as Element
          if (target.classList.contains('blocklyPath')) w.__caminhos.add(target)
        }
        if (mutation.type === 'childList')
          for (const node of mutation.addedNodes)
            if (node instanceof Element && node.classList.contains('blocklyDraggable')) w.__grupos++
      }
    }).observe(document, {
      subtree: true,
      attributes: true,
      attributeFilter: ['d'],
      childList: true,
    })
    new PerformanceObserver((lista) => {
      if (!w.__medindo) return
      for (const entrada of lista.getEntries()) w.__longas.push(entrada.duration)
    }).observe({ type: 'longtask' })
  })
}

test('mostrar o bloco da tecla R no Reino Zero Ultra', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await instrumentar(page)
  await page.goto('/')
  const card = page
    .locator('button')
    .filter({ has: page.getByText('Reino Zero Ultra (na mão)', { exact: true }) })
    .first()
  await card.click()
  await expect(page).toHaveURL(/\/editor\//, { timeout: 30_000 })
  await page
    .locator('svg.blocklySvg .blocklyBlockCanvas .blocklyDraggable')
    .first()
    .waitFor({ timeout: 120_000 })
  // O jogo pronto abre como cópia nova e grava a primeira vez: espera o "Salvo".
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible({ timeout: 60_000 })
  await page.waitForTimeout(2000)

  await page.getByRole('button', { name: 'Procurar no programa' }).click()
  const campo = page.getByRole('searchbox', { name: 'Procurar nos blocos do programa' })
  await campo.fill('se tecla')
  const resultado = page
    .locator('[data-sz-workspace-search]')
    .getByRole('button', { name: /tecla R/ })
    .first()
  await expect(resultado).toBeVisible({ timeout: 30_000 })

  const blocosSalvos = async () => {
    const saved = await readProjectStorageRecords(page)
    const key = Object.keys(saved).find((k) => k.startsWith('sz:v4:project-blocks:'))
    return key ? (saved[key] as { blocksState?: unknown }).blocksState : null
  }
  const salvoAntes = await blocosSalvos()
  const recolhidasAntes = await page.locator('.blocklyCollapsed').count()
  await page.evaluate(() => {
    ;(window as unknown as { __medindo: boolean }).__medindo = true
  })
  const inicio = Date.now()
  await resultado.click()
  const selecionado = page.locator('svg.blocklySvg .blocklyBlockCanvas .blocklySelected')
  await expect(selecionado).toHaveCount(1, { timeout: 120_000 })
  const ateSelecionar = Date.now() - inicio
  // Deixa a página assentar (o resto do desenho e a gravação, se houver).
  await page.waitForTimeout(3000)
  const medida = await page.evaluate(() => {
    const w = window as unknown as {
      __medindo: boolean
      __estilos: number
      __caminhos: Set<Element>
      __grupos: number
      __longas: number[]
      __mudou: boolean
    }
    w.__medindo = false
    return {
      projetoMarcadoComoMudado: w.__mudou,
      leiturasDeEstilo: w.__estilos,
      blocosRedesenhados: w.__caminhos.size,
      gruposPostosNaPagina: w.__grupos,
      maiorTarefaMs: Math.round(Math.max(0, ...w.__longas)),
      somaDasTarefasMs: Math.round(w.__longas.reduce((soma, valor) => soma + valor, 0)),
    }
  })
  const recolhidasDepois = await page.locator('.blocklyCollapsed').count()
  const salvoDepois = await blocosSalvos()
  const diferencas: string[] = []
  const comparar = (a: unknown, b: unknown, caminho: string) => {
    if (diferencas.length >= 12) return
    if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
      if (a !== b)
        diferencas.push(
          `${caminho}: ${JSON.stringify(a)?.slice(0, 80)} → ${JSON.stringify(b)?.slice(0, 80)}`,
        )
      return
    }
    const chaves = new Set([...Object.keys(a), ...Object.keys(b)])
    for (const chave of chaves)
      comparar(
        (a as Record<string, unknown>)[chave],
        (b as Record<string, unknown>)[chave],
        `${caminho}.${chave}`,
      )
  }
  comparar(salvoAntes, salvoDepois, 'blocos')
  console.log(`[mostrar o bloco] diferenças no salvo: ${JSON.stringify(diferencas)}`)
  const gruposNaPagina = await page
    .locator('svg.blocklySvg .blocklyBlockCanvas .blocklyDraggable')
    .count()
  const resultado_ = {
    ...medida,
    ateSelecionarMs: ateSelecionar,
    recolhidasAntes,
    recolhidasDepois,
    gruposNaPagina,
  }
  mkdirSync(SAIDA, { recursive: true })
  writeFileSync(resolve(SAIDA, 'resultado.json'), `${JSON.stringify(resultado_, null, 2)}\n`)
  console.log(`[mostrar o bloco] ${JSON.stringify(resultado_)}`)
  // Mostrar não é editar: o projeto salvo é o mesmo de antes (22/11/2026).
  expect(diferencas).toEqual([])
  expect(resultado_.projetoMarcadoComoMudado).toBe(false)
  // O trabalho do gesto, com folga sobre a medida depois do conserto (antes: 1.008 leituras de
  // estilo e 5.752 blocos redesenhados; depois: 444 e 393). A maior tarefa depende da máquina e só
  // fica registrada.
  expect(resultado_.leiturasDeEstilo).toBeLessThan(600)
  expect(resultado_.blocosRedesenhados).toBeLessThan(550)
})
