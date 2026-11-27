import type { ConstrutorTrecho } from './construtor-base-tipos'
import {
  conferir,
  entregar,
  telaDaConferencia,
  telaDaSaida,
  telaDoEnvio,
  verificar,
} from './faisca-comum'

export type FalaPatrulha = [
  voz: 'conversa' | 'instrucao' | 'teste' | 'descoberta' | 'pergunta' | 'abertura',
  texto: string,
  gesto?: string,
]
const vozes = {
  conversa: 'engaging, energetic, conversational voice',
  instrucao: 'confident, clear, unhurried voice',
  teste: 'upbeat, encouraging voice',
  descoberta: 'interested, animated voice',
  pergunta: 'curious',
  abertura: 'upbeat, welcoming voice',
}
export const montarFalaPatrulha = (falas: FalaPatrulha[]) =>
  falas.map(([voz, texto]) => `[${vozes[voz]}] ${texto}`).join(' ')
export const telaDasFalasPatrulha = (falas: FalaPatrulha[]) =>
  falas
    .filter((f) => f[2])
    .map(([, texto, gesto]) => `No "${texto}", ${gesto}.`)
    .join(' ')

type Montagem = {
  key: string
  title: string
  etapa: string
  objective: string
  falas: FalaPatrulha[]
  ponte: string
  steps: string[]
  tests: string[]
  blockLabels: string[]
  blockTypes: string[]
  conferencia: string
  mostrar: string
  semEfeitoVisivel?: boolean
  entrega?: { reconhecimento: string; depois: string; saida: 'Concluir aula' | 'Próxima parte' }
  notaDeGravacao?: string
}

/** O recado da página no padrão das aulas do Faísca e da Nave: o que fazer e quando seguir. */
function recadoDaPagina(m: Montagem) {
  if (m.entrega)
    return `Hora de conferir e enviar! ${m.ponte} Clique em Verificar projeto, envie o projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em ${m.entrega.saida}.`
  const teste = m.semEfeitoVisivel
    ? 'Clique em Verificar projeto.'
    : 'Teste no seu jogo e clique em Verificar projeto.'
  return `Sua vez! ${m.ponte} ${teste} Quando aparecer Objetivo cumprido!, clique em Próxima parte.`
}

/** O master e o Na tela saem dos mesmos segmentos, sem âncoras inventadas. */
export function montagemPatrulha(m: Montagem): ConstrutorTrecho {
  const final = m.entrega
    ? entregar(m.conferencia, m.entrega.reconhecimento, m.entrega.depois)
    : m.semEfeitoVisivel
      ? conferir(m.conferencia)
      : verificar(m.conferencia)
  const conferencia = m.semEfeitoVisivel
    ? `No "Confira se ficou assim", deixar o trecho à vista [mostrar blocos "${m.mostrar}"].`
    : telaDaConferencia(`"${m.mostrar}"`, [])
  const saida = m.entrega ? telaDoEnvio(m.entrega.reconhecimento, m.entrega.saida) : telaDaSaida
  return {
    key: m.key,
    title: m.title,
    etapa: m.etapa,
    objective: m.objective,
    kind: m.entrega ? 'delivery' : 'build',
    ponte: recadoDaPagina(m),
    text: `${montarFalaPatrulha(m.falas)} ${final}`,
    screen:
      `A parte começa com o Estúdio expandido e a entrada correspondente desta montagem [expandir estúdio]. ${telaDasFalasPatrulha(m.falas)} ${conferencia} ${saida} ${m.notaDeGravacao ?? ''}`.trim(),
    kids: m.falas.filter(([voz]) => voz === 'pergunta').map(([, texto]) => texto),
    steps: m.steps,
    tests: m.tests,
    blockLabels: m.blockLabels,
    blockTypes: m.blockTypes,
  }
}

/** Montagem integral da guarda conhecida; o Se da paleta já traz x > 0. */
export function guardaPatrulha(
  destino: string,
  contexto: string,
  primeiraVez = false,
): FalaPatrulha[] {
  const inicial = `Se valor da variável x > 0 dentro de ${destino}`
  const comEstado = `Se valor da variável estado > 0 dentro de ${destino}`
  const igualZero = `Se valor da variável estado = 0 dentro de ${destino}`
  const comTexto = `Se valor da variável estado = texto Olá dentro de ${destino}`
  const ponte: FalaPatrulha[] = primeiraVez
    ? [
        [
          'conversa',
          'Lembra da placa do estado na Nave Contra Asteroides? Lá, a pergunta o estado do jogo é jogando vinha num bloco pronto. Aqui você monta a mesma pergunta com uma comparação: estado é igual a jogando?',
        ],
      ]
    : [['conversa', 'Agora a guarda que você já conhece: estado é igual a jogando?']]
  return [
    ...ponte,
    [
      'instrucao',
      `Dentro de ${contexto}, deixe à vista o espaço ao lado de fazer.`,
      `[apontar encaixe em "${destino}"]`,
    ],
    [
      'instrucao',
      'Abra Programação e depois Lógica e Se.',
      '[abrir categoria Programação > Lógica & Se]',
    ],
    [
      'instrucao',
      'Pegue o bloco Se e solte nesse espaço ao lado de fazer.',
      `[encaixar "Se" em "${destino}"]`,
    ],
    [
      'conversa',
      'A pergunta que veio no bloco é x maior que zero. Vamos conferir o momento da partida.',
    ],
    [
      'instrucao',
      'Clique no x da pergunta e escolha estado.',
      `[trocar "x" por "estado" em "${inicial}"]`,
    ],
    [
      'instrucao',
      'Clique no sinal de maior e escolha o sinal de igual. Na lista existem dois iguais: escolha o que não tem a palavra solto do lado.',
      `[trocar ">" por "=" em "${comEstado}"]`,
    ],
    [
      'instrucao',
      'Deixe à vista o zero que está do lado direito da pergunta.',
      `[apontar bloco "${igualZero}"]`,
    ],
    [
      'instrucao',
      'Abra Programação, depois Valores, e pegue o bloco texto.',
      '[abrir categoria Programação > Valores]',
    ],
    [
      'instrucao',
      'Solte o bloco texto em cima desse zero.',
      `[soltar "texto" em cima do "0" em "${igualZero}"]`,
    ],
    [
      'instrucao',
      'Clique na palavra Olá e escreva jogando, tudo em letras minúsculas.',
      `[trocar "Olá" por "jogando" em "${comTexto}"]`,
    ],
    [
      'conversa',
      'Agora o Se pergunta se estado é igual a jogando. As ações vão no então dessa pergunta.',
    ],
  ]
}

export const passosGuardaPatrulha = (contexto: string) => [
  `Dentro de ${contexto}, deixe visível o espaço fazer. Em Programação → Lógica & Se, pegue Se e encaixe nesse espaço.`,
  'Na pergunta x > 0, escolha estado no lugar de x e = no lugar de >. Use o sinal = sem a palavra solto.',
  'Deixe o 0 da direita visível. Em Programação → Valores, pegue texto, solte sobre esse 0 e escreva jogando no lugar de Olá.',
]

export const TIPOS_GUARDA = ['sz_js_if_else', 'sz_val_compare', 'sz_val_variable', 'sz_val_text']
export const OBSERVACAO_GRAVACAO =
  'Antes de gravar, abrir a aula depois do deploy e usar uma sessão sem envio anterior. O Rodar de novo dá foco ao jogo. Os tempos de tecla são estimativas; conferir no Verificar plano. Não gravar áudio pago nem publicar nesta geração.'
