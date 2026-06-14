import { describe, expect, it } from 'bun:test'
import {
  estimatePreviewInputChars,
  PREVIEW_RENDER_FIXED_OVERHEAD_CHARS,
  shouldPausePreviewRender,
} from './previewBudget'

describe('preview budget', () => {
  it('soma arquivos canonicos, extras e runtimes de extensao', () => {
    // O JS canônico vira data: URL base64 igual aos extras: 'fghi' (4 chars) →
    // ceil(4/3)*4 + 128 = 136. html(3) + css(2) + js(136) + runtime(7) + extra(5).
    expect(
      estimatePreviewInputChars({
        html: 'abc',
        css: 'de',
        js: 'fghi',
        extensionScripts: ['runtime'],
        extraFiles: [{ content: 'extra', language: 'html' }],
      }),
    ).toBe(PREVIEW_RENDER_FIXED_OVERHEAD_CHARS + 153)
  })

  it('conta a expansao base64 do JS canonico (paridade com extras)', () => {
    // 'abc' (3 chars) → ceil(3/3)*4 + 128 = 132. Mesma fórmula dos extras JS.
    expect(estimatePreviewInputChars({ html: '', css: '', js: 'abc' })).toBe(
      PREVIEW_RENDER_FIXED_OVERHEAD_CHARS + 132,
    )
    // JS vazio não emite script → sem inflação.
    expect(estimatePreviewInputChars({ html: '', css: '', js: '' })).toBe(
      PREVIEW_RENDER_FIXED_OVERHEAD_CHARS,
    )
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
