/**
 * O PORTÃO dos 27 manifestos v6, o conjunto que vai ao ar.
 *
 * ⚠️⚠️ Ele existe porque o `validar-manifestos.ts` valida o `catalogo.json` da RAIZ, que não tem
 * nenhum caminho `-v6` (M2 do full review 2 de dados, 17/09/2026): o portão do CI passava sem olhar
 * um único manifesto dos que vão ser importados.
 *
 * ⚠️ Roda SEM os roteiros originais, de propósito: os três validadores v6
 * (`validar-revisao-completa.ts`, `validar-desafio-v6.ts`, `validar-meu-jeito-v6.ts`) reproduzem o
 * manifesto a partir das entregas de vídeo, que não moram no repositório, então nenhum deles pode
 * ser o portão do CI. Aqui só entram as réguas que leem o que ESTÁ no repositório: o formato do
 * manifesto, as validações de cena do core e o schema TypeBox do members, que é quem decide a
 * publicação. As réguas não são reescritas: são as mesmas funções que o produto usa.
 *
 * Uso: `bun docs/aulas-interativas/qa/validar-manifestos-v6.ts`
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  isInteractiveBlock,
  isLearningManifest,
  isPublicInteractiveBlock,
  publicInteractiveBlock,
} from '../../../packages/core/src/learning'
import { sceneUnknownSetupGoals } from '../../../packages/core/src/learning/scene'
import { parsePublishedLessonBlock } from '../../../packages/members/src/interfaces/http/lesson-draft.dtos'
import { studioSectionCompletionIssues } from '../../../packages/studio/src/blockly/projectCheckAuthoring'
import {
  CENARIO_DO_CURSO,
  type CenaAnterior,
  cenaMarkdown,
  conferirCenasNoRoteiro,
  conteudoDaCena,
  eCena,
} from './cenas-editorial'
import { correDinoRecipes } from './gerar-candidatos-v6'
import { desafioRecipes } from './gerar-desafio-v6'
import { meuJeitoRecipes } from './gerar-meu-jeito-v6'
import { lessonOneOldScenes } from './revisao-editorial-aula-01'

/** ⚠️ A ORDEM é a da PRIMEIRA importação, em `raio-x-implantacao.md` §4. Mexeu aqui, mexa lá. */
const AULAS = [
  ...Array.from({ length: 13 }, (_, i) => `corre-dino-v6/aula-${String(i + 1).padStart(2, '0')}`),
  'desafio-primeiro-jogo-v6/introducao',
  ...Array.from({ length: 5 }, (_, i) => `desafio-primeiro-jogo-v6/dia-${i + 1}`),
  ...Array.from({ length: 8 }, (_, i) => `o-jogo-do-meu-jeito-v6/aula-0${i + 1}`),
]

/** As marcas de "cena anterior" que a RECEITA da aula declara, sem passar pelos roteiros originais. */
function marcasDaReceita(aula: string): Record<string, CenaAnterior> | undefined {
  const [curso = '', slug = ''] = aula.split('/')
  const numero = Number(slug.replace(/^\D+/, ''))
  if (curso === 'corre-dino-v6')
    return numero === 1 ? lessonOneOldScenes : correDinoRecipes[numero]?.cenasAnteriores
  if (curso === 'desafio-primeiro-jogo-v6')
    return desafioRecipes[slug === 'introducao' ? 0 : numero]?.cenasAnteriores
  return meuJeitoRecipes[numero]?.cenasAnteriores
}

/** A Aula 1 do Corre Dino tem revisão própria; as outras 26 aulas nascem destas receitas. */
function cenasDaReceita(aula: string) {
  const [curso = '', slug = ''] = aula.split('/')
  const numero = Number(slug.replace(/^\D+/, ''))
  if (curso === 'corre-dino-v6') {
    if (numero === 1) return []
    const receita = correDinoRecipes[numero]
    assert(receita, `${aula}: receita ausente`)
    return receita.steps.flatMap((step) => (step.cena ? [step.cena] : []))
  }
  if (curso === 'desafio-primeiro-jogo-v6') {
    const receita = desafioRecipes[slug === 'introducao' ? 0 : numero]
    assert(receita, `${aula}: receita ausente`)
    return receita.steps.flatMap((step) => (step.cena ? [step.cena] : []))
  }
  const receita = meuJeitoRecipes[numero]
  assert(receita, `${aula}: receita ausente`)
  return receita.steps.flatMap((step) => (step.cena ? [step.cena] : []))
}

const root = resolve(import.meta.dir, '..')
const contas = { aulas: 0, secoes: 0, blocos: 0, interativos: 0, cenas: 0, clipes: 0 }
const problemas: string[] = []

