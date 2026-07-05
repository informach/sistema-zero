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
// P8 (o que o pai mais gostaria de ver primeiro) → encaixa em "sonha ver {resposta_p8}".
const P8_LABELS: Record<string, string> = {
  mostrar_familia: 'ele chamando a família pra mostrar o que criou',
  escola_colegas: 'ele levando pra escola e os colegas querendo ver',
  abrir_para_criar: 'ele abrindo o computador com vontade de criar',
  terminar_e_continuar: 'ele terminando algo do começo ao fim e já querendo o próximo',
}
// P10 (o que o pai sonha que ele se torne) → encaixa em "quer ver {resposta_p10}".
const P10_LABELS: Record<string, string> = {
  criar_proprio: 'ele criando as próprias coisas, e não só consumindo as dos outros',
  desenvolver_habilidade: 'ele com um talento de verdade no que ama',
  terminar_e_mostrar: 'ele se orgulhando do que faz',
  virar_aprendizado: 'essa paixão virando aprendizado pra vida',
}

/** Resolve {resposta_p3}/{resposta_p5}/{resposta_p8}/{resposta_p10}/{resultado} no diagnóstico. */
export function desafioRenderCorpo(corpo: string, a: QuizAnswers): string {
  const p3 = typeof a.foco_onde === 'string' ? (P3_LABELS[a.foco_onde] ?? a.foco_onde) : ''
  const p5 =
    typeof a.maior_incomodo === 'string' ? (P5_LABELS[a.maior_incomodo] ?? a.maior_incomodo) : ''
  const p8 = typeof a.visualizacao === 'string' ? (P8_LABELS[a.visualizacao] ?? a.visualizacao) : ''
  const p10 = typeof a.o_que_quer === 'string' ? (P10_LABELS[a.o_que_quer] ?? a.o_que_quer) : ''
  const resultado =
    typeof a.horas_ano_calculadas === 'number'
      ? a.horas_ano_calculadas.toLocaleString('pt-BR')
      : '—'
  return corpo
    .replaceAll('{resposta_p3}', p3)
    .replaceAll('{resposta_p5}', p5)
    .replaceAll('{resposta_p8}', p8)
    .replaceAll('{resposta_p10}', p10)
    .replaceAll('{resultado}', resultado)
}

/**
 * Frase do desejo (P10) para a OFERTA retomar ("Você disse que sonha ver ..."). Recebe
 * o enum `quer` (segmento não-PII vindo da URL, igual ao perfil) → frase, ou null.
 */
export function desafioDesejoLabel(quer: string | null | undefined): string | null {
  return typeof quer === 'string' ? (P10_LABELS[quer] ?? null) : null
}

/** Rótulos por perfil (aba Perfis do /admin + a Tela de Resultado). */
export const DESAFIO_PERFIL_LABELS: Record<string, string> = {
  explorador: 'O Explorador',
  especialista: 'O Especialista',
  foguete: 'O Foguete',
  investigador: 'O Investigador',
}
