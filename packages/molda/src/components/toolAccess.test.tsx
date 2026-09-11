import { expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { render, screen } from '@testing-library/react'
import type { MoldaToolFamilyId } from '../core/toolFamilies'
import { DeferredModule } from './editor/DeferredEditor'
import { MoldaToolAccessProvider, RequiresTool, useMoldaToolAccess } from './toolAccess'

function Probe({ family }: { family: MoldaToolFamilyId }) {
  const access = useMoldaToolAccess()
  return (
    <p>
      {family}: {access.can(family) ? 'liberada' : 'trancada'}
      {access.restricted ? ' (com trava)' : ''}
    </p>
  )
}

test('sem provedor, tudo liberado: o playground, os testes e outros hosts', () => {
  render(
    <>
      <Probe family="model.mesh" />
      <RequiresTool family="model.skin">
        <button type="button">Ossos</button>
      </RequiresTool>
    </>,
  )
  expect(screen.getByText('model.mesh: liberada')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Ossos' })).toBeTruthy()
})

test('com a lista do host, o trancado NÃO é desenhado (nunca fica desligado)', () => {
  render(
    <MoldaToolAccessProvider access={{ allow: ['paint.brush'] }}>
      <Probe family="paint.brush" />
      <RequiresTool family="paint.brush">
        <button type="button">Lápis</button>
      </RequiresTool>
      <RequiresTool family="model.mesh">
        <button type="button">Editar malha</button>
      </RequiresTool>
    </MoldaToolAccessProvider>,
  )
  expect(screen.getByText('paint.brush: liberada (com trava)')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Lápis' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Editar malha' })).toBeNull()
  expect(screen.queryByText('Editar malha')).toBeNull()
})

test('o portão atravessa a oficina carregada sob demanda, sem ganhar prop', async () => {
  const load = async () =>
    function Workshop() {
      return <Probe family="model.mesh" />
    }
  render(
    <MoldaToolAccessProvider access={{ allow: ['model.pieces'] }}>
      <DeferredModule load={load} props={{}} onBack={() => {}} />
    </MoldaToolAccessProvider>,
  )
  expect(await screen.findByText('model.mesh: trancada (com trava)')).toBeTruthy()
})

test('trocar a lista do host redesenha na hora (a criança subiu de posto com o Molda aberto)', () => {
  const view = render(
    <MoldaToolAccessProvider access={{ allow: [] }}>
      <RequiresTool family="model.mesh">
        <button type="button">Editar malha</button>
      </RequiresTool>
    </MoldaToolAccessProvider>,
  )
  expect(screen.queryByRole('button', { name: 'Editar malha' })).toBeNull()
  view.rerender(
    <MoldaToolAccessProvider access={{ allow: ['model.mesh'] }}>
      <RequiresTool family="model.mesh">
        <button type="button">Editar malha</button>
      </RequiresTool>
    </MoldaToolAccessProvider>,
  )
  expect(screen.getByRole('button', { name: 'Editar malha' })).toBeTruthy()
})

const SRC = join(import.meta.dir, '..')
/** Leitura, nuvem, exportação e a ponte com o Estúdio tratam toda criação igual. */
const GATE_FREE = [
  'scene',
  'state',
  'export',
  'import',
  'viewport',
  'workers',
  'model',
  'paint',
  'sky',
  'texture',
  'templates',
] as const
const GATE_MODULES = /from\s+['"][^'"]*(?:\/toolAccess|\/toolFamilies|\/sceneCommandAccess)['"]/

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(ts|tsx)$/.test(name) ? [path] : []
  })
}

test('o domínio não conhece o portão: trancar tira a autoria, nunca a leitura', () => {
  const offenders = GATE_FREE.flatMap((folder) => sourceFiles(join(SRC, folder)))
    .filter((path) => GATE_MODULES.test(readFileSync(path, 'utf8')))
    .map((path) => relative(SRC, path).replaceAll('\\', '/'))
  expect(offenders).toEqual([])
})
