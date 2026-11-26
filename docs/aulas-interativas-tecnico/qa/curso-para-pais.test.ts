/**
 * Cursos para pais (docs/aulas-interativas/pais/, 15/11/2026): o manifesto passa no validador REAL
 * do core, não usa as ferramentas da criança (a mesma régua que recusa publicar no Admin) e os
 * textos seguem a régua de linguagem do curso. Os cursos das crianças continuam nos testes deles.
 */
import { describe, expect, test } from 'bun:test'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parentsLessonIssues } from '../../../packages/core/src/course/learner'
import { isLearningManifest } from '../../../packages/core/src/learning'
import { isSectionCompletion } from '../../../packages/core/src/learning/section-progression'
import { PASTA_CURSOS } from './caminhos'

const PASTA_PAIS = resolve(PASTA_CURSOS, 'pais')
const cursos = readdirSync(PASTA_PAIS, { withFileTypes: true })
  .filter((entrada) => entrada.isDirectory())
  .map((entrada) => entrada.name)

/** Cursos apresentados pela Vivianne Lima, psicóloga da Laopa. */
const CURSOS_COM_A_VIVIANNE = new Set(['como-ajudar-seu-filho-autista-nas-frustracoes'])

type Manifesto = {
  courseSlug: string
  lessonSlug: string
  blocks: Array<{
    key: string
    plannedVideo?: string
    content?: { kind: string } & Record<string, unknown>
  }>
  sections: Array<{
    key: string
    blockKeys: string[]
    completion: unknown
    workspaceKey: unknown
    externalTool: unknown
  }>
}

