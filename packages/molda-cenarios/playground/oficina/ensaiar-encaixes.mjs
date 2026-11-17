import assert from 'node:assert/strict'
import { resolve } from 'node:path'

/** Complemento do ensaio da oficina: preferências não gravam, aplicar à seleção grava. */
export async function ensaiarEncaixes(pagina, { ler, saida, tema, largura, modulo }) {
  const antes = await ler()
  await pagina.getByText('Grade e encaixes', { exact: true }).click()
  const preencher = async (nome, valor) => {
    const campo = pagina.getByLabel(nome)
    await campo.fill(String(valor))
    await campo.press('Tab')
  }
  await preencher(/^Passo da grade/, 1.25)
  await preencher(/^Passo do giro/, 90)
  await preencher(/^Origem X/, 0.25)
  await preencher(/^Origem Y/, 0.25)
  await pagina.getByLabel('Colocar no andar', { exact: true }).check()
  await preencher(/^Andar$/, 2)
  assert.deepEqual(await ler(), antes)
  const girar = pagina.getByRole('button', { name: 'Girar seleção 90°', exact: true })
  if (largura === 390) await girar.tap()
  else await girar.click()
  await pagina.getByText('Guardado', { exact: true }).waitFor()
  const girado = await ler()
  assert.notDeepEqual(
    girado.instancias[0].transformacao.rotacao,
    antes.instancias[0].transformacao.rotacao,
  )
  await pagina.getByRole('button', { name: 'Levar seleção ao andar', exact: true }).click()
  await pagina.getByText('Guardado', { exact: true }).waitFor()
  const doc = await ler()
  const base = await pagina.evaluate(
    async ({ doc, modulo }) => {
      const { volumeNoMundo } = await import(modulo)
      return volumeNoMundo(doc, doc.instancias[0]).min.y
    },
    { doc, modulo },
  )
  assert.ok(Math.abs(base - 6.25) < 0.001)
  assert.equal(doc.instancias[0].apoio.tipo, 'absoluto')
  if (largura !== 390)
    await pagina.getByRole('button', { name: 'Ver o que escolhi', exact: true }).click()
  await pagina.screenshot({ path: resolve(saida, `encaixes-${tema}-${largura}.png`) })
  for (let i = 0; i < 2; i++) {
    await pagina.getByRole('button', { name: 'Desfazer', exact: true }).click()
    await pagina.getByText('Guardado', { exact: true }).waitFor()
  }
  assert.deepEqual(await ler(), antes)
  await pagina.getByText('Grade e encaixes', { exact: true }).click()
  return {
    preferenciasSemEdicao: true,
    giro90: true,
    baseNoAndar: base,
    desfazer: true,
    toqueEmulado: largura === 390,
  }
}
