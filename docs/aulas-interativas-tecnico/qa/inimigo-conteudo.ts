/**
 * A fonte editorial do Poder "Inimigo que atira" (Construtor): as falas gravadas, as notas de tela,
 * as falas do Zappy na página e os passos do caderno das duas aulas. O gerador (`gerar-inimigo.ts`)
 * monta manifestos, roteiros e caderno a partir daqui.
 *
 * A Aula 1 (2D) tem abertura, material, experiência (`enemy-fire`), três construções e o envio na
 * quarta; o quiz fecha a aula. A Aula 2 (3D) tem abertura, três construções e o envio na quarta; o
 * quiz fecha a aula. Toda montagem é guiada no vídeo, um gesto por vez (`montagemPoder`).
 */
import type { PoderDimensaoConstrutor } from './construtor-poderes-base'
import {
  encontrar,
  guarda2D,
  montagemPoder,
  RECADO_DO_QUIZ,
  TIPOS_GUARDA_2D,
  telaDaExperienciaDoPoder,
  trechoDoMaterial,
} from './construtor-poderes-conteudo'
import type { InimigoEtapa } from './inimigo-projeto'
import { guardaPatrulha, passosGuardaPatrulha, TIPOS_GUARDA } from './patrulha-espacial-editorial'
import type { PoderAula } from './poder-gerador'

const RELOGIO_2D = 'A cada 1.5 segundos'
const CRIAR_2D = 'No grupo tirosInimigos criar um sprite'
const BATIDA_2D = 'Para cada sprite do grupo asteroides que colidir com o sprite nave'
const ACERTO_2D = 'Para cada sprite do grupo tirosInimigos'
const LIMPEZA_2D = 'Tirar do grupo asteroides quem sair da tela'

const BATIDA_3D = 'Quando nave encostar em algum do grupo asteroides'
const ACERTO_3D = 'Quando nave encostar em algum do grupo tirosInimigos'
const SE_ACERTO_3D = `Se valor da variável estado dentro de ${ACERTO_3D}`
const LIMPEZA_3D = 'No grupo asteroides, tirar quem saiu'

/**
 * Os dois relógios "A cada 1.5 segundos" do jogo (o das pedras, pronto, e o da inimiga) têm o mesmo
 * rótulo: o do tiro inimigo é o SEGUNDO, logo abaixo do primeiro.
 */
const RELOGIO_INIMIGO = `${RELOGIO_2D} abaixo de ${RELOGIO_2D}`

export const inimigoExperiencia = {
  title: 'A experiência: a inimiga que atira',
  idea: 'A inimiga cria um tiro a cada um segundo e meio. O lugar onde o tiro nasce decide de onde ele sai: num lugar fixo, todo tiro sai do mesmo ponto; na posição da inimiga, ele acompanha a inimiga. O tiro que encosta na nave sai e tira uma vida, e uma partida nova começa sem tiros.',
  goals: [
    'Com a origem No meio, avance até a inimiga atirar duas vezes e veja de onde os tiros saem.',
    'Troque a origem para Na inimiga e avance até ela atirar duas vezes.',
    'Deixe um tiro chegar até a nave e olhe as vidas.',
    'Com tiros no ar, clique em Recomeçar a partida e olhe os tiros e as vidas.',
  ],
  observe:
    'Antes e depois de cada teste, observe onde a inimiga está, de onde cada tiro sai, os tiros no ar e as vidas. O Zappy te mostra o que testar, e você pode repetir quantas vezes quiser.',
}

