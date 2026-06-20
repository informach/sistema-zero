import type { JSX } from 'react'
import { useRef, useState } from 'react'
import { t } from '#core'
import { Button, Modal } from '#ui'
import { MAX_PROJECT_IMPORT_CHARS, useProjectStore } from '../../state/projectStore'

export interface ImportButtonProps {
  onImported: (id: string) => void
}

export function ImportButton({ onImported }: ImportButtonProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const importFromJSON = useProjectStore((s) => s.importProjectFromJSON)
  const [error, setError] = useState<string | null>(null)

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
      const imported = await importFromJSON(parsed)
      onImported(imported.id)
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'arquivo inválido'
      setError(t('projects.importError', { reason }))
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        aria-label="Importar projeto"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void handleFile(file)
        }}
      />
      <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
        {t('projects.import')}
      </Button>
      <Modal
        open={error !== null}
        onClose={() => setError(null)}
        title="Importação"
        footer={
          <Button variant="primary" size="sm" onClick={() => setError(null)}>
            Entendi
          </Button>
        }
      >
        {error}
      </Modal>
    </>
  )
}
