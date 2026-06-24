// Lógica do quiz do "Desafio do Primeiro Jogo": validação por chave, derivação das
// horas/ano e resolução do perfil. Espelha o módulo do NCI, mas SEM motor de
// pontuação — o perfil é a própria resposta da P1 (`perfil_p1`).

import { z } from 'zod'
import type { QuizAnswers } from '../registry'

const PERFIL = z.enum(['explorador', 'especialista', 'foguete', 'investigador'])
const FOCO = z.enum(['jogos', 'tecnologia', 'temas_especificos', 'videos_tutoriais'])
const INCOMODO = z.enum([
  'consome_nao_cria',
  'copia_e_trava',
  'tela_e_tensao',
  'interesse_sem_resultado',
])
const VISUALIZACAO = z.enum([
  'mostrar_familia',
  'escola_colegas',
  'abrir_para_criar',
  'terminar_e_continuar',
])
const PESA = z.enum(['terminar', 'baixo_custo', 'autonomia', 'rapido_divertido'])
const QUER = z.enum([
  'criar_proprio',
  'desenvolver_habilidade',
  'terminar_e_mostrar',
  'virar_aprendizado',
])
const SIM_NAO = z.enum(['sim', 'nao'])

/**
 * Validação do `value` por chave (server-side). Numéricos com teto que cabe em
 * int4 (horas/dia ≤ 24, dias/semana ≤ 7, horas/ano ≤ 100k). Chaves fora daqui são
 * rejeitadas pelo `patchLead`. `horas_ano_calculadas` é DERIVADA (não enviada pelo
 * cliente), mas fica aqui com teto p/ blindar contra envio forjado.
 */
export const DESAFIO_VALUE_SCHEMA = {
  perfil_p1: PERFIL,
  horas_tela_passiva_dia: z.coerce.number().int().min(0).max(24),
  foco_onde: FOCO,
  ja_largou: SIM_NAO,
  maior_incomodo: INCOMODO,
  dias_por_semana: z.coerce.number().int().min(0).max(7),
  horas_ano_calculadas: z.coerce.number().int().min(0).max(100_000),
  incomodo_tempo_tela: z.coerce.number().int().min(1).max(10),
  visualizacao: VISUALIZACAO,
  o_que_pesa: PESA,
  o_que_quer: QUER,
}

/** horas/ano = horas/dia × dias/semana × 52 — derivado quando ambos existem. */
export function desafioDerive(a: QuizAnswers): QuizAnswers {
  const horas = a.horas_tela_passiva_dia
  const dias = a.dias_por_semana
  if (typeof horas === 'number' && typeof dias === 'number') {
    return { horas_ano_calculadas: horas * dias * 52 }
  }
  return {}
}

/** Perfil = a própria resposta da P1 (sem motor de pontuação). */
export function desafioComputePerfil(a: QuizAnswers): string {
  return typeof a.perfil_p1 === 'string' ? a.perfil_p1 : ''
}

// Mapas value→rótulo legível p/ interpolar no corpo do resultado (verbatim do doc).
const P3_LABELS: Record<string, string> = {
  jogos: 'jogos',
  tecnologia: 'tecnologia',
  temas_especificos: 'temas específicos como dinossauros, espaço ou personagens',
  videos_tutoriais: 'vídeos e tutoriais',
}
const P5_LABELS: Record<string, string> = {
  consome_nao_cria:
    'ele consome muito sobre o que ama, mas quase nada disso vira algo criado por ele',
  copia_e_trava: 'ele copia coisas de tutorial, mas trava quando precisa mudar algo',
  tela_e_tensao: 'esse interesse às vezes vira só mais tempo de tela e tensão em casa',
  interesse_sem_resultado:
    'o interesse forte por jogos ou tecnologia ainda não virou uma habilidade concreta',
}

/** Resolve {resposta_p3}/{resposta_p5}/{resultado} no corpo do diagnóstico. */
export function desafioRenderCorpo(corpo: string, a: QuizAnswers): string {
  const p3 = typeof a.foco_onde === 'string' ? (P3_LABELS[a.foco_onde] ?? a.foco_onde) : ''
  const p5 =
    typeof a.maior_incomodo === 'string' ? (P5_LABELS[a.maior_incomodo] ?? a.maior_incomodo) : ''
  const resultado =
    typeof a.horas_ano_calculadas === 'number'
      ? a.horas_ano_calculadas.toLocaleString('pt-BR')
      : '—'
  return corpo
    .replaceAll('{resposta_p3}', p3)
    .replaceAll('{resposta_p5}', p5)
    .replaceAll('{resultado}', resultado)
}

/** Rótulos por perfil (aba Perfis do /admin + a Tela de Resultado). */
export const DESAFIO_PERFIL_LABELS: Record<string, string> = {
  explorador: 'O Explorador',
  especialista: 'O Especialista',
  foguete: 'O Foguete',
  investigador: 'O Investigador',
}
