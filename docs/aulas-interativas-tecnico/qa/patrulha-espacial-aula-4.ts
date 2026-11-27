import type { ConstrutorAula } from './construtor-base-tipos'
import {
  guardaPatrulha,
  montagemPatrulha,
  passosGuardaPatrulha,
  TIPOS_GUARDA,
} from './patrulha-espacial-editorial'
import { experienciaDaNavePatrulha } from './patrulha-espacial-experiencias'

export const patrulhaAula4: ConstrutorAula = {
  slug: 'aula-4',
  title: 'Três chances na patrulha',
  entryStage: 'placar',
  entry:
    'O laser consome um asteroide por acerto, soma pontos e atualiza o placar. A nave ainda não recebe dano.',
  outcome:
    'A nave começa com três vidas. No contato com uma pedra, o jogo retira apenas essa pedra e desconta uma vida, respeitando a breve proteção nativa.',
  trechos: [
    montagemPatrulha({
      key: 'tres-vidas',
      title: 'Três chances para a nave',
      etapa: 'vidas',
      objective: 'Dar três vidas à nave no começo e observar os corações nativos.',
      ponte: 'Dê três vidas à nave. Os corações aparecem no começo; a batida vem na próxima parte.',
      falas: [
        [
          'conversa',
          'Você já consegue acertar as pedras e contar os pontos. Agora a nave vai ter três chances. A cada batida, ela vai perder uma vida. Primeiro vamos preparar as três vidas do começo.',
        ],
        [
          'instrucao',
          'Encontre Ao iniciar e Criar variável estado com valor início. Deixe o encaixe logo abaixo dessa variável à vista, antes dos textos das telas finais.',
          '[arrastar até "Criar variável estado"] [apontar abaixo de "Criar variável estado"]',
        ],
        [
          'instrucao',
          'Abra Jogo 3D, Placar, vida e telas e Vida. Pegue Dar 3 de vida a e encaixe nesse lugar.',
          '[abrir categoria Jogo 3D > Placar, vida e telas > Vida] [encaixar "Dar 3 de vida a" abaixo de "Criar variável estado"]',
        ],
        [
          'instrucao',
          'Conserve a quantidade três. No nome do objeto, escolha nave.',
          '[trocar "heroi" por "nave" em "Dar 3 de vida a"]',
        ],
        [
          'descoberta',
          'Esse bloco dá as vidas no começo. Os corações aparecem na tela para mostrar quantas restam. Se a gente devolvesse três vidas a cada quadro, uma batida nunca teria efeito por muito tempo.',
        ],
        [
          'teste',
          'Clique em Rodar de novo. Veja os três corações no alto, à esquerda. Pressione Enter e pilote. A contagem de vidas começa em três.',
          '[rodar de novo] [apontar prévia] [tecla Enter]',
        ],
        [
          'conversa',
          'Uma pedra ainda não desconta vida, porque essa resposta será sua próxima construção. Agora você tem as três chances preparadas para usar.',
        ],
      ],
      steps: [
        'Em Ao iniciar, deixe visível o encaixe depois de Criar variável estado e antes dos textos das telas finais.',
        'Em Jogo 3D → Placar, vida e telas → Vida, pegue Dar 3 de vida a e encaixe nesse lugar.',
        'Conserve a quantidade 3 e escolha o objeto nave.',
      ],
      tests: [
        'Rodar de novo: aparecem três corações no alto, à esquerda.',
        'Enter começa a partida. O jogo ainda não desconta vida no contato; essa regra vem na próxima parte.',
      ],
      blockLabels: ['Dar 3 de vida a nave'],
      blockTypes: ['sz_g3d_set_life'],
      conferencia: 'Dar três de vida a nave está em Ao iniciar, e não dentro de A cada quadro',
      mostrar: 'Dar 3 de vida a nave',
    }),
    experienciaDaNavePatrulha({
      key: 'respiro-da-nave',
      title: 'Um respiro depois da batida',
      bancada: 'protecao',
      objective:
        'Observar a proteção curta depois de um dano, antes de programar a batida na patrulha.',
      convite: 'Compare uma batida com e sem o respiro de proteção.',
      falas: [
        [
          'conversa',
          'A nave já tem três vidas. Antes de programar a batida, lembre o que acontecia na Nave Contra Asteroides: depois de perder uma vida, a nave piscava um pouquinho.',
        ],
      ],
      pergunta: 'Enquanto a nave pisca, outra batida já tira mais um coração?',
    }),
    montagemPatrulha({
      key: 'vida-na-batida',
      title: 'A batida tira uma vida',
      etapa: 'dano',
      objective: 'Usar o encontro da nave com um grupo para descontar uma vida durante a partida.',
      ponte:
        'Programe a batida: quando um asteroide encosta na nave durante a partida, ela perde uma vida.',
      falas: [
        [
          'conversa',
          'Os corações já mostram as três chances. Vamos retomar o encontro que você usou na nave em duas dimensões: quando a nave encosta em uma pedra do grupo, acontece uma batida.',
        ],
        [
          'instrucao',
          'Encontre Quando acontecer. Deixe à vista um espaço depois do acontecimento de Espaço, fora do fazer dele.',
          '[arrastar até "Quando acontecer"] [apontar abaixo de "Quando apertar a tecla espaço"]',
        ],
        [
          'instrucao',
          'Abra Jogo 3D, Encostar e Encostar de novo. Pegue Quando heroi encostar em algum do grupo e encaixe nesse espaço.',
          '[abrir categoria Jogo 3D > Encostar > Encostar] [encaixar "Quando heroi encostar em algum do grupo" abaixo de "Quando apertar a tecla espaço"]',
        ],
        [
          'instrucao',
          'No primeiro nome, escolha nave. No grupo, escolha asteroides.',
          '[trocar "heroi" por "nave" em "Quando heroi encostar em algum do grupo"] [trocar "estrelas" por "asteroides" em "Quando nave encostar em algum do grupo"]',
        ],
        [
          'instrucao',
          'No campo chamando de, troque item por asteroideQueBateu, tudo junto, com Q e B maiúsculos.',
          '[trocar "item" por "asteroideQueBateu" em "Quando nave encostar em algum do grupo asteroides"]',
        ],
        [
          'descoberta',
          'Esse nome identifica a pedra que participou desta batida. Na próxima parte, você vai usar esse nome para retirar só ela.',
        ],
        ...guardaPatrulha(
          'Quando nave encostar em algum do grupo asteroides',
          'o encontro da nave com os asteroides',
        ),
        [
          'instrucao',
          'Deixe à vista o então desse Se. Abra Jogo 3D, Placar, vida e telas e Vida. Pegue Machucar heroi tirando 1 de vida e encaixe nesse então.',
          '[apontar encaixe em "Se dentro de Quando nave encostar em algum do grupo asteroides" no "então"] [abrir categoria Jogo 3D > Placar, vida e telas > Vida] [encaixar "Machucar heroi tirando 1 de vida" em "Se dentro de Quando nave encostar em algum do grupo asteroides" no "então"]',
        ],
        [
          'instrucao',
          'No objeto, escolha nave. Conserve a quantidade um.',
          '[trocar "heroi" por "nave" em "Machucar heroi tirando 1 de vida"]',
        ],
        [
          'instrucao',
          'Deixe visível o encaixe logo abaixo de Machucar. Abra Jogo 3D e Som. Encaixe Tocar o som pronto abaixo e troque moeda por acerto.',
          '[apontar abaixo de "Machucar nave tirando 1 de vida"] [abrir categoria Jogo 3D > Som] [encaixar "Tocar o som pronto" abaixo de "Machucar nave tirando 1 de vida"] [trocar "moeda" por "acerto" em "Tocar o som pronto abaixo de Machucar"]',
        ],
        [
          'teste',
          'Clique em Rodar de novo e pressione Enter. Escolha uma pedra que vem chegando e leve a nave para a frente dela, sem atirar. Na batida, um coração sai e a nave pisca por um instante.',
          '[rodar de novo] [tecla Enter] nota de edição: alinhar a nave com uma pedra em aproximação sem atirar; observar a primeira batida real [apontar prévia]',
        ],
        [
          'conversa',
          'É o respiro que você viu na bancada da nave: durante esse instante de proteção, outra batida não tira coração. O bloco Machucar cuida de um segundo de proteção. Depois, uma nova batida pode tirar outra vida.',
        ],
        ['pergunta', 'E a pedra que bateu? Ela some ou continua o caminho?'],
        [
          'conversa',
          'Repare: ela continua o caminho. Você vai terminar essa resposta retirando a pedra que já bateu.',
        ],
      ],
      steps: [
        'Em Quando acontecer, deixe visível o encaixe depois de Quando apertar a tecla espaço, fora do fazer dele.',
        'Em Jogo 3D → Encostar → Encostar, encaixe Quando heroi encostar em algum do grupo nesse lugar.',
        'Escolha objeto nave e grupo asteroides. No campo chamando de, escreva asteroideQueBateu, com Q e B maiúsculos.',
        ...passosGuardaPatrulha('Quando nave encostar em algum do grupo asteroides'),
        'Deixe o então da guarda visível. Em Jogo 3D → Placar, vida e telas → Vida, encaixe Machucar heroi tirando 1 de vida. Escolha nave e conserve a quantidade 1.',
        'Deixe o encaixe abaixo de Machucar visível. Em Jogo 3D → Som, encaixe Tocar o som pronto e escolha acerto.',
      ],
      tests: [
        'Rodar de novo → Enter. Sem disparar, alinhe a nave com uma pedra que se aproxima.',
        'No contato, a vida cai de três para dois e a nave pisca brevemente.',
        'A pedra ainda segue o caminho nesta etapa. A proteção nativa evita novo desconto durante um segundo.',
      ],
      blockLabels: [
        'Quando nave encostar em algum do grupo asteroides, chamando de asteroideQueBateu',
        'Se estado = jogando',
        'Machucar nave tirando 1 de vida',
        'Tocar o som pronto acerto',
      ],
      blockTypes: ['sz_g3d_on_touch_group', ...TIPOS_GUARDA, 'sz_g3d_hurt', 'sz_g3d_play_effect'],
      conferencia:
        'o encontro usa nave e asteroides, chama a pedra de asteroideQueBateu, pergunta estado igual a jogando, machuca nave tirando um e toca acerto',
      mostrar: 'Quando nave encostar em algum do grupo asteroides',
    }),
    montagemPatrulha({
      key: 'retirar-a-pedra-da-batida',
      title: 'Só a pedra da batida sai',
      etapa: 'retirada-batida',
      objective: 'Consumir o asteroide identificado pelo encontro antes de descontar a vida.',
      ponte:
        'Faça o asteroide que bateu sumir antes de tirar a vida. Compare uma batida, uma pedra que passa e um acerto. Depois envie.',
      falas: [
        [
          'conversa',
          'A batida já tira uma vida. Agora a pedra que bateu vai sair da rota. Você guardou o nome dessa pedra no próprio acontecimento, então pode retirar só ela.',
        ],
        [
          'instrucao',
          'Em Quando acontecer, encontre Quando nave encostar em algum do grupo asteroides. Dentro do Se de jogando, deixe visível o começo do então, onde está Machucar nave.',
          '[arrastar até "Quando nave encostar em algum do grupo asteroides"] [apontar encaixe em "Se dentro de Quando nave encostar em algum do grupo asteroides" no "então"]',
        ],
        [
          'instrucao',
          'Abra Jogo 3D e Grupos. Pegue Tirar o objeto inimigo do grupo e coloque no começo do então, antes de Machucar.',
          '[abrir categoria Jogo 3D > Grupos] [encaixar "Tirar o objeto inimigo do grupo" em "Se dentro de Quando nave encostar em algum do grupo asteroides" no "então"]',
        ],
        [
          'instrucao',
          'No objeto, escolha asteroideQueBateu. No grupo, escolha asteroides. Confira que Machucar e o som continuam logo abaixo, dentro do mesmo então.',
          '[trocar "inimigo" por "asteroideQueBateu" em "Tirar o objeto inimigo do grupo dentro de Quando nave encostar em algum do grupo asteroides"] [trocar "inimigos" por "asteroides" em "Tirar o objeto asteroideQueBateu do grupo"] [mostrar blocos "Quando nave encostar em algum do grupo asteroides"]',
        ],
        [
          'teste',
          'Clique em Rodar de novo e pressione Enter. Deixe uma pedra bater na nave, sem disparar. Essa pedra desaparece, um coração sai e a nave pisca.',
          '[rodar de novo] [tecla Enter] nota de edição: alinhar com uma pedra e observar a batida real sem disparar [apontar prévia]',
        ],
        [
          'teste',
          'Agora mova a nave para um lado e deixe outra pedra passar sem bater. Seus corações continuam iguais. A pedra que apenas sai da rota não usa a regra da batida.',
          'nota de edição: desviar de uma pedra em aproximação com as setas e observar o placar de vida [apontar prévia]',
        ],
        [
          'teste',
          'Acerte também uma pedra com o laser. Nesse caso, sobe um ponto, e a vida não diminui. São dois encontros diferentes, com respostas diferentes.',
          'nota de edição: alinhar e acertar uma pedra com um laser antes de ela chegar à nave [apontar prévia]',
        ],
        [
          'conversa',
          'Se as vidas chegarem a zero durante seus testes, a partida ainda continua nesta versão. Na próxima aula, você vai usar esse zero para chamar a tela de derrota.',
        ],
      ],
      steps: [
        'No encontro da nave com o grupo asteroides, deixe visível o começo do então de Se estado = jogando.',
        'Em Jogo 3D → Grupos, encaixe Tirar o objeto inimigo do grupo antes de Machucar nave.',
        'Escolha objeto asteroideQueBateu e grupo asteroides. Conserve Machucar nave tirando 1 de vida e Tocar o som pronto acerto logo abaixo.',
      ],
      tests: [
        'Rodar de novo → Enter. Uma batida retira a pedra envolvida e desconta uma vida.',
        'Desvie de outra pedra e deixe-a passar: ela não tira vida.',
        'Acerte uma pedra com um laser: o ponto sobe e a vida permanece igual.',
        'Se chegar a zero, esta versão ainda não mostra derrota; a regra será construída na aula seguinte.',
      ],
      blockLabels: ['Tirar o objeto asteroideQueBateu do grupo asteroides'],
      blockTypes: ['sz_g3d_remove_from_group'],
      conferencia:
        'Tirar asteroideQueBateu do grupo asteroides está no começo do então da batida, antes de Machucar nave e do som',
      mostrar: 'Quando nave encostar em algum do grupo asteroides',
      entrega: {
        reconhecimento:
          'Você fez a nave usar suas três chances: acertar soma, bater tira vida e desviar conserva a nave!',
        depois: 'Quando aparecer Projeto enviado!, clique em Concluir aula.',
        saida: 'Concluir aula',
      },
    }),
  ],
}
