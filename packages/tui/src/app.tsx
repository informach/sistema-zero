import { createCliRenderer } from '@opentui/core'
import { createRoot, useKeyboard, useRenderer, useTerminalDimensions } from '@opentui/react'
import { sanitize, terminalStates } from '@sistemazero/agent-core'
import {
  Component,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react'
import { InputBar } from './components/input-bar'
import { KeyboardLayerProvider, useKeyboardLayer } from './providers/keyboard-layer'
import { ThemeProvider, useTheme } from './providers/theme'
import { ToastProvider } from './providers/toast'
import { editDraft } from './state/editor'
import { PANELS, type Panel, RuntimeState } from './state/runtime'

const labels: Record<Panel, string> = {
  chat: 'Conversa',
  sessions: 'Sessões',
  tasks: 'Tarefas',
  team: 'Equipe',
  workflows: 'Receitas',
  schedules: 'Agendas',
  environments: 'Ambientes',
  services: 'Serviços',
  browser: 'Navegador',
  previews: 'Verificação visual',
  mcp: 'MCP',
  connections: 'Conexões',
  models: 'Modelos',
  usage: 'Uso e orçamento',
  context: 'Contexto',
  memory: 'Memória',
  skills: 'Skills',
  checkpoints: 'Checkpoints',
  effects: 'Efeitos',
  grants: 'Autorizações',
}
function useChanges(state: RuntimeState) {
  const [, refresh] = useReducer((value: number) => value + 1, 0)
  useEffect(() => {
    state.on('change', refresh)
    return () => {
      state.off('change', refresh)
    }
  }, [state])
}
export function SessionView({ state }: { state: RuntimeState }) {
  useChanges(state)
  const keyboard = useKeyboardLayer()
  const renderer = useRenderer()
  const { width, height } = useTerminalDimensions()
  const { colors } = useTheme()
  const [focus, setFocus] = useState<'input' | 'content'>('input')
  const [editing, setEditing] = useState(false)
  const report = useCallback(
    (error: unknown) => {
      state.error = error instanceof Error ? error.message : String(error)
      state.update()
    },
    [state],
  )
  const editor = useCallback(async () => {
    if (editing) return
    setEditing(true)
    renderer.suspend()
    try {
      state.setDraft(
        await editDraft(
          state.draftText === '/editor' ? '' : state.draftText,
          state.session?.workspace ?? state.workspace,
        ),
      )
    } finally {
      renderer.resume()
      setEditing(false)
    }
  }, [state, renderer, editing])
  useEffect(() => {
    keyboard.setResponder('base', () => {
      if (state.run && !terminalStates.has(state.run.state)) {
        void state.command('/cancel').catch(report)
        return true
      }
      state.close()
      return false
    })
    return () => keyboard.setResponder('base', null)
  }, [state, keyboard.setResponder, report])
  useKeyboard((key) => {
    if (editing || !keyboard.isTopLayer('base')) return
    if (key.name === 'tab') {
      setFocus((value) => (value === 'input' ? 'content' : 'input'))
      key.preventDefault()
      return
    }
    if (key.name === 'escape') {
      state.panel = 'chat'
      state.update()
      setFocus('input')
      return
    }
    if (key.ctrl && key.name === 'e') {
      key.preventDefault()
      void editor().catch(report)
      return
    }
    const shortcut: Record<string, string> = {
      f1: '/help',
      f2: '/tasks',
      f3: '/sessions',
      f4: '/connections',
    }
    const command = shortcut[key.name]
    if (command) {
      void state.command(command).catch(report)
      return
    }
    if (focus !== 'content') return
    if (key.name === 'up' || key.name === 'down') {
      state.selected = Math.max(
        0,
        Math.min(state.rows.length - 1, state.selected + (key.name === 'up' ? -1 : 1)),
      )
      state.update()
    }
    if (key.name === 'return' || key.name === 'enter') {
      const action = state.rows[state.selected]?.action
      if (action) void state.command(action).catch(report)
    }
    if (key.name === 'left' || key.name === 'right') {
      const panel =
        PANELS[
          (PANELS.indexOf(state.panel) + PANELS.length + (key.name === 'left' ? -1 : 1)) %
            PANELS.length
        ]
      if (panel) void state.show(panel).catch(report)
    }
  })
  const transcript = useMemo(() => {
    const final = state.events.findLast((event) => event.type === 'assistant.final')
    const text =
      typeof final?.payload === 'string'
        ? final.payload
        : final?.payload &&
            typeof final.payload === 'object' &&
            'preview' in final.payload &&
            typeof final.payload.preview === 'string'
          ? `${final.payload.preview}\nReferência completa: ${JSON.stringify('artifact' in final.payload ? final.payload.artifact : null)}`
          : state.events
              .filter((event) => event.type === 'assistant.delta')
              .map((event) => (typeof event.payload === 'string' ? event.payload : ''))
              .join('')
    const activity = state.events
      .filter((event) => ['effect.state', 'tool.result', 'backend.status'].includes(event.type))
      .slice(-8)
      .map((event) => `${event.type}: ${JSON.stringify(event.payload).slice(0, 900)}`)
      .join('\n')
    return sanitize(
      [state.run ? `Você: ${state.run.input.slice(0, 4000)}` : '', text.slice(-24000), activity]
        .filter(Boolean)
        .join('\n\n'),
    )
  }, [state.events, state.run])
  const compact = width < 100 || height < 28
  const selected = state.rows[state.selected]
  const visible = state.rows.slice(
    Math.max(0, state.selected - 4),
    Math.max(0, state.selected - 4) + Math.max(3, Math.min(12, height - 15)),
  )
  if (width < 50 || height < 14)
    return (
      <box flexDirection="column">
        <text fg={colors.error}>Terminal pequeno: mínimo 50 × 14.</text>
        <text>Redimensione ou use sistemazero run no CLI. Ctrl+C fecha.</text>
      </box>
    )
  return (
    <box
      width="100%"
      height="100%"
      flexDirection="column"
      backgroundColor={colors.background}
      paddingX={compact ? 1 : 2}
    >
      <box height={2} flexShrink={0} flexDirection="row" justifyContent="space-between">
        <text fg={colors.primary}>
          <b>SISTEMA ZERO</b> · {labels[state.panel]}
        </text>
        <text fg={colors.info}>{focus === 'input' ? 'Entrada' : 'Navegação'} · F1 ajuda</text>
      </box>
      <text height={1} flexShrink={0} fg={colors.dimSeparator}>
        {sanitize(state.session?.workspace ?? state.workspace)}
      </text>
      <box flexGrow={1} flexDirection="row" gap={2}>
        {!compact && (
          <scrollbox width={21} flexShrink={0} contentOptions={{ flexDirection: 'column' }}>
            {PANELS.map((panel) => (
              <text
                key={panel}
                fg={state.panel === panel ? colors.primary : colors.dimSeparator}
                onMouseDown={() => {
                  setFocus('content')
                  void state.show(panel).catch(report)
                }}
              >
                {state.panel === panel ? '› ' : '  '}
                {labels[panel]}
              </text>
            ))}
          </scrollbox>
        )}
        <box flexDirection="column" flexGrow={1}>
          <scrollbox
            flexGrow={1}
            width="100%"
            focused={focus === 'content' && state.panel === 'chat'}
            contentOptions={{ flexDirection: 'column', flexShrink: 0 }}
            stickyScroll={state.panel === 'chat'}
            stickyStart="bottom"
          >
            {state.panel === 'chat' ? (
              <>
                {state.previousCursor && (
                  <text fg={colors.dimSeparator}>
                    Histórico anterior disponível: /older · exportação completa: /export
                  </text>
                )}
                {transcript && (
                  <text flexShrink={0} width="100%" wrapMode="word">
                    {transcript}
                  </text>
                )}
                <text flexShrink={0} width="100%" fg={colors.info} wrapMode="word">
                  {sanitize(state.notice.slice(0, 24000))}
                </text>
              </>
            ) : (
              <>
                <text fg={colors.primary}>
                  {state.busy
                    ? 'Carregando…'
                    : `${state.rows.length} registros${state.nextCursor !== undefined ? ' · /more para continuar' : ''}`}
                </text>
                {visible.map((row) => (
                  <text
                    key={row.id}
                    flexShrink={0}
                    fg={selected === row ? colors.primary : colors.info}
                  >
                    {selected === row ? '› ' : '  '}
                    {sanitize(row.title.slice(0, 200))}
                  </text>
                ))}
                {selected && (
                  <box marginTop={1} flexDirection="column" flexShrink={0}>
                    <text fg={colors.primary}>{sanitize(selected.id)}</text>
                    <text wrapMode="word">{sanitize(selected.description)}</text>
                    {selected.action && <text fg={colors.success}>Enter: {selected.action}</text>}
                  </box>
                )}
                {!state.busy && !state.rows.length && (
                  <text>Nenhum registro. Use /help para iniciar uma operação.</text>
                )}
              </>
            )}
          </scrollbox>
          {[...state.questions]
            .sort(
              (left, right) =>
                Number(right.runId === state.run?.id) - Number(left.runId === state.run?.id),
            )
            .slice(0, compact ? 1 : 3)
            .map((question) => (
              <box
                key={question.id}
                flexDirection="column"
                flexShrink={0}
                maxHeight={compact ? 7 : 8}
                border={['left']}
                borderColor={colors.planMode}
                paddingLeft={1}
              >
                <text fg={colors.planMode}>
                  {question.kind === 'approval' ? 'APROVAÇÃO' : 'PERGUNTA'} · tarefa{' '}
                  {question.runId.slice(0, 8)}
                </text>
                <text wrapMode="word" height={compact ? 2 : 3} flexShrink={0}>
                  {sanitize(question.prompt.slice(0, compact ? 300 : 1000))}
                </text>
                <text fg={colors.primary} height={2} flexShrink={0}>
                  /answer {question.id} {sanitize(question.options.join(' | ') || 'resposta')}
                </text>
                <text fg={colors.info} height={1} flexShrink={0}>
                  Detalhes: /question {question.id}
                </text>
              </box>
            ))}
          {state.questions.length > (compact ? 1 : 3) && (
            <text fg={colors.planMode}>
              Mais {state.questions.length - (compact ? 1 : 3)} perguntas pendentes; /tasks para
              selecionar a tarefa.
            </text>
          )}
        </box>
      </box>
      {state.error && (
        <text height={2} flexShrink={0} fg={colors.error}>
          Erro: {sanitize(state.error.slice(0, 500))}
        </text>
      )}
      {state.attachments.length > 0 && (
        <text height={1} flexShrink={0} fg={colors.info}>
          {state.attachments.length} anexos:{' '}
          {sanitize(state.attachments.map((item) => item.path).join(', '))} · /detach
        </text>
      )}
      <InputBar
        disabled={editing || focus !== 'input'}
        draft={state.draft}
        onDraft={(text) => {
          state.draftText = text
        }}
        status={`${state.readiness === 'ready' ? state.settings?.mode : state.readiness} · ${state.settings?.backend ?? ''} · ${state.settings?.model || 'modelo padrão'} · ${state.run?.state ?? 'pronto'} · ${state.runs.filter((run) => !terminalStates.has(run.state)).length} tarefas ativas`}
        onSubmit={async (text) => {
          if (text === '/exit') {
            state.close()
            renderer.destroy()
            return
          }
          if (text === '/editor') {
            await editor()
            return
          }
          await state.submit(text)
        }}
      />
    </box>
  )
}
class TerminalBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  override render() {
    return this.state.failed ? (
      <text>
        Falha na interface. Ctrl+C fecha; reconecte com sistemazero. As tarefas permanecem no
        supervisor.
      </text>
    ) : (
      this.props.children
    )
  }
}
function Shell({ state }: { state: RuntimeState }) {
  useChanges(state)
  return (
    <ThemeProvider
      name={state.settings?.theme}
      onChange={(theme) => {
        void state.command(`/theme ${theme.name}`).catch((error) => {
          state.error = String(error)
          state.update()
        })
      }}
    >
      <ToastProvider>
        <KeyboardLayerProvider>
          <TerminalBoundary>
            <SessionView state={state} />
          </TerminalBoundary>
        </KeyboardLayerProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
export async function start(workspace: string) {
  const state = new RuntimeState(workspace)
  const renderer = await createCliRenderer({ targetFps: 30, exitOnCtrlC: false })
  renderer.on('destroy', () => state.close())
  createRoot(renderer).render(<Shell state={state} />)
  try {
    await state.open()
  } catch (error) {
    state.error = String(error)
    state.update()
  }
}
