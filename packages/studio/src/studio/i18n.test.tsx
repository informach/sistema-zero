import { expect, test } from 'bun:test'
import { render } from '@testing-library/react'
import { StudioI18nProvider, useT } from './i18n'
import { useSharedT } from './shared-i18n'

function Labels({ name }: { name: string }) {
  const t = useT()
  const shared = useSharedT()
  return (
    <output aria-label={name}>
      {shared('projects.rename')} / {t('pro.files')}
    </output>
  )
}

test('lista e editor compartilham o idioma da instância sem afetar vizinhos ou telas avulsas', () => {
  const content = (english: boolean) => (
    <>
      <StudioI18nProvider locale={english ? 'en' : 'pt-BR'}>
        <Labels name="instância A" />
      </StudioI18nProvider>
      <StudioI18nProvider locale="pt-BR">
        <Labels name="instância B" />
      </StudioI18nProvider>
      <Labels name="avulsa" />
    </>
  )
  const view = render(content(true))
  expect(view.getByLabelText('instância A').textContent).toBe('Rename / Files')
  expect(view.getByLabelText('instância B').textContent).toBe('Renomear / Arquivos')
  expect(view.getByLabelText('avulsa').textContent).toBe('Renomear / Arquivos')
  view.rerender(content(false))
  expect(view.getByLabelText('instância A').textContent).toBe('Renomear / Arquivos')
  view.unmount()
})
