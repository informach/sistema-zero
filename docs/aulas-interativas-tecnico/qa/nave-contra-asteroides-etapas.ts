/** Compatibilidade dos marcos por aula. A autoria fina está em construtor-2d-projetos.ts. */
import { config2D } from './construtor-2d'
import { projeto2D } from './construtor-2d-projetos'

/** Slugs preservados na plataforma. */
export const ORDEM_NAVE = [
  'primeira-nave',
  'dia-1',
  'dia-2',
  'chuva-de-asteroides',
  'dia-3',
  'pontos',
  'dia-4',
  'comecar-partida',
  'dia-5',
] as const

export function etapasNave() {
  return [
    projeto2D(config2D.etapas[0]!),
    ...config2D.aulas.map((aula) => {
      const stage = aula.trechos.filter((t) => t.etapa).at(-1)?.etapa
      if (!stage) throw new Error(`A aula ${aula.slug} não tem projeto de saída`)
      return projeto2D(stage)
    }),
  ]
}

/** 0 é o inicial preparado; 1…9 são as saídas das nove aulas, como no contrato anterior. */
export function projetoNave(etapa: number) {
  const project = etapasNave()[etapa]
  if (!project) throw new Error(`Etapa de aula inexistente: ${etapa}`)
  return project
}
