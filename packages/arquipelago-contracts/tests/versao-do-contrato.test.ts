import { expect, test } from 'bun:test'
import {
  VERSAO_CONTRATO_PLATAFORMA,
  VERSOES_COMPATIVEIS_DA_PLATAFORMA,
  versaoCompativel,
} from '../src/plataforma'

test('a versão atual e a anterior do contrato valem; as outras não (A35)', () => {
  expect(versaoCompativel(VERSAO_CONTRATO_PLATAFORMA)).toBe(true)
  expect(VERSOES_COMPATIVEIS_DA_PLATAFORMA).toContain(VERSAO_CONTRATO_PLATAFORMA)
  if (VERSAO_CONTRATO_PLATAFORMA > 1)
    expect(versaoCompativel(VERSAO_CONTRATO_PLATAFORMA - 1)).toBe(true)
  expect(VERSOES_COMPATIVEIS_DA_PLATAFORMA.length).toBeLessThanOrEqual(2)
  expect(versaoCompativel(VERSAO_CONTRATO_PLATAFORMA + 1)).toBe(false)
  expect(versaoCompativel(VERSAO_CONTRATO_PLATAFORMA - 2)).toBe(false)
  expect(versaoCompativel(String(VERSAO_CONTRATO_PLATAFORMA))).toBe(false)
  expect(versaoCompativel(null)).toBe(false)
})
