import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { isLearningManifest } from '../../../../packages/core/src/learning'
import { PASTA_CURSOS_ADULTO } from '../caminhos'
import {
  arquivosPorGrupo,
  cursos,
  divergencias,
  gerarCurso,
  lerTraducao,
  manifestoAdulto,
  markdownAdulto,
  Pendencias,
  palavrasDoKids,
  sufixoSlugAdulto,
  textosManifesto,
  trechosMarkdown,
} from './versao-adulta'

describe('a camada de tradução', () => {
  test('markdown com cada trecho repetido volta igual ao kids', () => {
    const kids =
      '# Título\n\nUm parágrafo.\n\n> “Fala\n>\n> com duas partes.”\n\n| a | b |\n| --- | --- |\n'
    const d = new Map(trechosMarkdown(kids).map((t) => [t, t]))
    expect(markdownAdulto(kids, d, 'x')).toBe(kids)
  })

  test('trecho vazio sai da versão adulta sem deixar linha em branco dobrada', () => {
    const kids = 'Antes.\n\n**Debinha (avatar):** Uhu!\n\nDepois.\n'
    const d = new Map([
      ['Antes.', 'Antes.'],
      ['**Debinha (avatar):** Uhu!', ''],
      ['Depois.', 'Depois.'],
    ])
    expect(markdownAdulto(kids, d, 'x')).toBe('Antes.\n\nDepois.\n')
  })

  test('trecho kids sem par para a geração em vez de passar adiante a frase infantil', () => {
    expect(() => markdownAdulto('Frase nova.\n', new Map(), 'x')).toThrow(Pendencias)
  })

  test('o manifesto troca só o texto de tela e mantém o jogo e as regras', () => {
    const kids = {
      courseSlug: 'corre-dino',
      title: 'Aula kids',
      blocks: [
        { key: 'fala', content: { kind: 'dialogue', text: 'Clique em Próxima parte.' } },
        {
          key: 'projeto',
          content: {
            kind: 'studio',
            initialProject: { name: 'Corre, Dino!', ir: { title: 'Fim de jogo' } },
          },
        },
      ],
      sections: [
        {
          title: 'Seção',
          objective: 'Jogar.',
          completion: {
            projectChecks: [{ label: 'Pule o cacto.', rule: { title: 'Fim de jogo' } }],
          },
        },
      ],
    }
    expect(textosManifesto(kids)).toEqual([
      'Aula kids',
      'Clique em Próxima parte.',
      'Seção',
      'Jogar.',
      'Pule o cacto.',
    ])
    const d = new Map(textosManifesto(kids).map((t) => [t, `${t} (adulto)`]))
    const adulto = manifestoAdulto(kids, d, 'x') as typeof kids
    expect(adulto.courseSlug).toBe(`corre-dino${sufixoSlugAdulto}`)
    expect(adulto.blocks[0]?.content).toEqual({
      kind: 'dialogue',
      text: 'Clique em Próxima parte. (adulto)',
    })
    expect(adulto.blocks[1]).toEqual(kids.blocks[1])
    expect(adulto.sections[0]?.completion.projectChecks[0]?.rule).toEqual({ title: 'Fim de jogo' })
    expect(adulto.sections[0]?.completion.projectChecks[0]?.label).toBe('Pule o cacto. (adulto)')
  })

  test('o link de um tutorial vai para a biblioteca adulta, e link sem par para a geração', () => {
    const kids = {
      blocks: [{ content: { items: [{ url: '/como-fazer/plataforma-pedir-ajuda' }] } }],
    }
    expect(manifestoAdulto(kids, new Map(), 'x')).toEqual({
      blocks: [{ content: { items: [{ url: '/como-fazer/aula-pedir-ajuda' }] } }],
    })
    const solto = { blocks: [{ content: { items: [{ url: '/como-fazer/plataforma-nova' }] } }] }
    expect(() => manifestoAdulto(solto, new Map(), 'x')).toThrow(Pendencias)
  })

  test('a régua do vocabulário morde e deixa passar a fase do jogo', () => {
    expect(palavrasDoKids('Clique em Próxima parte.')).toEqual(['Próxima seção'])
    expect(palavrasDoKids('Termine esta fase.')).toHaveLength(1)
    expect(palavrasDoKids('Dedé sai antes da resposta.')).toEqual(['avatar infantil'])
    expect(palavrasDoKids('Chegue na última fase do jogo.')).toEqual([])
    expect(palavrasDoKids('Clique em Próxima seção e depois em Concluir aula.')).toEqual([])
  })
})

describe.each(cursos())('versão adulta de $pasta', ({ prefixo, pasta }) => {
  test('todo trecho tem versão adulta', () => {
    expect(() => gerarCurso(prefixo, pasta)).not.toThrow()
  })

  test('os arquivos adultos estão em dia com o kids e com a tradução', () => {
    expect(divergencias(prefixo, pasta)).toEqual([])
  })

  test('nenhuma palavra do Kids na versão adulta', () => {
    const problemas = [...arquivosPorGrupo(prefixo, pasta).keys()].flatMap((grupo) =>
      (lerTraducao(pasta, grupo)?.trechos ?? []).flatMap((t) =>
        t.adulto
          ? palavrasDoKids(t.adulto).map((p) => `${grupo}: ${p}: ${t.adulto?.slice(0, 80)}`)
          : [],
      ),
    )
    expect(problemas).toEqual([])
  })

  test('os manifestos adultos são válidos e apontam para o curso adulto', () => {
    const nomes = [...gerarCurso(prefixo, pasta).keys()].filter((n) =>
      n.endsWith('.manifesto.json'),
    )
    expect(nomes.length).toBeGreaterThan(0)
    for (const nome of nomes) {
      const m = JSON.parse(readFileSync(resolve(PASTA_CURSOS_ADULTO, pasta, nome), 'utf8'))
      expect(isLearningManifest(m)).toBe(true)
      expect(m.courseSlug.endsWith(sufixoSlugAdulto)).toBe(true)
    }
  })
})
