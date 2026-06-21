import { afterEach, describe, expect, it } from 'bun:test'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

  it('para JSON VÁLIDO mas projeto inválido, surge a mensagem (em PT) do store', async () => {
    const { container } = render(<ImportButton onImported={() => undefined} />)
    // JSON válido, mas sem os campos obrigatórios (name/files) → o store lança
    // uma mensagem em português, encaminhada por projects.importError.
    await chooseFile(fileInput(container), jsonFile('{"foo":123}'))

    await waitFor(() => {
      expect(screen.getByText(/Não foi possível importar/i)).toBeTruthy()
    })
    // A mensagem do store é em português ("Arquivo inválido: ...").
    expect(screen.getByText(/Arquivo inválido/i)).toBeTruthy()
  })
})
