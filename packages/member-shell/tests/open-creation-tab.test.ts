import { afterEach, expect, test } from 'bun:test'
import {
  openCreationInMolda,
  openDrawingInPinta,
} from '../src/components/creator/open-creation-tab'

const hadWindow = 'window' in globalThis
const previous = (globalThis as { window?: unknown }).window
const opened: unknown[][] = []

function stubWindow() {
  opened.length = 0
  ;(globalThis as { window?: unknown }).window = {
    open: (...args: unknown[]) => {
      opened.push(args)
      return null
    },
  }
}

afterEach(() => {
  if (hadWindow) (globalThis as { window?: unknown }).window = previous
  else delete (globalThis as { window?: unknown }).window
})

test('without a prepared tab, the Pinta and the Molda open in a new isolated tab', () => {
  stubWindow()
  openDrawingInPinta('d 1')
  openCreationInMolda('m1')
  expect(opened).toEqual([
    ['/pinta?desenho=d%201', '_blank', 'noopener,noreferrer'],
    ['/molda?criacao=m1', '_blank', 'noopener,noreferrer'],
  ])
})

test('a tab the Studio opened inside the click is only navigated, never a second one', () => {
  stubWindow()
  const replaced: string[] = []
  const tab = { closed: false, location: { replace: (url: string) => replaced.push(url) } }
  openDrawingInPinta('novo', tab as unknown as Window)
  expect(replaced).toEqual(['/pinta?desenho=novo'])
  expect(opened).toEqual([])
  // A tab the child already closed falls back to the ordinary new tab.
  openDrawingInPinta('novo', { ...tab, closed: true } as unknown as Window)
  expect(opened).toEqual([['/pinta?desenho=novo', '_blank', 'noopener,noreferrer']])
})
