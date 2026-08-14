import { describe, expect, test } from 'bun:test'
import { linhasVisiveis, listarFontes, varrerCopy } from './helpers/copy-scan'

/**
 * A criança nunca lê a linguagem com que a EQUIPE monta o curso.
 *
 * Três termos são internos: **"curso-base"**, **"etapa"** e os nomes de degrau
 * (**"Iniciante 2D"**, "Avançado 3D"…). Para a criança, trilha se chama pelo POSTO dela
 * ("Trilha Faísca", "Trilha Construtor(a)") e o primeiro curso é "o primeiro curso".
 *
 * A usuária já apontou esse vazamento DUAS vezes, e nas duas ele tinha voltado por um
 * componente novo. Uma varredura manual não segura isso; um teste segura. A máquina é a
 * mesma do `copy-sem-travessao` (comentários são NOSSOS e podem usar o vocabulário interno
 * à vontade — é justamente onde ele deve estar).
 *
 * ⚠️ `courseTierOf`/`COURSE_TIER_LABELS` continuam vivos como LÓGICA (horizonte, trava,
 * admin): o que este guarda proíbe é a EXIBIÇÃO, não o conceito.
 */

const JARGAO: { nome: string; padrao: RegExp }[] = [
  {
    nome: 'nome de degrau',
    // Só a forma HUMANA, com espaço. O slug `iniciante-2d` é lógica e passa.
    padrao: /\b(iniciante|intermediári?o|avançado|avancado)\s+(2d|3d)\b/i,
  },
  { nome: '"curso-base"', padrao: /curso[\s-]base/i },
  { nome: '"etapa"', padrao: /\betapas?\b/i },
]

const temJargao = (texto: string) => JARGAO.some(({ padrao }) => padrao.test(texto))

describe('copy do aluno: vocabulário da criança, não o da equipe', () => {
  test('nenhum termo interno fora de comentário em src/', () => {
    // ⚠️ Guarda que não lê nada aprova tudo, e em silêncio.
    expect(listarFontes().length).toBeGreaterThan(100)

    expect(varrerCopy(temJargao)).toEqual([])
  })

  test('o detector pega cada termo e ignora o que é lógica', () => {
    // Sem estes casos o teste acima passaria com o detector quebrado.
    const achar = (fonte: string) => linhasVisiveis(fonte).filter((l) => temJargao(l.texto))
    expect(achar('<p>Faça o primeiro curso Iniciante 2D</p>')).toHaveLength(1)
    expect(achar('const t = "Trilha Avançado 3D"')).toHaveLength(1)
    expect(achar('const t = "Ir para o curso-base"')).toHaveLength(1)
    expect(achar('<span>Complete a etapa</span>')).toHaveLength(1)
    // Lógica e comentário passam.
    expect(achar("const tier = 'iniciante-2d'")).toEqual([])
    expect(achar('// o curso-base da etapa Iniciante 2D')).toEqual([])
    expect(achar('const label = COURSE_TIER_LABELS[tier]')).toEqual([])
  })
})