export function inimigoAulas(): PoderAula<InimigoEtapa>[] {
  return [
    {
      slug: 'aula-1',
      title: 'Uma inimiga que atira',
      dimension: '2d',
      trechos: [
        {
          key: 'abertura',
          title: 'Uma nave inimiga',
          kind: 'intro',
          kids: ['Será que dá para desviar dos tiros dela?'],
          screen: `Do "Oi" até o "que atira", a tela mostra o título Inimigo que atira sobre a cena inicial do jogo pronto [na edição: título Inimigo que atira]. No "Clique no jogo e aperte Enter", ampliar o jogo pronto [ampliar jogo], clicar no meio do jogo [tocar jogo] e apertar Enter [tecla Enter]. No "Olha aqui em cima", apontar a inimiga [apontar jogo 400 50]. No "a cada um segundo e meio", esperar um tiro descer [aguardar 2 s] [apontar jogo 400 240]. No "Será que dá para desviar", manter a cena parada. No "Agora é a sua vez", voltar ao tamanho da aula [voltar à aula]. No "Quando terminar, clique em Próxima parte", clicar em **Próxima parte** [próxima parte]. Não jogar a partida: ela é da criança.`,
          ponte:
            'Sua vez! Jogue a versão pronta: desvie dos tiros da nave inimiga e acerte os asteroides. Quando terminar, clique em Próxima parte.',
          text: '[upbeat, welcoming voice] Oi! A sua nave vai ganhar um desafio: uma nave inimiga que atira. [engaging, energetic, conversational voice] O jogo é a Nave Contra Asteroides que você montou: as setas movem a nave, e o Espaço dispara. [engaging, energetic, conversational voice] Clique no jogo e aperte Enter para começar a partida. [interested, animated voice] Olha aqui em cima: a nave inimiga vai de um lado para o outro e, a cada um segundo e meio, atira para baixo. Se o tiro encosta na sua nave, ela perde uma vida. [curious] Será que dá para desviar dos tiros dela? [engaging, energetic, conversational voice] Isso eu deixo para você descobrir. [upbeat, encouraging voice] Agora é a sua vez: desvie dos tiros e acerte os asteroides. Quando terminar, clique em Próxima parte.',
        },
        trechoDoMaterial<InimigoEtapa>(),
        {
          key: 'experiencia',
          title: 'A inimiga que atira',
          kind: 'experience',
          kids: ['E se o tiro nascer sempre no mesmo lugar?'],
          screen: `A experiência aparece no tamanho da aula, com a cena parada. Do "Sabe o carrinho de pipoca" até o "a pipoca sai do carrinho", a tela fica parada, e a edição troca esse trecho por um desenho nosso com o Zappy empurrando um carrinho de pipoca que solta pipocas por onde passa [na edição: o Zappy e o carrinho de pipoca]. No "No seu jogo, a inimiga", a tela volta para a experiência. ${telaDaExperienciaDoPoder('com a inimiga no alto, a nave embaixo e nenhum tiro no ar, sem apontar controles nem testar')} De onde o tiro sai e o que o recomeço faz é a descoberta da criança, e quem acompanha cada teste é o Zappy, dentro da experiência.`,
          ponte:
            'Sua vez! Investigue de onde os tiros saem com cada origem, o que acontece quando um tiro encosta na nave e o que o Recomeçar a partida faz. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.',
          text: '[engaging, energetic, conversational voice] A nave inimiga atira com um relógio: a cada um segundo e meio, nasce um tiro. [confident, clear, unhurried voice] Mas onde o tiro nasce? Isso o jogo precisa saber. [engaging, energetic, conversational voice] Sabe o carrinho de pipoca andando pela praça? Por onde ele passa, a pipoca sai do carrinho, e não de um lugar fixo. [engaging, energetic, conversational voice] No seu jogo, a inimiga é o carrinho. O tiro pode nascer num lugar fixo ou onde a inimiga está. [curious] E se o tiro nascer sempre no mesmo lugar? [engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência. [upbeat, encouraging voice] Agora você vai investigar de onde os tiros saem, o que acontece quando um encosta na nave e o que o recomeço faz. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.',
        },
        montagemPoder<InimigoEtapa>({
          key: 'tiro',
          title: 'O relógio dos tiros',
          etapa: 'tiro',
          objective: 'Criar o relógio que cria um tiro inimigo a cada 1,5 s, só na partida.',
          ponte:
            'Crie o relógio da inimiga: a cada 1,5 segundo, só na partida, um tiro nasce no grupo tirosInimigos, no meio do alto da tela.',
          falas: [
            [
              'conversa',
              'A inimiga já patrulha o alto da tela, e o grupo tirosInimigos já anda para baixo e aparece na tela. Falta o relógio que cria os tiros.',
              '[apontar prévia]',
            ],
            encontrar('Enquanto estiver rodando'),
            [
              'instrucao',
              'Logo abaixo do relógio A cada 1.5 segundos, o dos asteroides, encaixe outro A cada segundos, de Jogo 2D, Tempo e Quadros e intervalos. Troque o 2 por 1.5, com ponto.',
              `[arrastar até "${RELOGIO_2D}"] [abrir categoria Jogo 2D > Tempo > Quadros e intervalos] [encaixar "A cada 2 segundos" abaixo de "${RELOGIO_2D}"] [trocar "2" por "1.5" em "A cada 2 segundos"]`,
            ],
            ...guarda2D(RELOGIO_INIMIGO),
            [
              'instrucao',
              'No então, encaixe No grupo criar um sprite com imagem, de Jogo 2D, Grupos e Criar e percorrer. Troque o grupo inimigos por tirosInimigos.',
              `[abrir categoria Jogo 2D > Grupos > Criar e percorrer] [encaixar "No grupo inimigos criar um sprite" em "Se o estado do jogo é jogando dentro de ${RELOGIO_INIMIGO}" no "então"] [trocar "inimigos" por "tirosInimigos" em "No grupo inimigos criar um sprite"]`,
            ],
            [
              'instrucao',
              'Coloque 395 no x e 76 no y. Na largura, 10, e na altura, 26. Escolha a imagem laser-inimigo-vermelho e, logo depois de vy, coloque 5.',
              `[trocar "100" por "395" em "${CRIAR_2D}"] [trocar "100" por "76" em "${CRIAR_2D}"] [trocar "32" por "10" em "${CRIAR_2D}"] [trocar "32" por "26" em "${CRIAR_2D}"] [trocar "inimigo" por "laser-inimigo-vermelho" em "${CRIAR_2D}"] aproximar o fim do bloco; editar somente o zero depois do rótulo vy para 5 e confirmar, em captura manual deste campo [apontar bloco "${CRIAR_2D}"]`,
            ],
            [
              'teste',
              'Clique no jogo e aperte Enter. A cada um segundo e meio, um tiro desce, sempre pelo meio, mesmo quando a inimiga está longe.',
              '[tocar prévia 400 300] [tecla Enter] [aguardar 4 s] [apontar prévia 400 240]',
            ],
            ['pergunta', 'Mas o tiro não devia sair da inimiga?'],
            [
              'conversa',
              'Devia. Como na experiência, com a origem no meio. A origem é a próxima parte.',
            ],
          ],
          steps: [
            'Em Enquanto estiver rodando, logo abaixo de A cada 1.5 segundos (o das pedras): outro A cada segundos, com 1.5.',
            'No fazer, um Se com o estado do jogo é jogando.',
            'No então: No grupo tirosInimigos criar um sprite com imagem laser-inimigo-vermelho, x 395, y 76, largura 10, altura 26, vx 0 e vy 5.',
          ],
          tests: [
            'Antes do Enter, a inimiga não atira; na partida, um tiro desce a cada 1,5 segundo.',
            'Por enquanto, os tiros saem sempre do meio.',
          ],
          blockLabels: [
            'A cada 1.5 segundos',
            'Se o estado do jogo é jogando',
            'No grupo tirosInimigos criar um sprite',
          ],
          blockTypes: ['sz_g2d_every_seconds', ...TIPOS_GUARDA_2D, 'sz_g2d_spawn_image_in_group'],
          conferencia:
            'o segundo relógio A cada 1.5 segundos cria o tiro no grupo tirosInimigos só na partida, em x 395 e y 76, com vy 5',
          mostrar: RELOGIO_INIMIGO,
        }),
        montagemPoder<InimigoEtapa>({
          key: 'origem',
          title: 'O tiro sai da inimiga',
          etapa: 'origem',
          objective:
            'Fazer o tiro nascer embaixo da inimiga: o x lê o centro x dela e o y lê a posição y dela.',
          ponte:
            'Faça o tiro sair da inimiga: no x, o centro x do sprite inimiga menos 5; no y, a posição y da inimiga mais 52.',
          falas: [
            [
              'conversa',
              'Para o tiro acompanhar a inimiga, a posição dele precisa ler onde ela está agora. Você já fez isso com o laser da sua nave, lembra? O x do laser lia o centro x da nave.',
            ],
            [
              'instrucao',
              'No tiro da inimiga, solte uma conta de menos, de Programação e Matemática, em cima do 395.',
              `[arrastar até "${CRIAR_2D}"] [abrir categoria Programação > Matemática] [soltar "0 + 0" em cima do "395" em "${CRIAR_2D}"] [trocar "+" por "−" em "${CRIAR_2D}"]`,
            ],
            [
              'instrucao',
              'Na primeira parte da conta, solte o centro x do sprite, de Jogo 2D, Movimento e Posição e tamanho, e escolha inimiga. Na segunda, escreva 5.',
              `[abrir categoria Jogo 2D > Movimento > Posição e tamanho] [soltar "o centro x do sprite" em cima do "0" em "${CRIAR_2D}"] [apontar bloco "${CRIAR_2D}"]`,
            ],
            [
              'instrucao',
              'No y, faça o mesmo com uma conta de mais: a posição y do sprite inimiga mais 52, a altura da inimiga.',
              `[abrir categoria Programação > Matemática] [soltar "0 + 0" em cima do "76" em "${CRIAR_2D}"] [abrir categoria Jogo 2D > Movimento > Posição e tamanho] [apontar bloco "${CRIAR_2D}"]`,
            ],
            [
              'teste',
              'Clique no jogo e aperte Enter. Agora cada tiro sai de baixo da inimiga, onde ela estiver.',
              '[tocar prévia 400 300] [tecla Enter] [aguardar 4 s] [apontar prévia 400 50]',
            ],
            ['pergunta', 'E quando um tiro encosta na nave, o que acontece?'],
            ['conversa', 'Por enquanto, nada: o tiro atravessa. O dano é a próxima parte.'],
          ],
          steps: [
            'No x do tiro da inimiga: o centro x do sprite inimiga − 5 (Programação → Matemática e Jogo 2D → Movimento → Posição e tamanho).',
            'No y: a posição y do sprite inimiga + 52.',
          ],
          tests: ['Na partida, cada tiro sai de baixo da inimiga, onde ela estiver.'],
          blockLabels: ['o centro x do sprite inimiga − 5', 'a posição y do sprite inimiga + 52'],
          blockTypes: ['sz_math_arithmetic', 'sz_g2d_center_x', 'sz_g2d_sprite_y'],
          conferencia:
            'no tiro da inimiga, o x é o centro x da inimiga menos 5 e o y é a posição y da inimiga mais 52',
          mostrar: RELOGIO_INIMIGO,
        }),
        montagemPoder<InimigoEtapa>({
          key: 'dano',
          title: 'O tiro machuca a nave',
          etapa: 'dano',
          objective:
            'Usar o encontro da nave com o grupo tirosInimigos: o tiro sai e a nave perde uma vida.',
          ponte:
            'Programe o dano: quando um tiro inimigo encosta na nave, o tiro sai do grupo e a nave perde uma vida.',
          falas: [
            [
              'conversa',
              'O tiro inimigo é como uma pedra: quando encosta na nave, ela perde uma vida. Você já montou esse encontro para as pedras.',
            ],
            encontrar('Enquanto estiver rodando'),
            [
              'instrucao',
              'Dentro de A cada quadro do jogo, logo abaixo do encontro das pedras com a nave, encaixe Para cada sprite do grupo que colidir com o sprite, de Jogo 2D, Colisões e Encostar e bloquear.',
              `[arrastar até "${BATIDA_2D}"] [abrir categoria Jogo 2D > Colisões > Encostar e bloquear] [encaixar "Para cada sprite do grupo" abaixo de "${BATIDA_2D}"]`,
            ],
            [
              'instrucao',
              'Escolha o grupo tirosInimigos e chame o sprite de tiroQueAcertou.',
              '[trocar "asteroides" por "tirosInimigos" em "Para cada sprite do grupo"] [trocar "inimigo" por "tiroQueAcertou" em "Para cada sprite do grupo tirosInimigos"]',
            ],
            [
              'instrucao',
              'No fazer: Tirar o sprite do grupo, com tiroQueAcertou e tirosInimigos. Logo abaixo, Machucar o sprite nave, e um Tocar efeito batida.',
              `[abrir categoria Jogo 2D > Grupos > Participação e limpeza] [encaixar "Tirar o sprite" em "${ACERTO_2D}"] [abrir categoria Jogo 2D > Vida e placar > Vida] [encaixar "Machucar o sprite" abaixo de "Tirar o sprite tiroQueAcertou"] [abrir categoria Jogo 2D > Som > Efeitos prontos] [apontar bloco "${ACERTO_2D}"]`,
            ],
            [
              'teste',
              'Clique no jogo, aperte Enter e deixe um tiro encostar na nave: ele some, e a nave perde uma vida.',
              '[tocar prévia 400 300] [tecla Enter] [aguardar 5 s] [apontar prévia 60 52]',
            ],
          ],
          steps: [
            'No quadro do jogo, logo abaixo do encontro das pedras com a nave: Para cada sprite do grupo tirosInimigos que colidir com o sprite nave, chamando de tiroQueAcertou.',
            'Dentro: Tirar o sprite tiroQueAcertou do grupo tirosInimigos, Machucar o sprite nave tirando 1 e Tocar efeito batida.',
          ],
          tests: ['O tiro inimigo que encosta na nave some, e a nave perde uma vida.'],
          blockLabels: [
            'Para cada sprite do grupo tirosInimigos que colidir com o sprite nave',
            'Tirar o sprite tiroQueAcertou do grupo tirosInimigos',
            'Machucar o sprite nave',
          ],
          blockTypes: [
            'sz_g2d_on_sprite_group_overlap',
            'sz_g2d_remove_from_group',
            'sz_g2d_damage_sprite',
          ],
          conferencia:
            'o encontro de tirosInimigos com a nave tira o tiro do grupo e machuca a nave',
          mostrar: ACERTO_2D,
        }),
        montagemPoder<InimigoEtapa>({
          key: 'limpeza',
          title: 'Os tiros saem da tela',
          etapa: 'limpeza',
          objective: 'Tirar do grupo tirosInimigos os tiros que saem da tela.',
          ponte:
            'Limpe os tiros: no quadro do jogo, tire do grupo tirosInimigos quem sair da tela.',
          falas: [
            [
              'conversa',
              'Os tiros que passam pela nave continuam no grupo, lá embaixo, fora da tela, para sempre. Como os lasers e as pedras, eles precisam sair do grupo.',
            ],
            [
              'instrucao',
              'No quadro do jogo, logo abaixo da limpeza das pedras, encaixe Tirar do grupo quem sair da tela, de Jogo 2D, Grupos e Participação e limpeza, e escolha tirosInimigos.',
              `[arrastar até "${LIMPEZA_2D}"] [abrir categoria Jogo 2D > Grupos > Participação e limpeza] [encaixar "Tirar do grupo asteroides quem sair da tela" abaixo de "${LIMPEZA_2D}"] [apontar bloco "${LIMPEZA_2D}"]`,
            ],
            [
              'descoberta',
              'E quando a partida recomeça, os tiros somem todos: o reinício cria o jogo de novo, com o grupo vazio.',
            ],
            [
              'teste',
              'Clique no jogo e aperte Enter. Os tiros descem e saem: o grupo não fica cheio de tiros perdidos.',
              '[tocar prévia 400 300] [tecla Enter] [aguardar 5 s]',
            ],
          ],
          steps: [
            'No quadro do jogo, logo abaixo de Tirar do grupo asteroides quem sair da tela: Tirar do grupo tirosInimigos quem sair da tela.',
          ],
          tests: [
            'Os tiros que passam pela nave saem do grupo.',
            'Uma partida nova começa sem tiros.',
          ],
          blockLabels: ['Tirar do grupo tirosInimigos quem sair da tela'],
          blockTypes: ['sz_g2d_prune_offscreen'],
          conferencia: 'no quadro do jogo, o grupo tirosInimigos tira quem sai da tela',
          mostrar: LIMPEZA_2D,
          entrega: {
            reconhecimento:
              'Pronto, a sua nave ganhou uma inimiga de verdade: ela atira de onde está, os tiros machucam e saem da tela!',
            depois:
              'Depois do envio, ainda tem algumas perguntas para você pensar na inimiga. Quando aparecer Projeto enviado!, clique em Próxima parte.',
            saida: 'Próxima parte',
          },
        }),
        {
          key: 'revisao',
          title: 'Pense na inimiga',
          kind: 'quiz',
          screen: 'Quiz com quatro perguntas: três previsões com cena e uma escolha de teste.',
          ponte: RECADO_DO_QUIZ,
          text: '',
        },
      ],
    },
    {
      slug: 'aula-2',
      title: 'A inimiga na patrulha',
      dimension: '3d',
      trechos: [
        {
          key: 'abertura',
          title: 'A inimiga chegou à patrulha',
          kind: 'intro',
          kids: ['No espaço em três dimensões, de onde vêm os tiros?'],
          screen: `Do "Oi" até o "em três dimensões", a tela mostra o título A inimiga na patrulha sobre a cena inicial do jogo pronto [na edição: título A inimiga na patrulha]. No "Clique no jogo e aperte Enter", ampliar o jogo pronto [ampliar jogo], clicar no meio do jogo [tocar jogo] e apertar Enter [tecla Enter]. No "Olha lá na frente", apontar a inimiga [apontar jogo 480 240]. No "No espaço em três dimensões", manter a cena parada. No "Agora é a sua vez", voltar ao tamanho da aula [voltar à aula]. No "Quando terminar, clique em Próxima parte", clicar em **Próxima parte** [próxima parte]. Não jogar a partida: ela é da criança.`,
          ponte:
            'Sua vez! Jogue a versão pronta: desvie dos tiros da inimiga na patrulha. Quando terminar, clique em Próxima parte.',
          text: '[upbeat, welcoming voice] Oi! Na Aula 1, você programou a inimiga que atira no jogo 2D. Agora ela chegou à Patrulha Espacial, em três dimensões! [engaging, energetic, conversational voice] Clique no jogo e aperte Enter para começar a patrulha. [interested, animated voice] Olha lá na frente: a inimiga vai de um lado para o outro e atira na direção da nave. [curious] No espaço em três dimensões, de onde vêm os tiros? [engaging, energetic, conversational voice] Isso eu deixo para você descobrir. [upbeat, encouraging voice] Agora é a sua vez: desvie dos tiros. Quando terminar, clique em Próxima parte.',
        },
        montagemPoder<InimigoEtapa>({
          key: 'tiro',
          title: 'O relógio dos tiros',
          etapa: 'tiro',
          objective:
            'Criar o relógio que cria uma cópia do tiro inimigo a cada 1,5 s, só na partida.',
          ponte:
            'Crie o relógio da inimiga: a cada 1,5 segundo, só na partida, uma cópia de moldeTiroInimigo no grupo tirosInimigos, em x 0, y 1 e z menos 22.',
          falas: [
            [
              'conversa',
              'Na patrulha, a inimiga já anda de um lado para o outro, e os tiros do grupo tirosInimigos já vêm na direção da nave. Falta o relógio.',
              '[apontar prévia]',
            ],
            encontrar('Enquanto estiver rodando'),
            [
              'instrucao',
              'Logo abaixo do relógio A cada 1.5 segundos, o dos asteroides, encaixe outro A cada segundos, de Jogo 3D, Tempo e sorteio e Tempo, e troque o 2 por 1.5.',
              '[arrastar até "A cada 1.5 segundos"] [abrir categoria Jogo 3D > Tempo e sorteio > Tempo] [encaixar "A cada 2 segundos" abaixo de "A cada 1.5 segundos"] [trocar "2" por "1.5" em "A cada 2 segundos"]',
            ],
            ...guardaPatrulha(RELOGIO_INIMIGO, 'o relógio da inimiga'),
            [
              'instrucao',
              'No então, encaixe Criar uma cópia, de Jogo 3D e Grupos. Escolha moldeTiroInimigo e o grupo tirosInimigos. Na posição: x 0, y 1 e z menos 22.',
              `[abrir categoria Jogo 3D > Grupos] [encaixar "Criar uma cópia" em "Se valor da variável estado dentro de ${RELOGIO_INIMIGO}" no "então"] [trocar "molde" por "moldeTiroInimigo" em "Criar uma cópia dentro de ${RELOGIO_INIMIGO}"] [trocar "inimigos" por "tirosInimigos" em "Criar uma cópia dentro de ${RELOGIO_INIMIGO}"] [trocar "0" por "1" em "Criar uma cópia de moldeTiroInimigo"] [trocar "0" por "-22" em "Criar uma cópia de moldeTiroInimigo"]`,
            ],
            [
              'teste',
              'Clique em Rodar de novo e aperte Enter. A cada um segundo e meio, um tiro vem pelo meio, mesmo com a inimiga longe.',
              '[rodar de novo] [tecla Enter] [aguardar 4 s]',
            ],
          ],
          steps: [
            'Em Enquanto estiver rodando, logo abaixo de A cada 1.5 segundos (o das pedras): outro A cada segundos, com 1.5.',
            ...passosGuardaPatrulha('o relógio da inimiga'),
            'No então: Criar uma cópia de moldeTiroInimigo no grupo tirosInimigos, em x 0, y 1, z −22.',
          ],
          tests: [
            'Antes do Enter, a inimiga não atira; na partida, um tiro vem a cada 1,5 segundo.',
          ],
          blockLabels: [
            'A cada 1.5 segundos',
            'Se estado = jogando',
            'Criar uma cópia de moldeTiroInimigo',
          ],
          blockTypes: ['sz_g3d_every_seconds', ...TIPOS_GUARDA, 'sz_g3d_spawn_copy'],
          conferencia:
            'o relógio da inimiga cria a cópia de moldeTiroInimigo no grupo tirosInimigos só na partida, em z menos 22',
          mostrar: RELOGIO_INIMIGO,
        }),
        montagemPoder<InimigoEtapa>({
          key: 'origem',
          title: 'O tiro sai da inimiga',
          etapa: 'origem',
          objective: 'Fazer o tiro nascer na frente da inimiga: o x da cópia lê a posição x dela.',
          ponte: 'Faça o tiro sair da inimiga: no x da cópia, a posição x do objeto inimiga.',
          falas: [
            [
              'conversa',
              'Como no jogo 2D, o tiro precisa nascer onde a inimiga está. No 3D, basta o x: o y e o z já ficam na frente dela.',
            ],
            [
              'instrucao',
              'No x da cópia do tiro, solte posição x do objeto, de Jogo 3D, Objetos e Posição, giro e tamanho, e escolha inimiga.',
              `[arrastar até "Criar uma cópia de moldeTiroInimigo"] [abrir categoria Jogo 3D > Objetos > Posição, giro e tamanho] [soltar "posição x do objeto" em cima do "0" em "Criar uma cópia de moldeTiroInimigo"] [trocar "jogador" por "inimiga" em "posição x do objeto dentro de Criar uma cópia de moldeTiroInimigo"]`,
            ],
            [
              'teste',
              'Clique em Rodar de novo e aperte Enter. Agora os tiros saem da frente da inimiga, onde ela estiver.',
              '[rodar de novo] [tecla Enter] [aguardar 4 s]',
            ],
          ],
          steps: [
            'No x da cópia do tiro: posição x do objeto inimiga (Jogo 3D → Objetos → Posição, giro e tamanho).',
          ],
          tests: ['Na partida, cada tiro sai da frente da inimiga, onde ela estiver.'],
          blockLabels: ['posição x do objeto inimiga'],
          blockTypes: ['sz_g3d_get_pos'],
          conferencia: 'o x da cópia do tiro é a posição x do objeto inimiga',
          mostrar: 'Criar uma cópia de moldeTiroInimigo',
        }),
        montagemPoder<InimigoEtapa>({
          key: 'dano',
          title: 'O tiro machuca a nave',
          etapa: 'dano',
          objective:
            'Usar o encontro da nave com o grupo tirosInimigos: o tiro sai e a nave perde uma vida.',
          ponte:
            'Programe o dano: quando a nave encosta num tiro inimigo durante a partida, o tiro sai do grupo e a nave perde uma vida.',
          falas: [
            [
              'conversa',
              'Agora o encontro, como o das pedras: o tiro que encosta na nave sai e tira uma vida.',
            ],
            encontrar('Quando acontecer'),
            [
              'instrucao',
              `Logo abaixo do encontro ${BATIDA_3D}, encaixe Quando heroi encostar em algum do grupo. Escolha nave, tirosInimigos e chame o tiro de tiroQueAcertou.`,
              `[arrastar até "${BATIDA_3D}"] [abrir categoria Jogo 3D > Encostar > Encostar] [encaixar "Quando heroi encostar em algum do grupo" abaixo de "${BATIDA_3D}"] [trocar "heroi" por "nave" em "Quando heroi encostar em algum do grupo"] [trocar "estrelas" por "tirosInimigos" em "Quando nave encostar em algum do grupo"] [trocar "item" por "tiroQueAcertou" em "${ACERTO_3D}"]`,
            ],
            ...guardaPatrulha(ACERTO_3D, 'o encontro da nave com os tiros inimigos'),
            [
              'instrucao',
              'No então: Tirar o objeto do grupo, com tiroQueAcertou e tirosInimigos, e Machucar nave tirando 1 de vida.',
              `[abrir categoria Jogo 3D > Grupos] [encaixar "Tirar o objeto inimigo do grupo" em "${SE_ACERTO_3D}" no "então"] [trocar "inimigo" por "tiroQueAcertou" em "Tirar o objeto inimigo do grupo"] [trocar "asteroides" por "tirosInimigos" em "Tirar o objeto tiroQueAcertou do grupo"] [abrir categoria Jogo 3D > Placar, vida e telas > Vida] [encaixar "Machucar heroi tirando 1 de vida" abaixo de "Tirar o objeto tiroQueAcertou do grupo tirosInimigos"] [trocar "heroi" por "nave" em "Machucar heroi tirando 1 de vida"]`,
            ],
            [
              'teste',
              'Clique em Rodar de novo, aperte Enter e deixe um tiro encostar na nave: ele some, e a nave perde uma vida.',
              '[rodar de novo] [tecla Enter] [aguardar 5 s]',
            ],
          ],
          steps: [
            'Em Quando acontecer, logo abaixo do encontro com os asteroides: Quando nave encostar em algum do grupo tirosInimigos, chamando de tiroQueAcertou.',
            ...passosGuardaPatrulha('o encontro da nave com os tiros inimigos'),
            'No então: Tirar o objeto tiroQueAcertou do grupo tirosInimigos e Machucar nave tirando 1 de vida.',
          ],
          tests: ['O tiro inimigo que encosta na nave some, e a nave perde uma vida.'],
          blockLabels: [
            'Quando nave encostar em algum do grupo tirosInimigos',
            'Tirar o objeto tiroQueAcertou do grupo tirosInimigos',
            'Machucar nave tirando 1 de vida',
          ],
          blockTypes: [
            'sz_g3d_on_touch_group',
            ...TIPOS_GUARDA,
            'sz_g3d_remove_from_group',
            'sz_g3d_hurt',
          ],
          conferencia:
            'o encontro da nave com tirosInimigos, com a guarda da partida, tira o tiro do grupo e machuca a nave',
          mostrar: ACERTO_3D,
        }),
        montagemPoder<InimigoEtapa>({
          key: 'limpeza',
          title: 'Os tiros saem da tela',
          etapa: 'limpeza',
          objective: 'Tirar do grupo tirosInimigos os tiros que passam da nave.',
          ponte:
            'Limpe os tiros: no quadro, No grupo tirosInimigos, tirar quem saiu, no z, de menos 36 até 6.',
          falas: [
            [
              'conversa',
              'Os tiros que passam pela nave continuam no grupo, atrás da câmera. Eles precisam sair, como as pedras.',
            ],
            [
              'instrucao',
              'Logo abaixo de No grupo asteroides, tirar quem saiu, encaixe outro, de Jogo 3D e Grupos. Escolha tirosInimigos, conserve o z e use menos 36 e 6.',
              `[arrastar até "${LIMPEZA_3D}"] [abrir categoria Jogo 3D > Grupos] [encaixar "No grupo inimigos, tirar quem saiu" abaixo de "${LIMPEZA_3D}"] [trocar "-20" por "-36" em "No grupo inimigos, tirar quem saiu"] [trocar "20" por "6" em "No grupo inimigos, tirar quem saiu"]`,
            ],
            [
              'teste',
              'Clique em Rodar de novo e aperte Enter. Os tiros passam e saem do grupo.',
              '[rodar de novo] [tecla Enter] [aguardar 5 s]',
            ],
          ],
          steps: [
            'No quadro, logo abaixo de No grupo asteroides, tirar quem saiu: No grupo tirosInimigos, tirar quem saiu, no z, de −36 até 6.',
          ],
          tests: [
            'Os tiros que passam pela nave saem do grupo.',
            'Voltar ao início começa uma partida sem tiros.',
          ],
          blockLabels: ['No grupo tirosInimigos, tirar quem saiu'],
          blockTypes: ['sz_g3d_prune_area'],
          conferencia: 'no quadro, o grupo tirosInimigos tira quem sai, no z, de menos 36 até 6',
          mostrar: LIMPEZA_3D,
          entrega: {
            reconhecimento:
              'Pronto, a patrulha também tem inimiga: ela atira de onde está, os tiros machucam e saem!',
            depois:
              'Depois do envio, ainda tem duas perguntas para você pensar na inimiga. Quando aparecer Projeto enviado!, clique em Próxima parte.',
            saida: 'Próxima parte',
          },
        }),
        {
          key: 'revisao',
          title: 'Pense na inimiga da patrulha',
          kind: 'quiz',
          screen: 'Quiz com duas perguntas: uma previsão com cena e um diagnóstico.',
          ponte: RECADO_DO_QUIZ,
          text: '',
        },
      ],
    },
  ]
}

export function inimigoAjuda(d: PoderDimensaoConstrutor) {
  const aula = inimigoAulas().find((a) => a.dimension === d)!
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
