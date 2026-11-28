/**
 * A fonte editorial do Poder "Tiro triplo" (Construtor): as falas gravadas, as notas de tela, as
 * falas do Zappy na página e os passos do caderno das duas aulas. O gerador (`gerar-triplo.ts`)
 * monta manifestos, roteiros e caderno a partir daqui.
 *
 * A Aula 1 (2D, sobre a Nave Contra Asteroides) tem abertura, material, experiência (`spread-shot`),
 * três construções e o envio na quarta; o quiz fecha a aula. A Aula 2 (3D, sobre a Patrulha
 * Espacial) tem abertura, três construções e o envio na quarta; o quiz fecha a aula. Toda montagem
 * é guiada no vídeo, um gesto por vez (`montagemPoder`).
 *
 * ⚠️ Duplicar um bloco (botão direito → Duplicar) não tem marca do robô de gravação: esses gestos
 * vão em captura manual, como a edição do vy dos cursos da trilha.
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
import { guardaPatrulha, passosGuardaPatrulha, TIPOS_GUARDA } from './patrulha-espacial-editorial'
import type { PoderAula, PoderTrecho } from './poder-gerador'
import type { TriploEtapa } from './triplo-projeto'

export type TriploTrecho = PoderTrecho<TriploEtapa>

const ESPERA =
  'Os tempos de espera são estimativas (o item nasce a cada 4 s desde que o jogo abre): acertar no Verificar plano.'
const DUPLICAR =
  'Duplicar (botão direito no bloco → Duplicar) e levar a cópia ao lugar, em captura manual: o robô não tem marca para esse gesto.'

const RELOGIO_2D = 'A cada 4 segundos'
const SE_RELOGIO_2D = `Se o estado do jogo é jogando dentro de ${RELOGIO_2D}`
const CRIAR_ITEM_2D = 'No grupo itensTriplo criar um sprite'
const BATIDA_2D = 'Para cada sprite do grupo asteroides que colidir com o sprite nave'
const PEGAR_2D = 'Para cada sprite do grupo itensTriplo'
const ESPACO_2D = 'Quando apertar a tecla barra de espaço'
const SE_ESPACO_2D = `Se o estado do jogo é jogando dentro de ${ESPACO_2D}`
const SE_TRIPLO_2D = `Se valor da variável tempoTriplo dentro de ${ESPACO_2D}`
const CONTAGEM_2D = 'A cada 1 segundos'
const SE_TEMPO_2D = `Se valor da variável tempoTriplo dentro de ${CONTAGEM_2D}`

const RELOGIO_3D = 'A cada 4 segundos'
const SE_JOGANDO_RELOGIO_3D = `Se valor da variável estado dentro de ${RELOGIO_3D}`
const BATIDA_3D = 'Quando nave encostar em algum do grupo asteroides'
const PEGAR_3D = 'Quando nave encostar em algum do grupo itensTriplo'
const SE_PEGAR_3D = `Se valor da variável estado dentro de ${PEGAR_3D}`
const ESPACO_3D = 'Quando apertar a tecla espaço'
const SE_ESPACO_3D = `Se valor da variável estado dentro de ${ESPACO_3D}`
const SE_TRIPLO_3D = `Se valor da variável tempoTriplo dentro de ${ESPACO_3D}`
const CONTAGEM_3D = 'A cada 1 segundos'
const SE_TEMPO_3D = `Se valor da variável tempoTriplo dentro de ${CONTAGEM_3D}`

export const triploExperiencia = {
  title: 'A experiência: o leque de tiros',
  idea: 'Cada laser tem uma velocidade para cima e outra para o lado. Com o tiro triplo, um aperto cria três lasers. Se os três têm a mesma velocidade para o lado, eles seguem juntos e parecem um só; com desvios diferentes, cada um segue o seu caminho.',
  goals: [
    'Com o tiro triplo desligado, dispare e veja quantos lasers saem.',
    'Ligue o tiro triplo com desvio 0 e dispare.',
    'Com o tiro triplo e desvio 2, dispare e veja onde cada laser chega.',
    'Troque o desvio para 1 e dispare de novo: os lasers dos lados chegam às pedras?',
  ],
  observe:
    'Antes e depois de cada disparo, observe quantos lasers estão no ar, por onde cada um passa e quantas pedras ele acerta. O Zappy te mostra o que testar, e você pode repetir quantas vezes quiser.',
}

/** A conta da criação de um laser (o que vem pronto no Espaço da trilha). */
const LASER_2D = 'No grupo tiros criar um sprite'

