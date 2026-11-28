/**
 * A fonte editorial do Poder "Chefão com resistência" (Construtor): as falas gravadas, as notas de
 * tela, as falas do Zappy na página e os passos do caderno das duas aulas. O gerador
 * (`gerar-chefao.ts`) monta manifestos, roteiros e caderno a partir daqui.
 *
 * A Aula 1 (2D) tem abertura, material, experiência (`boss-health`), três construções e o envio na
 * quarta; o quiz fecha a aula. A Aula 2 (3D) tem abertura, três construções e o envio na quarta; o
 * quiz fecha a aula. A etapa `fim` mostra de propósito o placar disparando (o prêmio sem guarda),
 * que a etapa `uma-vez` conserta.
 */
import type { ChefaoEtapa } from './chefao-projeto'
import type { PoderDimensaoConstrutor } from './construtor-poderes-base'
import {
  encontrar,
  montagemPoder,
  RECADO_DO_QUIZ,
  telaDaExperienciaDoPoder,
  trechoDoMaterial,
} from './construtor-poderes-conteudo'
import type { PoderAula } from './poder-gerador'

const ACERTO_2D = 'Para cada sprite do grupo tiros que colidir com o sprite chefao'
const BATIDA_2D = 'Para cada sprite do grupo asteroides que colidir com o sprite nave'
const SE_ZERO_2D = `Se valor da variável vidaDoChefao abaixo de ${ACERTO_2D}`
const SE_GUARDA_2D = `Se valor da variável chefaoDerrotado dentro de ${SE_ZERO_2D}`
const SE_ZERO_3D = 'Se valor da variável vidaDoChefao'
const SE_GUARDA_3D = `Se valor da variável chefaoDerrotado dentro de ${SE_ZERO_3D}`
const BATIDA_3D = 'Quando nave encostar em algum do grupo asteroides'
const ACERTO_3D = 'Quando chefao encostar em algum do grupo tiros'

export const chefaoExperiencia = {
  title: 'A experiência: a resistência do chefão',
  idea: 'O chefão tem uma vida própria, guardada numa variável. Cada laser que acerta tira 1. Um laser só não derrota; quando a vida chega a zero, o chefão cai, e o prêmio precisa valer uma vez só.',
  goals: [
    'Acerte o chefão uma vez e olhe a vida dele.',
    'Continue acertando e veja a vida descer.',
    'Acerte até a vida chegar a 0.',
    'Com o chefão derrotado, compare o prêmio com a guarda ligada e desligada.',
  ],
  observe:
    'Antes e depois de cada laser, observe a vida do chefão, a barra e o placar. O Zappy te mostra o que testar, e você pode repetir quantas vezes quiser.',
}