describe.each(cursos)('curso para pais %s', (curso) => {
  const pasta = resolve(PASTA_PAIS, curso)
  const arquivos = readdirSync(pasta)
  const manifestos = arquivos.filter((nome) => nome.endsWith('.manifesto.json')).sort()

  const conteudoDaApostila = resolve(import.meta.dir, `../recursos/${curso}/caderno-conteudo.json`)

  // A apostila pode vir numa segunda etapa: ela é cobrada quando o conteúdo dela já existe.
  test('tem aulas, módulos, fontes e, quando há conteúdo de apostila, o PDF', () => {
    expect(manifestos.length).toBeGreaterThan(0)
    const obrigatorios = ['README.md', 'modulos.md', 'fontes.md']
    if (existsSync(conteudoDaApostila)) obrigatorios.push('apostila.pdf')
    for (const nome of obrigatorios) expect(existsSync(resolve(pasta, nome))).toBe(true)
  })

  test.each(manifestos)('%s passa no validador do core', (nome) => {
    const manifesto = JSON.parse(readFileSync(resolve(pasta, nome), 'utf8')) as Manifesto
    expect(isLearningManifest(manifesto)).toBe(true)
    expect(manifesto.courseSlug).toBe(curso)
    expect(nome).toBe(`${manifesto.lessonSlug}.manifesto.json`)
    for (const secao of manifesto.sections) {
      expect(isSectionCompletion(secao.completion)).toBe(true)
      expect(secao.workspaceKey).toBeNull()
      expect(secao.externalTool).toBeNull()
    }
    const colocados = manifesto.sections.flatMap((secao) => secao.blockKeys)
    expect([...colocados].sort()).toEqual(manifesto.blocks.map((bloco) => bloco.key).sort())
    expect(new Set(colocados).size).toBe(colocados.length)
  })

  test.each(manifestos)('%s não usa Estúdio nem Pinta (régua de publicação)', (nome) => {
    const manifesto = JSON.parse(readFileSync(resolve(pasta, nome), 'utf8')) as Manifesto
    const blocos = manifesto.blocks
      .filter((bloco) => bloco.content)
      .map((bloco) => ({ id: bloco.key, content: { kind: String(bloco.content?.kind) } }))
    expect(parentsLessonIssues(blocos)).toEqual([])
  })

  test('sem travessão e com a fala para o ElevenLabs de cada aula', () => {
    for (const nome of arquivos.filter((n) => /\.(md|json)$/.test(n))) {
      const texto = readFileSync(resolve(pasta, nome), 'utf8')
      expect({ nome, travessao: /[—–]/.test(texto) }).toEqual({ nome, travessao: false })
    }
    for (const nome of arquivos.filter((n) => n.endsWith('.roteiro.md'))) {
      const roteiro = readFileSync(resolve(pasta, nome), 'utf8')
      // Desde 19/11/2026 a voz é gerada no ElevenLabs e quem apresenta é um avatar.
      expect(roteiro).toContain('**Fala para ElevenLabs:**')
      expect(roteiro).not.toContain('**Fala da Helena:**')
      const copiavel = nome.replace('.roteiro.md', '.elevenlabs.txt')
      expect({ copiavel, existe: arquivos.includes(copiavel) }).toEqual({ copiavel, existe: true })
      const texto = readFileSync(resolve(pasta, copiavel), 'utf8')
      // Só fala, tags e pausas: nada de título, rótulo ou nota de produção.
      expect({ copiavel, producao: /^(#|\*\*|Na tela|Clipe|Depoimento)/m.test(texto) }).toEqual({
        copiavel,
        producao: false,
      })
      expect({ copiavel, travessao: /[—–]/.test(texto) }).toEqual({ copiavel, travessao: false })
    }
  })

  // Decisão da dona (15/11/2026): o curso da Helena não cita mais ninguém. Nos cursos em que a
  // Vivianne é a apresentadora (19/11/2026), o nome dela aparece. Nenhum curso fala do evento que
  // serviu de fonte. O `fontes.md` é interno e registra de onde veio o conteúdo.
  test('o que os pais leem não cita outra autora nem a palestra de origem', () => {
    const textoDoCurso = arquivos
      .filter((n) => /\.(roteiro\.md|manifesto\.json)$/.test(n) || /-aula-\d+\.md$/.test(n))
      .concat(['README.md', 'modulos.md'])
      .map((nome) => ({ nome, texto: readFileSync(resolve(pasta, nome), 'utf8') }))
    if (existsSync(conteudoDaApostila))
      textoDoCurso.push({
        nome: 'caderno-conteudo.json',
        texto: readFileSync(conteudoDaApostila, 'utf8'),
      })
    for (const { nome, texto } of textoDoCurso) {
      if (!CURSOS_COM_A_VIVIANNE.has(curso))
        expect({ nome, citaVivianne: /viviann?e/i.test(texto) }).toEqual({
          nome,
          citaVivianne: false,
        })
      expect({
        nome,
        citaPalestra: /palestra de|na palestra|aula aberta|a plateia/i.test(texto),
      }).toEqual({
        nome,
        citaPalestra: false,
      })
    }
  })
})

describe('Aula 7: jornada autenticada e identidade infantil', () => {
  const pasta = resolve(PASTA_PAIS, 'transformando-o-vilao-em-aliado')
  const base = 'transformando-o-vilao-em-aliado-aula-7'
  const manifesto = JSON.parse(
    readFileSync(resolve(pasta, `${base}.manifesto.json`), 'utf8'),
  ) as Manifesto
  const fala = readFileSync(resolve(pasta, `${base}.elevenlabs.txt`), 'utf8')

  test('benefício nativo independe de campanha e não é requisito para concluir a aula', () => {
    const presente = manifesto.blocks.find((bloco) => bloco.key === 'presente')
    expect(presente?.content?.kind).toBe('gift')
    // Desde fe0bb71fb o presente da Aula 7 é um benefício permanente do curso (`benefitCode`).
    expect(presente?.content?.benefitCode).toBe('vilao-em-aliado-cade')
    expect(presente?.content).not.toHaveProperty('campaignCode')
    for (const secao of manifesto.sections) {
      expect((secao.completion as { blockIds: string[] }).blockIds).not.toContain('presente')
    }
    expect(manifesto.blocks.filter((bloco) => bloco.plannedVideo)).toHaveLength(3)
  })

  test('fala orienta ativação na conta, identidade e aparelho sem novo cadastro do responsável', () => {
    for (const trecho of [
      'Ativar meu presente',
      'conta com que você já está logado',
      'Editar perfil',
      'apelido público',
      'nome completo',
      'Autorizar aparelho',
    ]) {
      expect(fala).toContain(trecho)
    }
    expect(fala).not.toMatch(/outra aba|preencha.*e-mail|informe.*mesmo e-mail/i)
    expect(fala).toContain('A gente não guarda a gravação na plataforma')
    expect(fala).toContain('se você autorizar')
    expect(fala).toContain('idade recomendada')
    expect(fala).toMatch(/perfil (?:de |de uma |para uma )criança/)
  })
})
