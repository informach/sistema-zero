import { afterEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CURRENT_PROJECT_FORMAT_VERSION } from '../../core/projectDocument'
import { MAX_PROJECT_IMPORT_CHARS } from '../../state/projectLimits'
import { ImportButton } from './ImportButton'

// happy-dom expõe File/Blob; `file.text()` resolve com o conteúdo cru — é o que
// o ImportButton lê antes de tentar o JSON.parse.
function jsonFile(content: string, name = 'projeto.json'): File {
  return new File([content], name, { type: 'application/json' })
}

function fileInput(container: HTMLElement): HTMLInputElement {
  const el = container.querySelector<HTMLInputElement>('input[type="file"]')
  if (!el) throw new Error('input de arquivo não encontrado')
  return el
}

// Dispara o onChange do input forjando `target.files` (happy-dom não preenche
// sozinho a partir de um clique real).
async function chooseFile(input: HTMLInputElement, file: File): Promise<void> {
  Object.defineProperty(input, 'files', { value: [file], configurable: true })
  await act(async () => {
    fireEvent.change(input)
  })
}

describe('ImportButton', () => {
  afterEach(() => {
    cleanup()
  })

  for (const kind of ['classic', 'pro'] as const) {
    it(`Python ${kind} v3 reaches its document validator without requiring JavaScript rights`, async () => {
      const { pythonEnvironmentFixture } = await import('../../state/fixtures/pythonEnvironment')
      const { project } = await pythonEnvironmentFixture(kind)
      const { useProjectStore } = await import('../../state/projectStore')
      const original = useProjectStore.getState().importProjectFromJSON
      const importProject = mock(async () => ({ project, warnings: [] }))
      const authorize = mock(async () => {
        throw new Error('Python must not request JavaScript rights')
      })
      const onImported = mock((_id: string) => {})
      const warn = spyOn(console, 'warn').mockImplementation(() => {})
      useProjectStore.setState({
        importProjectFromJSON: importProject as unknown as typeof original,
      })
      try {
        const view = render(
          <ImportButton
            onImported={onImported}
            javascriptAvailable={false}
            authorizeJavaScript={authorize}
          />,
        )
        await chooseFile(fileInput(view.container), jsonFile(JSON.stringify(project)))
        expect(importProject.mock.calls.length).toBe(1)
        expect(authorize).not.toHaveBeenCalled()
        expect(onImported).toHaveBeenCalledWith(project.id)
      } finally {
        useProjectStore.setState({ importProjectFromJSON: original })
        warn.mockRestore()
      }
    })
  }

  it('a denied or revoked free Python import preserves the file and never persists; an approved retry can import', async () => {
    const { pythonEnvironmentFixture } = await import('../../state/fixtures/pythonEnvironment')
    const { project } = await pythonEnvironmentFixture('pro')
    if (project.kind !== 'pro') throw new Error('Expected Pro fixture')
    project.tree['requirements.txt'] = { kind: 'file', content: '# Dependências em edição\n' }
    const source = JSON.stringify(project)
    const file = jsonFile(source)
    const { useProjectStore } = await import('../../state/projectStore')
    const original = useProjectStore.getState().importProjectFromJSON
    const importProject = mock(async () => ({ project, warnings: [] }))
    useProjectStore.setState({ importProjectFromJSON: importProject as unknown as typeof original })
    let allowed = false
    const authorizePython = mock(async (snapshot: unknown) => {
      expect(snapshot).toEqual(project)
      if (!allowed) throw new Error('Conquista Python indisponível')
    })
    const onImported = mock((_id: string) => {})
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const view = render(
        <ImportButton
          onImported={onImported}
          javascriptAvailable={false}
          authorizePython={authorizePython}
        />,
      )
      await chooseFile(fileInput(view.container), file)
      expect(importProject).not.toHaveBeenCalled()
      expect(onImported).not.toHaveBeenCalled()
      expect(await file.text()).toBe(source)
      allowed = true
      await chooseFile(fileInput(view.container), file)
      expect(importProject).toHaveBeenCalledTimes(1)
      expect(onImported).toHaveBeenCalledTimes(1)
      allowed = false
      await chooseFile(fileInput(view.container), file)
      expect(importProject).toHaveBeenCalledTimes(1)
      expect(onImported).toHaveBeenCalledTimes(1)
      expect(await file.text()).toBe(source)
    } finally {
      useProjectStore.setState({ importProjectFromJSON: original })
      warn.mockRestore()
    }
  })

  it('JavaScript imports recheck the host before persistence, including older documents claiming Python', async () => {
    const { useProjectStore } = await import('../../state/projectStore')
    const original = useProjectStore.getState().importProjectFromJSON
    const importProject = mock(async () => ({
      project: { id: 'imported', installedExtensions: [] },
      warnings: [],
    }))
    useProjectStore.setState({ importProjectFromJSON: importProject as unknown as typeof original })
    const warn = spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const authorized: string[] = []
      let allow = false
      const onImported = mock((_id: string) => {})
      const props = {
        onImported,
        authorizeJavaScript: async (kind: 'classic' | 'pro') => {
          authorized.push(kind)
          if (!allow) throw new Error('Sem conquista JavaScript')
        },
      }
      const view = render(<ImportButton {...props} />)
      const project = {
        name: 'Arena',
        files: { 'index.html': '', 'style.css': '', 'script.js': '' },
        kind: 'pro',
      }
      await chooseFile(fileInput(view.container), jsonFile(JSON.stringify(project)))
      expect(authorized).toEqual(['pro'])
      expect(importProject).not.toHaveBeenCalled()
      expect(onImported).not.toHaveBeenCalled()
      allow = true
      await chooseFile(fileInput(view.container), jsonFile(JSON.stringify(project)))
      expect(importProject).toHaveBeenCalledTimes(1)
      expect(onImported).toHaveBeenCalledWith('imported')
      view.rerender(<ImportButton {...props} javascriptAvailable={false} />)
      await chooseFile(
        fileInput(view.container),
        jsonFile(JSON.stringify({ ...project, programmingLanguage: 'python' })),
      )
      expect(importProject).toHaveBeenCalledTimes(1)
      expect(authorized).toEqual(['pro', 'pro'])
    } finally {
      useProjectStore.setState({ importProjectFromJSON: original })
      warn.mockRestore()
    }
  })

  it('mostra mensagem amigável em PT quando o arquivo não é JSON válido', async () => {
    const { container } = render(<ImportButton onImported={() => undefined} />)
    // Conteúdo que não é JSON (ex.: uma imagem/txt) → JSON.parse lança SyntaxError.
    await chooseFile(fileInput(container), jsonFile('isto não é json {{{'))

    await waitFor(() => {
      expect(
        screen.getByText(/não parece ser um projeto do Studio/i, { exact: false }),
      ).toBeTruthy()
    })
    // E NÃO vaza o texto técnico em inglês do SyntaxError.
    expect(screen.queryByText(/Unexpected token/i)).toBeNull()
    expect(screen.queryByText(/in JSON/i)).toBeNull()
  })

  it('ferramenta ainda não ganha aparece pelo NOME (Jogo 2D), nunca pelo id interno', async () => {
    const projeto = {
      name: 'Com Jogo 2D',
      formatVersion: CURRENT_PROJECT_FORMAT_VERSION,
      files: { 'index.html': '<h1>ok</h1>', 'style.css': '', 'script.js': '' },
      installedExtensions: [{ id: 'game-2d', version: '1.0.0' }],
    }
    // A gravação de verdade vai ao IndexedDB, que o happy-dom não tem: aqui só importa o aviso.
    const { useProjectStore } = await import('../../state/projectStore')
    const original = useProjectStore.getState().importProjectFromJSON
    useProjectStore.setState({
      importProjectFromJSON: (async () => ({
        project: { id: 'p-importado', installedExtensions: projeto.installedExtensions },
        warnings: [],
      })) as unknown as typeof original,
    })
    try {
      const { container } = render(
        <ImportButton onImported={() => undefined} allowedExtensions={[]} />,
      )
      await chooseFile(fileInput(container), jsonFile(JSON.stringify(projeto)))

      await waitFor(() => {
        expect(screen.getByText(/ainda vai ganhar nas aventuras/)).toBeTruthy()
      })
      const tela = document.body.textContent ?? ''
      expect(tela).toContain('Jogo 2D')
      expect(tela).not.toContain('game-2d')
      expect(tela).not.toContain('jornada')
    } finally {
      useProjectStore.setState({ importProjectFromJSON: original })
    }
  })

  it('JSON VÁLIDO sem a forma de projeto recebe a mesma frase do arquivo que não é projeto', async () => {
    const { container } = render(<ImportButton onImported={() => undefined} />)
    await chooseFile(fileInput(container), jsonFile('{"foo":123}'))

    await waitFor(() => {
      expect(screen.getByText(/não parece ser um projeto do Studio/i)).toBeTruthy()
    })
  })
})