export function chefaoAulas(): PoderAula<ChefaoEtapa>[] {
  return [
    {
      slug: 'aula-1',
      title: 'Um chefão que aguenta',
      dimension: '2d',
      trechos: [
        {
          key: 'abertura',
          title: 'Um chefão no céu',
          kind: 'intro',
          kids: ['Quantos lasers será que ele aguenta?'],
          screen: `Do "Oi" até o "um chefão", a tela mostra o título Chefão com resistência sobre a cena inicial do jogo pronto [na edição: título Chefão com resistência]. No "Clique no jogo e aperte Enter", ampliar o jogo pronto [ampliar jogo], clicar no meio do jogo [tocar jogo] e apertar Enter [tecla Enter]. No "Olha aqui em cima", apontar o chefão [apontar jogo 400 80]. No "Cada laser que acerta", apertar Espaço uma vez [tecla Space] e apontar a barra [apontar jogo 400 163]. No "Quantos lasers será", manter a cena parada. No "Agora é a sua vez", voltar ao tamanho da aula [voltar à aula]. No "Quando terminar, clique em Próxima parte", clicar em **Próxima parte** [próxima parte]. Não derrotar o chefão: a partida é da criança.`,
          ponte:
            'Sua vez! Jogue a versão pronta: acerte o chefão até ele cair e veja o prêmio no placar. Quando terminar, clique em Próxima parte.',
          text: '[upbeat, welcoming voice] Oi! A sua nave vai enfrentar um chefão. [engaging, energetic, conversational voice] O jogo é a Nave Contra Asteroides que você montou: as setas movem a nave, e o Espaço dispara. [engaging, energetic, conversational voice] Clique no jogo e aperte Enter para começar a partida. [interested, animated voice] Olha aqui em cima: o chefão fica no meio do céu, com uma barra de vida embaixo dele. Cada laser que acerta faz a barra diminuir um pouco. [curious] Quantos lasers será que ele aguenta? [engaging, energetic, conversational voice] Isso eu deixo para você descobrir. [upbeat, encouraging voice] Agora é a sua vez: derrote o chefão e veja o prêmio no placar. Quando terminar, clique em Próxima parte.',
        },
        trechoDoMaterial<ChefaoEtapa>(),
        {
          key: 'experiencia',
          title: 'A resistência do chefão',
          kind: 'experience',
          kids: ['E se o prêmio somar a cada quadro?'],
          screen: `A experiência aparece no tamanho da aula, com a cena parada. Do "Sabe o castelo de areia" até o "ele desmorona", a tela fica parada, e a edição troca esse trecho por um desenho nosso com o Zappy jogando baldes de água num castelo de areia, que perde um pedaço a cada balde até cair [na edição: o Zappy e o castelo de areia]. No "No seu jogo, o chefão", a tela volta para a experiência. ${telaDaExperienciaDoPoder('com o chefão no alto, a barra cheia e o placar em zero, sem apontar controles nem testar')} Quantos lasers derrotam o chefão e o que a guarda faz com o prêmio é a descoberta da criança, e quem acompanha cada teste é o Zappy, dentro da experiência.`,
          ponte:
            'Sua vez! Investigue quantos lasers o chefão aguenta, quando ele cai e o que acontece com o prêmio com a guarda ligada e desligada. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.',
          text: '[engaging, energetic, conversational voice] Um asteroide cai com um laser só. Um chefão, não: ele tem resistência. [confident, clear, unhurried voice] O jogo guarda a vida do chefão numa variável, e cada acerto tira um dela. [engaging, energetic, conversational voice] Sabe o castelo de areia? Cada balde de água leva um pedaço e, quando não sobra mais nada, ele desmorona. [engaging, energetic, conversational voice] No seu jogo, o chefão é o castelo, e cada laser é um balde. Quando a vida chega a zero, ele cai e dá um prêmio no placar. [curious] E se o prêmio somar a cada quadro? [engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência. [upbeat, encouraging voice] Agora você vai investigar quantos lasers o chefão aguenta e o que acontece com o prêmio. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.',
        },
        montagemPoder<ChefaoEtapa>({
          key: 'vida',
          title: 'A vida do chefão',
          etapa: 'vida',
          objective:
            'Criar a variável vidaDoChefao com 5 e a barra que mostra a vida embaixo do chefão.',
          ponte:
            'Dê vida ao chefão: em Ao iniciar, a variável vidaDoChefao com 5; no fim do quadro, a Barra com vidaDoChefao e máximo 5, embaixo dele.',
          falas: [
            [
              'conversa',
              'O chefão já está lá em cima, mas ainda não tem vida. Primeiro, o jogo precisa guardar quantos acertos ele aguenta.',
              '[apontar prévia 400 80]',
            ],
            encontrar('Ao iniciar'),
            [
              'instrucao',
              'Logo abaixo de Criar sprite chefao, encaixe Criar variável com valor, de Programação e Variáveis. Troque contador por vidaDoChefao e o 0 por 5.',
              '[arrastar até "Criar sprite chefao"] [abrir categoria Programação > Variáveis] [encaixar "Criar variável contador com valor" abaixo de "Criar sprite chefao"] [trocar "contador" por "vidaDoChefao" em "Criar variável contador"] [trocar "0" por "5" em "Criar variável vidaDoChefao"]',
            ],
            encontrar('Enquanto estiver rodando'),
            [
              'instrucao',
              'No fim de A cada quadro do jogo, logo abaixo da Barra dos acertos, encaixe outra Barra de, de Jogo 2D, Vida e placar e Indicadores e texto na tela.',
              '[arrastar até "Barra de"] [abrir categoria Jogo 2D > Vida e placar > Indicadores e texto na tela] [encaixar "Barra de" abaixo de "Barra de"]',
            ],
            [
              'instrucao',
              'No valor, solte valor da variável vidaDoChefao. No máximo, 5. Na posição, x 300 e y 158; na largura, 200; na altura, 10. Escolha uma cor vermelha.',
              '[abrir categoria Programação > Valores] [apontar bloco "Barra de"]',
            ],
            [
              'teste',
              'Clique no jogo e aperte Enter. A barra aparece cheia, embaixo do chefão. Os lasers ainda passam por ele.',
              '[tocar prévia 400 300] [tecla Enter] [tecla Space] [apontar prévia 400 163]',
            ],
          ],
          steps: [
            'Em Ao iniciar, logo abaixo de Criar sprite chefao: Criar variável vidaDoChefao com valor 5 (Programação → Variáveis).',
            'No fim de A cada quadro do jogo: Barra de valor da variável vidaDoChefao, máximo 5, x 300, y 158, largura 200, altura 10, vermelha (Jogo 2D → Vida e placar → Indicadores e texto na tela).',
          ],
          tests: ['A barra aparece cheia embaixo do chefão.'],
          blockLabels: ['Criar variável vidaDoChefao com valor 5', 'Barra de vidaDoChefao'],
          blockTypes: ['sz_js_var_create', 'sz_g2d_draw_bar'],
          conferencia:
            'em Ao iniciar está Criar variável vidaDoChefao com 5, e no fim do quadro a Barra com vidaDoChefao e máximo 5',
          mostrar: 'Criar variável vidaDoChefao',
        }),
        montagemPoder<ChefaoEtapa>({
          key: 'acerto',
          title: 'Cada laser tira 1',
          etapa: 'acerto',
          objective: 'Usar o encontro do chefão com o grupo tiros: o laser sai e a vida perde 1.',
          ponte:
            'Programe o acerto: quando um laser encosta no chefão, o laser sai do grupo e vidaDoChefao perde 1.',
          falas: [
            [
              'conversa',
              'Agora o acerto. Um laser encostando no chefão é um encontro, como o laser numa pedra.',
            ],
            encontrar('Enquanto estiver rodando'),
            [
              'instrucao',
              'Logo abaixo do encontro das pedras com a nave, encaixe Para cada sprite do grupo que colidir com o sprite, de Jogo 2D, Colisões e Encostar e bloquear. Escolha o grupo tiros, o sprite chefao e chame o laser de tiroNoChefao.',
              `[arrastar até "${BATIDA_2D}"] [abrir categoria Jogo 2D > Colisões > Encostar e bloquear] [encaixar "Para cada sprite do grupo" abaixo de "${BATIDA_2D}"] [trocar "asteroides" por "tiros" em "Para cada sprite do grupo"] [trocar "nave" por "chefao" em "Para cada sprite do grupo tiros"] [trocar "inimigo" por "tiroNoChefao" em "${ACERTO_2D}"]`,
            ],
            [
              'instrucao',
              'No fazer: Tirar o sprite tiroNoChefao do grupo tiros e, logo abaixo, Somar 1 em variável, com menos 1 e vidaDoChefao.',
              `[abrir categoria Jogo 2D > Grupos > Participação e limpeza] [encaixar "Tirar o sprite" em "${ACERTO_2D}"] [abrir categoria Programação > Variáveis] [encaixar "Somar 1 em variável" abaixo de "Tirar o sprite tiroNoChefao"] [trocar "1" por "-1" em "Somar 1 em variável"] [trocar "contador" por "vidaDoChefao" em "Somar -1 em variável"]`,
            ],
            [
              'descoberta',
              'Sem tirar o laser do grupo, ele continuaria encostando a cada quadro, e um laser só tiraria toda a vida.',
            ],
            [
              'teste',
              'Clique no jogo, aperte Enter e dispare uma vez: a barra perde um pedaço. Dispare mais: ela continua descendo.',
              '[tocar prévia 400 300] [tecla Enter] [tecla Space] [apontar prévia 400 163]',
            ],
            ['pergunta', 'E quando a barra acabar, o chefão some?'],
            [
              'conversa',
              'Ainda não: a vida pode até ficar negativa. O que acontece no zero é a próxima parte.',
            ],
          ],
          steps: [
            'No quadro do jogo, logo abaixo do encontro das pedras com a nave: Para cada sprite do grupo tiros que colidir com o sprite chefao, chamando de tiroNoChefao.',
            'Dentro: Tirar o sprite tiroNoChefao do grupo tiros e Somar −1 em variável vidaDoChefao.',
          ],
          tests: ['Cada laser que acerta tira um pedaço da barra; um laser só não acaba com ela.'],
          blockLabels: [
            'Para cada sprite do grupo tiros que colidir com o sprite chefao',
            'Somar -1 em variável vidaDoChefao',
          ],
          blockTypes: [
            'sz_g2d_on_sprite_group_overlap',
            'sz_g2d_remove_from_group',
            'sz_js_var_increment',
          ],
          conferencia:
            'o encontro dos tiros com o chefão tira o laser do grupo e soma menos 1 em vidaDoChefao',
          mostrar: ACERTO_2D,
        }),
        montagemPoder<ChefaoEtapa>({
          key: 'fim',
          title: 'No zero, o chefão cai',
          etapa: 'fim',
          objective:
            'Quando a vida chega a 0, levar o chefão para longe e somar 10 pontos de prêmio.',
          ponte:
            'Programe o fim: no quadro, Se vidaDoChefao for menor ou igual a 0, o chefão explode, vai para longe e o placar ganha 10.',
          falas: [
            [
              'conversa',
              'Quando a vida chega a zero, o chefão cai: explode, sai da tela e dá dez pontos de prêmio.',
            ],
            encontrar('Enquanto estiver rodando'),
            [
              'instrucao',
              'Logo abaixo do encontro dos tiros com o chefão, encaixe um Se, de Programação e Lógica e Se. Escolha vidaDoChefao no x e o sinal de menor ou igual. Conserve o zero.',
              `[arrastar até "${ACERTO_2D}"] [abrir categoria Programação > Lógica & Se] [encaixar "Se" abaixo de "${ACERTO_2D}"] [trocar "x" por "vidaDoChefao" em "Se abaixo de ${ACERTO_2D}"] [trocar ">" por "≤" em "${SE_ZERO_2D}"]`,
            ],
            [
              'instrucao',
              'No então: Soltar explosão no sprite chefao, Levar o sprite chefao para x 300 e y menos 400, e Somar 10 em pontos.',
              `[abrir categoria Jogo 2D > Desenho e efeitos > Partículas] [encaixar "Soltar explosão no sprite" em "${SE_ZERO_2D}" no "então"] [abrir categoria Jogo 2D > Movimento > Posição e tamanho] [apontar bloco "${SE_ZERO_2D}"]`,
            ],
            [
              'teste',
              'Clique no jogo, aperte Enter e acerte o chefão cinco vezes. Ele explode e some... e o placar dispara!',
              '[tocar prévia 400 300] [tecla Enter] [tecla Space] [tecla Space] [tecla Space] [tecla Space] [tecla Space] [apontar prévia 80 32]',
            ],
            ['pergunta', 'Por que o placar disparou?'],
            [
              'conversa',
              'Porque o quadro do jogo roda sessenta vezes por segundo, e a vida continua em zero: o prêmio soma de novo a cada quadro. Na próxima parte, ele vai valer uma vez só.',
            ],
          ],
          steps: [
            'No quadro do jogo, logo abaixo do encontro dos tiros com o chefão: Se vidaDoChefao ≤ 0.',
            'No então: Soltar explosão no sprite chefao, Levar o sprite chefao para x 300 e y −400 (Jogo 2D → Movimento → Posição e tamanho) e Somar 10 em variável pontos.',
          ],
          tests: [
            'Com cinco acertos, o chefão explode e sai da tela.',
            'O placar dispara: o prêmio ainda soma a cada quadro.',
          ],
          blockLabels: [
            'Se vidaDoChefao ≤ 0',
            'Levar o sprite chefao para x 300 y -400',
            'Somar 10 em variável pontos',
          ],
          blockTypes: [
            'sz_js_if_else',
            'sz_g2d_explode',
            'sz_g2d_set_position',
            'sz_js_var_increment',
          ],
          conferencia:
            'no quadro, o Se vidaDoChefao menor ou igual a 0 explode o chefão, leva o chefão para longe e soma 10 em pontos',
          mostrar: SE_ZERO_2D,
        }),
        montagemPoder<ChefaoEtapa>({
          key: 'uma-vez',
          title: 'O prêmio vale uma vez',
          etapa: 'uma-vez',
          objective:
            'Guardar o prêmio com chefaoDerrotado: na primeira vez ele vira verdadeiro, e o prêmio não soma de novo.',
          ponte:
            'Conserte o prêmio: crie chefaoDerrotado com falso e, dentro do Se do zero, Se chefaoDerrotado = falso, então ele vira verdadeiro e o resto acontece.',
          falas: [
            [
              'conversa',
              'Para o prêmio valer uma vez só, o jogo precisa lembrar se o chefão já foi derrotado. Isso é uma variável de sim ou não.',
            ],
            [
              'instrucao',
              'Em Ao iniciar, logo abaixo de Criar variável vidaDoChefao, crie a variável chefaoDerrotado com o valor falso, de Programação e Valores.',
              '[arrastar até "Criar variável vidaDoChefao"] [abrir categoria Programação > Variáveis] [encaixar "Criar variável contador com valor" abaixo de "Criar variável vidaDoChefao"] [trocar "contador" por "chefaoDerrotado" em "Criar variável contador"] [abrir categoria Programação > Valores] [apontar bloco "Criar variável chefaoDerrotado"]',
            ],
            [
              'instrucao',
              'Dentro do Se vidaDoChefao ≤ 0, encaixe outro Se no começo do então. Os blocos do prêmio descem para baixo dele; leve os quatro para dentro do Se novo.',
              `[arrastar até "${SE_ZERO_2D}"] [abrir categoria Programação > Lógica & Se] [encaixar "Se" em "${SE_ZERO_2D}" no "então"] [apontar bloco "${SE_ZERO_2D}"]`,
            ],
            [
              'instrucao',
              'No Se novo, escolha chefaoDerrotado no x, o sinal de igual e, no lugar do zero, o valor falso. Logo no começo do então, encaixe Alterar variável chefaoDerrotado para verdadeiro.',
              `[apontar bloco "${SE_GUARDA_2D}"]`,
            ],
            [
              'teste',
              'Clique no jogo, aperte Enter e derrote o chefão. Agora o placar ganha dez e para.',
              '[tocar prévia 400 300] [tecla Enter] [tecla Space] [tecla Space] [tecla Space] [tecla Space] [tecla Space] [apontar prévia 80 32]',
            ],
          ],
          steps: [
            'Em Ao iniciar, logo abaixo de vidaDoChefao: Criar variável chefaoDerrotado com valor falso.',
            'Dentro do Se vidaDoChefao ≤ 0: Se chefaoDerrotado = falso, com os blocos do prêmio dentro.',
            'No começo desse então: Alterar variável chefaoDerrotado para verdadeiro.',
          ],
          tests: ['Ao derrotar o chefão, o placar ganha 10 uma vez e para.'],
          blockLabels: [
            'Criar variável chefaoDerrotado com valor falso',
            'Se chefaoDerrotado = falso',
            'Alterar variável chefaoDerrotado para verdadeiro',
          ],
          blockTypes: ['sz_js_var_create', 'sz_js_if_else', 'sz_js_var_assign', 'sz_val_boolean'],
          conferencia:
            'em Ao iniciar está chefaoDerrotado com falso, e dentro do Se do zero o prêmio fica no Se chefaoDerrotado igual a falso, que começa mudando chefaoDerrotado para verdadeiro',
          mostrar: SE_ZERO_2D,
          entrega: {
            reconhecimento:
              'Pronto, a sua nave enfrentou um chefão de verdade: ele aguenta cinco lasers e o prêmio vale uma vez só!',
            depois:
              'Depois do envio, ainda tem algumas perguntas para você pensar no chefão. Quando aparecer Projeto enviado!, clique em Próxima parte.',
            saida: 'Próxima parte',
          },
        }),
        {
          key: 'revisao',
          title: 'Pense no chefão',
          kind: 'quiz',
          screen: 'Quiz com quatro perguntas: três previsões com cena e uma escolha de teste.',
          ponte: RECADO_DO_QUIZ,
          text: '',
        },
      ],
    },
    {
      slug: 'aula-2',
      title: 'O chefão na patrulha',
      dimension: '3d',
      trechos: [
        {
          key: 'abertura',
          title: 'O chefão chegou à patrulha',
          kind: 'intro',
          kids: ['No espaço em três dimensões, ele aguenta os mesmos lasers?'],
          screen: `Do "Oi" até o "em três dimensões", a tela mostra o título O chefão na patrulha sobre a cena inicial do jogo pronto [na edição: título O chefão na patrulha]. No "Clique no jogo e aperte Enter", ampliar o jogo pronto [ampliar jogo], clicar no meio do jogo [tocar jogo] e apertar Enter [tecla Enter]. No "Olha lá na frente", apontar o chefão [apontar jogo 480 240]. No "No espaço em três dimensões", manter a cena parada. No "Agora é a sua vez", voltar ao tamanho da aula [voltar à aula]. No "Quando terminar, clique em Próxima parte", clicar em **Próxima parte** [próxima parte]. Não derrotar o chefão: a partida é da criança.`,
          ponte:
            'Sua vez! Jogue a versão pronta: derrote o chefão da patrulha e veja o prêmio. Quando terminar, clique em Próxima parte.',
          text: '[upbeat, welcoming voice] Oi! Na Aula 1, você programou o chefão no jogo 2D. Agora ele chegou à Patrulha Espacial, em três dimensões! [engaging, energetic, conversational voice] Clique no jogo e aperte Enter para começar a patrulha. [interested, animated voice] Olha lá na frente: o chefão espera no meio, e o texto Chefão, no alto à esquerda, mostra a vida dele. [curious] No espaço em três dimensões, ele aguenta os mesmos lasers? [engaging, energetic, conversational voice] Isso eu deixo para você descobrir. [upbeat, encouraging voice] Agora é a sua vez: derrote o chefão. Quando terminar, clique em Próxima parte.',
        },
        montagemPoder<ChefaoEtapa>({
          key: 'vida',
          title: 'A vida do chefão',
          etapa: 'vida',
          objective: 'Criar a variável vidaDoChefao com 5 e o texto que mostra a vida.',
          ponte:
            'Dê vida ao chefão: em Ao iniciar, vidaDoChefao com 5 e Escrever na tela, em cima, à esquerda, Chefão: mais a vida.',
          falas: [
            [
              'conversa',
              'Na patrulha, a vida do chefão também é uma variável, e não a vida do motor: a vida do motor é da nave.',
            ],
            encontrar('Ao iniciar'),
            [
              'instrucao',
              'Logo abaixo de Dar 3 de vida a nave, crie a variável vidaDoChefao com 5.',
              '[arrastar até "Dar 3 de vida a nave"] [abrir categoria Programação > Variáveis] [encaixar "Criar variável contador com valor" abaixo de "Dar 3 de vida a nave"] [trocar "contador" por "vidaDoChefao" em "Criar variável contador"] [trocar "0" por "5" em "Criar variável vidaDoChefao"]',
            ],
            [
              'instrucao',
              'Logo abaixo do placar dos acertos, Escrever na tela, em cima, à esquerda, com Chefão, dois-pontos e um espaço, mais o valor de vidaDoChefao.',
              '[abrir categoria Jogo 3D > Placar, vida e telas > Na tela] [encaixar "Escrever na tela" abaixo de "Escrever na tela em cima, à direita"] [apontar bloco "Escrever na tela abaixo de Escrever na tela em cima, à direita"]',
            ],
            [
              'teste',
              'Clique em Rodar de novo. O texto Chefão 5 aparece no alto à esquerda.',
              '[rodar de novo] [apontar prévia 70 24]',
            ],
          ],
          steps: [
            'Em Ao iniciar, logo abaixo de Dar 3 de vida a nave: Criar variável vidaDoChefao com valor 5.',
            'Logo abaixo do placar dos acertos: Escrever na tela, em cima, à esquerda, "Chefão: " + vidaDoChefao.',
          ],
          tests: ['O texto Chefão: 5 aparece no alto à esquerda.'],
          blockLabels: [
            'Criar variável vidaDoChefao com valor 5',
            'Escrever na tela em cima, à esquerda',
          ],
          blockTypes: ['sz_js_var_create', 'sz_g3d_hud_text'],
          conferencia:
            'em Ao iniciar estão vidaDoChefao com 5 e o texto Chefão em cima, à esquerda',
          mostrar: 'Criar variável vidaDoChefao',
        }),
        montagemPoder<ChefaoEtapa>({
          key: 'acerto',
          title: 'Cada laser tira 1',
          etapa: 'acerto',
          objective:
            'Usar o encontro do chefão com o grupo tiros: o laser sai, a vida perde 1 e o texto é escrito de novo.',
          ponte:
            'Programe o acerto: quando o chefão encosta num laser do grupo tiros, o laser sai, vidaDoChefao perde 1 e o texto Chefão é escrito de novo.',
          falas: [
            [
              'conversa',
              'O laser encostando no chefão é um encontro, como a pedra batendo na nave. Só que agora quem encosta é o chefão.',
            ],
            encontrar('Ao iniciar'),
            [
              'instrucao',
              'Abra Jogo 3D, Encostar e Encostar. Pegue Quando heroi encostar em algum do grupo e encaixe logo abaixo do encontro da nave com os asteroides.',
              `[abrir categoria Jogo 3D > Encostar > Encostar] [encaixar "Quando heroi encostar em algum do grupo" abaixo de "${BATIDA_3D}"]`,
            ],
            [
              'instrucao',
              'Troque heroi por chefao, o grupo por tiros e chame o laser de tiroNoChefao.',
              '[trocar "heroi" por "chefao" em "Quando heroi encostar em algum do grupo"] [trocar "estrelas" por "tiros" em "Quando chefao encostar em algum do grupo"] [trocar "item" por "tiroNoChefao" em "Quando chefao encostar em algum do grupo tiros"]',
            ],
            [
              'instrucao',
              'Dentro: Tirar o objeto tiroNoChefao do grupo tiros, Somar menos 1 em vidaDoChefao e escrever o texto Chefão de novo.',
              `[abrir categoria Jogo 3D > Grupos] [apontar bloco "${ACERTO_3D}"]`,
            ],
            [
              'descoberta',
              'O texto da tela só muda quando é escrito de novo. Sem ele, a vida desce, mas o texto continua mostrando 5.',
            ],
            [
              'teste',
              'Clique em Rodar de novo, aperte Enter e dispare: o texto Chefão desce de um em um.',
              '[rodar de novo] [tecla Enter] [tecla Space] [apontar prévia 70 24]',
            ],
          ],
          steps: [
            'Logo abaixo do encontro da nave com os asteroides: Quando chefao encostar em algum do grupo tiros, chamando o laser de tiroNoChefao (Jogo 3D → Encostar → Encostar).',
            'Dentro: Tirar o objeto tiroNoChefao do grupo tiros e Somar −1 em variável vidaDoChefao.',
            'Logo abaixo: Escrever na tela, em cima, à esquerda, "Chefão: " + vidaDoChefao.',
          ],
          tests: ['Cada laser que acerta tira 1 do texto Chefão.'],
          blockLabels: [
            'Quando chefao encostar em algum do grupo tiros',
            'Somar -1 em variável vidaDoChefao',
          ],
          blockTypes: ['sz_g3d_on_touch_group', 'sz_g3d_remove_from_group', 'sz_js_var_increment'],
          conferencia:
            'o encontro do chefão com os tiros tira o laser do grupo e soma menos 1 em vidaDoChefao',
          mostrar: ACERTO_3D,
        }),
        montagemPoder<ChefaoEtapa>({
          key: 'fim',
          title: 'No zero, o chefão cai',
          etapa: 'fim',
          objective: 'Quando a vida chega a 0, levar o chefão para longe e somar 10 pontos.',
          ponte:
            'Programe o fim: no quadro, Se vidaDoChefao for menor ou igual a 0, o chefão vai para longe e o placar ganha 10.',
          falas: [
            ['conversa', 'No zero, como no jogo 2D: o chefão sai e dá dez pontos.'],
            [
              'instrucao',
              'No quadro, logo abaixo de Mover os objetos do grupo asteroides, um Se com vidaDoChefao menor ou igual a 0.',
              '[arrastar até "Enquanto estiver rodando"] [abrir categoria Programação > Lógica & Se] [apontar prévia]',
            ],
            [
              'instrucao',
              'No então: Colocar o objeto chefao em x 0, y 1 e z menos 200, Somar 10 em pontos e escrever o placar dos acertos de novo.',
              `[abrir categoria Jogo 3D > Objetos > Posição, giro e tamanho] [apontar bloco "${SE_ZERO_3D}"]`,
            ],
            [
              'teste',
              'Clique em Rodar de novo, aperte Enter e acerte o chefão cinco vezes. Ele some... e o placar dispara!',
              '[rodar de novo] [tecla Enter] [tecla Space] [tecla Space] [tecla Space] [tecla Space] [tecla Space]',
            ],
            ['pergunta', 'É o mesmo problema do jogo 2D?'],
            [
              'conversa',
              'É, sim: o quadro roda sem parar e a vida continua em zero. A guarda é a próxima parte.',
            ],
          ],
          steps: [
            'No quadro, logo abaixo do movimento dos asteroides: Se vidaDoChefao ≤ 0.',
            'No então: Colocar o objeto chefao em x 0, y 1, z −200, Somar 10 em pontos e escrever o placar dos acertos.',
          ],
          tests: [
            'Com cinco acertos, o chefão sai.',
            'O placar dispara: o prêmio ainda soma a cada quadro.',
          ],
          blockLabels: [
            'Se vidaDoChefao ≤ 0',
            'Colocar o objeto chefao em x 0 y 1 z -200',
            'Somar 10 em variável pontos',
          ],
          blockTypes: ['sz_js_if_else', 'sz_g3d_set_position', 'sz_js_var_increment'],
          conferencia:
            'no quadro, o Se vidaDoChefao menor ou igual a 0 leva o chefão para longe e soma 10 em pontos',
          mostrar: SE_ZERO_3D,
        }),
        montagemPoder<ChefaoEtapa>({
          key: 'uma-vez',
          title: 'O prêmio vale uma vez',
          etapa: 'uma-vez',
          objective: 'Guardar o prêmio com chefaoDerrotado, como no jogo 2D.',
          ponte:
            'Conserte o prêmio: chefaoDerrotado com falso em Ao iniciar e, dentro do Se do zero, Se chefaoDerrotado = falso, então ele vira verdadeiro e o resto acontece.',
          falas: [
            ['conversa', 'A mesma guarda do jogo 2D: o jogo lembra se o chefão já foi derrotado.'],
            [
              'instrucao',
              'Em Ao iniciar, logo abaixo de vidaDoChefao, crie chefaoDerrotado com o valor falso.',
              '[arrastar até "Criar variável vidaDoChefao"] [abrir categoria Programação > Variáveis] [encaixar "Criar variável contador com valor" abaixo de "Criar variável vidaDoChefao"] [trocar "contador" por "chefaoDerrotado" em "Criar variável contador"]',
            ],
            [
              'instrucao',
              'Dentro do Se do zero, um Se chefaoDerrotado igual a falso com os blocos do prêmio dentro, e no começo dele Alterar chefaoDerrotado para verdadeiro.',
              `[abrir categoria Programação > Lógica & Se] [apontar bloco "${SE_GUARDA_3D}"]`,
            ],
            [
              'teste',
              'Clique em Rodar de novo, aperte Enter e derrote o chefão. O placar ganha dez e para.',
              '[rodar de novo] [tecla Enter] [tecla Space] [tecla Space] [tecla Space] [tecla Space] [tecla Space]',
            ],
          ],
          steps: [
            'Em Ao iniciar: Criar variável chefaoDerrotado com valor falso.',
            'Dentro do Se vidaDoChefao ≤ 0: Se chefaoDerrotado = falso, com o prêmio dentro, começando com Alterar variável chefaoDerrotado para verdadeiro.',
          ],
          tests: ['Ao derrotar o chefão, o placar ganha 10 uma vez e para.'],
          blockLabels: [
            'Criar variável chefaoDerrotado com valor falso',
            'Se chefaoDerrotado = falso',
            'Alterar variável chefaoDerrotado para verdadeiro',
          ],
          blockTypes: ['sz_js_var_create', 'sz_js_if_else', 'sz_js_var_assign', 'sz_val_boolean'],
          conferencia:
            'o prêmio fica no Se chefaoDerrotado igual a falso, que começa mudando chefaoDerrotado para verdadeiro',
          mostrar: SE_ZERO_3D,
          entrega: {
            reconhecimento:
              'Pronto, a patrulha também tem chefão: ele aguenta cinco lasers e o prêmio vale uma vez só!',
            depois:
              'Depois do envio, ainda tem duas perguntas para você pensar no chefão. Quando aparecer Projeto enviado!, clique em Próxima parte.',
            saida: 'Próxima parte',
          },
        }),
        {
          key: 'revisao',
          title: 'Pense no chefão da patrulha',
          kind: 'quiz',
          screen: 'Quiz com duas perguntas: uma previsão com cena e um diagnóstico.',
          ponte: RECADO_DO_QUIZ,
          text: '',
        },
      ],
    },
  ]
}

export function chefaoAjuda(d: PoderDimensaoConstrutor) {
  const aula = chefaoAulas().find((a) => a.dimension === d)!
  return aula.trechos.flatMap((t) =>
    'steps' in t
      ? [
          {
            title: t.title,
            idea: (t as { objective: string }).objective,
            steps: (t as { steps: string[] }).steps,
            tests: (t as { tests: string[] }).tests,
          },
        ]
      : [],
  )
}
