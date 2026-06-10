import { describe, expect, it } from 'bun:test'
import {
  estimatePreviewInputChars,
  PREVIEW_RENDER_FIXED_OVERHEAD_CHARS,
  shouldPausePreviewRender,
} from './previewBudget'

describe('preview budget', () => {
  it('soma arquivos canonicos, extras e runtimes de extensao', () => {
    expect(
      estimatePreviewInputChars({
        html: 'abc',
        css: 'de',
        js: 'fghi',
        extensionScripts: ['runtime'],
        extraFiles: [{ content: 'extra', language: 'html' }],
      }),
    ).toBe(PREVIEW_RENDER_FIXED_OVERHEAD_CHARS + 21)
  })

  it('estima expansao base64 de arquivos JS extras', () => {
    expect(
      estimatePreviewInputChars({
        html: '',
        css: '',
        js: '',
        extraFiles: [{ content: 'abc', language: 'javascript' }],
      }),
    ).toBe(PREVIEW_RENDER_FIXED_OVERHEAD_CHARS + 132)
  })

  it('pausa render automatico quando o input excede o limite', () => {
    expect(
      shouldPausePreviewRender(
        { html: '12345', css: '', js: '' },
        PREVIEW_RENDER_FIXED_OVERHEAD_CHARS + 4,
      ),
    ).toBe(true)
    expect(
      shouldPausePreviewRender(
        { html: '1234', css: '', js: '' },
        PREVIEW_RENDER_FIXED_OVERHEAD_CHARS + 4,
      ),
    ).toBe(false)
  })
})
