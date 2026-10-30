import {
  type CurriculoDeBlocos,
  coberturaDosBlocos,
  ilha,
  type MetadadosDoDesafio,
  POSTOS_DA_JORNADA,
  type ProblemaDoDesafio,
} from '@sistemazero/arquipelago-contracts'

/** Papéis obrigatórios da trilha. Escolher um Poder não obriga a escolher todos os outros. */
const PAPEIS_DA_TRILHA = new Set(['base2d', 'base3d', 'mission'])

export function analisarRepertorio(
  exigidos: readonly string[],
  curriculo: CurriculoDeBlocos,
  metadados: Pick<MetadadosDoDesafio, 'ilha' | 'tipo'>,
) {
  const posto = ilha(metadados.ilha).posto
  const limite = POSTOS_DA_JORNADA.indexOf(posto)
  const cobertura = coberturaDosBlocos(exigidos, curriculo, posto)
  const problemas: ProblemaDoDesafio[] = []
  for (const c of cobertura) {
    const nome = c.rotulo || c.bloco
    for (const aviso of c.avisos) {
      if (aviso === 'bloco-desconhecido')
        problemas.push({
          codigo: 'BLOCO_DESCONHECIDO',
          mensagem: `${nome}: o bloco não existe no catálogo atual do Estúdio. Revise o projeto.`,
        })
      if (aviso === 'sem-curso')
        problemas.push({
          codigo: 'BLOCO_SEM_CURSO',
          mensagem: `${nome}: nenhum curso publicado desta comunidade concede o bloco. Vincule o ensino antes de publicar o desafio.`,
        })
      if (aviso === 'curso-depois-da-ilha')
        problemas.push({
          codigo: 'CURSO_DEPOIS_DA_ILHA',
          mensagem: `${nome}: o ensino não está disponível até o posto desta ilha. Use um repertório anterior ou publique em outra ilha.`,
        })
    }
    if (metadados.tipo !== 'quadro-das-cores' || c.avisos.length > 0) continue
    const fonteDaTrilha = curriculo.cursos.some((curso) => {
      const posicao = POSTOS_DA_JORNADA.indexOf(curso.posto as typeof posto)
      return (
        curso.blocos.includes(c.bloco) &&
        PAPEIS_DA_TRILHA.has(curso.papel ?? '') &&
        posicao >= 0 &&
        posicao <= limite
      )
    })
    if (!fonteDaTrilha)
      problemas.push({
        codigo: 'QUADRO_DEPENDE_DE_OPCIONAL',
        mensagem: `${nome}: este Quadro das Cores depende de curso opcional ou sem papel na trilha. Use um bloco ensinado nas bases ou na missão, ou transforme a atividade em desafio opcional.`,
      })
  }
  return { cobertura, problemas }
}
