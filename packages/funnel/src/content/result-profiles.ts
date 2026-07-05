// Conteúdo da tela de resultado por perfil. O diagnóstico é QUEBRADO em blocos
// (`secoes`) — layout escaneável, renderizado pela tela compartilhada. Os textos
// guardam os marcadores {{projeto}}, {{custo_mensal}} e o bloco condicional
// [[CUSTO]]…[[/CUSTO]] — resolvidos por `lib/result-template.ts` (via `nciRenderCorpo`).
// O bloco "O custo de esperar" some quando não há custo (a seção resolve vazia e a
// tela a descarta). O fecho é igual para todos (vem antes do CTA).

import type { Perfil } from '../lib/perfil'

/** Bloco rotulado do diagnóstico (layout escaneável). O `texto` pode conter marcadores. */
export interface ResultSecao {
  rotulo: string
  texto: string
}

export interface ResultProfile {
  titulo: string
  /** Corpo corrido (narrativa). Use ISTO **ou** `secoes`. Marcadores resolvidos pelo renderCorpo. */
  corpo?: string
  cta: string
  /**
   * Diagnóstico QUEBRADO em blocos rotulados (alternativa ao `corpo` corrido). Capacidade
   * compartilhada: quando presente, a tela de resultado renderiza os blocos; senão cai no `corpo`.
   */
  secoes?: ResultSecao[]
}

export const FECHO_COMPARTILHADO =
  'Você acabou de ver onde trava. A boa notícia é que a distância entre esse ponto e criar no comando é menor do que parece, e a própria IA encurta esse caminho com você. O próximo passo é virar esse diagnóstico num plano e começar.'

export const RESULT_PROFILES: Record<Perfil, ResultProfile> = {
  ideia_parada: {
    titulo: 'Sua ideia ainda está parada',
    secoes: [
      {
        rotulo: 'O que está acontecendo',
        texto:
          'Você tem {{projeto}} na cabeça há um tempo, mas ainda não conseguiu tirar do papel.',
      },
      {
        rotulo: 'Por que acontece',
        texto:
          'E não é falta de capacidade. É que, do jeito que a ideia está hoje, fica difícil até explicar pra IA o que você quer: o que ela faz, em que ordem, com quais telas e regras. Sem isso, toda tentativa começa confusa e morre no meio.',
      },
      {
        rotulo: 'O que destrava',
        texto:
          'Você não precisa aprender a programar pra destravar. O primeiro passo é mais simples do que parece: organizar a ideia num plano claro, que a IA consiga seguir. É a diferença entre pedir "cria um sistema pra mim" e entregar um caminho pronto pra ela construir.',
      },
      {
        rotulo: 'O custo de esperar',
        texto:
          'E tem um custo que não aparece na conta: enquanto a sua ideia espera, gente com ideias parecidas já está começando a tirar as delas do papel.[[CUSTO]] Você mesmo estimou que esse tempo parado pode custar uns R$ {{custo_mensal}} por mês. Mesmo antes de virar projeto, a espera já cobra o seu preço.[[/CUSTO]]',
      },
    ],
    cta: 'Ver como tirar a minha ideia do papel',
  },
  criando_no_escuro: {
    titulo: 'Você está criando no escuro',
    secoes: [
      {
        rotulo: 'O que está acontecendo',
        texto:
          'Você já viu a IA criar coisas em minutos, e talvez tenha usado isso pra {{projeto}}. Funcionou de primeira, e por um tempo parecia que tava tudo certo.',
      },
      {
        rotulo: 'Por que acontece',
        texto:
          'O problema aparece depois: quando alguma coisa quebra, você não sabe nem por onde começar a procurar. E não é que a IA seja ruim. É que, quando você só pede e copia o que volta, nunca chega a entender o que foi montado, então fica à mercê dela pra cada conserto. Funciona enquanto é simples e te abandona quando foge do roteiro.',
      },
      {
        rotulo: 'O que destrava',
        texto:
          'A saída não é virar programador. É ter o mínimo de critério pra olhar o que a IA fez, saber se está de pé e mexer com segurança, sem depender dela pra cada passo.',
      },
      {
        rotulo: 'O custo de esperar',
        texto:
          '[[CUSTO]]Você mesmo estimou que perde uns R$ {{custo_mensal}} por mês preso nesse vai e volta de conserto.[[/CUSTO]]',
      },
    ],
    cta: 'Ver como sair do escuro',
  },
  refem_ajustes: {
    titulo: 'Seu bloqueio está nos ajustes',
    secoes: [
      {
        rotulo: 'O que está acontecendo',
        texto:
          'Você tem algo no ar, ou quase lá, talvez {{projeto}}. Só que ele nunca é totalmente seu: pra qualquer mudança, você precisa chamar alguém ou voltar pra IA e torcer pra ela não estragar outra coisa. É estranho depender assim de um negócio que é seu.',
      },
      {
        rotulo: 'Por que acontece',
        texto:
          'O ponto não é você não ser capaz. É que ninguém te mostrou como aquilo é montado por dentro, e sem isso todo ajuste parece coisa de especialista.',
      },
      {
        rotulo: 'O que destrava',
        texto:
          'Quando você entende o básico, para de ficar refém: os ajustes simples voltam a ser seus.',
      },
      {
        rotulo: 'O custo de esperar',
        texto:
          'E sai caro nos três: tempo esperando, dinheiro com terceiros e o controle, que fica sempre na mão dos outros.[[CUSTO]] Você mesmo estimou que isso custa uns R$ {{custo_mensal}} por mês entre espera e retrabalho.[[/CUSTO]]',
      },
    ],
    cta: 'Ver como ganhar autonomia nos ajustes',
  },
  sem_criterio: {
    titulo: 'Falta critério para confiar no que a IA entrega',
    secoes: [
      {
        rotulo: 'O que está acontecendo',
        texto:
          'Você cria com a IA e às vezes até entrega, talvez {{projeto}}, mas na hora de publicar bate aquele frio na barriga: e se tiver algo errado que você não viu?',
      },
      {
        rotulo: 'Por que acontece',
        texto:
          'Essa dúvida não é frescura. Hoje você não tem como olhar o que a IA gerou e dizer com segurança "isso aqui está de pé". Aí a verdade só aparece depois, quando alguém usa e quebra, ou quando você descobre que um dado estava exposto o tempo todo.',
      },
      {
        rotulo: 'O que destrava',
        texto:
          'O que tira esse peso não é aprender a programar. É ter um jeito simples de revisar a entrega da IA antes de soltar pro mundo, pra você apertar publicar sabendo o que está fazendo, em vez de torcendo.',
      },
      {
        rotulo: 'O custo de esperar',
        texto:
          '[[CUSTO]]Você mesmo estimou que perde uns R$ {{custo_mensal}} por mês nesse vai e volta de refazer o que não passou.[[/CUSTO]]',
      },
    ],
    cta: 'Ver como criar com mais segurança',
  },
}
