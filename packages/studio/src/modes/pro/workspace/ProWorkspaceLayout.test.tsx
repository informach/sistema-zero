import { describe, expect, it } from 'bun:test'
import { fireEvent, render } from '@testing-library/react'
import { useEffect, useState } from 'react'
import { StudioLayoutProvider } from '../../../studio/layoutContext'
import { emptyWorkspace } from './model'
import { ProWorkspaceLayout } from './ProWorkspaceLayout'

describe('layout contínuo do Pro', () => {
  it('preserves code, preview and tutor instances through resize and expansion', () => {
    const mounts: Record<string, number> = {},
      disposals: Record<string, number> = {}
    function Probe({ name }: { name: string }) {
      useEffect(() => {
        mounts[name] = (mounts[name] ?? 0) + 1
        return () => {
          disposals[name] = (disposals[name] ?? 0) + 1
        }
      }, [name])
      return <input aria-label={name} defaultValue={`${name} inicial`} />
    }
    function Workspace() {
      const [preferences, change] = useState(emptyWorkspace)
      return (
        <ProWorkspaceLayout
          navigator={() => <Probe name="arquivos" />}
          editor={<Probe name="código" />}
          preview={<Probe name="jogo" />}
          tutor={<Probe name="zappy" />}
          bottom={null}
          preferences={preferences}
          change={change}
          gameRequest={0}
          searchRequest={0}
        />
      )
    }
    const content = (narrow: boolean) => (
      <StudioLayoutProvider
        value={{ width: narrow ? 600 : 1200, isNarrow: narrow, isCompact: narrow }}
      >
        <Workspace />
      </StudioLayoutProvider>
    )
    const view = render(content(false))
    const original = view.getByLabelText('código')
    fireEvent.change(original, { target: { value: 'edição ainda aberta' } })
    fireEvent.click(view.getByRole('button', { name: 'Ampliar código' }))
    fireEvent.click(view.getByRole('button', { name: 'Ampliar jogo' }))
    view.rerender(content(true))
    fireEvent.click(view.getByRole('button', { name: 'Código' }))
    view.rerender(content(false))
    expect(view.getByLabelText('código')).toBe(original)
    expect((original as HTMLInputElement).value).toBe('edição ainda aberta')
    expect(mounts).toEqual({ arquivos: 1, código: 1, jogo: 1, zappy: 1 })
    expect(disposals).toEqual({})
    view.unmount()
    expect(disposals).toEqual({ arquivos: 1, código: 1, jogo: 1, zappy: 1 })
  })
})