export function triploAulas(): PoderAula<TriploEtapa>[] {
  return [
    {
      slug: 'aula-1',
      title: 'Três lasers de uma vez',
      dimension: '2d',
      trechos: [
        {
          key: 'abertura',
          title: 'Um leque de lasers',
          kind: 'intro',
          kids: ['Por que os três lasers não vão para o mesmo lugar?'],
          screen: `Do "Oi" até o "três lasers de uma vez", a tela mostra o título Tiro triplo sobre a cena inicial do jogo pronto [na edição: título Tiro triplo]. No "Clique no jogo e aperte Enter", ampliar o jogo pronto [ampliar jogo], clicar no meio do jogo [tocar jogo] e apertar Enter [tecla Enter]. No "Olha aqui no meio da tela", esperar o item cair pelo meio, sem mexer na nave, até ela pegar o item [aguardar 8 s] [apontar jogo 400 300]. No "o número do Triplo, aqui no canto, vira 5", apontar o número [apontar jogo 700 55]. No "Agora, cada aperto de Espaço", apertar Espaço uma vez [tecla Space]. No "Por que os três lasers", manter a cena parada. No "Agora é a sua vez", voltar ao tamanho da aula [voltar à aula]. No "Quando terminar, clique em Próxima parte", clicar em **Próxima parte** [próxima parte]. Não jogar a partida: ela é da criança. ${ESPERA}`,
          ponte:
            'Sua vez! Jogue a versão pronta: pegue o item que cai pelo meio, dispare com o tiro triplo e veja o que acontece quando o Triplo chega a zero. Quando terminar, clique em Próxima parte.',
          text: '[upbeat, welcoming voice] Oi! A sua nave vai ganhar um Poder: o tiro triplo, três lasers de uma vez. [engaging, energetic, conversational voice] O jogo é a Nave Contra Asteroides que você montou: as setas movem a nave, o Espaço dispara, e você precisa acertar vinte asteroides. [engaging, energetic, conversational voice] Clique no jogo e aperte Enter para começar a partida. [interested, animated voice] Olha aqui no meio da tela: de tempos em tempos cai um item amarelo. Quando a nave pega o item, o número do Triplo, aqui no canto, vira 5. [interested, animated voice] Agora, cada aperto de Espaço cria três lasers, um para cada lado. [curious] Por que os três lasers não vão para o mesmo lugar? [engaging, energetic, conversational voice] Isso eu deixo para você descobrir. [upbeat, encouraging voice] Agora é a sua vez: pegue o item, dispare e repare no número do Triplo. Quando terminar, clique em Próxima parte.',
        },
        trechoDoMaterial<TriploEtapa>(),
        {
          key: 'experiencia',
          title: 'O leque de tiros',
          kind: 'experience',
          kids: ['E se os três lasers saírem com o mesmo desvio?'],
          screen: `A experiência aparece no tamanho da aula, com a cena parada. Do "Sabe a mangueira" até o "o jato vai para o lado", a tela fica parada, e a edição troca esse trecho por um desenho nosso com o Zappy segurando uma mangueira e virando o bico, com o jato indo reto, para a esquerda e para a direita [na edição: o Zappy e a mangueira]. No "No seu jogo, cada laser", a tela volta para a experiência. ${telaDaExperienciaDoPoder('com a nave, as três pedras no alto e o tiro triplo desligado, sem apontar controles nem testar')} Quantos lasers saem e onde cada um chega é a descoberta da criança, e quem acompanha cada teste é o Zappy, dentro da experiência.`,
          ponte:
            'Sua vez! Investigue quantos lasers saem em cada disparo e onde cada um chega com cada desvio. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.',
          text: '[engaging, energetic, conversational voice] O laser da sua nave sobe reto, porque anda só para cima. [confident, clear, unhurried voice] Mas um laser pode andar também para o lado, e quem diz o quanto é o vx, a velocidade para o lado. [engaging, energetic, conversational voice] Sabe a mangueira? Com o bico reto, o jato vai para a frente. Quando você vira o bico, o jato vai para o lado. [engaging, energetic, conversational voice] No seu jogo, cada laser é um jato, e o vx é o bico. Com o tiro triplo, um aperto cria três lasers. [curious] E se os três lasers saírem com o mesmo desvio? [engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência. [upbeat, encouraging voice] Agora você vai investigar quantos lasers saem e onde cada um chega. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.',
        },
        montagemPoder<TriploEtapa>({
          key: 'item',
          title: 'O item do tiro triplo',
          etapa: 'item',
          objective:
            'Criar o relógio que solta o item pelo meio, só na partida, e o encontro que liga o tiro triplo.',
          ponte:
            'Crie o item: a cada 4 segundos, só na partida, um item nasce no grupo itensTriplo, no meio; quando a nave encosta nele, o item sai e tempoTriplo vira 5.',
          falas: [
            [
              'conversa',
              'O seu jogo já tem tudo para o tiro triplo: o grupo itensTriplo, o desenho do item e o placar do Triplo, ainda em zero. Primeiro, o item precisa cair. Depois, pegar o item liga o tiro triplo.',
              '[apontar prévia]',
            ],
            encontrar('Enquanto estiver rodando'),
            [
              'instrucao',
              'Siga até o relógio A cada 1.5 segundos, o dos asteroides, e deixe à vista o espaço logo abaixo dele, fora do fazer.',
              '[arrastar até "A cada 1.5 segundos"] [apontar abaixo de "A cada 1.5 segundos"]',
            ],
            [
              'instrucao',
              'Abra Jogo 2D, depois Tempo e depois Quadros e intervalos. Pegue A cada segundos, encaixe nesse espaço e troque o 2 por 4.',
              '[abrir categoria Jogo 2D > Tempo > Quadros e intervalos] [encaixar "A cada 2 segundos" abaixo de "A cada 1.5 segundos"] [trocar "2" por "4" em "A cada 2 segundos"]',
            ],
            ...guarda2D(RELOGIO_2D),
            [
              'instrucao',
              'No então desse Se, encaixe No grupo criar um sprite com imagem, de Jogo 2D, Grupos e Criar e percorrer. Troque o grupo inimigos por itensTriplo.',
              `[abrir categoria Jogo 2D > Grupos > Criar e percorrer] [encaixar "No grupo inimigos criar um sprite" em "${SE_RELOGIO_2D}" no "então"] [trocar "inimigos" por "itensTriplo" em "No grupo inimigos criar um sprite"]`,
            ],
            [
              'instrucao',
              'Coloque 378 no x e menos 44 no y. Na largura e na altura, coloque 44.',
              `[trocar "100" por "378" em "${CRIAR_ITEM_2D}"] [trocar "100" por "-44" em "${CRIAR_ITEM_2D}"] [trocar "32" por "44" em "${CRIAR_ITEM_2D}"] [trocar "32" por "44" em "${CRIAR_ITEM_2D}"]`,
            ],
            [
              'instrucao',
              'Escolha a imagem item-triplo-redondo e, no último número, logo depois de vy, coloque 2.',
              `[trocar "inimigo" por "item-triplo-redondo" em "${CRIAR_ITEM_2D}"] aproximar o fim do bloco; editar somente o zero depois do rótulo vy para 2 e confirmar, em captura manual deste campo [apontar bloco "${CRIAR_ITEM_2D}"]`,
            ],
            [
              'conversa',
              'Agora o encontro. Pegar o item é uma batida, como a da pedra na nave, só que liga o tiro triplo.',
            ],
            [
              'instrucao',
              'Dentro de A cada quadro do jogo, deixe à vista o espaço logo abaixo do encontro das pedras com a nave. Abra Jogo 2D, Colisões e Encostar e bloquear, e encaixe Para cada sprite do grupo que colidir com o sprite.',
              `[arrastar até "${BATIDA_2D}"] [apontar abaixo de "${BATIDA_2D}"] [abrir categoria Jogo 2D > Colisões > Encostar e bloquear] [encaixar "Para cada sprite do grupo" abaixo de "${BATIDA_2D}"]`,
            ],
            [
              'instrucao',
              'No grupo, escolha itensTriplo. Em chamar o sprite de, troque inimigo por itemPego.',
              '[trocar "asteroides" por "itensTriplo" em "Para cada sprite do grupo"] [trocar "inimigo" por "itemPego" em "Para cada sprite do grupo itensTriplo"]',
            ],
            [
              'instrucao',
              'No fazer, encaixe Tirar o sprite do grupo, de Grupos e Participação e limpeza. Escolha itemPego e o grupo itensTriplo.',
              `[abrir categoria Jogo 2D > Grupos > Participação e limpeza] [encaixar "Tirar o sprite" em "${PEGAR_2D}"] [trocar "asteroide" por "itemPego" em "Tirar o sprite dentro de ${PEGAR_2D}"] [trocar "asteroides" por "itensTriplo" em "Tirar o sprite itemPego"]`,
            ],
            [
              'instrucao',
              'Logo abaixo, encaixe Alterar variável para, de Programação e Variáveis. Troque contador por tempoTriplo e o 1 por 5.',
              '[abrir categoria Programação > Variáveis] [encaixar "Alterar variável contador para" abaixo de "Tirar o sprite itemPego"] [trocar "contador" por "tempoTriplo" em "Alterar variável contador para"] [trocar "1" por "5" em "Alterar variável tempoTriplo para"]',
            ],
            [
              'instrucao',
              'Por último, encaixe Tocar efeito, de Jogo 2D, Som e Efeitos prontos, e escolha power-up.',
              '[abrir categoria Jogo 2D > Som > Efeitos prontos] [encaixar "Tocar efeito" abaixo de "Alterar variável tempoTriplo para"] [trocar "moeda" por "power-up" em "Tocar efeito dentro de Para cada sprite do grupo itensTriplo"]',
            ],
            [
              'teste',
              'Clique no jogo e aperte Enter. Deixe a nave no meio: o item cai, a nave pega, e o Triplo vira 5. O Espaço ainda dispara um laser só.',
              '[tocar prévia 400 300] [tecla Enter] [aguardar 8 s] [apontar prévia 700 55] [tecla Space]',
            ],
          ],
          steps: [
            'Em Enquanto estiver rodando, logo abaixo de A cada 1.5 segundos: A cada 4 segundos (Jogo 2D → Tempo → Quadros e intervalos), com um Se e a pergunta o estado do jogo é jogando.',
            'No então: No grupo itensTriplo criar um sprite com imagem item-triplo-redondo, x 378, y −44, largura e altura 44, vx 0 e vy 2.',
            'Logo abaixo do encontro das pedras com a nave: Para cada sprite do grupo itensTriplo que colidir com o sprite nave, chamando de itemPego.',
            'Dentro dele: Tirar o sprite itemPego do grupo itensTriplo, Alterar variável tempoTriplo para 5 e Tocar efeito power-up.',
          ],
          tests: [
            'Antes do Enter, nenhum item cai; na partida, um item cai pelo meio a cada 4 segundos.',
            'Com a nave parada no meio, ela pega o item e o Triplo vira 5.',
          ],
          blockLabels: [
            'A cada 4 segundos',
            'No grupo itensTriplo criar um sprite com imagem item-triplo-redondo',
            'Para cada sprite do grupo itensTriplo que colidir com o sprite nave',
            'Alterar variável tempoTriplo para 5',
          ],
          blockTypes: [
            'sz_g2d_every_seconds',
            ...TIPOS_GUARDA_2D,
            'sz_g2d_spawn_image_in_group',
            'sz_g2d_on_sprite_group_overlap',
            'sz_g2d_remove_from_group',
            'sz_js_var_assign',
          ],
          conferencia:
            'o relógio A cada 4 segundos cria o item no grupo itensTriplo só na partida, e o encontro de itensTriplo com a nave tira o item e põe 5 em tempoTriplo',
          mostrar: PEGAR_2D,
          notaDeGravacao: ESPERA,
        }),
        montagemPoder<TriploEtapa>({
          key: 'tres',
          title: 'Três lasers no Espaço',
          etapa: 'tres',
          objective:
            'Fazer o Espaço perguntar pelo tiro triplo: com tempoTriplo maior que 0, três lasers; senão, o laser de antes.',
          ponte:
            'No Espaço, dentro de Se jogando: Se tempoTriplo for maior que 0, três lasers; senão, o laser de sempre.',
          falas: [
            [
              'conversa',
              'O Triplo já vira cinco, mas o Espaço ainda cria um laser só. O Espaço precisa fazer uma pergunta: o tiro triplo está ligado?',
            ],
            encontrar('Quando acontecer'),
            [
              'instrucao',
              'Encontre Quando apertar a tecla barra de espaço e deixe à vista o então do Se jogando, com o laser dentro.',
              `[arrastar até "${ESPACO_2D}"] [apontar encaixe em "${SE_ESPACO_2D}" no "então"]`,
            ],
            [
              'instrucao',
              'Abra Programação e depois Lógica e Se. Encaixe um Se no começo desse então. O laser e o som descem para baixo dele.',
              `[abrir categoria Programação > Lógica & Se] [encaixar "Se" em "${SE_ESPACO_2D}" no "então"]`,
            ],
            [
              'instrucao',
              'Clique no x da pergunta e escolha tempoTriplo. Conserve maior que zero.',
              `[trocar "x" por "tempoTriplo" em "Se dentro de ${ESPACO_2D}"]`,
            ],
            [
              'instrucao',
              'Clique no segundo sinal de mais, o de antes da palavra senão, e arraste o laser para dentro do senão. O som vai junto.',
              `[abrir "senão" em "${SE_TRIPLO_2D}"] [mover "${LASER_2D}" para "${SE_TRIPLO_2D}" no "senão"]`,
            ],
            [
              'conversa',
              'O senão guarda o tiro de sempre. O então vai ganhar três lasers: três cópias do mesmo bloco.',
            ],
            [
              'instrucao',
              'Clique com o botão direito no laser do senão e escolha Duplicar. Leve a cópia para dentro do então. Faça isso mais duas vezes, até ter três lasers no então.',
              `[apontar bloco "${LASER_2D} dentro de ${SE_TRIPLO_2D}"]`,
            ],
            [
              'instrucao',
              'Encaixe Tocar efeito logo abaixo dos três lasers e escolha laser.',
              `[abrir categoria Jogo 2D > Som > Efeitos prontos] [apontar bloco "${SE_TRIPLO_2D}"]`,
            ],
            [
              'teste',
              'Clique no jogo, aperte Enter, pegue o item e dispare. Três lasers saem juntos e seguem o mesmo caminho: parece um laser só.',
              '[tocar prévia 400 300] [tecla Enter] [aguardar 8 s] [tecla Space] [apontar prévia 400 300]',
            ],
            ['pergunta', 'Se são três, por que parece um só?'],
            [
              'conversa',
              'Porque os três têm o mesmo vx, zero, e seguem juntos. Como na experiência, com desvio zero. A direção de cada um é a próxima parte.',
            ],
          ],
          steps: [
            'No Espaço, dentro do então de Se jogando, encaixe um Se no começo (Programação → Lógica & Se). O laser e o som descem para baixo dele.',
            'Na pergunta, escolha tempoTriplo no lugar de x. Conserve > e 0.',
            'Abra o senão (o segundo +) e leve o laser, com o som, para dentro dele.',
            'Duplique o laser (botão direito → Duplicar) três vezes e leve as cópias para o então. Abaixo delas, Tocar efeito laser.',
          ],
          tests: [
            'Sem o item, o Espaço cria um laser.',
            'Com o Triplo maior que 0, o Espaço cria três lasers, por enquanto no mesmo caminho.',
          ],
          blockLabels: ['Se tempoTriplo > 0', 'então: três lasers', 'senão: o laser de sempre'],
          blockTypes: ['sz_js_if_else', 'sz_val_compare', 'sz_g2d_spawn_image_in_group'],
          conferencia:
            'no Espaço, dentro do Se jogando, está o Se tempoTriplo maior que 0: no então, três lasers; no senão, o laser de antes',
          mostrar: SE_TRIPLO_2D,
          notaDeGravacao: `${ESPERA} ${DUPLICAR}`,
        }),
        montagemPoder<TriploEtapa>({
          key: 'direcoes',
          title: 'Cada laser para um lado',
          etapa: 'direcoes',
          objective: 'Dar a cada laser do tiro triplo uma direção: vx −2, 0 e 2.',
          ponte:
            'Dê uma direção a cada laser: no então do Se tempoTriplo, vx −2 no primeiro e 2 no terceiro.',
          falas: [
            [
              'conversa',
              'Os três lasers saem juntos porque todos têm vx zero. Lembra do desvio da experiência? Com desvio dois, cada laser seguia o seu caminho.',
            ],
            encontrar('Quando acontecer'),
            [
              'instrucao',
              'No Espaço, deixe à vista os três lasers do então do Se tempoTriplo.',
              `[arrastar até "${SE_TRIPLO_2D}"] [apontar encaixe em "${SE_TRIPLO_2D}" no "então"]`,
            ],
            [
              'instrucao',
              'No primeiro laser, troque o vx de 0 por menos 2: ele vai para a esquerda.',
              `aproximar o fim do primeiro laser do então; editar somente o zero depois do rótulo vx para -2 e confirmar, em captura manual deste campo [apontar bloco "${SE_TRIPLO_2D}"]`,
            ],
            [
              'instrucao',
              'Deixe o segundo com vx 0, para ele subir reto. No terceiro, troque o vx por 2: ele vai para a direita.',
              `aproximar o fim do terceiro laser do então; editar somente o zero depois do rótulo vx para 2 e confirmar, em captura manual deste campo [apontar bloco "${SE_TRIPLO_2D}"]`,
            ],
            [
              'descoberta',
              'O vy continua menos 7 nos três: todos sobem igual. Só o vx muda o lado.',
            ],
            [
              'teste',
              'Clique no jogo, aperte Enter, pegue o item e dispare. Agora os lasers abrem em leque: um para a esquerda, um reto e um para a direita.',
              '[tocar prévia 400 300] [tecla Enter] [aguardar 8 s] [tecla Space] [apontar prévia 400 300]',
            ],
            ['pergunta', 'E esse tiro triplo dura para sempre?'],
            ['conversa', 'Por enquanto, sim: falta o prazo. Ele é a próxima parte.'],
          ],
          steps: [
            'No Espaço, deixe visíveis os três lasers do então do Se tempoTriplo.',
            'No primeiro, troque o vx por −2; deixe o segundo com 0; no terceiro, troque o vx por 2.',
          ],
          tests: [
            'Com o Triplo maior que 0, os três lasers abrem em leque: esquerda, reto e direita.',
            'Sem o item, o Espaço continua com um laser reto.',
          ],
          blockLabels: ['vx −2', 'vx 0', 'vx 2'],
          blockTypes: ['sz_g2d_spawn_image_in_group'],
          conferencia: 'no então do Se tempoTriplo, os três lasers têm vx menos 2, 0 e 2',
          mostrar: SE_TRIPLO_2D,
          notaDeGravacao: ESPERA,
        }),
        montagemPoder<TriploEtapa>({
          key: 'volta',
          title: 'O tiro triplo acaba',
          etapa: 'volta',
          objective:
            'Criar o relógio de 1 segundo que tira 1 de tempoTriplo enquanto ele é maior que 0, para o tiro simples voltar.',
          ponte:
            'Dê um prazo ao tiro triplo: a cada 1 segundo, Se tempoTriplo for maior que 0, ele perde 1.',
          falas: [
            [
              'conversa',
              'Falta o prazo: a cada segundo, o Triplo perde um. Quando chega a zero, o Se do Espaço responde não, e volta o tiro de sempre.',
            ],
            encontrar('Enquanto estiver rodando'),
            [
              'instrucao',
              `Deixe à vista o espaço logo abaixo do relógio ${RELOGIO_2D}, o do item, fora do fazer.`,
              `[arrastar até "${RELOGIO_2D}"] [apontar abaixo de "${RELOGIO_2D}"]`,
            ],
            [
              'instrucao',
              'Abra Jogo 2D, Tempo e Quadros e intervalos. Encaixe outro A cada segundos nesse espaço e troque o 2 por 1.',
              `[abrir categoria Jogo 2D > Tempo > Quadros e intervalos] [encaixar "A cada 2 segundos" abaixo de "${RELOGIO_2D}"] [trocar "2" por "1" em "A cada 2 segundos"]`,
            ],
            [
              'instrucao',
              'Encaixe um Se no fazer desse relógio e escolha tempoTriplo no lugar do x. Conserve maior que zero.',
              `[abrir categoria Programação > Lógica & Se] [encaixar "Se" em "${CONTAGEM_2D}"] [trocar "x" por "tempoTriplo" em "Se dentro de ${CONTAGEM_2D}"]`,
            ],
            [
              'instrucao',
              'No então, encaixe Somar 1 em variável, de Programação e Variáveis. Troque o 1 por menos 1 e escolha tempoTriplo.',
              `[abrir categoria Programação > Variáveis] [encaixar "Somar 1 em variável" em "${SE_TEMPO_2D}" no "então"] [trocar "1" por "-1" em "Somar 1 em variável"] [trocar "contador" por "tempoTriplo" em "Somar -1 em variável"]`,
            ],
            ['pergunta', 'E sem o Se, o que aconteceria?'],
            [
              'conversa',
              'O número passaria do zero: menos um, menos dois. Com o Se, ele para no zero.',
            ],
            [
              'teste',
              'Clique no jogo, aperte Enter e pegue o item. O Triplo desce de cinco a zero. Saia do meio, espere o zero e dispare: volta um laser só.',
              '[tocar prévia 400 300] [tecla Enter] [aguardar 8 s] [segurar tecla ArrowLeft por 0,8 s] [aguardar 6 s] [tecla Space]',
            ],
          ],
          steps: [
            'Em Enquanto estiver rodando, logo abaixo de A cada 4 segundos: outro A cada segundos, com 1.',
            'No fazer, um Se com tempoTriplo > 0.',
            'No então: Somar −1 em variável tempoTriplo (Programação → Variáveis).',
          ],
          tests: [
            'Depois de pegar o item, o Triplo desce de 5 a 0, um por segundo, e para no 0.',
            'Com o Triplo em 0, o Espaço volta a criar um laser.',
          ],
          blockLabels: [
            'A cada 1 segundos',
            'Se tempoTriplo > 0',
            'Somar -1 em variável tempoTriplo',
          ],
          blockTypes: ['sz_g2d_every_seconds', 'sz_js_if_else', 'sz_js_var_increment'],
          conferencia:
            'o relógio A cada 1 segundo tem o Se tempoTriplo maior que 0, e no então está Somar menos 1 em tempoTriplo',
          mostrar: CONTAGEM_2D,
          entrega: {
            reconhecimento:
              'Pronto, a sua nave ganhou o tiro triplo: o item liga, três lasers abrem em leque e o tempo acaba!',
            depois:
              'Depois do envio, ainda tem algumas perguntas para você pensar no tiro triplo. Quando aparecer Projeto enviado!, clique em Próxima parte.',
            saida: 'Próxima parte',
          },
          notaDeGravacao: ESPERA,
        }),
        {
          key: 'revisao',
          title: 'Pense no tiro triplo',
          kind: 'quiz',
          screen: 'Quiz com quatro perguntas: três previsões com cena e uma escolha de teste.',
          ponte: RECADO_DO_QUIZ,
          text: '',
        },
      ],
    },
    {
      slug: 'aula-2',
      title: 'O leque na patrulha',
      dimension: '3d',
      trechos: [
        {
          key: 'abertura',
          title: 'O tiro triplo chegou à patrulha',
          kind: 'intro',
          kids: ['No espaço em três dimensões, como os lasers vão para o lado?'],
          screen: `Do "Oi" até o "em três dimensões", a tela mostra o título O leque na patrulha sobre a cena inicial do jogo pronto [na edição: título O leque na patrulha]. No "Clique no jogo e aperte Enter", ampliar o jogo pronto [ampliar jogo], clicar no meio do jogo [tocar jogo] e apertar Enter [tecla Enter]. No "Olha aqui pela esquerda", segurar a seta da esquerda até a nave encostar na borda [segurar tecla ArrowLeft por 0,8 s] e esperar o item chegar [aguardar 7 s] [apontar jogo 200 320]. No "Agora o Espaço", apertar Espaço uma vez [tecla Space]. No "No espaço em três dimensões", manter a cena parada. No "Agora é a sua vez", voltar ao tamanho da aula [voltar à aula]. No "Quando terminar, clique em Próxima parte", clicar em **Próxima parte** [próxima parte]. Não jogar a partida: ela é da criança. ${ESPERA}`,
          ponte:
            'Sua vez! Jogue a versão pronta: pegue o item que vem pela esquerda, dispare com o tiro triplo e veja quando ele acaba. Quando terminar, clique em Próxima parte.',
          text: '[upbeat, welcoming voice] Oi! Na Aula 1, você deu o tiro triplo à nave do jogo 2D. Agora ele chegou à Patrulha Espacial, em três dimensões! [engaging, energetic, conversational voice] Clique no jogo e aperte Enter para começar a patrulha. [interested, animated voice] Olha aqui pela esquerda: o item vem por esse lado. Quando a nave pega, o Triplo, no alto à esquerda, vira 5. [interested, animated voice] Agora o Espaço cria três lasers, abertos em leque. [curious] No espaço em três dimensões, como os lasers vão para o lado? [engaging, energetic, conversational voice] Isso eu deixo para você descobrir. [upbeat, encouraging voice] Agora é a sua vez: pegue o item e dispare. Quando terminar, clique em Próxima parte.',
        },
        montagemPoder<TriploEtapa>({
          key: 'item',
          title: 'O item vem pela esquerda',
          etapa: 'item',
          objective:
            'Criar o relógio que cria uma cópia do item à esquerda, só na partida, e o encontro que liga o tiro triplo.',
          ponte:
            'Crie o item: a cada 4 segundos, só na partida, uma cópia de moldeTriplo em x −4, y 1, z −20; quando a nave encosta nela, o item sai, tempoTriplo vira 5 e o texto do Triplo mostra o número.',
          falas: [
            [
              'conversa',
              'Na patrulha, o tiro triplo já tem o molde do item, o grupo itensTriplo, o movimento dos itens e o texto do Triplo. Falta o relógio do item e o encontro que liga o tiro.',
              '[apontar prévia]',
            ],
            encontrar('Enquanto estiver rodando'),
            [
              'instrucao',
              'Logo abaixo do relógio A cada 1.5 segundos, encaixe A cada segundos, de Jogo 3D, Tempo e sorteio e Tempo, e troque o 2 por 4.',
              '[arrastar até "A cada 1.5 segundos"] [abrir categoria Jogo 3D > Tempo e sorteio > Tempo] [encaixar "A cada 2 segundos" abaixo de "A cada 1.5 segundos"] [trocar "2" por "4" em "A cada 2 segundos"]',
            ],
            ...guardaPatrulha(RELOGIO_3D, 'o relógio A cada 4 segundos'),
            [
              'instrucao',
              'No então, encaixe Criar uma cópia, de Jogo 3D e Grupos. Escolha moldeTriplo e o grupo itensTriplo.',
              `[abrir categoria Jogo 3D > Grupos] [encaixar "Criar uma cópia" em "${SE_JOGANDO_RELOGIO_3D}" no "então"] [trocar "molde" por "moldeTriplo" em "Criar uma cópia dentro de ${RELOGIO_3D}"] [trocar "inimigos" por "itensTriplo" em "Criar uma cópia dentro de ${RELOGIO_3D}"]`,
            ],
            [
              'instrucao',
              'Na posição, coloque menos 4 no x, 1 no y e menos 20 no z. O menos 4 é a faixa da esquerda.',
              '[trocar "0" por "-4" em "Criar uma cópia de moldeTriplo"] [trocar "0" por "1" em "Criar uma cópia de moldeTriplo"] [trocar "0" por "-20" em "Criar uma cópia de moldeTriplo"]',
            ],
            encontrar('Quando acontecer'),
            [
              'instrucao',
              `Logo abaixo do encontro ${BATIDA_3D}, encaixe Quando heroi encostar em algum do grupo, de Jogo 3D, Encostar e Encostar. Escolha nave, itensTriplo e chame o item de itemPego.`,
              `[arrastar até "${BATIDA_3D}"] [abrir categoria Jogo 3D > Encostar > Encostar] [encaixar "Quando heroi encostar em algum do grupo" abaixo de "${BATIDA_3D}"] [trocar "heroi" por "nave" em "Quando heroi encostar em algum do grupo"] [trocar "estrelas" por "itensTriplo" em "Quando nave encostar em algum do grupo"] [trocar "item" por "itemPego" em "Quando nave encostar em algum do grupo itensTriplo"]`,
            ],
            ...guardaPatrulha(PEGAR_3D, 'o encontro da nave com os itens'),
            [
              'instrucao',
              'No então: Tirar o objeto do grupo, com itemPego e itensTriplo, e logo abaixo Alterar variável tempoTriplo para 5.',
              `[abrir categoria Jogo 3D > Grupos] [encaixar "Tirar o objeto inimigo do grupo" em "${SE_PEGAR_3D}" no "então"] [trocar "inimigo" por "itemPego" em "Tirar o objeto inimigo do grupo"] [trocar "asteroides" por "itensTriplo" em "Tirar o objeto itemPego do grupo"] [abrir categoria Programação > Variáveis] [encaixar "Alterar variável contador para" abaixo de "Tirar o objeto itemPego do grupo itensTriplo"] [trocar "contador" por "tempoTriplo" em "Alterar variável contador para"] [trocar "1" por "5" em "Alterar variável tempoTriplo para"]`,
            ],
            [
              'instrucao',
              'Logo abaixo, escreva o Triplo na tela: Escrever na tela, em cima, à esquerda, com Triplo, dois-pontos e um espaço, mais o valor de tempoTriplo.',
              '[abrir categoria Jogo 3D > Placar, vida e telas > Na tela] [encaixar "Escrever na tela" abaixo de "Alterar variável tempoTriplo para"] [apontar bloco "Escrever na tela abaixo de Alterar variável tempoTriplo para"]',
            ],
            [
              'teste',
              'Clique em Rodar de novo e aperte Enter. Leve a nave para a borda da esquerda: o item vem, a nave pega, e o Triplo vira 5.',
              '[rodar de novo] [tecla Enter] [segurar tecla ArrowLeft por 0,8 s] [aguardar 7 s] [apontar prévia 70 24]',
            ],
          ],
          steps: [
            'Em Enquanto estiver rodando, logo abaixo de A cada 1.5 segundos: A cada 4 segundos (Jogo 3D → Tempo e sorteio → Tempo).',
            ...passosGuardaPatrulha('o relógio A cada 4 segundos'),
            'No então: Criar uma cópia de moldeTriplo no grupo itensTriplo, em x −4, y 1, z −20.',
            'Em Quando acontecer, logo abaixo do encontro com os asteroides: Quando nave encostar em algum do grupo itensTriplo, chamando de itemPego, com a guarda da partida.',
            'No então: Tirar o objeto itemPego do grupo itensTriplo, Alterar variável tempoTriplo para 5 e Escrever na tela, em cima, à esquerda, "Triplo: " + tempoTriplo.',
          ],
          tests: [
            'Antes do Enter, nenhum item nasce; na partida, um item vem pela esquerda a cada 4 segundos.',
            'Na borda da esquerda, a nave pega o item e o Triplo vira 5.',
          ],
          blockLabels: [
            'A cada 4 segundos',
            'Criar uma cópia de moldeTriplo no grupo itensTriplo',
            'Quando nave encostar em algum do grupo itensTriplo',
            'Alterar variável tempoTriplo para 5',
          ],
          blockTypes: [
            'sz_g3d_every_seconds',
            ...TIPOS_GUARDA,
            'sz_g3d_spawn_copy',
            'sz_g3d_on_touch_group',
            'sz_g3d_remove_from_group',
            'sz_js_var_assign',
            'sz_g3d_hud_text',
          ],
          conferencia:
            'o relógio A cada 4 segundos cria a cópia de moldeTriplo em x menos 4 só na partida, e o encontro com itensTriplo tira o item, põe 5 em tempoTriplo e escreve o Triplo',
          mostrar: PEGAR_3D,
          notaDeGravacao: ESPERA,
        }),
        montagemPoder<TriploEtapa>({
          key: 'tres',
          title: 'Três lasers no Espaço',
          etapa: 'tres',
          objective:
            'Fazer o Espaço perguntar pelo tiro triplo: com tempoTriplo maior que 0, três cópias do laser; senão, o laser de antes.',
          ponte:
            'No Espaço, dentro da guarda: Se tempoTriplo for maior que 0, três cópias de moldeTiro; senão, a cópia de sempre.',
          falas: [
            [
              'conversa',
              'Como no jogo 2D, o Espaço pergunta se o tiro triplo está ligado. Se está, três lasers; se não, o de sempre.',
            ],
            encontrar('Quando acontecer'),
            [
              'instrucao',
              'No Quando apertar a tecla espaço, deixe à vista o então da guarda, com Criar uma cópia de moldeTiro.',
              `[arrastar até "${ESPACO_3D}"] [apontar encaixe em "${SE_ESPACO_3D}" no "então"]`,
            ],
            [
              'instrucao',
              'Encaixe um Se no começo desse então. A cópia e a nota descem para baixo dele. Escolha tempoTriplo no lugar do x.',
              `[abrir categoria Programação > Lógica & Se] [encaixar "Se" em "${SE_ESPACO_3D}" no "então"] [trocar "x" por "tempoTriplo" em "Se valor da variável x > 0 dentro de ${ESPACO_3D}"]`,
            ],
            [
              'instrucao',
              'Abra o senão, no segundo sinal de mais, e arraste a cópia do laser para dentro dele. A nota vai junto.',
              `[abrir "senão" em "${SE_TRIPLO_3D}"] [mover "Criar uma cópia de moldeTiro" para "${SE_TRIPLO_3D}" no "senão"]`,
            ],
            [
              'instrucao',
              'Duplique a cópia do senão três vezes e leve as três para o então. Elas vão todas para o grupo tiros, por enquanto.',
              `[apontar bloco "Criar uma cópia de moldeTiro dentro de ${SE_TRIPLO_3D}"]`,
            ],
            [
              'teste',
              'Clique em Rodar de novo, aperte Enter, leve a nave para a esquerda, pegue o item e dispare. Três lasers saem juntos e parecem um só.',
              '[rodar de novo] [tecla Enter] [segurar tecla ArrowLeft por 0,8 s] [aguardar 7 s] [tecla Space]',
            ],
            ['pergunta', 'No 2D, era o vx que mudava a direção. E aqui?'],
            [
              'conversa',
              'Aqui, as cópias não têm velocidade própria: quem dá a velocidade é o grupo. A direção é a próxima parte.',
            ],
          ],
          steps: [
            'No Espaço, no começo do então da guarda, encaixe um Se e escolha tempoTriplo no lugar de x. Conserve > e 0.',
            'Abra o senão e leve a cópia de moldeTiro, com a nota, para dentro dele.',
            'Duplique a cópia três vezes e leve as cópias para o então.',
          ],
          tests: [
            'Sem o item, o Espaço cria um laser.',
            'Com o Triplo maior que 0, três lasers saem juntos, por enquanto no mesmo caminho.',
          ],
          blockLabels: [
            'Se tempoTriplo > 0',
            'então: três cópias de moldeTiro',
            'senão: a cópia de sempre',
          ],
          blockTypes: ['sz_js_if_else', 'sz_val_compare', 'sz_g3d_spawn_copy'],
          conferencia:
            'no Espaço, dentro da guarda, está o Se tempoTriplo maior que 0: no então, três cópias de moldeTiro; no senão, a cópia de antes',
          mostrar: SE_TRIPLO_3D,
          notaDeGravacao: `${ESPERA} ${DUPLICAR}`,
        }),
        montagemPoder<TriploEtapa>({
          key: 'direcoes',
          title: 'Um grupo para cada lado',
          etapa: 'direcoes',
          objective: 'Mandar os lasers dos lados para os grupos tirosEsquerda e tirosDireita.',
          ponte:
            'Dê uma direção a cada laser: no então do Se tempoTriplo, a primeira cópia vai para tirosEsquerda e a terceira para tirosDireita.',
          falas: [
            [
              'conversa',
              'Na patrulha, já vêm prontos dois grupos novos: tirosEsquerda, que anda em diagonal para a esquerda, e tirosDireita, para a direita. Os dois acertam as pedras como o grupo tiros.',
            ],
            [
              'instrucao',
              'No então do Se tempoTriplo, clique no grupo da primeira cópia e escolha tirosEsquerda.',
              `[arrastar até "${SE_TRIPLO_3D}"] [trocar "tiros" por "tirosEsquerda" em "Criar uma cópia de moldeTiro dentro de ${SE_TRIPLO_3D}"]`,
            ],
            [
              'instrucao',
              'Deixe a segunda no grupo tiros. Na terceira, escolha tirosDireita.',
              `[apontar bloco "${SE_TRIPLO_3D}"]`,
            ],
            [
              'descoberta',
              'A cópia pega a velocidade do grupo dela: trocar o grupo é trocar a direção.',
            ],
            [
              'teste',
              'Clique em Rodar de novo, pegue o item e dispare. Agora os lasers abrem em leque.',
              '[rodar de novo] [tecla Enter] [segurar tecla ArrowLeft por 0,8 s] [aguardar 7 s] [tecla Space]',
            ],
            ['pergunta', 'E quando é que o tiro triplo da patrulha acaba?'],
            ['conversa', 'Ainda não acaba: o prazo é a próxima parte.'],
          ],
          steps: [
            'No então do Se tempoTriplo, troque o grupo da primeira cópia por tirosEsquerda.',
            'Deixe a segunda em tiros e troque o grupo da terceira por tirosDireita.',
          ],
          tests: ['Com o Triplo maior que 0, os três lasers abrem em leque.'],
          blockLabels: [
            'Criar uma cópia de moldeTiro no grupo tirosEsquerda',
            'Criar uma cópia de moldeTiro no grupo tiros',
            'Criar uma cópia de moldeTiro no grupo tirosDireita',
          ],
          blockTypes: ['sz_g3d_spawn_copy'],
          conferencia:
            'no então do Se tempoTriplo, as três cópias vão para tirosEsquerda, tiros e tirosDireita',
          mostrar: SE_TRIPLO_3D,
          notaDeGravacao: ESPERA,
        }),
        montagemPoder<TriploEtapa>({
          key: 'volta',
          title: 'O tiro triplo acaba',
          etapa: 'volta',
          objective:
            'Criar o relógio de 1 segundo que tira 1 de tempoTriplo enquanto ele é maior que 0 e escreve o Triplo.',
          ponte:
            'Dê um prazo ao tiro triplo: a cada 1 segundo, Se tempoTriplo for maior que 0, ele perde 1 e o texto do Triplo é escrito de novo.',
          falas: [
            [
              'conversa',
              'Falta o prazo, como no jogo 2D. Na patrulha, o texto do Triplo também precisa ser escrito a cada segundo.',
            ],
            encontrar('Enquanto estiver rodando'),
            [
              'instrucao',
              `Logo abaixo do relógio ${RELOGIO_3D}, encaixe outro A cada segundos e troque o 2 por 1.`,
              `[arrastar até "${RELOGIO_3D}"] [abrir categoria Jogo 3D > Tempo e sorteio > Tempo] [encaixar "A cada 2 segundos" abaixo de "${RELOGIO_3D}"] [trocar "2" por "1" em "A cada 2 segundos"]`,
            ],
            [
              'instrucao',
              'Encaixe um Se no fazer e escolha tempoTriplo. No então, Somar 1 em variável, com menos 1 e tempoTriplo.',
              `[abrir categoria Programação > Lógica & Se] [encaixar "Se" em "${CONTAGEM_3D}"] [trocar "x" por "tempoTriplo" em "Se dentro de ${CONTAGEM_3D}"] [abrir categoria Programação > Variáveis] [encaixar "Somar 1 em variável" em "${SE_TEMPO_3D}" no "então"] [trocar "1" por "-1" em "Somar 1 em variável"] [trocar "contador" por "tempoTriplo" em "Somar -1 em variável"]`,
            ],
            [
              'instrucao',
              'Logo abaixo, escreva o Triplo de novo, em cima, à esquerda, como na parte do item.',
              '[abrir categoria Jogo 3D > Placar, vida e telas > Na tela] [encaixar "Escrever na tela" abaixo de "Somar -1 em variável tempoTriplo"] [apontar bloco "Escrever na tela abaixo de Somar -1 em variável tempoTriplo"]',
            ],
            ['pergunta', 'E sem o Se, o que aconteceria com o número?'],
            [
              'conversa',
              'Ele passaria do zero, como no jogo 2D. O Se faz o tiro triplo parar no zero.',
            ],
            [
              'teste',
              'Clique em Rodar de novo, aperte Enter e pegue o item. O Triplo desce de cinco a zero, e o Espaço volta ao laser de sempre.',
              '[rodar de novo] [tecla Enter] [segurar tecla ArrowLeft por 0,8 s] [aguardar 7 s] [apontar prévia 70 24]',
            ],
          ],
          steps: [
            'Em Enquanto estiver rodando, logo abaixo de A cada 4 segundos: outro A cada segundos, com 1.',
            'No fazer, um Se com tempoTriplo > 0.',
            'No então: Somar −1 em variável tempoTriplo e Escrever na tela, em cima, à esquerda, "Triplo: " + tempoTriplo.',
          ],
          tests: [
            'Depois de pegar o item, o Triplo desce de 5 a 0, um por segundo, e para no 0.',
            'Com o Triplo em 0, o Espaço volta a criar um laser.',
          ],
          blockLabels: [
            'A cada 1 segundos',
            'Se tempoTriplo > 0',
            'Somar -1 em variável tempoTriplo',
            'Escrever na tela em cima, à esquerda',
          ],
          blockTypes: [
            'sz_g3d_every_seconds',
            'sz_js_if_else',
            'sz_js_var_increment',
            'sz_g3d_hud_text',
          ],
          conferencia:
            'o relógio A cada 1 segundo tem o Se tempoTriplo maior que 0, e no então estão Somar menos 1 em tempoTriplo e o texto do Triplo',
          mostrar: CONTAGEM_3D,
          entrega: {
            reconhecimento:
              'Pronto, a patrulha também tem tiro triplo: o item liga, os lasers abrem em leque e o tempo acaba!',
            depois:
              'Depois do envio, ainda tem duas perguntas para você pensar no tiro triplo. Quando aparecer Projeto enviado!, clique em Próxima parte.',
            saida: 'Próxima parte',
          },
          notaDeGravacao: ESPERA,
        }),
        {
          key: 'revisao',
          title: 'Pense no leque da patrulha',
          kind: 'quiz',
          screen: 'Quiz com duas perguntas: uma previsão com cena e um diagnóstico.',
          ponte: RECADO_DO_QUIZ,
          text: '',
        },
      ],
    },
  ]
}

/** O Passo a passo de uma dimensão (as montagens da aula). */
export function triploAjuda(d: PoderDimensaoConstrutor) {
  const aula = triploAulas().find((a) => a.dimension === d)!
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
