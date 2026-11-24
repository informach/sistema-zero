import assert from 'node:assert/strict'

export async function aplicarCorPelaOficina(pagina, ler, cor) {
  const antes = await ler()
  const hexadecimal = pagina.getByLabel('Cor hexadecimal', { exact: true })
  await hexadecimal.fill(cor)
  await hexadecimal.press('Tab')
  assert.deepEqual(await ler(), antes)
  await pagina.getByRole('button', { name: 'Aplicar tonalidade', exact: true }).click()
  await pagina.getByText('Guardado', { exact: true }).waitFor()
  await pagina
    .getByRole('slider', { name: 'Saturação e luminosidade', exact: true })
    .scrollIntoViewIfNeeded()
  return ler()
}

export async function conferirCoresDaSelecao(pagina, ler) {
  const antes = await ler()
  const uniformes = await aplicarCorPelaOficina(pagina, ler, '#aaddff')
  assert.ok(uniformes.instancias.every((o) => o.aparencia?.cor === '#aaddff'))
  await pagina.getByRole('button', { name: 'Restaurar cores originais', exact: true }).click()
  await pagina.getByText('Guardado', { exact: true }).waitFor()
  assert.ok((await ler()).instancias.every((o) => !o.aparencia?.cor))
  await pagina.getByRole('button', { name: 'Desfazer', exact: true }).click()
  await pagina.getByText('Guardado', { exact: true }).waitFor()
  assert.deepEqual(await ler(), uniformes)
  await pagina.getByRole('button', { name: 'Desfazer', exact: true }).click()
  await pagina.getByText('Guardado', { exact: true }).waitFor()
  assert.deepEqual(await ler(), antes)
  return { porObjeto: true, multipla: true, restaurar: true, desfazer: true }
}