// O que a criança lê quando a importação é recusada. As regras de recusa são as do documento
// (validação e migrações); aqui se cobra só a FRASE: humana, sem o jargão que o validador
// escreve para quem diagnostica, e com esse detalhe preservado no console.
describe('ImportButton: recusa em linguagem de criança', () => {
  const baseFiles = { 'index.html': '<h1>ok</h1>', 'style.css': '', 'script.js': '' }
  const JARGAO = [
    /allowlist/i,
    /\$\./,
    /\[\d+\]/,
    /sz_/,
    /Nenhuma cópia foi gravada/,
    /blocksState/,
  ]

  afterEach(() => {
    cleanup()
    mock.restore()
  })

  async function recusar(file: File) {
    const warn = spyOn(console, 'warn').mockImplementation(() => undefined)
    const onImported = mock(() => undefined)
    const { container } = render(<ImportButton onImported={onImported} />)
    await chooseFile(fileInput(container), file)
    await waitFor(() => {
      expect(screen.getByText(/Nada mudou na sua lista/)).toBeTruthy()
    })
    const tela = document.body.textContent ?? ''
    for (const termo of JARGAO) expect(tela).not.toMatch(termo)
    expect(onImported).not.toHaveBeenCalled()
    return { tela, avisos: warn.mock.calls.map((call) => JSON.stringify(call)) }
  }

  it('bloco que esta versão não conhece', async () => {
    const projeto = {
      name: 'Do futuro',
      formatVersion: CURRENT_PROJECT_FORMAT_VERSION,
      files: baseFiles,
      blocksState: { blocks: { languageVersion: 0, blocks: [{ type: 'sz_bloco_do_futuro' }] } },
    }
    const { tela, avisos } = await recusar(jsonFile(JSON.stringify(projeto)))
    expect(tela).toContain('usa blocos que o Estúdio daqui ainda não conhece')
    // Anti-vácuo: o motivo técnico existia e foi para o console, não sumiu.
    expect(avisos.join(' ')).toContain('sz_bloco_do_futuro')
    expect(avisos.join(' ')).toContain('$.blocksState')
  })

  it('ferramenta (extensão) que esta versão não conhece', async () => {
    const projeto = {
      name: 'Com ferramenta solta',
      formatVersion: CURRENT_PROJECT_FORMAT_VERSION,
      files: baseFiles,
      installedExtensions: [{ id: 'extensao-inexistente', version: '9.9.9' }],
    }
    const { tela, avisos } = await recusar(jsonFile(JSON.stringify(projeto)))
    expect(tela).toContain('tem partes que o Estúdio daqui ainda não sabe abrir')
    expect(avisos.join(' ')).toContain('$.installedExtensions')
  })

  it('projeto antigo cuja conversão não reconhece um bloco', async () => {
    const projeto = {
      name: 'Antigo',
      files: baseFiles,
      blocksState: { blocks: { languageVersion: 0, blocks: [{ type: 'sz_bloco_do_futuro' }] } },
    }
    const { tela, avisos } = await recusar(jsonFile(JSON.stringify(projeto)))
    expect(tela).toContain('tem partes que o Estúdio daqui ainda não sabe abrir')
    expect(avisos.join(' ')).toContain('migration-pending')
  })

  it('projeto feito numa versão mais nova do Estúdio', async () => {
    const projeto = { name: 'Novíssimo', files: baseFiles, formatVersion: 9999 }
    const { tela, avisos } = await recusar(jsonFile(JSON.stringify(projeto)))
    expect(tela).toContain('foi feito numa versão mais nova do Estúdio')
    expect(avisos.join(' ')).toContain('future-format')
  })

  it('arquivo grande demais', async () => {
    const file = jsonFile('{}')
    Object.defineProperty(file, 'size', { value: MAX_PROJECT_IMPORT_CHARS * 4 + 1 })
    const { tela } = await recusar(file)
    expect(tela).toContain('grande demais para importar')
  })
})
