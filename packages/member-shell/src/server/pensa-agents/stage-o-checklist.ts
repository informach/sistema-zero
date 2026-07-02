import 'server-only'

/**
 * Checklist da etapa O ("O Grande Lançamento") — template DETERMINÍSTICO no código
 * (sem LLM: confiável, grátis e igual pra todo mundo; personalização por IA pode
 * vir depois). Itens obrigatórios (decisão de produto): Caça aos Bugs, Teste do
 * Convidado e Publicar no Mural; Toque de Brilho e Mostrar pra família são opcionais.
 * O gate o→done do members exige todos os `required` marcados.
 */

export interface ChecklistSeedItem {
  category: 'test' | 'polish' | 'publish' | 'share'
  title: string
  description: string
  required: boolean
  position: number
}

export function buildChecklistSeed(input: {
  mode: 'kids' | 'adult'
  gameName: string
  cycleNumber: number
}): ChecklistSeedItem[] {
  const v = `Versão ${input.cycleNumber}`
  if (input.mode === 'adult') {
    return [
      {
        category: 'test',
        title: 'Testar o fluxo principal',
        description: 'Percorra o caminho principal do sistema como um usuário novo.',
        required: true,
        position: 0,
      },
      {
        category: 'test',
        title: 'Teste com outra pessoa',
        description: 'Deixe alguém usar sem explicação e anote o que travou.',
        required: true,
        position: 1,
      },
      {
        category: 'polish',
        title: 'Revisar textos e visual',
        description: 'Ajuste textos, estados vazios e mensagens de erro.',
        required: false,
        position: 2,
      },
      {
        category: 'publish',
        title: 'Publicar',
        description: 'Coloque a versão no ar.',
        required: true,
        position: 3,
      },
      {
        category: 'share',
        title: 'Divulgar para as primeiras pessoas',
        description: 'Compartilhe com um grupo pequeno e colete feedback.',
        required: false,
        position: 4,
      },
    ]
  }
  return [
    {
      category: 'test',
      title: 'Caça aos Bugs com o Buga',
      description: `Jogue ${input.gameName} 3 vezes caçando bugs, como um detetive. Em cada rodada anote: "Eu esperava que..." e "Mas o que aconteceu foi...". Achou um bug? Ele vira uma missão de conserto no seu quadro. Não achou nenhum? Uau, pode marcar!`,
      required: true,
      position: 0,
    },
    {
      category: 'test',
      title: 'Teste do Convidado',
      description:
        'Chame alguém (pai, mãe, amigo) e deixe a pessoa jogar SEM explicar nada. Só observe. A pessoa conseguiu jogar sozinha? O que ela não entendeu pode virar um conserto.',
      required: true,
      position: 1,
    },
    {
      category: 'polish',
      title: 'Toque de Brilho',
      description:
        'Escolha UMA coisa pra deixar mais caprichada: um som de comemoração, as cores da sua paleta ou a tela de título com o nome do jogo.',
      required: false,
      position: 2,
    },
    {
      category: 'publish',
      title: 'Publicar no Mural dos Criadores',
      description: `Abra ${input.gameName} no Estúdio e use o botão Compartilhar. Seu jogo ganha um link público pra qualquer pessoa jogar!`,
      required: true,
      position: 3,
    },
    {
      category: 'share',
      title: 'Mostrar pra família e amigos',
      description: `Mande o link do seu jogo pra quem você gosta. Você ZEROU a ${v}!`,
      required: false,
      position: 4,
    },
  ]
}
