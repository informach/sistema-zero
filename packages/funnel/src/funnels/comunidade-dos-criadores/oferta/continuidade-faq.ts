import type { ComunidadeFaqEntry } from './types'

// Respostas próprias da página de continuidade (proposta aprovada em 16/10/2026,
// docs/marketing/kids/comunidade-dos-criadores/copy/proposta-melhoria-2026-10-16/e-continuar.md).
// As demais respostas vêm de `FAQ` e `FAQ_EXTRA` (shared.ts); estas as substituem quando o id coincide.
export const CONTINUIDADE_FAQ = {
  continuidade: {
    question: 'O que a assinatura acrescenta ao curso que já temos?',
    paragraphs: [
      'O curso de vocês dá acesso às aulas daquela oferta. A assinatura abre o resto: todos os cursos publicados e os que forem lançados durante o plano, sem compra separada; o Estúdio e o Pinta livres quando ele chega ao Construtor, e as ferramentas dos postos seguintes; o Clube e o Mural, com até dois perfis de criança.',
      'A conta, o perfil e o progresso continuam os mesmos. O que vocês já receberam, como uma visita permanente ao Mural incluída no convite, segue com as condições de antes.',
    ],
  },
  'conta-existente': {
    question: 'Preciso criar outra conta para assinar?',
    paragraphs: [
      'Não. Assinem com o mesmo e-mail do responsável e seu filho continua no perfil de sempre, com tudo o que já fez. Se esqueceu a senha, use a recuperação na tela de entrada.',
      'Se o curso ficou numa conta com outro e-mail, escreva para contato@sistemazero.com.br antes de assinar, para combinarmos como continuar na conta certa. Quem ainda não tem conta preenche os dados do responsável na contratação.',
    ],
  },
  desafio: {
    question: 'Meu filho já fez o Desafio. Precisa repetir o que concluiu?',
    paragraphs: [
      'Não. O que ficou concluído no perfil continua concluído. Se faltou alguma atividade ou a publicação do jogo, a Jornada mostra esse ponto, e ele segue dali.',
    ],
  },
  'cade-todo-mundo': {
    question: 'Concluir o Cadê Todo Mundo libera o uso livre do Estúdio e do Pinta?',
    paragraphs: [
      'Não. O Cadê Todo Mundo é um curso extra: o jogo que ele fez fica no perfil, mas o Estúdio e o Pinta livres abrem no posto Construtor, depois de concluir A Chave do Farol e publicar o jogo dele. A assinatura já inclui as duas ferramentas; A Chave do Farol é o caminho até elas.',
    ],
  },
  interesse: {
    question: 'Ele perdeu o interesse no meio do curso. A assinatura muda isso?',
    paragraphs: [
      'A assinatura sozinha não faz uma criança gostar de criar jogos, por isso vale conversar com ele antes. Pergunte o que mudaria no jogo que fez. Se ele responder com uma ideia (um personagem novo, uma fase mais difícil), é exatamente isso que o Estúdio e o Pinta livres deixam ele fazer no posto Construtor.',
      'Se o que atrapalhou foi um passo difícil, a resposta “O que ele faz quando trava numa atividade?” mostra o que a própria aula oferece para seguir.',
    ],
  },
  'idade-continuidade': {
    question:
      'Meu filho recebeu um curso, mas está fora da faixa de 9 a 14 anos. A Comunidade serve para ele?',
    paragraphs: [
      'A Comunidade foi feita para crianças de 9 a 14 anos. Fora dessa faixa, o que decide é a leitura, o uso de mouse e teclado e o interesse dele, e o curso que vocês receberam já mostra bastante disso. Se tiverem dúvida, escrevam para contato@sistemazero.com.br antes de assinar.',
    ],
  },
  'acesso-vencido': {
    question: 'O acesso ao curso venceu. Perdemos o progresso?',
    paragraphs: [
      'Não. O fim do prazo fecha as aulas, mas o progresso continua guardado na conta, conforme os termos. Com a assinatura, na mesma conta, ele retoma do ponto em que estava. Se não encontrar o perfil ou um trabalho, escreva para o atendimento antes de criar outro cadastro.',
    ],
  },
  'curso-em-andamento': {
    question: 'Preciso assinar para terminar um curso que ainda está no prazo?',
    paragraphs: [
      'Não. O curso que vocês receberam vale até o fim do prazo dele, com ou sem assinatura. Terminar com esse acesso é um bom jeito de ver se seu filho quer continuar.',
    ],
  },
  'inicio-assinatura': {
    question: 'Se eu assinar antes de terminar o prazo do curso, quando começa a assinatura?',
    paragraphs: [
      'No dia em que o pagamento é aprovado. Os dias que restavam do curso não se somam ao plano, e cada acesso segue as próprias condições. O resumo da contratação mostra o período e a renovação antes de você pagar.',
    ],
  },
  'valor-anterior': {
    question: 'O valor que paguei por um curso vira desconto na assinatura?',
    paragraphs: [
      'Não. A compra anterior não é abatida; os valores da assinatura são os dos planos acima. Se vocês receberam alguma condição especial, ela aparece no resumo antes do pagamento.',
    ],
  },
  'visita-mural': {
    question: 'A visita ao Mural que recebemos com o curso depende da assinatura?',
    paragraphs: [
      'Não. Se o convite de vocês inclui visita permanente ao Mural, ela continua valendo depois do prazo do curso, com ou sem assinatura. Convites mais antigos podem ter outras condições, e vale o que estava no convite recebido.',
    ],
  },
} satisfies Record<string, ComunidadeFaqEntry>
