// Lógica do quiz do Desafio do Primeiro Jogo. As respostas observam como a
// criança usa jogos e tecnologia, sem transformar o resultado em diagnóstico.

import { z } from 'zod'
import type { QuizAnswers } from '../registry'

const PERFIL_VALUES = ['explorador', 'especialista', 'foguete', 'investigador'] as const
const PERFIL = z.enum(PERFIL_VALUES)

const USO_DIGITAL = z.enum(['joga_pronto', 'assiste', 'tutoriais', 'ja_cria'])
const RESULTADO_DESEJADO = z.enum([
  'mostrar_criacao',
  'raciocinio',
  'concluir_projeto',
  'entender_tecnologia',
])
const APOIO_PARA_COMECAR = z.enum([
  'projeto_curto',
  'sem_experiencia',
  'acompanhar_sem_programar',
  'investimento_pequeno',
])

/** Validação do `value` por chave no servidor. */
export const DESAFIO_VALUE_SCHEMA = {
  uso_digital_atual: USO_DIGITAL,
  perfil_p1: PERFIL,
  perfil_p2: PERFIL,
  perfil_p3: PERFIL,
  perfil_p4: PERFIL,
  resultado_desejado: RESULTADO_DESEJADO,
  apoio_para_comecar: APOIO_PARA_COMECAR,
}

function isPerfil(value: unknown): value is (typeof PERFIL_VALUES)[number] {
  return typeof value === 'string' && PERFIL_VALUES.some((perfil) => perfil === value)
}

/**
 * O perfil é o comportamento que mais aparece nas quatro perguntas de perfil.
 * Em caso de empate, a primeira resposta funciona como desempate porque observa
 * a reação espontânea da criança ao entrar em um jogo novo.
 */
export function desafioComputePerfil(a: QuizAnswers): string {
  if (!isPerfil(a.perfil_p1)) return ''

  const scores: Record<(typeof PERFIL_VALUES)[number], number> = {
    explorador: 0,
    especialista: 0,
    foguete: 0,
    investigador: 0,
  }

  for (const key of ['perfil_p1', 'perfil_p2', 'perfil_p3', 'perfil_p4'] as const) {
    const resposta = a[key]
    if (isPerfil(resposta)) scores[resposta] += 1
  }

  let perfil = a.perfil_p1
  for (const candidato of PERFIL_VALUES) {
    if (scores[candidato] > scores[perfil]) perfil = candidato
  }
  return perfil
}

const USO_LABELS: Record<string, string> = {
  joga_pronto: 'o tempo digital dele fica principalmente em jogos que já estão prontos',
  assiste: 'boa parte desse tempo vai para vídeos sobre jogos e personagens',
  tutoriais: 'ele acompanha tutoriais, mas nem sempre chega a um projeto terminado',
  ja_cria: 'ele já tenta modificar ou criar alguma coisa no computador',
}

const DESEJO_LABELS: Record<string, string> = {
  mostrar_criacao: 'chamando a família para mostrar algo que criou',
  raciocinio: 'pensando, testando e resolvendo problemas dentro de um projeto',
  concluir_projeto: 'começando e terminando um projeto',
  entender_tecnologia: 'entendendo melhor como a tecnologia funciona',
}

const APOIO_LABELS: Record<string, string> = {
  projeto_curto: 'um projeto curto, com uma chegada clara',
  sem_experiencia: 'um começo que não exija experiência anterior',
  acompanhar_sem_programar: 'a possibilidade de acompanhar sem saber programar',
  investimento_pequeno: 'um investimento pequeno antes de escolher algo maior',
}

/** Resolve as respostas personalizadas usadas na tela de resultado. */
export function desafioRenderCorpo(corpo: string, a: QuizAnswers): string {
  const uso =
    typeof a.uso_digital_atual === 'string'
      ? (USO_LABELS[a.uso_digital_atual] ?? a.uso_digital_atual)
      : ''
  const desejo =
    typeof a.resultado_desejado === 'string'
      ? (DESEJO_LABELS[a.resultado_desejado] ?? a.resultado_desejado)
      : ''
  const apoio =
    typeof a.apoio_para_comecar === 'string'
      ? (APOIO_LABELS[a.apoio_para_comecar] ?? a.apoio_para_comecar)
      : ''

  return corpo
    .replaceAll('{resposta_uso}', uso)
    .replaceAll('{resposta_desejo}', desejo)
    .replaceAll('{resposta_apoio}', apoio)
}

/** Frase do desejo que a oferta retoma depois do quiz. */
export function desafioDesejoLabel(quer: string | null | undefined): string | null {
  return typeof quer === 'string' ? (DESEJO_LABELS[quer] ?? null) : null
}

export const DESAFIO_PERFIL_LABELS: Record<string, string> = {
  explorador: 'Criador Explorador',
  especialista: 'Criador Inventor',
  foguete: 'Criador Desafiador',
  investigador: 'Criador Investigador',
}
