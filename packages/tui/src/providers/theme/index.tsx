import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react'
import { DEFAULT_THEME, THEMES, type Theme, type ThemeColors } from '../../theme'

type ThemeContextValue = {
  colors: ThemeColors
  currentTheme: Theme
  setTheme: (theme: Theme) => void
}
const ThemeContext = createContext<ThemeContextValue | null>(null)
const monochrome: ThemeColors = {
  primary: '#ffffff',
  planMode: '#ffffff',
  selection: '#ffffff',
  thinking: '#cccccc',
  success: '#ffffff',
  error: '#ffffff',
  info: '#cccccc',
  background: '#000000',
  surface: '#111111',
  dialogSurface: '#111111',
  thinkingBorder: '#999999',
  dimSeparator: '#aaaaaa',
}
export function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used within a ThemeProvider')
  return value
}
export function ThemeProvider({
  children,
  name,
  onChange,
}: {
  children: ReactNode
  name?: string
  onChange?: (theme: Theme) => void
}) {
  const [currentTheme, setCurrentTheme] = useState(DEFAULT_THEME)
  useEffect(() => {
    if (name) setCurrentTheme(THEMES.find((theme) => theme.name === name) ?? DEFAULT_THEME)
  }, [name])
  const setTheme = useCallback(
    (theme: Theme) => {
      setCurrentTheme(theme)
      onChange?.(theme)
    },
    [onChange],
  )
  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        colors: process.env.NO_COLOR !== undefined ? monochrome : currentTheme.colors,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}
