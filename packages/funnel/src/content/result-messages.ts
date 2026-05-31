import type { Segmento } from './quiz-config'

// Mensagem condicional da tela de resultado, conforme o `segmento` salvo (A/B/C/D).
export const RESULT_MESSAGES: { segmentos: Record<Segmento, string>; fallback: string } = {
  segmentos: {
    A: 'A sua ideia não saiu do papel porque, sem entender o que a IA entrega, cada passo vira um chute. Você fica esperando o momento de ter certeza, e ele não chega. O que destrava é um critério pra saber o que aceitar e o que questionar no que a IA gera.',
    B: 'O seu projeto quebrou porque foi montado no escuro. Funciona enquanto o cenário é simples e desmorona quando algo foge do padrão. O ponto não é a IA ter errado, é você não ter tido referência pra perceber o erro antes dele aparecer.',
    C: 'Cada ajuste que depende de outra pessoa custa o seu dinheiro, o seu tempo e o seu controle. Você criou algo que ainda não é totalmente seu, porque não consegue mexer nele por conta própria. Entender o mínimo do que a IA faz é o que vira esse jogo.',
    D: 'Essa sensação de estar fazendo errado sem perceber tem nome: é criar sem critério pra avaliar o resultado. Você não precisa virar programador pra resolver isso. Precisa de um referencial mínimo pra olhar o que a IA gerou e saber se está de pé.',
  },
  fallback:
    'O que destrava não é mais uma ferramenta, é critério: saber o que aceitar e o que questionar no que a IA gera. É disso que você precisa pra sair da posição de refém.',
}
