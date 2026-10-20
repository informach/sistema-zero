/**
 * Gera a versão adulta dos cursos em docs/aulas-interativas/adulto. Não importa nem publica aulas.
 *
 *   bun docs/aulas-interativas-tecnico/qa/adulto/gerar-adulto.ts --preparar [pasta]
 *     Atualiza traducoes/<pasta>/*.json com os trechos kids de agora (novos entram como null).
 *   bun docs/aulas-interativas-tecnico/qa/adulto/gerar-adulto.ts --revisar [pasta] [grupo]
 *     Lista os trechos sem versão adulta e as palavras do Kids que sobraram, sem gravar nada.
 *   bun docs/aulas-interativas-tecnico/qa/adulto/gerar-adulto.ts --mostrar <pasta> <grupo>
 *     Lista os trechos do grupo com o índice, para quem escreve a versão adulta.
 *   bun docs/aulas-interativas-tecnico/qa/adulto/gerar-adulto.ts --aplicar <pasta> <grupo> <arquivo>
 *     Grava no grupo as versões de um JSON { "<índice>": "texto adulto" }. "=" repete o kids.
 *   bun docs/aulas-interativas-tecnico/qa/adulto/gerar-adulto.ts [pasta]
 *     Grava os arquivos adultos. Para se algum trecho ainda não tiver versão adulta.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import {
  arquivosPorGrupo,
  caminhoTraducao,
  cursos,
  GRUPO_DO_CADERNO,
  gravarCurso,
  lerTraducao,
  Pendencias,
  palavrasDoKids,
  prepararGrupo,
} from './versao-adulta'

const argumentos = process.argv.slice(2).filter((a) => !a.startsWith('--'))
if (process.argv.includes('--mostrar') || process.argv.includes('--aplicar')) {
  const [pasta, grupo, arquivo] = argumentos
  const traducao = pasta && grupo ? lerTraducao(pasta, grupo) : null
  if (!traducao) throw new Error(`Grupo sem tradução: ${pasta}/${grupo}`)
  if (process.argv.includes('--mostrar')) {
    traducao.trechos.forEach((t, i) => {
      const estado = t.adulto === null ? 'PENDENTE' : t.adulto === '' ? 'SAI' : 'feito'
      console.log(`### [${i}] ${t.onde} (${estado})\n${t.kids}\n`)
    })
    // Versões adultas de trechos kids que mudaram: referência para reescrever os pendentes.
    for (const o of traducao.obsoletos ?? [])
      console.log(`### OBSOLETO (kids antigo)\n${o.kids}\n--- versão adulta antiga:\n${o.adulto}\n`)
    process.exit(0)
  }
  if (!arquivo) throw new Error('Informe o arquivo com as versões adultas.')
  const versoes = JSON.parse(readFileSync(arquivo, 'utf8')) as Record<string, unknown>
  for (const [chave, valor] of Object.entries(versoes)) {
    const trecho = traducao.trechos[Number(chave)]
    if (!/^\d+$/.test(chave) || !trecho) throw new Error(`Índice inexistente: ${chave}`)
    if (typeof valor !== 'string') throw new Error(`[${chave}] precisa ser texto`)
    trecho.adulto = valor === '=' ? trecho.kids : valor
  }
  writeFileSync(
    caminhoTraducao(pasta as string, grupo as string),
    `${JSON.stringify(traducao, null, 2)}\n`,
  )
  const pendentes = traducao.trechos.filter((t) => t.adulto === null).length
  console.log(`${pasta}/${grupo}: ${Object.keys(versoes).length} gravados, ${pendentes} pendentes.`)
  process.exit(0)
}

const preparar = process.argv.includes('--preparar')
const revisar = process.argv.includes('--revisar')
const [filtro, grupoFiltro] = argumentos
const escolhidos = cursos().filter((c) => !filtro || c.pasta === filtro)
if (!escolhidos.length) throw new Error(`Curso desconhecido: ${filtro}`)

let falhou = false
for (const { prefixo, pasta } of escolhidos) {
  const grupos = [...arquivosPorGrupo(prefixo, pasta)].filter(
    ([grupo]) => !grupoFiltro || grupo === grupoFiltro,
  )
  if (preparar) {
    let total = 0
    let pendentes = 0
    let removidos = 0
    for (const [grupo, nomes] of grupos) {
      const r = prepararGrupo(pasta, grupo, nomes)
      total += r.total
      pendentes += r.pendentes
      removidos += r.removidos
    }
    console.log(
      `${pasta}: ${total} trechos, ${pendentes} sem versão adulta, ${removidos} removidos.`,
    )
    continue
  }
  if (revisar) {
    // O caderno não é um grupo de arquivos das aulas, mas a tradução dele passa pela mesma régua.
    const comCaderno = [...grupos.map(([grupo]) => grupo)]
    if ((!grupoFiltro || grupoFiltro === GRUPO_DO_CADERNO) && lerTraducao(pasta, GRUPO_DO_CADERNO))
      comCaderno.push(GRUPO_DO_CADERNO)
    for (const grupo of comCaderno) {
      const trechos = lerTraducao(pasta, grupo)?.trechos ?? []
      const pendentes = trechos.filter((t) => t.adulto === null).length
      const problemas = trechos.flatMap((t, i) =>
        t.adulto
          ? palavrasDoKids(t.adulto).map((p) => `  #${i} ${p}: ${t.adulto?.slice(0, 90)}`)
          : [],
      )
      if (pendentes || problemas.length) falhou = true
      console.log(`${pasta}/${grupo}: ${trechos.length} trechos, ${pendentes} pendentes`)
      for (const p of problemas) console.log(p)
    }
    continue
  }
  try {
    console.log(`${pasta}: ${gravarCurso(prefixo, pasta)} arquivos adultos gravados.`)
  } catch (erro) {
    if (!(erro instanceof Pendencias)) throw erro
    console.error(`${pasta}: ${erro.message}`)
    falhou = true
  }
}
if (falhou) process.exit(1)
