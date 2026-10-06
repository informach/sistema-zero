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
