import { expect, test } from 'bun:test'
import {
  negociarVersao,
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

test('a negociação entrega a menor versão dos dois lados, e recusa a que não é aceita (A35)', () => {
  // O outro lado na mesma versão: a atual.
  expect(negociarVersao(VERSAO_CONTRATO_PLATAFORMA)).toBe(VERSAO_CONTRATO_PLATAFORMA)
  // O outro lado uma versão atrás: este lado fala a dele.
  if (VERSAO_CONTRATO_PLATAFORMA > 1)
    expect(negociarVersao(VERSAO_CONTRATO_PLATAFORMA - 1)).toBe(VERSAO_CONTRATO_PLATAFORMA - 1)
  // Na frente ou duas atrás: não monta.
  expect(negociarVersao(VERSAO_CONTRATO_PLATAFORMA + 1)).toBeNull()
  expect(negociarVersao(VERSAO_CONTRATO_PLATAFORMA - 2)).toBeNull()
  expect(negociarVersao('1')).toBeNull()
  for (const versao of VERSOES_COMPATIVEIS_DA_PLATAFORMA)
    expect(versaoCompativel(negociarVersao(versao))).toBe(true)
})
