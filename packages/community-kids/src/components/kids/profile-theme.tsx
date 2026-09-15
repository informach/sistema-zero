'use client'

import type { KidsTheme } from '@sistemazero/core/learning'
import { apiGet, apiSend } from '@sistemazero/member-shell/lib/api'
import { useTheme } from 'next-themes'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'

const ProfileThemeContext = createContext<{
  busy: boolean
  error: string
  toggle: () => Promise<void>
  retry: () => void
} | null>(null)
export const useProfileTheme = () => useContext(ProfileThemeContext)

/**
 * De QUEM é o tema que o next-themes guardou neste navegador. A chave dele (`sz-kids-tema`) é do
 * aparelho, não do perfil: sem saber o dono, a única saída segura seria reiniciar no Padrão a cada
 * montagem, e aí a tela de quem usa o Pink piscaria azul em TODO F5 até o GET responder (o script
 * sem flash tinha acabado de acertar o tema, e nós o desfazíamos). Storage bloqueado devolve
 * `null`, que cai no reinício de sempre.
 */
const DONO_DO_TEMA_LOCAL = 'sz:kids:tema-dono'
function donoDoTemaLocal(): string | null {
  try {
    return localStorage.getItem(DONO_DO_TEMA_LOCAL)
  } catch {
    return null
  }
}
function marcarDonoDoTemaLocal(viewerId: string) {
  try {
    localStorage.setItem(DONO_DO_TEMA_LOCAL, viewerId)
  } catch {}
}

/** The server owns the preference; next-themes applies it to the current document. */
export function ProfileThemeProvider({
  viewerId,
  children,
}: {
  viewerId: string
  children: ReactNode
}) {
  const { setTheme } = useTheme()
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const current = useRef<KidsTheme>('padrao')
  const request = useRef(0)
  const saving = useRef(false)
  // ⚠️ O `setTheme` do next-themes é um useCallback com o tema ATUAL na dependência: a identidade
  // dele MUDA a cada troca de tema. Numa dependência de efeito isso vira laço — aplicar o Pink
  // reexecutava a carga, que reiniciava para o Padrão, que aplicava o Pink de novo (as cores
  // piscavam e o GET estourava o limite de 60/min do gateway). A ref sempre em dia dá a função
  // mais recente sem carregar a identidade dela para as deps. NÃO devolva `setTheme` aos arrays.
  const aplicarTema = useRef(setTheme)
  useEffect(() => {
    aplicarTema.current = setTheme
  })
  const load = useCallback(() => {
    const id = ++request.current
    setBusy(true)
    setError('')
    void apiGet<{ theme: KidsTheme | null }>('/api/members/preferences', {
      'x-sz-viewer': viewerId,
    })
      .then((saved) => {
        if (id !== request.current) return
        current.current = saved.theme ?? 'padrao'
        aplicarTema.current(current.current)
        marcarDonoDoTemaLocal(viewerId)
      })
      .catch(() => {
        if (id === request.current) setError('Não consegui carregar o tema do seu perfil.')
      })
      .finally(() => {
        if (id === request.current) setBusy(false)
      })
  }, [viewerId])
  useEffect(() => {
    // Reinício otimista, só quando o tema guardado é de OUTRO perfil: sem ele o tema do irmão
    // anterior ficaria na tela até o GET responder. O provider remonta a cada perfil pelo
    // `key={session.id}` do layout, e o GET logo abaixo confirma (ou corrige) o que está na tela.
    if (donoDoTemaLocal() !== viewerId) aplicarTema.current('padrao')
    load()
    const onFocus = () => {
      if (!saving.current) load()
    }
    window.addEventListener('focus', onFocus)
    return () => {
      request.current++
      window.removeEventListener('focus', onFocus)
    }
    // `viewerId` vem de PROP e o `load` já muda junto com ele: nenhum dos dois é realimentado
    // pelo tema, que é a única coisa que não pode entrar aqui.
  }, [load, viewerId])
  async function toggle() {
    if (busy || error || saving.current) return
    saving.current = true
    const id = ++request.current
    setBusy(true)
    const theme = current.current === 'padrao' ? 'pink' : 'padrao'
    try {
      await apiSend('/api/members/preferences', 'PUT', { theme }, { 'x-sz-viewer': viewerId })
      if (id !== request.current) return
      current.current = theme
      aplicarTema.current(theme)
      marcarDonoDoTemaLocal(viewerId)
    } catch {
      if (id === request.current) setError('Não consegui salvar seu tema. Tente novamente.')
    } finally {
      saving.current = false
      if (id === request.current) setBusy(false)
    }
  }
  return (
    <ProfileThemeContext.Provider value={{ busy, error, toggle, retry: load }}>
      {children}
    </ProfileThemeContext.Provider>
  )
}
