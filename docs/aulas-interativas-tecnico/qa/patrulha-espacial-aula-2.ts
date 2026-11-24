import type { ConstrutorAula } from './construtor-base-tipos'
import {
  guardaPatrulha,
  montagemPatrulha,
  passosGuardaPatrulha,
  TIPOS_GUARDA,
} from './patrulha-espacial-editorial'

export const patrulhaAula2: ConstrutorAula = {
  slug: 'aula-2',
  title: 'Asteroides na rota',
  entryStage: 'limite-tiro',
  entry:
    'Os lasers nascem no X da nave, viajam com velocidade Z -22 e são retirados depois do limite. O grupo asteroides ainda está vazio.',
  outcome:
    'Asteroides surgem a cada 1,5 segundo dentro da faixa lateral fornecida, aproximam-se pelo Z positivo e saem do grupo depois de passar pela nave.',
  trechos: [
    montagemPatrulha({
      key: 'relogio-dos-asteroides',
      title: 'Um asteroide a cada intervalo',
      etapa: 'relogio',
      objective: 'Usar um intervalo para criar asteroides somente durante a partida.',
      ponte:
        'Monte o relógio dos asteroides. Primeiro a pedra vai nascer parada lá no fundo. Confira que o relógio espera o começo da partida.',
      falas: [
        [
          'conversa',
          'Seu laser já atravessa o espaço. Agora vamos colocar asteroides na rota. Você já usou um intervalo para isso no jogo em duas dimensões. Aqui o relógio também vai criar uma cópia de cada vez.',
        ],
        ['pergunta', 'Se eu colocar a cópia em cada quadro, não aparece mais rápido?'],
        [
          'conversa',
          'Aparece muitas vezes em um segundo, e a rota fica cheia de uma vez. Nosso intervalo deixa um tempo entre uma pedra e outra. Vamos começar com uma pedra parada, para conferir o lugar onde ela nasce.',
        ],
        [
          'instrucao',
          'Encontre a área Enquanto estiver rodando. Deixe à vista um espaço dentro dela, depois de A cada quadro da cena e fora de tudo que está dentro desse bloco.',
          '[arrastar até "Enquanto estiver rodando"] [apontar abaixo de "A cada quadro da cena"]',
        ],
        [
          'instrucao',
          'Abra Jogo 3D, depois Tempo e sorteio e Tempo. Pegue A cada 2 segundos e coloque nesse espaço.',
          '[abrir categoria Jogo 3D > Tempo e sorteio > Tempo] [encaixar "A cada 2 segundos" abaixo de "A cada quadro da cena"]',
        ],
        [
          'instrucao',
          'Troque o tempo de dois por um vírgula cinco. Esse intervalo é um segundo e meio.',
          '[trocar "2" por "1.5" em "A cada 2 segundos"]',
        ],
        ...guardaPatrulha('A cada 1.5 segundos', 'o relógio de um segundo e meio'),
        [
          'instrucao',
          'Deixe o espaço então desse Se à vista.',
          '[apontar encaixe em "Se dentro de A cada 1.5 segundos" no "então"]',
        ],
        [
          'instrucao',
          'Abra Jogo 3D e Grupos. Encaixe Criar uma cópia no então.',
          '[abrir categoria Jogo 3D > Grupos] [encaixar "Criar uma cópia" em "Se dentro de A cada 1.5 segundos" no "então"]',
        ],
        [
          'instrucao',
          'Escolha moldeAsteroide no primeiro campo e asteroides no grupo. Deixe x em zero. Mude y para um e z para menos vinte e oito.',
          '[trocar "molde" por "moldeAsteroide" em "Criar uma cópia dentro de A cada 1.5 segundos"] [trocar "inimigos" por "asteroides" em "Criar uma cópia dentro de A cada 1.5 segundos"] nota de gravação manual: trocar "0" por "1" em "y de Criar uma cópia de moldeAsteroide"; escolher visualmente o campo nomeado, conservando x nota de gravação manual: trocar "0" por "-28" em "z de Criar uma cópia de moldeAsteroide"; escolher visualmente o campo nomeado, conservando x',
        ],
        [
          'descoberta',
          'A pedra nasce bem mais ao fundo que o laser. O y é um nos dois: eles vão passar pela mesma altura. Por enquanto, as cópias ficam paradas no mesmo lugar.',
        ],
        [
          'teste',
          'Clique em Rodar de novo e espere um pouco na abertura. Nenhuma pedra deve aparecer. Pressione Enter e espere dois segundos. Um asteroide aparece no centro, lá no fundo.',
          '[rodar de novo] nota de edição: aguardar dois segundos na abertura [tecla Enter] nota de edição: aguardar dois segundos [apontar prévia]',
        ],
        [
          'conversa',
          'As próximas cópias ficam sobrepostas nesse mesmo lugar. Na próxima parte, você vai espalhar os lugares de entrada para conseguir distinguir as pedras.',
        ],
      ],
      steps: [
        'Em Enquanto estiver rodando, deixe visível o encaixe depois de A cada quadro da cena, fora do fazer desse bloco.',
        'Em Jogo 3D → Tempo e sorteio → Tempo, pegue A cada 2 segundos e encaixe nesse lugar. Troque 2 por 1.5.',
        ...passosGuardaPatrulha('A cada 1.5 segundos'),
        'Deixe o então do Se visível. Em Jogo 3D → Grupos, encaixe Criar uma cópia nesse então.',
        'Escolha moldeAsteroide e grupo asteroides. Use x = 0, y = 1 e z = -28.',
      ],
      tests: [
        'Rodar de novo. Espere dois segundos antes de Enter: não deve surgir asteroide.',
        'Pressione Enter e espere dois segundos. Aparece uma pedra parada no centro do fundo.',
        'As cópias seguintes ainda se sobrepõem; isso é esperado nesta etapa.',
      ],
      blockLabels: [
        'A cada 1.5 segundos',
        'Se estado = jogando',
        'Criar uma cópia de moldeAsteroide no grupo asteroides em x 0 y 1 z -28',
      ],
      blockTypes: ['sz_g3d_every_seconds', ...TIPOS_GUARDA, 'sz_g3d_spawn_copy'],
      conferencia:
        'o relógio está fora de A cada quadro, usa um vírgula cinco segundos, pergunta se está jogando e cria moldeAsteroide no grupo asteroides com x zero, y um e z menos vinte e oito',
      mostrar: 'A cada 1.5 segundos',
    }),
    montagemPatrulha({
      key: 'lugares-de-entrada',
      title: 'Uma faixa para as entradas',
      etapa: 'entrada',
      objective:
        'Montar a expressão fornecida que sorteia o X dentro da faixa lateral da patrulha.',
      ponte:
        'Use a receita de posição: número aleatório × 10.4 − 5.2. Ela escolhe o X das novas pedras dentro da rota. Conserve Y = 1 e Z = -28.',
      falas: [
        [
          'conversa',
          'As pedras estão nascendo todas no centro. Vamos escolher lugares diferentes dentro da faixa que a nave consegue alcançar. Para isso, você vai usar uma receita de posição que já vem definida para esta rota.',
        ],
        [
          'descoberta',
          'A receita pega um número sorteado, multiplica por dez vírgula quatro e tira cinco vírgula dois. Ela entrega um lugar entre a borda esquerda e a borda direita. Você vai montá-la no x da cópia.',
        ],
        [
          'instrucao',
          'No relógio de um segundo e meio, encontre Criar uma cópia de moldeAsteroide. Deixe o zero do x à vista.',
          '[arrastar até "Criar uma cópia de moldeAsteroide"] [apontar bloco "Criar uma cópia de moldeAsteroide"]',
        ],
        [
          'instrucao',
          'Abra Programação e Matemática. Pegue o bloco de conta que aparece com zero mais zero e solte em cima do zero do x.',
          '[abrir categoria Programação > Matemática] [soltar "0 + 0" em cima do "0" em "Criar uma cópia de moldeAsteroide"]',
        ],
        [
          'instrucao',
          'Nesse bloco de conta, mude o sinal de mais para menos. No número da direita, escreva cinco vírgula dois.',
          '[trocar "+" por "−" em "Criar uma cópia de moldeAsteroide"] nota de gravação manual: trocar "0" por "5.2" em "lado direito da conta do x"; seguir o operando indicado na fala e conferir a expressão no desenho do caderno',
        ],
        [
          'instrucao',
          'Deixe visível o zero que ficou à esquerda do sinal de menos. Pegue outro bloco zero mais zero em Matemática e solte em cima desse zero da esquerda.',
          '[apontar bloco "Criar uma cópia de moldeAsteroide"] [abrir categoria Programação > Matemática] nota de gravação manual: soltar "0 + 0" em cima do "0" em "lado esquerdo da conta do x"; seguir o operando indicado na fala e conferir a expressão no desenho do caderno',
        ],
        [
          'instrucao',
          'No bloco que você acabou de colocar, troque o mais pelo sinal de multiplicar. No número à direita desse sinal, escreva dez vírgula quatro.',
          '[trocar "+" por "×" em "Criar uma cópia de moldeAsteroide"] nota de gravação manual: trocar "0" por "10.4" em "lado direito da multiplicação"; seguir o operando indicado na fala e conferir a expressão no desenho do caderno',
        ],
        [
          'instrucao',
          'Deixe visível o zero à esquerda da multiplicação. Abra Programação e Valores. Pegue número aleatório, de zero a um, e solte em cima desse zero.',
          '[apontar bloco "Criar uma cópia de moldeAsteroide"] [abrir categoria Programação > Valores] nota de gravação manual: soltar "número aleatório (0 a 1)" em cima do "0" em "lado esquerdo da multiplicação"; seguir o operando indicado na fala e conferir a expressão no desenho do caderno',
        ],
        [
          'conversa',
          'Leia de dentro para fora: número aleatório vezes dez vírgula quatro, menos cinco vírgula dois. Tudo isso está no x. O y continua um, e o z continua menos vinte e oito.',
        ],
        [
          'teste',
          'Clique em Rodar de novo e pressione Enter. Espere surgirem algumas pedras. Elas continuam paradas lá no fundo, mas agora aparecem em lugares diferentes da faixa.',
          '[rodar de novo] [tecla Enter] nota de edição: aguardar sete segundos [apontar prévia]',
        ],
        [
          'conversa',
          'Sorteios podem dar lugares próximos. Não precisa aparecer uma pedra exatamente em cada borda. Na próxima parte, todas vão começar a se aproximar.',
        ],
      ],
      steps: [
        'No relógio A cada 1.5 segundos, deixe visível o X da cópia de moldeAsteroide.',
        'Em Programação → Matemática, pegue 0 + 0 e solte sobre o 0 do X. Mude + para − e o número direito para 5.2.',
        'Deixe visível o 0 à esquerda da subtração. Pegue outro 0 + 0 e solte sobre esse 0.',
        'No bloco de dentro, mude + para × e o número direito para 10.4.',
        'Deixe visível o 0 à esquerda da multiplicação. Em Programação → Valores, pegue número aleatório (0 a 1) e solte sobre esse 0.',
        'Confira X = (número aleatório × 10.4) − 5.2, Y = 1 e Z = -28.',
      ],
      tests: [
        'Rodar de novo → Enter. Espere sete segundos para observar algumas entradas.',
        'Os asteroides surgem parados em lugares diferentes dentro da faixa lateral. Lugares próximos também são possíveis.',
      ],
      blockLabels: [
        'número aleatório (0 a 1)',
        'número aleatório × 10.4 − 5.2',
        'Criar uma cópia de moldeAsteroide no grupo asteroides',
      ],
      blockTypes: ['sz_math_arithmetic', 'sz_val_random_float'],
      conferencia:
        'o x da cópia tem número aleatório vezes dez vírgula quatro, menos cinco vírgula dois, e os campos y e z continuam um e menos vinte e oito',
      mostrar: 'Criar uma cópia de moldeAsteroide',
    }),
    montagemPatrulha({
      key: 'asteroides-se-aproximam',
      title: 'Os asteroides vêm até a nave',
      etapa: 'trajeto-asteroide',
      objective: 'Definir a velocidade positiva em Z para aproximar os asteroides.',
      ponte:
        'Defina velocidadeAsteroides como 7. Compare o caminho das pedras com o caminho dos lasers e confira o que muda.',
      falas: [
        [
          'conversa',
          'Os asteroides já entram em lugares diferentes, mas continuam parados. O laser vai da nave para o fundo diminuindo z. A pedra vai fazer o caminho contrário, do fundo para perto da nave.',
        ],
        ['pergunta', 'O z da pedra precisa aumentar?'],
        [
          'conversa',
          'Isso! Ela começa em menos vinte e oito e se aproxima de zero, onde está a nave. Vamos escolher uma velocidade positiva para esse caminho.',
        ],
        [
          'instrucao',
          'Encontre Ao iniciar e o bloco Criar variável velocidadeAsteroides com valor zero.',
          '[arrastar até "Ao iniciar"] [apontar bloco "Criar variável velocidadeAsteroides"]',
        ],
        [
          'instrucao',
          'Troque o valor zero por sete. Conserve o nome da variável.',
          '[trocar "0" por "7" em "Criar variável velocidadeAsteroides"]',
        ],
        [
          'descoberta',
          'O percurso preparado aplica essa velocidade a cada asteroide. O sinal positivo faz a pedra seguir em direção à nave.',
        ],
        [
          'teste',
          'Clique em Rodar de novo e pressione Enter. Espere uma pedra aparecer lá no fundo e aperte Espaço uma vez. Agora ela vem para perto, enquanto o laser vai para longe.',
          '[rodar de novo] [tecla Enter] nota de edição: aguardar três segundos [tecla Space] [apontar prévia]',
        ],
        [
          'teste',
          'Mova a nave para um lado e deixe uma pedra passar. Ela continua o caminho depois da nave. Vamos definir o fim desse caminho na próxima parte.',
          '[segurar tecla ArrowRight por 0,6 s] nota de edição: aguardar três segundos [apontar prévia]',
        ],
      ],
      steps: [
        'Em Ao iniciar, encontre Criar variável velocidadeAsteroides com valor 0.',
        'Troque 0 por 7. Não mude velocidadeTiros, que continua -22.',
      ],
      tests: [
        'Rodar de novo → Enter. As pedras aparecem no fundo e se aproximam da nave pelo Z positivo.',
        'Dispare: o laser e o asteroide viajam em direções opostas.',
        'Afaste a nave e deixe uma pedra passar. Nesta etapa, ela ainda continua além da rota.',
      ],
      blockLabels: ['Criar variável velocidadeAsteroides com valor 7'],
      blockTypes: ['sz_js_var_create'],
      conferencia:
        'velocidadeAsteroides começa com sete em Ao iniciar, e velocidadeTiros continua menos vinte e dois',
      mostrar: 'Criar variável velocidadeAsteroides',
    }),
    montagemPatrulha({
      key: 'fim-da-rota',
      title: 'A pedra sai depois de passar',
      etapa: 'limite-asteroide',
      objective:
        'Retirar asteroides que ultrapassam o fim da rota, conservando o intervalo dos tiros.',
      ponte:
        'Defina o limite dos asteroides no eixo Z. Teste as duas direções e envie sua rota com lasers e pedras em movimento.',
      falas: [
        [
          'conversa',
          'Agora a rota tem movimento nos dois sentidos. A pedra que passou pela nave também precisa sair do grupo. Seu limite vai ficar um pouco depois da nave.',
        ],
        [
          'instrucao',
          'Em Enquanto estiver rodando, encontre No grupo tiros, tirar quem saiu. Esse bloco está no final do Se de jogando, dentro de A cada quadro da cena.',
          '[arrastar até "No grupo tiros, tirar quem saiu"]',
        ],
        [
          'instrucao',
          'Deixe visível o encaixe logo abaixo dele, ainda dentro do mesmo então.',
          '[apontar abaixo de "No grupo tiros, tirar quem saiu"]',
        ],
        [
          'instrucao',
          'Abra Jogo 3D e Grupos. Pegue outro No grupo inimigos, tirar quem saiu e encaixe nesse lugar.',
          '[abrir categoria Jogo 3D > Grupos] [encaixar "No grupo inimigos, tirar quem saiu" abaixo de "No grupo tiros, tirar quem saiu"]',
        ],
        [
          'instrucao',
          'No novo bloco, escolha asteroides. Mude o primeiro limite para menos trinta e seis e o segundo para seis. Escolha o eixo Z.',
          '[trocar "inimigos" por "asteroides" em "No grupo inimigos, tirar quem saiu abaixo de No grupo tiros"] [trocar "-20" por "-36" em "No grupo asteroides, tirar quem saiu"] [trocar "20" por "6" em "No grupo asteroides, tirar quem saiu"] [trocar "↔ X" por "↗ Z" em "No grupo asteroides, tirar quem saiu"]',
        ],
        [
          'descoberta',
          'A pedra nasce em z menos vinte e oito, passa perto de zero e sai quando ultrapassa seis. A regra só retira a pedra. Passar pela rota não tira vida.',
        ],
        [
          'teste',
          'Clique em Rodar de novo e pressione Enter. Observe alguns asteroides se aproximarem e deixe um passar, movendo a nave para o lado. Ele termina o caminho depois da nave.',
          '[rodar de novo] [tecla Enter] [segurar tecla ArrowRight por 0,6 s] nota de edição: observar a rota por seis segundos [apontar prévia]',
        ],
        [
          'teste',
          'Dispare também. Os lasers continuam indo para o fundo e terminando o próprio caminho. Ainda falta programar o que acontece quando um laser encosta numa pedra; essa será sua próxima construção.',
          '[tecla Space] [apontar prévia]',
        ],
      ],
      steps: [
        'No final de A cada quadro da cena → Se estado = jogando, encontre o limite do grupo tiros.',
        'Deixe o encaixe abaixo dele visível. Em Jogo 3D → Grupos, encaixe outro No grupo inimigos, tirar quem saiu.',
        'No novo bloco, escolha grupo asteroides, limites -36 e 6 e eixo Z. Conserve o limite dos tiros em -36 a 3.',
      ],
      tests: [
        'Rodar de novo → Enter. As pedras surgem na faixa, aproximam-se e saem depois de passar pela nave.',
        'Dispare; os lasers seguem no sentido contrário e também terminam o caminho.',
        'Um laser ainda pode atravessar a pedra sem removê-la. O contato será construído na aula seguinte.',
      ],
      blockLabels: ['No grupo asteroides, tirar quem saiu de -36 a 6 no eixo Z'],
      blockTypes: ['sz_g3d_prune_area'],
      conferencia:
        'os dois limites ficam dentro do Se de jogando no fim do quadro: tiros de menos trinta e seis a três, asteroides de menos trinta e seis a seis, ambos no eixo Z',
      mostrar: 'No grupo tiros, tirar quem saiu", "No grupo asteroides, tirar quem saiu',
      entrega: {
        reconhecimento:
          'Você construiu a rota: asteroides entram no tempo certo, vêm do fundo e saem depois de passar!',
        depois: 'Quando aparecer Projeto enviado!, clique em Concluir aula.',
        saida: 'Concluir aula',
      },
    }),
  ],
}
