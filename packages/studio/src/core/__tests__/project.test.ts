import { describe, expect, it } from 'bun:test'
import {
  createEmptyProject,
  inferExtraLanguage,
  isReservedProjectFileName,
  normalizeExtraFileName,
} from '../project'

describe('project defaults', () => {
  it('cria projeto novo com HTML estrutural e CSS/JS vazios', () => {
    const project = createEmptyProject('p1', 'Meu <Projeto>')

    expect(project.files['style.css']).toBe('')
    expect(project.files['script.js']).toBe('')
    expect(project.files['index.html']).toBe(`<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <title>Meu &lt;Projeto&gt;</title>
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <script src="script.js"></script>
  </body>
</html>
`)
  })
})

describe('extra project files', () => {
  it('normaliza nomes seguros e aceita html/css/js/mjs', () => {
    expect(normalizeExtraFileName(' utils.js ')).toBe('utils.js')
    expect(normalizeExtraFileName('fragmento.html')).toBe('fragmento.html')
    expect(normalizeExtraFileName('tema.css')).toBe('tema.css')
    expect(normalizeExtraFileName('modulo.mjs')).toBe('modulo.mjs')
  })

  it('rejeita caminhos virtuais inseguros e extensões fora do subset', () => {
    expect(normalizeExtraFileName('../secret.js')).toBeNull()
    expect(normalizeExtraFileName('pasta/arquivo.js')).toBeNull()
    expect(normalizeExtraFileName('script.jsx')).toBeNull()
    expect(normalizeExtraFileName('.env.js')).toBeNull()
  })

  it('mantém os nomes canônicos reservados e infere linguagem por extensão', () => {
    expect(isReservedProjectFileName('INDEX.HTML')).toBe(true)
    expect(inferExtraLanguage('componente.mjs')).toBe('javascript')
    expect(inferExtraLanguage('layout.html')).toBe('html')
    expect(inferExtraLanguage('tema.css')).toBe('css')
  })
})
