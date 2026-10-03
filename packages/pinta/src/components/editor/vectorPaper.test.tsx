import { expect, test } from 'bun:test'
import { createCanvas, loadImage } from '@napi-rs/canvas'
import { fireEvent, render, screen } from '@testing-library/react'
import { COPY } from '../../core/copy'
import { createVectorBackgroundAsset } from '../../core/project'
import { buildStudioPayload } from '../../export/studioBridge'
import { createMemoryPersistence } from '../../state/memoryPersistence'
import { PintaApp } from '../PintaApp'

test('o papel mostra transparência, troca só a visualização e conserva branco pintado no export', async () => {
  const asset = createVectorBackgroundAsset({ name: 'neve-transparente', width: 100, height: 100 })
  asset.shapes.push({
    id: 'white',
    type: 'rect',
    x: 20,
    y: 20,
    w: 30,
    h: 30,
    rx: 0,
    fill: '#ffffff',
    stroke: null,
    opacity: 1,
    rotation: 0,
  })
  const persistence = createMemoryPersistence([asset])
  const before = JSON.stringify(asset)
  render(<PintaApp persistence={persistence} />)
  fireEvent.click(await screen.findByRole('button', { name: /Abrir neve-transparente/ }))
  const select = await screen.findByRole('combobox', { name: COPY.vector.paperLabel })
  const drawing = screen.getByRole('img', { name: COPY.a11y.drawArea })
  expect(drawing.parentElement?.className).toContain('pin-checkerboard')
  expect(drawing.classList.contains('bg-white/60')).toBe(false)
  for (const [value, className] of [
    ['white', 'bg-white'],
    ['dark', 'bg-slate-900'],
    ['transparent', 'pin-checkerboard'],
  ]) {
    fireEvent.change(select, { target: { value } })
    expect(drawing.parentElement?.className).toContain(className)
  }
  expect(JSON.stringify(await persistence.loadAssetById(asset.id))).toBe(before)
  const payload = await buildStudioPayload(asset, () => null, { animationId: null, frameIndex: 0 })
  if (!payload) throw new Error('SVG export expected')
  const svg = decodeURIComponent(payload.dataUrl.slice(payload.dataUrl.indexOf(',') + 1))
  const canvas = createCanvas(100, 100)
  const ctx = canvas.getContext('2d')
  ctx.drawImage(await loadImage(Buffer.from(svg)), 0, 0)
  expect([...ctx.getImageData(0, 0, 1, 1).data]).toEqual([0, 0, 0, 0])
  expect([...ctx.getImageData(30, 30, 1, 1).data]).toEqual([255, 255, 255, 255])
})
