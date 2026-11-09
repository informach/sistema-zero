import { expect, type Page } from '@playwright/test'

export const feitas = (page: Page) => page.locator('.sz-discovery-cartao[data-feito="true"]')
export const abrir = async (page: Page, curso: string, bloco: string, largura = 1366) => {
  await page.setViewportSize({ width: largura, height: 900 })
  await page.goto(`/?course=${curso}&block=${bloco}&width=900`)
  await expect(page.locator('.sz-discovery-moldura')).toBeVisible()
  await page.locator('.sz-discovery-moldura').scrollIntoViewIfNeeded()
}

/** O canto de cima do personagem no mapa do Farol (o grupo que anda, com o desenho 64 × 64). */
export const heroi2d = (page: Page) =>
  page.evaluate(() => {
    for (const img of document.querySelectorAll(
      '.sz-discovery-moldura image[width="64"][height="64"]',
    )) {
      let n = img.parentElement
      while (n && n.tagName.toLowerCase() !== 'svg') {
        const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(n.getAttribute('style') ?? '')
        if (m) return { x: Number(m[1]), y: Number(m[2]) }
        n = n.parentElement
      }
    }
    return null
  })

/** Anda com UMA seta até a coordenada chegar perto do alvo (segura e solta, como a criança). */
async function andarNoEixo(page: Page, eixo: 'x' | 'y', alvo: number) {
  for (let volta = 0; volta < 6; volta++) {
    const p = await heroi2d(page)
    if (!p) throw new Error('sem personagem')
    const falta = alvo - p[eixo]
    if (Math.abs(falta) < 8) return
    const tecla =
      eixo === 'x' ? (falta > 0 ? 'ArrowRight' : 'ArrowLeft') : falta > 0 ? 'ArrowDown' : 'ArrowUp'
    await page.keyboard.down(tecla)
    try {
      await expect
        .poll(
          async () => {
            const q = await heroi2d(page)
            return q
              ? Math.sign(alvo - q[eixo]) !== Math.sign(falta) || Math.abs(alvo - q[eixo]) < 8
              : true
          },
          { timeout: 8000, intervals: [30] },
        )
        .toBe(true)
    } finally {
      await page.keyboard.up(tecla)
    }
  }
}
export const andar2d = async (page: Page, ...pontos: [number, number][]) => {
  for (const [x, y] of pontos) {
    await andarNoEixo(page, 'x', x)
    await andarNoEixo(page, 'y', y)
  }
}

/** O personagem na ilha 3D (x e z do chão) e o giro da câmera, que as setas acompanham. */
export const ilha = (page: Page) =>
  page.evaluate(() => {
    const el = document.querySelector('.sz-discovery-livre-ilha-jogo')
    const [x, z] = (el?.getAttribute('data-heroi') ?? '').split(',').map(Number)
    return { x: x ?? 0, z: z ?? 0, az: Number(el?.getAttribute('data-vista-az') ?? 0) }
  })
/** Anda na ilha 3D escolhendo, a cada passo, a combinação de setas que leva mais perto do alvo. */
export async function andar3d(page: Page, x: number, z: number) {
  for (let i = 0; i < 160; i++) {
    const p = await ilha(page)
    const dx = x - p.x
    const dz = z - p.z
    const d = Math.hypot(dx, dz)
    if (d < 0.3) return
    let melhor: { nota: number; teclas: string[] } | null = null
    for (const [ix, iz, teclas] of [
      [1, 0, ['ArrowRight']],
      [-1, 0, ['ArrowLeft']],
      [0, 1, ['ArrowDown']],
      [0, -1, ['ArrowUp']],
      [1, 1, ['ArrowRight', 'ArrowDown']],
      [1, -1, ['ArrowRight', 'ArrowUp']],
      [-1, 1, ['ArrowLeft', 'ArrowDown']],
      [-1, -1, ['ArrowLeft', 'ArrowUp']],
    ] as const) {
      const n = Math.hypot(ix, iz)
      const vx = (ix * Math.cos(p.az) + iz * Math.sin(p.az)) / n
      const vz = (iz * Math.cos(p.az) - ix * Math.sin(p.az)) / n
      const nota = (vx * dx + vz * dz) / d
      if (!melhor || nota > melhor.nota) melhor = { nota, teclas: [...teclas] }
    }
    for (const t of melhor?.teclas ?? []) await page.keyboard.down(t)
    await page.waitForTimeout(Math.max(40, Math.min(250, (d / 4) * 1000)))
    for (const t of melhor?.teclas ?? []) await page.keyboard.up(t)
  }
  const p = await ilha(page)
  throw new Error(`não chegou a (${x}, ${z}): parou em (${p.x}, ${p.z})`)
}
