import type { ConstrutorAula } from './construtor-base-tipos'
import { montagemPatrulha } from './patrulha-espacial-editorial'
import { experienciaContatoPatrulha, quizPatrulha } from './patrulha-espacial-experiencias'

export const patrulhaAula3: ConstrutorAula = {
  slug: 'aula-3',
  title: 'Acertar no espaço',
  entryStage: 'limite-asteroide',
  entry:
    'Tiros e asteroides percorrem a rota e saem dos grupos ao passar dos limites. Ainda não há resposta ao contato nem contador de pontos.',
  outcome:
    'Um contato real retira o par envolvido, consome o alvo uma única vez e soma um ponto. O placar começa em zero e mostra cada acerto.',
  trechos: [
    experienciaContatoPatrulha(),
    montagemPatrulha({
      key: 'acerto-do-laser',
      title: 'Um encontro que acerta',
      etapa: 'contato',
      objective:
        'Responder ao contato entre um tiro e um asteroide, retirando os dois e consumindo o alvo.',
      ponte:
        'Use a investigação da Ilha para programar um contato real. Dentro do par preparado, retire o tiro e a pedra envolvidos e marque esse alvo como consumido.',
      falas: [
        [
          'teste',
          'Clique em Rodar de novo e pressione Enter. Alinhe a nave com uma pedra e dispare. O laser atravessa a pedra, porque o encontro ainda não tem uma resposta.',
          '[rodar de novo] [tecla Enter] nota de gravação manual: alinhar a nave com uma pedra e disparar para mostrar a passagem sem retirada na etapa de entrada',
        ],
        [
          'conversa',
          'Lembra da experiência da parte anterior? Na Ilha, parecer junto na imagem não bastava: os objetos precisavam encostar de verdade. Vamos usar essa pergunta no laser e na pedra e programar o que acontece no acerto.',
        ],
        [
          'instrucao',
          'Encontre Enquanto estiver rodando e A cada quadro da cena. Dentro do Se de jogando, procure Para cada objeto asteroide do grupo asteroides. Dentro dele, há Para cada objeto tiro do grupo tiros.',
          '[arrastar até "Para cada objeto asteroide do grupo asteroides abaixo de Mover o grupo asteroides"] [apontar bloco "Para cada objeto tiro do grupo tiros"]',
        ],
        [
          'conversa',
          'Esse percurso preparado apresenta um par de cada vez: um asteroide e um tiro. O Se valor da variável alvoAtivo pergunta se essa pedra ainda pode ser acertada. Você vai colocar a pergunta do contato dentro dele.',
        ],
        [
          'instrucao',
          'Deixe visível o espaço então do Se valor da variável alvoAtivo.',
          '[apontar encaixe em "Se valor da variável alvoAtivo" no "então"]',
        ],
        [
          'instrucao',
          'Abra Programação e Lógica e Se. Pegue um Se e encaixe nesse então.',
          '[abrir categoria Programação > Lógica & Se] [encaixar "Se" em "Se valor da variável alvoAtivo" no "então"]',
        ],
        [
          'instrucao',
          'O Se novo chega com x maior que zero. Segure essa pergunta pelo sinal de maior e leve até a lixeira.',
          '[jogar na lixeira ">" em "Se dentro de Se valor da variável alvoAtivo"]',
        ],
        [
          'instrucao',
          'Deixe visível o espaço que ficou ao lado do Se novo. Abra Jogo 3D, Encostar e Encostar de novo. Pegue o objeto jogador está encostando em e coloque nesse espaço.',
          '[apontar encaixe em "Se dentro de Se valor da variável alvoAtivo" no "Se"] [abrir categoria Jogo 3D > Encostar > Encostar] [encaixar "o objeto jogador está encostando em" em "Se dentro de Se valor da variável alvoAtivo" no "Se"]',
        ],
        [
          'instrucao',
          'No primeiro objeto da pergunta, escolha tiro. No segundo, escolha asteroide.',
          '[trocar "jogador" por "tiro" em "o objeto jogador está encostando em"] [trocar "chao" por "asteroide" em "o objeto tiro está encostando em"]',
        ],
        [
          'instrucao',
          'Deixe à vista o então dessa pergunta de contato.',
          '[apontar encaixe em "Se o objeto tiro está encostando em asteroide" no "então"]',
        ],
        [
          'instrucao',
          'Abra Jogo 3D e Grupos. Pegue Tirar o objeto inimigo do grupo e coloque nesse então. Escolha asteroide no objeto e asteroides no grupo.',
          '[abrir categoria Jogo 3D > Grupos] [encaixar "Tirar o objeto inimigo do grupo" em "Se o objeto tiro está encostando em asteroide" no "então"] [trocar "inimigo" por "asteroide" em "Tirar o objeto inimigo do grupo"] [trocar "inimigos" por "asteroides" em "Tirar o objeto asteroide do grupo"]',
        ],
        [
          'instrucao',
          'Deixe o encaixe abaixo dessa retirada visível. Pegue outro Tirar o objeto inimigo do grupo e encaixe logo abaixo. Desta vez, escolha tiro no objeto e tiros no grupo.',
          '[apontar abaixo de "Tirar o objeto asteroide do grupo asteroides"] [abrir categoria Jogo 3D > Grupos] [encaixar "Tirar o objeto inimigo do grupo" abaixo de "Tirar o objeto asteroide do grupo asteroides"] [trocar "inimigo" por "tiro" em "Tirar o objeto inimigo do grupo abaixo de Tirar o objeto asteroide"] [trocar "inimigos" por "tiros" em "Tirar o objeto tiro do grupo"]',
        ],
        [
          'conversa',
          'Você está retirando só os dois objetos desse encontro. As outras pedras e os outros lasers continuam na rota.',
        ],
        [
          'instrucao',
          'Deixe visível o encaixe abaixo da retirada do tiro. Abra Programação e Variáveis. Pegue Alterar variável contador para e encaixe ali. No nome, escolha alvoAtivo.',
          '[apontar abaixo de "Tirar o objeto tiro do grupo tiros"] [abrir categoria Programação > Variáveis] [encaixar "Alterar variável contador para" abaixo de "Tirar o objeto tiro do grupo tiros"] [trocar "contador" por "alvoAtivo" em "Alterar variável contador para"]',
        ],
        [
          'instrucao',
          'Deixe o número um desse bloco à vista. Abra Programação e Lógica e Se. Pegue verdadeiro, solte em cima do um e escolha falso.',
          '[apontar bloco "Alterar variável alvoAtivo"] [abrir categoria Programação > Lógica & Se] [soltar "verdadeiro" em cima do "1" em "Alterar variável alvoAtivo"] [trocar "verdadeiro" por "falso" em "Alterar variável alvoAtivo"]',
        ],
        [
          'descoberta',
          'A pedra que já foi acertada deixa de ser um alvo ativo. Assim, dois lasers muito próximos não contam a mesma pedra duas vezes. O percurso prepara a próxima pedra separadamente.',
        ],
        [
          'instrucao',
          'Deixe o encaixe abaixo de Alterar variável alvoAtivo visível. Abra Jogo 3D e Som. Encaixe Tocar o som pronto abaixo e conserve a opção moeda.',
          '[apontar abaixo de "Alterar variável alvoAtivo"] [abrir categoria Jogo 3D > Som] [encaixar "Tocar o som pronto" abaixo de "Alterar variável alvoAtivo"]',
        ],
        [
          'teste',
          'Clique em Rodar de novo e pressione Enter. Espere uma pedra se aproximar. Mova a nave para ficar na direção dela e dispare. Quando o laser encosta, os dois desaparecem e você ouve o som do acerto.',
          '[rodar de novo] [tecla Enter] nota de edição: alinhar a nave com uma pedra usando as setas e disparar um laser; marcar o momento do contato no Verificar plano',
        ],
        [
          'teste',
          'Atire também numa faixa sem pedra. Esse laser continua o caminho normalmente. O acerto só acontece quando os objetos encostam.',
          'nota de edição: mover para uma faixa vazia com as setas e disparar [apontar prévia]',
        ],
      ],
      steps: [
        'Em A cada quadro da cena → Se estado = jogando, encontre Para cada asteroide → Para cada tiro → Se valor da variável alvoAtivo. Deixe o então desse último Se visível.',
        'Em Programação → Lógica & Se, encaixe um novo Se nesse então. Retire a pergunta x > 0 pela lixeira.',
        'Deixe o lugar da pergunta visível. Em Jogo 3D → Encostar → Encostar, encaixe o objeto jogador está encostando em. Escolha tiro no primeiro objeto e asteroide no segundo.',
        'No então do contato, encaixe Jogo 3D → Grupos → Tirar o objeto inimigo do grupo. Escolha objeto asteroide e grupo asteroides.',
        'Logo abaixo, encaixe outro Tirar o objeto inimigo do grupo. Escolha objeto tiro e grupo tiros.',
        'Abaixo da retirada do tiro, encaixe Programação → Variáveis → Alterar variável contador para. Escolha alvoAtivo.',
        'Troque o 1 por Programação → Lógica & Se → verdadeiro/falso e escolha falso.',
        'Abaixo de Alterar variável alvoAtivo, encaixe Jogo 3D → Som → Tocar o som pronto. Conserve moeda.',
      ],
      tests: [
        'Rodar de novo → Enter. Alinhe a nave com uma pedra e dispare. No contato real, só esse tiro e essa pedra saem dos grupos.',
        'Dispare numa faixa vazia. Sem contato, o laser continua o caminho.',
        'Ainda não existe placar; o som e o desaparecimento do par são o resultado visível desta parte.',
      ],
      blockLabels: [
        'Se o objeto tiro está encostando em asteroide',
        'Tirar o objeto asteroide do grupo asteroides',
        'Tirar o objeto tiro do grupo tiros',
        'Alterar variável alvoAtivo para falso',
        'Tocar o som pronto moeda',
      ],
      blockTypes: [
        'sz_js_if_else',
        'sz_g3d_collides',
        'sz_g3d_remove_from_group',
        'sz_js_var_assign',
        'sz_val_bool',
        'sz_g3d_play_effect',
      ],
      conferencia:
        'a pergunta de contato fica dentro de Se alvoAtivo, usa tiro e asteroide, retira os dois objetos dos grupos certos, muda alvoAtivo para falso e toca moeda',
      mostrar: 'Se valor da variável alvoAtivo',
    }),
    montagemPatrulha({
      key: 'contador-da-patrulha',
      title: 'Um lugar para guardar os pontos',
      etapa: 'contador',
      objective: 'Criar o contador pontos com valor zero no início de cada jogo.',
      ponte:
        'Crie pontos com valor 0 em Ao iniciar. O mostrador vem depois; nesta parte, confira onde o contador começa.',
      semEfeitoVisivel: true,
      falas: [
        [
          'conversa',
          'O laser já acerta as pedras. Para saber quantas você acertou, vamos guardar uma contagem, como na sua nave em duas dimensões. Ela começa sem acertos: zero.',
        ],
        [
          'instrucao',
          'Encontre Ao iniciar e Criar variável velocidadeAsteroides. Deixe o encaixe logo abaixo dele à vista, antes da variável estado.',
          '[arrastar até "Criar variável velocidadeAsteroides"] [apontar abaixo de "Criar variável velocidadeAsteroides"]',
        ],
        [
          'instrucao',
          'Abra Programação e Variáveis. Pegue Criar variável contador com valor e encaixe nesse lugar.',
          '[abrir categoria Programação > Variáveis] [encaixar "Criar variável contador com valor" abaixo de "Criar variável velocidadeAsteroides"]',
        ],
        [
          'instrucao',
          'No nome contador, escreva pontos, tudo em letras minúsculas. Conserve o valor zero.',
          '[trocar "contador" por "pontos" em "Criar variável contador com valor"]',
        ],
        [
          'descoberta',
          'Toda vez que o jogo começa do início, pontos recebe zero. Esse bloco prepara a contagem. Ele ainda não escreve nada na tela e ainda não soma no acerto.',
        ],
      ],
      steps: [
        'Em Ao iniciar, deixe visível o encaixe abaixo de Criar variável velocidadeAsteroides e antes de estado.',
        'Em Programação → Variáveis, pegue Criar variável contador com valor e encaixe nesse lugar.',
        'Troque o nome contador por pontos e conserve o valor 0.',
      ],
      tests: [
        'Confira o nome pontos e o valor 0 em Ao iniciar.',
        'Nenhum placar novo aparece nesta etapa. O efeito é preparar a variável.',
      ],
      blockLabels: ['Criar variável pontos com valor 0'],
      blockTypes: ['sz_js_var_create'],
      conferencia:
        'Criar variável pontos com valor zero está em Ao iniciar, depois de velocidadeAsteroides',
      mostrar: 'Criar variável pontos',
    }),
    montagemPatrulha({
      key: 'um-ponto-por-acerto',
      title: 'Cada acerto soma um',
      etapa: 'soma',
      objective: 'Somar um ponto dentro da mesma resposta que consome o par acertado.',
      ponte:
        'Coloque a soma dentro do acerto real. Um tiro que passa no vazio não soma. Depois vamos ligar o mostrador à contagem.',
      semEfeitoVisivel: true,
      falas: [
        [
          'conversa',
          'Você criou o lugar que guarda a contagem. Agora ela precisa mudar no acontecimento certo: o contato que acerta uma pedra. Disparar sozinho não vale ponto.',
        ],
        ['pergunta', 'E uma pedra que passa pela nave sem bater, conta como acerto?'],
        [
          'conversa',
          'Não. O ponto pertence ao encontro do laser com a pedra. Vamos colocar a soma dentro dessa resposta.',
        ],
        [
          'instrucao',
          'Em Enquanto estiver rodando, encontre Se o objeto tiro está encostando em asteroide. Dentro dele, deixe visível o encaixe depois de Tirar o objeto tiro e antes de Alterar variável alvoAtivo.',
          '[arrastar até "Se o objeto tiro está encostando em asteroide"] [apontar abaixo de "Tirar o objeto tiro do grupo tiros"]',
        ],
        [
          'instrucao',
          'Abra Programação e Variáveis. Pegue Somar 1 em variável e encaixe nesse lugar.',
          '[abrir categoria Programação > Variáveis] [encaixar "Somar 1 em variável" abaixo de "Tirar o objeto tiro do grupo tiros"]',
        ],
        [
          'instrucao',
          'Conserve a quantidade um. No nome contador, escolha pontos.',
          '[trocar "contador" por "pontos" em "Somar 1 em variável"]',
        ],
        [
          'descoberta',
          'O encontro retira o par, soma um ponto e marca a pedra como consumida. Sem esse encontro, a soma não roda. O número ainda está guardado na variável; a próxima parte vai mostrá-lo na tela.',
        ],
      ],
      steps: [
        'No então do contato tiro–asteroide, deixe visível o encaixe depois de Tirar o objeto tiro do grupo tiros e antes de Alterar variável alvoAtivo.',
        'Em Programação → Variáveis, encaixe Somar 1 em variável nesse lugar.',
        'Conserve a quantidade 1 e escolha a variável pontos.',
      ],
      tests: [
        'Confira a soma dentro do então do contato, entre a retirada do tiro e alvoAtivo = falso.',
        'Não espere um placar visível ainda: esta etapa muda o valor guardado.',
      ],
      blockLabels: ['Somar 1 em variável pontos'],
      blockTypes: ['sz_js_var_increment'],
      conferencia:
        'Somar um em variável pontos está dentro do acerto, depois de tirar o tiro e antes de mudar alvoAtivo para falso',
      mostrar: 'Se o objeto tiro está encostando em asteroide',
    }),
    montagemPatrulha({
      key: 'placar-da-patrulha',
      title: 'Veja a contagem na tela',
      etapa: 'placar',
      objective:
        'Mostrar o zero inicial e atualizar o placar com a variável pontos em cada acerto.',
      ponte:
        'Ligue a contagem ao aviso da tela. Confira o zero inicial, um acerto e um disparo no vazio. Depois envie sua patrulha com placar.',
      falas: [
        [
          'conversa',
          'A contagem já começa em zero e soma no acerto. Agora o piloto precisa enxergar esse número. Vamos preparar o aviso inicial e atualizar o mesmo lugar depois de cada acerto.',
        ],
        [
          'instrucao',
          'Em Ao iniciar, encontre Escrever na tela ↑ em cima, no meio, com o título Patrulha Espacial e Projeto inicial. Deixe o encaixe logo abaixo dele visível.',
          '[arrastar até "Escrever na tela ↑ em cima, no meio"] [apontar abaixo de "Escrever na tela ↑ em cima, no meio"]',
        ],
        [
          'instrucao',
          'Abra Jogo 3D, Placar, vida e telas e Na tela. Pegue Escrever na tela e coloque nesse lugar.',
          '[abrir categoria Jogo 3D > Placar, vida e telas > Na tela] [encaixar "Escrever na tela" abaixo de "Escrever na tela ↑ em cima, no meio"]',
        ],
        [
          'instrucao',
          'No lugar da tela, escolha em cima, à direita. No texto Pegue as estrelas, escreva Acertos, dois-pontos, espaço, zero, espaço, barra, espaço, vinte.',
          '[trocar "↖ em cima, à esquerda" por "↗ em cima, à direita" em "Escrever na tela abaixo de Escrever na tela ↑ em cima, no meio"] [trocar "Pegue as estrelas!" por "Acertos: 0 / 20" em "Escrever na tela em cima, à direita"]',
        ],
        [
          'conversa',
          'Esse é o aviso do começo. Agora vamos montar o aviso que acompanha os acertos.',
        ],
        [
          'instrucao',
          'Volte ao contato do tiro com o asteroide. Deixe à vista o encaixe depois de Tocar o som pronto moeda, ainda dentro do então.',
          '[arrastar até "Se o objeto tiro está encostando em asteroide"] [apontar abaixo de "Tocar o som pronto moeda"]',
        ],
        [
          'instrucao',
          'Abra de novo Jogo 3D, Placar, vida e telas e Na tela. Encaixe outro Escrever na tela nesse lugar. Escolha em cima, à direita.',
          '[abrir categoria Jogo 3D > Placar, vida e telas > Na tela] [encaixar "Escrever na tela" abaixo de "Tocar o som pronto moeda"] [trocar "↖ em cima, à esquerda" por "↗ em cima, à direita" em "Escrever na tela dentro de Se o objeto tiro está encostando em asteroide"]',
        ],
        [
          'instrucao',
          'Deixe visível o texto Pegue as estrelas desse novo bloco. Abra Programação e Matemática. Pegue zero mais zero e solte em cima desse texto.',
          '[apontar bloco "Escrever na tela dentro de Se o objeto tiro está encostando em asteroide"] [abrir categoria Programação > Matemática] [soltar "0 + 0" em cima do "Pegue as estrelas!" em "Escrever na tela dentro de Se o objeto tiro está encostando em asteroide"]',
        ],
        [
          'conversa',
          'Quando uma das partes é texto, o mais junta as partes da mensagem. Vamos juntar Acertos, o valor de pontos e a meta vinte.',
        ],
        [
          'instrucao',
          'Deixe visível o zero da esquerda. Pegue outro zero mais zero em Matemática e solte em cima desse zero.',
          '[apontar bloco "Escrever na tela dentro de Se o objeto tiro está encostando em asteroide"] [abrir categoria Programação > Matemática] nota de gravação manual: soltar "0 + 0" em cima do "0" em "lado esquerdo da conta do placar"; seguir o operando indicado na fala e conferir a expressão no desenho do caderno',
        ],
        [
          'instrucao',
          'No bloco de dentro, deixe visível o zero da esquerda. Abra Programação e Valores. Pegue texto e solte sobre esse zero. No lugar de Olá, escreva Acertos com dois-pontos e deixe um espaço depois.',
          '[abrir categoria Programação > Valores] nota de gravação manual: soltar "texto" em cima do "0" em "lado esquerdo da conta interna do placar"; seguir o operando indicado na fala e conferir a expressão no desenho do caderno nota de gravação manual: trocar "Olá" por "Acertos: " em "texto da conta interna do placar"; seguir o operando indicado na fala e conferir a expressão no desenho do caderno',
        ],
        [
          'instrucao',
          'Deixe visível o zero à direita desse mesmo mais, o de dentro. Em Valores, pegue valor da variável e solte sobre esse zero. No x, escolha pontos.',
          '[apontar bloco "Escrever na tela dentro de Se o objeto tiro está encostando em asteroide"] [abrir categoria Programação > Valores] nota de gravação manual: soltar "valor da variável" em cima do "0" em "lado direito da conta interna do placar"; seguir o operando indicado na fala e conferir a expressão no desenho do caderno nota de gravação manual: trocar "x" por "pontos" em "valor da variável dentro do placar"; seguir o operando indicado na fala e conferir a expressão no desenho do caderno',
        ],
        [
          'instrucao',
          'Falta o zero à direita do mais de fora. Deixe esse zero à vista. Em Valores, pegue outro texto e solte sobre ele. No lugar de Olá, escreva um espaço, barra, outro espaço e vinte.',
          '[apontar bloco "Escrever na tela dentro de Se o objeto tiro está encostando em asteroide"] [abrir categoria Programação > Valores] nota de gravação manual: soltar "texto" em cima do "0" em "lado direito da conta externa do placar"; seguir o operando indicado na fala e conferir a expressão no desenho do caderno nota de gravação manual: trocar "Olá" por " / 20" em "texto à direita do placar"; seguir o operando indicado na fala e conferir a expressão no desenho do caderno',
        ],
        [
          'descoberta',
          'A mensagem junta Acertos, o número guardado em pontos e a meta vinte. Como esse aviso vem depois da soma, ele mostra a contagem já atualizada.',
        ],
        [
          'teste',
          'Clique em Rodar de novo. O canto de cima, à direita, começa em Acertos zero de vinte. Pressione Enter, alinhe a nave com uma pedra e acerte. O número passa para um.',
          '[rodar de novo] [apontar prévia] [tecla Enter] nota de edição: alinhar e acertar uma pedra; conferir o placar real',
        ],
        [
          'teste',
          'Dispare numa faixa vazia. A contagem não muda. Acerte outra pedra: agora o placar soma mais um. Ele não deve subir sem um novo acerto.',
          'nota de edição: mostrar um disparo no vazio e depois um novo acerto, sem alterar o projeto [apontar prévia]',
        ],
      ],
      steps: [
        'Em Ao iniciar, deixe visível o encaixe abaixo do título em cima, no meio. Em Jogo 3D → Placar, vida e telas → Na tela, encaixe Escrever na tela.',
        'Escolha em cima, à direita e escreva o texto Acertos: 0 / 20.',
        'No então do contato tiro–asteroide, deixe visível o encaixe depois de Tocar o som pronto moeda. Encaixe outro Escrever na tela e escolha em cima, à direita.',
        'Deixe o texto do segundo aviso visível. Em Programação → Matemática, solte 0 + 0 sobre esse texto.',
        'No 0 da esquerda, encaixe outro 0 + 0.',
        'No 0 à esquerda do mais interno, encaixe Programação → Valores → texto. Escreva Acertos: com um espaço no fim.',
        'No 0 à direita do mais interno, encaixe valor da variável e escolha pontos.',
        'No 0 à direita do mais externo, encaixe outro texto. Escreva espaço, /, espaço, 20. A expressão fica ("Acertos: " + pontos) + " / 20".',
      ],
      tests: [
        'Rodar de novo: o placar começa em Acertos: 0 / 20.',
        'Depois de Enter, acerte uma pedra: o placar soma exatamente um.',
        'Um disparo no vazio e uma pedra que passa não alteram o placar.',
        'Acerte outra pedra e confirme a próxima soma.',
      ],
      blockLabels: [
        'Escrever na tela em cima, à direita: Acertos: 0 / 20',
        'Escrever na tela em cima, à direita: Acertos: + pontos + / 20',
        'valor da variável pontos',
        'texto',
        '0 + 0',
      ],
      blockTypes: ['sz_g3d_hud_text', 'sz_math_arithmetic', 'sz_val_text', 'sz_val_variable'],
      conferencia:
        'o aviso inicial fica em Ao iniciar, o aviso com pontos fica dentro do acerto depois da soma, e os dois escrevem em cima, à direita',
      mostrar:
        'Escrever na tela em cima, à direita", "Se o objeto tiro está encostando em asteroide',
      entrega: {
        reconhecimento: 'Você fez cada acerto valer um ponto e aparecer no placar da sua patrulha!',
        depois: 'Quando aparecer Projeto enviado!, clique em Próxima parte.',
        saida: 'Próxima parte',
      },
    }),
    quizPatrulha(
      'conferir-acertos',
      'O que faz o ponto valer?',
      [
        {
          id: 'contato-3d',
          prompt:
            'Vendo de cima, um laser parece passar sobre uma pedra, mas está bem mais alto. O que confirma um acerto?',
          choices: [
            'Apenas os desenhos parecerem juntos na imagem.',
            'Os objetos encostarem de verdade no espaço.',
            'A tecla Espaço ter sido apertada.',
          ],
          correct: 1,
          explanation:
            'A imagem pode esconder uma diferença de altura. A regra de acerto confere o contato real entre tiro e asteroide.',
        },
        {
          id: 'um-ponto',
          prompt:
            'Você dispara três vezes e só um laser acerta uma pedra. Quantos pontos essa jogada deve somar?',
          choices: [
            'Três, porque saíram três lasers.',
            'Zero, porque dois lasers erraram.',
            'Um, porque houve um acerto.',
          ],
          correct: 2,
          explanation:
            'A soma fica dentro do contato que retira o par. Criar um laser, sozinho, não soma ponto.',
        },
        {
          id: 'mostrar-pontos',
          prompt:
            'A variável pontos chegou a dois. Por que o aviso usa o valor da variável, em vez de um texto fixo com zero?',
          choices: [
            'Para mostrar a contagem atual depois de cada acerto.',
            'Para criar mais asteroides.',
            'Para mudar a altura do laser.',
          ],
          correct: 0,
          explanation:
            'O valor guardado muda nos acertos. A mensagem lê esse valor para mostrar a contagem atual.',
        },
      ],
      true,
    ),
  ],
}
