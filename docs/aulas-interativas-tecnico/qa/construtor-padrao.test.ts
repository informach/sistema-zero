/**
 * O padrão de linguagem dos cursos-base do Construtor (revisão de 27/11/2026): o que a professora
 * fala e o que a página diz precisam servir a uma criança e à voz do ElevenLabs.
 */
import { describe, expect, test } from 'bun:test'
import { config2D } from './construtor-2d'
import { config3D } from './construtor-3d'

for (const config of [config2D, config3D]) {
  const trechos = config.aulas.flatMap((aula) =>
    aula.trechos.map((trecho) => ({ aula: aula.slug, ...trecho })),
  )

  describe(config.nome, () => {
    test('a fala não dita código de cor, nem símbolos que a voz lê errado', () => {
      for (const t of trechos) {
        const fala = t.text.replace(/\[[^\]]*\]/g, '')
        expect(fala, `${t.aula}/${t.key}`).not.toMatch(/#[0-9a-f]{3,8}\b/i)
        expect(fala, `${t.aula}/${t.key}`).not.toMatch(/[↑↓↖↗·×−]/)
        expect(fala, `${t.aula}/${t.key}`).not.toMatch(/hexadecimal|cerquilha/i)
      }
    })

    test('na fala, a vírgula colada numa palavra ganha espaço (x, 462), e o decimal fica (1,5)', () => {
      for (const t of trechos) {
        const fala = t.text.replace(/\[[^\]]*\]/g, '')
        expect(fala, `${t.aula}/${t.key}`).not.toMatch(/[a-záàâãéêíóôõúç],[^\s\d]/i)
        expect(fala, `${t.aula}/${t.key}`).not.toMatch(/[a-záàâãéêíóôõúç],\d/i)
      }
    })

    test('o recado da página de montagem e de envio diz o que clicar para seguir', () => {
      for (const t of trechos.filter((t) => t.kind === 'build' || t.kind === 'delivery')) {
        expect(t.ponte, `${t.aula}/${t.key}`).toMatch(
          t.kind === 'delivery'
            ? /Projeto enviado!, clique em (?:Concluir aula|Próxima parte)\.$/
            : /Objetivo cumprido!, clique em Próxima parte\.$/,
        )
        expect(t.ponte, `${t.aula}/${t.key}`).toMatch(/^(?:Sua vez!|Hora de conferir e enviar!)/)
      }
    })

    test('a previsão pede uma resposta antes do teste, sem o fecho repetido de antes', () => {
      for (const t of trechos)
        expect(t.text, `${t.aula}/${t.key}`).not.toContain('O que você acha? Isso você vai testar')
    })
  })
}