for (const aula of AULAS) {
  const dir = resolve(root, aula)
  const manifest: unknown = JSON.parse(readFileSync(resolve(dir, 'manifesto.json'), 'utf8'))
  assert(isLearningManifest(manifest), `${aula}: o manifesto não passa no formato do core`)
  const montage = JSON.parse(readFileSync(resolve(dir, 'montagem.json'), 'utf8')) as {
    clips: Array<{ key: string }>
  }
  const roteiro = readFileSync(resolve(dir, 'roteiro.md'), 'utf8').replaceAll('\r\n', '\n')

  for (const block of manifest.blocks) {
    if (!('content' in block)) continue
    contas.blocos++
    // O schema TypeBox do members é o MESMO que a publicação usa: bloco que não passa aqui não
    // publica lá. Ele lança, e a mensagem já diz qual campo.
    parsePublishedLessonBlock(block.content)
    if (block.content.kind !== 'interactive') continue
    contas.interativos++
    assert(isInteractiveBlock(block.content), `${aula}/${block.key}: o core recusa este bloco`)
    // A projeção pública precisa passar no guarda do NAVEGADOR: é o que o kids lê para desenhar.
    assert(
      isPublicInteractiveBlock(publicInteractiveBlock(block.content)),
      `${aula}/${block.key}: a projeção pública não passa no guarda do navegador`,
    )
  }

  const cenasDoManifesto = manifest.blocks.filter(eCena)
  for (const block of cenasDoManifesto) {
    contas.cenas++
    const atividade = block.content.activity
    const mortas = sceneUnknownSetupGoals(atividade.scene, atividade.setup?.goals)
    if (mortas.length)
      problemas.push(`${aula}/${block.key}: objetivo que a cena não tem (${mortas.join(', ')})`)
    // O roteiro é gerado da cena. Conferir o trecho completo também protege sucesso, pistas e
    // pergunta final: a checagem de frases obrigatórias só alcança instrução, previsão e metas.
    const linhas = cenaMarkdown(block.content)
    const descricao = linhas.join('\n')
    if (!roteiro.includes(descricao)) {
      const linhaAusente = linhas.find((linha) => linha && !roteiro.includes(linha))
      problemas.push(
        `${aula}/${block.key}: descrição da cena no roteiro desatualizada${linhaAusente ? `; falta “${linhaAusente}”` : ' (ordem ou espaçamento)'}`,
      )
    }
  }

  // Manifesto e roteiro são entregas da receita. Divergir só em um deles deixaria a próxima
  // geração apagar a correção sem nenhum erro de formato ou de cena.
  const [cursoV6 = ''] = aula.split('/')
  const cenario = CENARIO_DO_CURSO[cursoV6.replace(/-v6$/, '')]
  assert(cenario, `${aula}: cenário do curso ausente`)
  const cenasEsperadas = cenasDaReceita(aula)
  const chavesEsperadas = new Set(cenasEsperadas.map((cena) => cena.chave))
  if (aula !== 'corre-dino-v6/aula-01')
    for (const cena of cenasDoManifesto)
      if (!chavesEsperadas.has(cena.key))
        problemas.push(`${aula}/${cena.key}: cena do manifesto não está na receita`)
  for (const cena of cenasEsperadas) {
    const atual = manifest.blocks.find((block) => block.key === cena.chave)
    const esperado = conteudoDaCena(cena, cenario)
    if (
      !atual ||
      !('content' in atual) ||
      JSON.stringify(atual.content) !== JSON.stringify(esperado)
    )
      problemas.push(`${aula}/${cena.chave}: manifesto diverge da receita da cena`)
  }

  // As cenas aparecem no roteiro com os textos de HOJE, e toda marca de cena anterior é legal.
  problemas.push(...conferirCenasNoRoteiro(aula, manifest, montage, roteiro, marcasDaReceita(aula)))

  const sections = manifest.sections.map((s) => ({
    ...s,
    id: s.key,
    blockIds: s.blockKeys,
    workspaceBlockId: s.workspaceKey,
  }))
  const blocks = manifest.blocks.map((b) => ({
    id: b.key,
    content:
      'content' in b
        ? b.content
        : 'existing' in b
          ? { kind: b.existing.kind, initialProject: { installedExtensions: [{ id: 'game-2d' }] } }
          : { kind: 'video' },
  }))
  problemas.push(
    ...studioSectionCompletionIssues(sections, blocks).map((p) => `${aula}: ${JSON.stringify(p)}`),
  )

  contas.aulas++
  contas.secoes += manifest.sections.length
  contas.clipes += montage.clips.length
}

if (problemas.length) {
  console.error(problemas.join('\n'))
  process.exit(1)
}
assert.equal(contas.aulas, 27, 'A primeira importação são 27 manifestos (raio-x-implantacao.md §4)')
console.log(JSON.stringify(contas, null, 2))
