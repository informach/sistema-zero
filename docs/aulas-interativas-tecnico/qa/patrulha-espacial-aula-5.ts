import type { ConstrutorAula } from './construtor-base-tipos'
import {
  guardaPatrulha,
  montagemPatrulha,
  montarFalaPatrulha,
  passosGuardaPatrulha,
  TIPOS_GUARDA,
} from './patrulha-espacial-editorial'
import { quizPatrulha } from './patrulha-espacial-experiencias'

export const patrulhaAula5: ConstrutorAula = {
  slug: 'aula-5',
  title: 'Uma patrulha completa',
  entryStage: 'retirada-batida',
  entry:
    'Disparos, surgimento, percursos, retirada, acertos, placar e dano funcionam. A abertura, o estado, Enter, os textos das telas finais e o botão de retorno estão preparados; ainda não existem condições que acionem os resultados.',
  outcome:
    'Vida zero aciona a derrota; se houver vida, vinte pontos acionam a vitória. O jogo encerra uma vez e o botão nativo prepara outra partida com zero pontos e três vidas.',
  trechos: [
    montagemPatrulha({
      key: 'quando-as-vidas-acabam',
      title: 'Quando as vidas acabam',
      etapa: 'derrota',
      objective:
        'Conferir vida zero no começo do quadro e acionar estado de derrota e fim de jogo.',
      ponte:
        'Programe a derrota: quando as vidas acabam, a partida termina com a tela de fim, que já vem preparada.',
      falas: [
        [
          'conversa',
          'A nave já perde vida nas batidas. Mas, quando os corações acabam, a versão anterior ainda continua rodando. Vamos usar a vida zero para encerrar a partida e chamar a tela de derrota.',
        ],
        [
          'instrucao',
          'Encontre Enquanto estiver rodando e A cada quadro da cena. Deixe visível o começo do fazer, onde está o Se de jogando que movimenta a nave e os grupos.',
          '[arrastar até "A cada quadro da cena"] [apontar encaixe em "A cada quadro da cena"]',
        ],
        [
          'conversa',
          'A nova conferência vai entrar antes desse Se. Assim, se a partida acabou, o jogo decide o resultado antes de continuar o movimento.',
        ],
        ...guardaPatrulha('A cada quadro da cena', 'A cada quadro da cena, no começo do fazer'),
        [
          'instrucao',
          'Confira que o Se anterior desceu e continua logo abaixo do novo, fora do então dele. Deixe visível o então vazio do Se novo.',
          '[mostrar blocos "A cada quadro da cena"] [apontar encaixe em "Se valor da variável estado dentro de A cada quadro da cena" no "então"]',
        ],
        [
          'instrucao',
          'Abra Programação e Lógica e Se. Encaixe outro Se dentro desse então.',
          '[abrir categoria Programação > Lógica & Se] [encaixar "Se" em "Se valor da variável estado dentro de A cada quadro da cena" no "então"]',
        ],
        [
          'instrucao',
          'Na pergunta x maior que zero do Se de dentro, deixe o x à vista. Abra Jogo 3D, Placar, vida e telas e Vida. Pegue a vida de e solte em cima desse x.',
          '[apontar bloco "Se valor da variável x dentro de Se valor da variável estado dentro de A cada quadro da cena"] [abrir categoria Jogo 3D > Placar, vida e telas > Vida] [soltar "a vida de" em cima do "x" em "Se valor da variável x dentro de Se valor da variável estado dentro de A cada quadro da cena"]',
        ],
        [
          'instrucao',
          'No nome do objeto, escolha nave. Troque o sinal de maior pelo sinal de menor ou igual. Conserve o zero à direita.',
          '[trocar "heroi" por "nave" em "a vida de"] [trocar ">" por "≤" em "Se a vida de nave"]',
        ],
        [
          'conversa',
          'A pergunta agora é: a vida da nave é menor ou igual a zero? Se for, vamos guardar o resultado e terminar a partida.',
        ],
        [
          'instrucao',
          'Deixe o então dessa pergunta à vista. Abra Programação e Variáveis. Encaixe Alterar variável contador para nesse então. No nome contador, escolha estado.',
          '[apontar encaixe em "Se a vida de nave" no "então"] [abrir categoria Programação > Variáveis] [encaixar "Alterar variável contador para" em "Se a vida de nave" no "então"] [trocar "contador" por "estado" em "Alterar variável dentro de Se a vida de nave"]',
        ],
        [
          'instrucao',
          'Deixe o número um do valor visível. Abra Programação e Valores. Solte texto sobre esse número e escreva derrota no lugar de Olá, tudo em letras minúsculas.',
          '[apontar bloco "Alterar variável estado dentro de Se a vida de nave"] [abrir categoria Programação > Valores] [soltar "texto" em cima do "1" em "Alterar variável estado dentro de Se a vida de nave"] [trocar "Olá" por "derrota" em "Alterar variável estado dentro de Se a vida de nave"]',
        ],
        [
          'instrucao',
          'Deixe visível o encaixe abaixo dessa mudança de estado. Abra Jogo 3D, Placar, vida e telas e Na tela. Encaixe Escrever na tela nesse lugar.',
          '[apontar abaixo de "Alterar variável estado para texto derrota"] [abrir categoria Jogo 3D > Placar, vida e telas > Na tela] [encaixar "Escrever na tela" abaixo de "Alterar variável estado para texto derrota"]',
        ],
        [
          'instrucao',
          'Escolha embaixo, no meio. Apague o texto Pegue as estrelas e deixe o texto vazio. Isso limpa o aviso dos controles antes da tela final.',
          '[trocar "↖ em cima, à esquerda" por "↓ embaixo, no meio" em "Escrever na tela abaixo de Alterar variável estado para texto derrota"] [trocar "Pegue as estrelas!" por "" em "Escrever na tela abaixo de Alterar variável estado para texto derrota"]',
        ],
        [
          'instrucao',
          'Deixe o encaixe abaixo desse aviso visível. Em Jogo 3D, Placar, vida e telas, abra Telas e fim. Encaixe Fim de jogo e conserve você perdeu.',
          '[apontar abaixo de "Escrever na tela abaixo de Alterar variável estado para texto derrota"] [abrir categoria Jogo 3D > Placar, vida e telas > Telas e fim] [encaixar "Fim de jogo" abaixo de "Escrever na tela abaixo de Alterar variável estado para texto derrota"]',
        ],
        [
          'descoberta',
          'O estado deixa de ser jogando, e o bloco Fim de jogo abre a tela de derrota que já está preparada. O movimento, os disparos e o relógio param junto com a partida.',
        ],
        [
          'teste',
          'Clique em Rodar de novo e pressione Enter. Neste teste, deixe pedras baterem na nave, esperando a proteção acabar entre as batidas. Quando a vida chega a zero, aparece o resultado de derrota.',
          '[rodar de novo] [tecla Enter] nota de edição: capturar três batidas válidas, separadas por mais de um segundo, até a tela de derrota',
        ],
        [
          'teste',
          'Clique em Voltar ao início. Você volta à abertura, com zero pontos e três vidas. Pressione Enter para começar outra partida.',
          '[clicar "Voltar ao início"] [apontar prévia] [tecla Enter]',
        ],
      ],
      steps: [
        'Em Enquanto estiver rodando → A cada quadro da cena, deixe visível o começo do fazer, antes do Se que movimenta o jogo.',
        ...passosGuardaPatrulha('A cada quadro da cena, antes do Se de movimento'),
        'Confira que o Se de movimento continua depois do novo, fora do então. Deixe o então do novo Se estado = jogando visível.',
        'Em Programação → Lógica & Se, encaixe outro Se nesse então.',
        'No x da pergunta nova, encaixe Jogo 3D → Placar, vida e telas → Vida → a vida de. Escolha nave, use ≤ e conserve 0 à direita.',
        'No então da vida, encaixe Programação → Variáveis → Alterar variável contador para. Escolha estado.',
        'Deixe o valor 1 visível. Em Programação → Valores, solte texto sobre ele e escreva derrota.',
        'Abaixo da mudança de estado, encaixe Jogo 3D → Placar, vida e telas → Na tela → Escrever na tela. Escolha embaixo, no meio e deixe o texto vazio.',
        'Abaixo do aviso vazio, encaixe Jogo 3D → Placar, vida e telas → Telas e fim → Fim de jogo. Conserve você perdeu.',
      ],
      tests: [
        'Rodar de novo → Enter. Deixe acontecerem três batidas válidas, com tempo para acabar a proteção entre elas.',
        'Quando a vida chega a zero, a tela de derrota aparece e a partida para.',
        'Clique em Voltar ao início. Confira abertura, pontos zero e três vidas. Enter inicia uma nova partida.',
      ],
      blockLabels: [
        'Se estado = jogando',
        'Se a vida de nave ≤ 0',
        'Alterar variável estado para derrota',
        'Escrever na tela ↓ embaixo, no meio: texto vazio',
        'Fim de jogo: você perdeu',
      ],
      blockTypes: [
        ...TIPOS_GUARDA,
        'sz_g3d_life_of',
        'sz_js_var_assign',
        'sz_g3d_hud_text',
        'sz_g3d_end_game',
      ],
      conferencia:
        'a conferência nova fica antes do movimento, pergunta se está jogando e se a vida da nave chegou a zero; então muda estado para derrota, limpa o aviso de baixo e chama você perdeu',
      mostrar: 'Se a vida de nave',
    }),
    montagemPatrulha({
      key: 'meta-da-patrulha',
      title: 'Vinte acertos abrem a rota',
      etapa: 'vitoria',
      objective: 'Conferir a meta no senão da derrota e acionar a vitória uma única vez.',
      ponte:
        'Programe a vitória: com vinte acertos e vida sobrando, a partida termina com a tela de vitória.',
      falas: [
        [
          'conversa',
          'Você já encerra a partida quando as vidas acabam. Agora vamos completar a outra possibilidade: acertar vinte asteroides enquanto a nave ainda tem vida. Antes de montar, uma pergunta para você pensar.',
        ],
        ['pergunta', 'Se eu chegar a vinte e a vida também acabar, qual resultado vale?'],
        [
          'conversa',
          'Pense na sua resposta. Nesta patrulha, a vida é conferida primeiro: se acabou, vale a derrota. Por isso a vitória vai ficar no senão, que só acontece quando ainda há vida.',
        ],
        [
          'instrucao',
          'Encontre a pergunta Se a vida de nave é menor ou igual a zero, no começo de A cada quadro da cena.',
          '[arrastar até "Se a vida de nave"]',
        ],
        [
          'instrucao',
          'Clique no segundo mais desse Se, o que fica logo antes de senão, para abrir esse espaço. Deixe visível o espaço do senão que apareceu.',
          '[abrir "senão" em "Se a vida de nave"] [apontar encaixe em "Se a vida de nave" no "senão"]',
        ],
        [
          'conversa',
          'Se a vida chegou a zero, o então cuida da derrota. Senão, a nave ainda tem vida, e podemos conferir a meta de acertos. Essa ordem decide uma única resposta, a que você pensou agora há pouco.',
        ],
        [
          'instrucao',
          'Abra Programação e Lógica e Se. Pegue um Se e encaixe no senão.',
          '[abrir categoria Programação > Lógica & Se] [encaixar "Se" em "Se a vida de nave" no "senão"]',
        ],
        [
          'instrucao',
          'Na pergunta x maior que zero, escolha pontos no lugar de x. Troque o sinal de maior por maior ou igual. Troque o zero por vinte.',
          '[trocar "x" por "pontos" em "Se valor da variável x dentro de Se a vida de nave"] [trocar ">" por "≥" em "Se valor da variável pontos dentro de Se a vida de nave"] [trocar "0" por "20" em "Se valor da variável pontos dentro de Se a vida de nave"]',
        ],
        [
          'instrucao',
          'Deixe visível o então da pergunta dos pontos. Abra Programação e Variáveis. Encaixe Alterar variável contador para nesse então e escolha estado no nome.',
          '[apontar encaixe em "Se valor da variável pontos dentro de Se a vida de nave" no "então"] [abrir categoria Programação > Variáveis] [encaixar "Alterar variável contador para" em "Se valor da variável pontos dentro de Se a vida de nave" no "então"] [trocar "contador" por "estado" em "Alterar variável dentro de Se valor da variável pontos"]',
        ],
        [
          'instrucao',
          'Deixe visível o número um do valor. Abra Programação e Valores. Solte texto sobre esse um e escreva vitoria, sem acento e com letras minúsculas.',
          '[apontar bloco "Alterar variável estado dentro de Se valor da variável pontos"] [abrir categoria Programação > Valores] [soltar "texto" em cima do "1" em "Alterar variável estado dentro de Se valor da variável pontos"] [trocar "Olá" por "vitoria" em "Alterar variável estado dentro de Se valor da variável pontos"]',
        ],
        [
          'instrucao',
          'Deixe o encaixe abaixo dessa mudança à vista. Abra Jogo 3D, Placar, vida e telas e Na tela. Encaixe Escrever na tela abaixo.',
          '[apontar abaixo de "Alterar variável estado para texto vitoria"] [abrir categoria Jogo 3D > Placar, vida e telas > Na tela] [encaixar "Escrever na tela" abaixo de "Alterar variável estado para texto vitoria"]',
        ],
        [
          'instrucao',
          'Escolha embaixo, no meio, e deixe o texto vazio, apagando Pegue as estrelas.',
          '[trocar "↖ em cima, à esquerda" por "↓ embaixo, no meio" em "Escrever na tela abaixo de Alterar variável estado para texto vitoria"] [trocar "Pegue as estrelas!" por "" em "Escrever na tela abaixo de Alterar variável estado para texto vitoria"]',
        ],
        [
          'instrucao',
          'Deixe visível o encaixe abaixo do aviso vazio. Abra Jogo 3D e Som. Encaixe Tocar o som pronto e conserve moeda.',
          '[apontar abaixo de "Escrever na tela abaixo de Alterar variável estado para texto vitoria"] [abrir categoria Jogo 3D > Som] [encaixar "Tocar o som pronto" abaixo de "Escrever na tela abaixo de Alterar variável estado para texto vitoria"]',
        ],
        [
          'instrucao',
          'Deixe o encaixe abaixo do som visível. Abra Jogo 3D, Placar, vida e telas e Telas e fim. Encaixe Fim de jogo abaixo e troque você perdeu por você ganhou.',
          '[apontar abaixo de "Tocar o som pronto dentro de Se valor da variável pontos"] [abrir categoria Jogo 3D > Placar, vida e telas > Telas e fim] [encaixar "Fim de jogo" abaixo de "Tocar o som pronto dentro de Se valor da variável pontos"] [trocar "você perdeu" por "você ganhou" em "Fim de jogo dentro de Se valor da variável pontos"]',
        ],
        [
          'teste',
          'Clique em Rodar de novo e pressione Enter. Pilote, desvie e acerte as pedras. Quando o placar chega a vinte e você ainda tem vida, aparece a tela de vitória.',
          '[rodar de novo] [tecla Enter] nota de edição: capturar uma partida real até vinte acertos com vida restante; usar corte de edição na repetição, sem mudar valores do projeto',
        ],
        [
          'teste',
          'Depois do resultado, tente mover e disparar: a partida está encerrada. Clique em Voltar ao início. O começo volta com pontos zero e três vidas.',
          '[tecla ArrowRight] [tecla Space] [clicar "Voltar ao início"] [apontar prévia]',
        ],
      ],
      steps: [
        'No primeiro Se de jogando de A cada quadro, encontre Se a vida de nave ≤ 0. Clique no segundo +, imediatamente antes de senão, para abrir esse ramo.',
        'Deixe o senão visível. Em Programação → Lógica & Se, encaixe um Se nesse ramo.',
        'Na pergunta nova, use pontos no lugar de x, ≥ no lugar de > e 20 no lugar de 0.',
        'No então dos pontos, encaixe Programação → Variáveis → Alterar variável contador para. Escolha estado.',
        'No valor, troque 1 por Programação → Valores → texto e escreva vitoria, sem acento.',
        'Abaixo, encaixe Jogo 3D → Placar, vida e telas → Na tela → Escrever na tela. Use embaixo, no meio e texto vazio.',
        'Abaixo do aviso, encaixe Jogo 3D → Som → Tocar o som pronto e conserve moeda.',
        'Abaixo do som, encaixe Jogo 3D → Placar, vida e telas → Telas e fim → Fim de jogo. Escolha você ganhou.',
      ],
      tests: [
        'Rodar de novo → Enter. Alcance vinte pontos mantendo alguma vida: aparece a vitória.',
        'Depois do resultado, movimento e disparos não continuam.',
        'Voltar ao início restaura a abertura, zero pontos e três vidas.',
        'Confira nos blocos: a vitória está no senão da vida zero, nunca em uma conferência independente.',
      ],
      blockLabels: [
        'Se a vida de nave ≤ 0, senão',
        'Se pontos ≥ 20',
        'Alterar variável estado para vitoria',
        'Escrever na tela ↓ embaixo, no meio: texto vazio',
        'Tocar o som pronto moeda',
        'Fim de jogo: você ganhou',
      ],
      blockTypes: [
        'sz_js_if_else',
        'sz_val_compare',
        'sz_val_variable',
        'sz_js_var_assign',
        'sz_val_text',
        'sz_g3d_hud_text',
        'sz_g3d_play_effect',
        'sz_g3d_end_game',
      ],
      conferencia:
        'o Se dos vinte pontos fica no senão da vida zero, muda estado para vitoria, limpa o aviso de baixo, toca moeda e chama você ganhou',
      mostrar: 'Se a vida de nave',
    }),
    montagemPatrulha({
      key: 'patrulha-pronta',
      title: 'Confira a patrulha completa',
      etapa: 'completo',
      objective: 'Testar o ciclo de partida completo e enviar a patrulha pronta.',
      ponte:
        'Teste a partida inteira: começo, acerto, batida, vitória, derrota e uma nova partida. Depois envie sua Patrulha Espacial completa.',
      falas: [
        [
          'conversa',
          'Sua patrulha já tem as regras completas: disparos, asteroides, acertos, pontos, vidas e as duas formas de terminar. Os avisos da tela já mostram a missão desde a primeira aula. Agora é hora de testar o jogo inteiro, como um piloto de testes, antes de enviar.',
        ],
        [
          'teste',
          'Clique em Rodar de novo. Confira a abertura, os três corações e o zero no placar. Toque em Espaço antes de Enter: não deve sair laser.',
          '[rodar de novo] [apontar prévia] [tecla Space]',
        ],
        [
          'teste',
          'Pressione Enter. Mova a nave e dispare. Um acerto soma um ponto; uma batida tira uma vida; uma pedra que passa sem bater não muda nenhum dos dois.',
          '[tecla Enter] nota de edição: capturar um acerto, uma batida válida e uma pedra passando, apontando o placar correspondente',
        ],
        [
          'teste',
          'Confira as duas formas de terminar em partidas diferentes: acabar a vida mostra derrota; chegar a vinte acertos com vida mostra vitória. Depois de cada resultado, use Voltar ao início.',
          'nota de edição: retomar capturas reais dos dois resultados desta aula, sem alterar os blocos nem simular pontuação [clicar "Voltar ao início"]',
        ],
        [
          'teste',
          'Veja o começo voltar: nave no centro, nenhum tiro ou asteroide, três vidas e zero pontos. Pressione Enter e confira se a nova partida funciona como a primeira.',
          '[apontar prévia] [tecla Enter] [tecla Space]',
        ],
        [
          'descoberta',
          'Você levou a ideia da nave para um espaço com profundidade e construiu as regras que fazem a patrulha acontecer. Agora seu jogo está pronto para ser jogado do começo ao fim.',
        ],
      ],
      steps: [
        'Clique em Rodar de novo e confira a abertura: nave no centro, três corações e zero acertos.',
        'Antes de Enter, toque em Espaço: não sai laser.',
        'Depois de Enter, teste um acerto, uma batida e uma pedra que passa sem bater.',
        'Em partidas diferentes, teste a derrota e a vitória. Depois de cada resultado, clique em Voltar ao início.',
      ],
      tests: [
        'Rodar de novo: nave no centro, grupos vazios, pontos zero e três vidas. Espaço antes de Enter não dispara.',
        'Depois de Enter, movimento, disparos e relógio funcionam.',
        'Um acerto soma um ponto; uma batida válida tira uma vida; uma pedra que passa sem bater não altera pontos ou vida.',
        'Em partidas distintas, teste a derrota por vida zero e a vitória por vinte pontos com vida restante.',
        'Depois de cada resultado, Voltar ao início restaura a abertura e o começo completo. Enter permite jogar de novo.',
      ],
      blockLabels: ['Quando apertar a tecla Enter', 'Se a vida de nave ≤ 0, senão', 'Fim de jogo'],
      blockTypes: ['sz_js_if_else', 'sz_g3d_end_game'],
      conferencia:
        'a derrota continua antes da vitória e Voltar ao início prepara uma nova partida com zero pontos e três vidas',
      mostrar:
        'Escrever na tela em cima, no meio", "Quando apertar a tecla Enter", "Se a vida de nave',
      entrega: {
        reconhecimento:
          'Você concluiu a Patrulha Espacial, com acertos, pontos, vidas e duas formas de terminar a partida!',
        depois: 'Quando aparecer Projeto enviado!, clique em Próxima parte.',
        saida: 'Próxima parte',
      },
    }),
    quizPatrulha('conferir-a-patrulha', 'Por que o jogo termina?', [
      {
        id: 'guardas',
        prompt: 'Por que o disparo e o relógio perguntam se estado é igual a jogando?',
        choices: [
          'Para escolher a aparência da nave.',
          'Para agir apenas durante a partida, depois do começo.',
          'Para fazer todo asteroide valer vinte pontos.',
        ],
        correct: 1,
        explanation:
          'A abertura mantém estado como inicio. Enter muda para jogando. Os novos acontecimentos usam essa pergunta para respeitar o momento da partida.',
      },
      {
        id: 'prioridade',
        prompt:
          'No começo de um quadro, pontos está em vinte e a vida está em zero. O que esta patrulha faz?',
        choices: [
          'Mostra vitória e derrota ao mesmo tempo.',
          'Mostra vitória, porque vinte é maior que zero.',
          'Mostra derrota, porque confere vida zero antes da meta.',
        ],
        correct: 2,
        explanation:
          'A pergunta da vida vem primeiro. A meta fica no senão, então só é conferida quando a nave ainda tem vida.',
      },
      {
        id: 'novo-comeco',
        prompt: 'Depois do resultado, você clica em Voltar ao início. O que deve conferir?',
        choices: [
          'Abertura, nave no centro, grupos vazios, zero pontos e três vidas.',
          'Só a mudança do título; os pontos anteriores ficam.',
          'Uma nova pedra já batendo na nave.',
        ],
        correct: 0,
        explanation:
          'O botão nativo prepara o jogo desde o começo. Enter inicia uma nova partida, sem carregar os tiros, as pedras ou a pontuação da anterior.',
      },
    ]),
    {
      key: 'sua-patrulha',
      title: 'Sua patrulha está pronta',
      kind: 'fecho',
      objective: 'Reconhecer a construção concluída e conhecer a publicação opcional no Mural.',
      ponte:
        'Sua Patrulha Espacial está pronta! Se quiser, publique no Mural e copie o link de jogar para mostrar à família. Você também pode clicar em Concluir aula e continuar a jornada sem publicar.',
      text: montarFalaPatrulha([
        [
          'descoberta',
          'Você construiu uma rota em três dimensões. Fez o laser nascer na nave, criou o intervalo dos asteroides, reconheceu os contatos, contou os acertos e cuidou das vidas. Depois, escolheu quando a partida termina.',
        ],
        [
          'conversa',
          'Seu jogo está pronto! Se quiser, você pode publicar a Patrulha no Mural dos Criadores. É o lugar da plataforma onde sua família e seus amigos podem jogar os jogos publicados. Você também pode clicar em Concluir aula e continuar a jornada sem publicar.',
        ],
        [
          'instrucao',
          'Para publicar, clique em Compartilhar, no alto do Estúdio. Ele pode aparecer como uma setinha para cima.',
        ],
        [
          'conversa',
          'Abre uma janela, e o resumo do projeto já vem preenchido. Pode deixar como está.',
        ],
        [
          'instrucao',
          'Clique em Gerar capa e espere a imagem aparecer. Confira a capa do seu jogo. Depois clique em Publicar e espere a publicação terminar.',
        ],
        [
          'descoberta',
          'Quando aparecer Seu jogo está no Mural, sua patrulha já pode ser jogada pelo link.',
        ],
        ['pergunta', 'Como eu mostro minha patrulha para a família?'],
        [
          'conversa',
          'Clique em Copiar link de jogar. Depois envie esse link, com a ajuda de um adulto se precisar. Quem receber pode jogar no computador com o teclado.',
        ],
        ['instrucao', 'Clique em Fechar e, por fim, em Concluir aula.'],
      ]),
      kids: ['Como eu mostro minha patrulha para a família?'],
      screen:
        'A parte usa o projeto completo já enviado, com Estúdio expandido [expandir estúdio]. Durante a retomada, usar capturas reais da Patrulha pronta nota de edição: nave, disparo, acerto, vida e resultados. No "Para publicar, clique em Compartilhar", abrir a janela [compartilhar]. No "o resumo do projeto já vem preenchido", apontar o resumo [apontar "Resumo do projeto"]. No "Clique em Gerar capa", gerar a capa nativa [clicar "Gerar capa"]. No "Depois clique em Publicar", demonstrar a publicação apenas na sessão de gravação autorizada [clicar "Publicar"]. No "Clique em Copiar link de jogar", copiar [clicar "Copiar link de jogar"]. No "Clique em Fechar", fechar [clicar "Fechar"]. No "em Concluir aula", reduzir o Estúdio e concluir [reduzir estúdio] [concluir aula]. A publicação é opcional para o aluno; esta autoria não publica projetos nem envia mensagens.',
      steps: [
        'Você pode concluir a aula sem publicar.',
        'Se quiser publicar: Compartilhar → Gerar capa → conferir a capa → Publicar.',
        'Depois de Seu jogo está no Mural!, use Copiar link de jogar. Feche a janela e clique em Concluir aula.',
      ],
      tests: [],
      blockLabels: [],
      blockTypes: [],
    },
  ],
}
