import type { JSX, Ref } from 'react'
import { useImperativeHandle, useRef, useState } from 'react'
import { Button, IconUpload, Modal } from '#ui'
import { MAX_PROJECT_IMPORT_CHARS } from '../../state/projectLimits'
import { useT } from '../../studio/i18n'

/**
 * Abre o seletor de arquivo de fora do botão. É o que deixa um SEGUNDO gatilho (o "Importar um
 * jogo" do cartão da faixa lilás, 11/09/2026) usar o MESMO input e o MESMO aviso: dois inputs
 * seriam dois caminhos de import para manter iguais, e dois modais disputariam o foco.
 */
export interface ImportButtonHandle {
  open: () => void
}

export interface ImportButtonProps {
  onImported: (id: string) => void
  /** IDs conquistados na carreira; projeto não é destruído, mas incompatibilidades são avisadas. */
  allowedExtensions?: readonly string[]
  ref?: Ref<ImportButtonHandle>
}

export function ImportButton({
  onImported,
  allowedExtensions,
  ref,
}: ImportButtonProps): JSX.Element {
  const t = useT()
  const inputRef = useRef<HTMLInputElement | null>(null)
  useImperativeHandle(ref, () => ({ open: () => inputRef.current?.click() }), [])
  const [error, setError] = useState<string | null>(null)
  // Avisos não-fatais do import (cota/permissão/bloco desconhecido): o projeto FOI
  // criado, mas mostramos o que ficou de fora antes de abrir. A navegação
  // (`onImported`) só acontece quando o aluno fecha o aviso — senão a tela trocaria
  // e a lista de avisos sumiria.
  const [warnings, setWarnings] = useState<string[] | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    try {
      // `file.size` é em BYTES; o limite real é em CARACTERES (checado abaixo
      // com `text.length`). Aqui é só um teto anti-DoS para não ler arquivos
      // gigantescos: 4 bytes/char é o pior caso de expansão UTF-8, então comparar
      // bytes contra `MAX_PROJECT_IMPORT_CHARS * 4` evita rejeitar por engano
      // conteúdo multi-byte que cabe dentro do limite de caracteres.
      if (file.size > MAX_PROJECT_IMPORT_CHARS * 4) {
        throw new Error('arquivo excede o tamanho máximo permitido')
      }
      const text = await file.text()
      if (text.length > MAX_PROJECT_IMPORT_CHARS) {
        throw new Error('arquivo excede o tamanho máximo permitido')
      }
      // O JSON.parse fica no SEU PRÓPRIO try/catch: um arquivo que não é JSON
      // (ex.: uma imagem, um .txt) estoura um SyntaxError com texto em inglês
      // ("Unexpected token o in JSON") que não diz nada a uma criança. Aqui
      // trocamos por uma frase fixa em português que aponta o próximo passo.
      // Erros de JSON-válido-mas-projeto-inválido continuam vindo do store (já
      // em português) e NÃO são engolidos por este catch.
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        setError(t('projects.importNotJson'))
        return
      }
      const { useProjectStore } = await import('../../state/projectStore')
      const { project, warnings: importWarnings } = await useProjectStore
        .getState()
        .importProjectFromJSON(parsed)
      const warns = [...importWarnings]
      if (allowedExtensions) {
        const unavailable = project.installedExtensions
          .map((extension) => extension.id)
          .filter((id) => !allowedExtensions.includes(id))
        if (unavailable.length > 0) {
          warns.push(
            `Este projeto usa ferramentas que ainda serão liberadas na sua carreira: ${unavailable.join(', ')}. Ele ficou salvo e poderá ser aberto quando você conquistar essas ferramentas.`,
          )
        }
      }
      if (warns.length > 0) {
        // Segura a navegação até o aluno ler os avisos (ver dismiss()).
        setWarnings(warns)
        setPendingId(project.id)
      } else {
        onImported(project.id)
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'arquivo inválido'
      setError(t('projects.importError', { reason }))
    }
  }

  // Fecha o modal. Se havia avisos, o projeto foi importado: navega AGORA.
  const dismiss = () => {
    setError(null)
    const id = pendingId
    setWarnings(null)
    setPendingId(null)
    if (id) onImported(id)
  }

  const open = error !== null || warnings !== null

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        name="project-import-file"
        aria-label="Importar projeto"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void handleFile(file)
        }}
      />
      {/* A pílula branca das telas-modelo (`.sz-tool-pill--quiet` de
          `@sistemazero/ui/tool-chrome.css`). O nome acessível segue "Importar" (os e2e usam). */}
      <button
        type="button"
        className="sz-tool-pill sz-tool-pill--quiet"
        onClick={() => inputRef.current?.click()}
      >
        <IconUpload />
        {t('projects.import')}
      </button>
      <Modal
        open={open}
        onClose={dismiss}
        title="Importação"
        footer={
          <Button variant="primary" size="sm" onClick={dismiss}>
            {t('projects.importWarn.dismiss')}
          </Button>
        }
      >
        {error !== null ? (
          error
        ) : warnings !== null ? (
          <div role="status">
            <p className="mb-1 font-medium text-sz-fg">{t('projects.importWarn.title')}</p>
            <ul className="list-disc space-y-1 pl-5 text-sz-fg-soft">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </Modal>
    </>
  )
}
