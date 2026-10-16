import type { KeyBinding, TextareaRenderable } from '@opentui/core'
import { useRenderer } from '@opentui/react'
import { useCallback, useLayoutEffect, useRef } from 'react'
import { useTheme } from '../providers/theme'
import { useToast } from '../providers/toast'
import { EmptyBorder } from './border'
import { CommandMenu } from './command-menu'
import type { Command } from './command-menu/types'
import { useCommandMenu } from './command-menu/use-command-menu'
import { StatusBar } from './status-bar'

type Props = {
  onSubmit: (text: string) => Promise<void>
  status?: string
  disabled?: boolean
  draft?: { text: string; version: number }
  onDraft?: (text: string) => void
}

export const TEXTAREA_KEY_BINDINGS: KeyBinding[] = [
  { name: 'return', action: 'submit' },
  { name: 'enter', action: 'submit' },
  { name: 'return', shift: true, action: 'newline' },
  { name: 'enter', shift: true, action: 'newline' },
]

export function InputBar({ onSubmit, disabled = false, status = '', draft, onDraft }: Props) {
  const { colors } = useTheme()
  const textareaRef = useRef<TextareaRenderable>(null)
  const submitting = useRef(false)
  const onSubmitRef = useRef<() => void>(() => {})
  const renderer = useRenderer()
  const toast = useToast()

  const {
    showCommandMenu,
    commandQuery,
    selectedIndex,
    scrollRef,
    handleContentChange,
    resolveCommand,
    setSelectedIndex,
  } = useCommandMenu()

  const handleTextareaContentChange = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    handleContentChange(textarea.plainText)
    onDraft?.(textarea.plainText)
  }, [handleContentChange, onDraft])
  useLayoutEffect(() => {
    if (draft) textareaRef.current?.setText(draft.text)
  }, [draft])

  const handleSubmit = useCallback(async () => {
    if (disabled || submitting.current) return

    const textarea = textareaRef.current
    if (!textarea) return

    const text = textarea.plainText.trim()
    if (text.length === 0) return
    submitting.current = true
    try {
      await onSubmit(text)
      if (textarea.plainText.trim() === text) textarea.setText('')
    } catch (error) {
      toast.show({
        variant: 'error',
        message: error instanceof Error ? error.message : 'Falha ao enviar',
      })
    } finally {
      submitting.current = false
    }
  }, [disabled, onSubmit, toast])

  const handleCommand = useCallback(
    (command: Command | undefined) => {
      const textarea = textareaRef.current
      if (!textarea || !command) return

      textarea.setText('')

      if (command.action) {
        command.action({
          exit: () => renderer.destroy(),
          toast,
        })
      } else {
        textarea.insertText(`${command.value} `)
      }
    },
    [renderer, toast],
  )

  const handleCommandExecute = useCallback(
    (index: number) => {
      const command = resolveCommand(index)
      handleCommand(command)
    },
    [resolveCommand, handleCommand],
  )

  // Wire up textarea submit handler once so it always reads the latest state.
  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.onSubmit = () => {
      onSubmitRef.current()
    }
  }, [])

  onSubmitRef.current = () => {
    if (disabled) return

    if (showCommandMenu) {
      const command = resolveCommand(selectedIndex)
      handleCommand(command)
      return
    }

    void handleSubmit()
  }

  return (
    <box width="100%" alignItems="center">
      <box
        width="100%"
        border={['left']}
        borderColor={colors.primary}
        customBorderChars={{
          ...EmptyBorder,
          vertical: '┃',
          bottomLeft: '╹',
        }}
      >
        <box
          position="relative"
          justifyContent="center"
          paddingX={2}
          paddingY={1}
          backgroundColor={colors.surface}
          width="100%"
          gap={1}
        >
          {showCommandMenu && (
            <box
              position="absolute"
              bottom="100%"
              left={0}
              width="100%"
              backgroundColor={colors.surface}
              zIndex={10}
            >
              <CommandMenu
                query={commandQuery}
                selectedIndex={selectedIndex}
                scrollRef={scrollRef}
                onSelect={setSelectedIndex}
                onExecute={handleCommandExecute}
              />
            </box>
          )}
          <textarea
            ref={textareaRef}
            focused={!disabled}
            keyBindings={TEXTAREA_KEY_BINDINGS}
            onContentChange={handleTextareaContentChange}
            placeholder={'Descreva a tarefa ou use /help · Shift+Enter para nova linha'}
          />
          <StatusBar status={status} />
        </box>
      </box>
    </box>
  )
}
