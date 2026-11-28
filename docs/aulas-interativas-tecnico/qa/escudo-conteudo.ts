/**
 * A fonte editorial do Poder "Escudo temporário" (Construtor): as falas gravadas (com as marcas do
 * ElevenLabs), as notas de tela, as falas do Zappy na página e os passos do caderno das duas aulas.
 * O gerador (`gerar-escudo.ts`) monta manifestos, roteiros e caderno a partir daqui.
 *
 * A Aula 1 (2D, sobre a Nave Contra Asteroides) tem abertura, material, experiência, as três
 * construções e o envio na quarta; o quiz fecha a aula. A Aula 2 (3D, sobre a Patrulha Espacial)
 * tem abertura, três construções e o envio na quarta; o quiz fecha a aula. Toda montagem é guiada
 * no vídeo, um gesto por vez (`montagemPoder`). As perguntas da Debinha (Aula 1) e do Dedé (Aula 2)
 * são as falas de pergunta de cada montagem.
 *
 * As teclas. O item cai pelo meio da tela a cada 4 s desde que o jogo abre: na gravação, a espera
 * pelo primeiro item é de até 4 s depois do Enter, mais a queda (cerca de 3,4 s no 2D e 3,7 s no
 * 3D). A nave começa no meio, então basta não mexer nela para pegar o item.
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
import type { EscudoEtapa } from './escudo-projeto'
import { guardaPatrulha, passosGuardaPatrulha, TIPOS_GUARDA } from './patrulha-espacial-editorial'
import type { PoderAula, PoderTrecho } from './poder-gerador'

export type EscudoTrecho = PoderTrecho<EscudoEtapa>

const ESPERA =
  'Os tempos de espera são estimativas (o item nasce a cada 4 s desde que o jogo abre): acertar no Verificar plano.'

// ── nomes dos blocos, como o palco os acha (ESPEC 9.5) ─────────────────────────────────────────
const RELOGIO_2D = 'A cada 4 segundos'
const SE_RELOGIO_2D = `Se o estado do jogo é jogando dentro de ${RELOGIO_2D}`
const CRIAR_ITEM_2D = 'No grupo itensEscudo criar um sprite'
const BATIDA_2D = 'Para cada sprite do grupo asteroides que colidir com o sprite nave'
const PEGAR_2D = 'Para cada sprite do grupo itensEscudo'
const SE_BATIDA_2D = `Se dentro de ${BATIDA_2D}`
const SE_ESCUDO_2D = `Se valor da variável tempoDoEscudo dentro de ${BATIDA_2D}`
const CONTAGEM_2D = 'A cada 1 segundos'
const SE_CONTAGEM_2D = `Se dentro de ${CONTAGEM_2D}`
const SE_TEMPO_2D = `Se valor da variável tempoDoEscudo dentro de ${CONTAGEM_2D}`

const RELOGIO_3D = 'A cada 4 segundos'
const SE_JOGANDO_RELOGIO_3D = `Se valor da variável estado dentro de ${RELOGIO_3D}`
const PEGAR_3D = 'Quando nave encostar em algum do grupo itensEscudo'
const SE_PEGAR_3D = `Se valor da variável estado dentro de ${PEGAR_3D}`
const BATIDA_3D = 'Quando nave encostar em algum do grupo asteroides'
const SE_ESCUDO_3D = `Se valor da variável tempoDoEscudo dentro de ${BATIDA_3D}`
const CONTAGEM_3D = 'A cada 1 segundos'
const SE_TEMPO_3D = `Se valor da variável tempoDoEscudo dentro de ${CONTAGEM_3D}`

/**
 * A experiência da Aula 1, como o Passo a passo do projeto a apresenta: a ideia e os objetivos de
 * investigação, os MESMOS da lista da tela (`scene-livre/timed-shield.tsx`).
 */
export const escudoExperiencia = {
  title: 'A experiência: o escudo que acaba',
  idea: 'O escudo é um número que conta para trás. Pegar o item põe 5 nesse número, e a cada segundo ele perde 1. Na batida, o jogo pergunta: o escudo ainda tem tempo? Se tem, a pedra só sai; se não tem, a nave perde uma vida.',
  goals: [
    'Sem pegar o item, avance até uma pedra bater e olhe as vidas.',
    'Pegue o item do escudo e avance até uma pedra bater com o Escudo maior que 0.',
    'Pegue o item, deixe o Escudo chegar a 0 e avance até a próxima pedra.',
    'Com o Escudo entre 1 e 4, pegue o item de novo e olhe o número.',
  ],
  observe:
    'Antes e depois de cada teste, observe o número do Escudo, as vidas e o segundo em que cada pedra bate. O Zappy te mostra o que testar, e você pode repetir quantas vezes quiser.',
}

export function escudoAulas(): PoderAula<EscudoEtapa>[] {
  return [
    {
      slug: 'aula-1',
      title: 'O escudo que acaba',
      dimension: '2d',
      trechos: [
        {
          key: 'abertura',
          title: 'Um escudo para a nave',
          kind: 'intro',
          kids: ['Será que o escudo dura para sempre?'],
          screen: `Do "Oi" até o "um escudo", a tela mostra o título Escudo temporário sobre a cena inicial do jogo pronto [na edição: título Escudo temporário]. No "Clique no jogo e aperte Enter", ampliar o jogo pronto [ampliar jogo], clicar no meio do jogo [tocar jogo] e apertar Enter [tecla Enter]. No "Olha aqui no meio da tela", esperar o item cair pelo meio, sem mexer na nave, até ela pegar o item [aguardar 8 s] [apontar jogo 400 300]. No "o número do Escudo, aqui no canto, vira 5", apontar o número do Escudo [apontar jogo 700 55]. No "a nave pisca", apontar a nave [apontar jogo 400 428]. No "Será que o escudo dura para sempre", manter a nave parada. No "Agora é a sua vez", voltar ao tamanho da aula [voltar à aula]. No "Quando terminar, clique em Próxima parte", clicar em **Próxima parte** [próxima parte]. Não ficar esperando o escudo acabar nem jogar a partida: ela é da criança. ${ESPERA}`,
          ponte:
            'Sua vez! Jogue a versão pronta: pegue o item que cai pelo meio, deixe uma pedra bater com o escudo ligado e repare no que acontece quando o número do Escudo chega a zero. Quando terminar, clique em Próxima parte.',
          text: '[upbeat, welcoming voice] Oi! A sua nave vai ganhar um Poder: um escudo. [engaging, energetic, conversational voice] O jogo é a Nave Contra Asteroides que você montou: as setas movem a nave, o Espaço dispara, e você precisa acertar vinte asteroides antes de perder as três vidas. [engaging, energetic, conversational voice] Clique no jogo e aperte Enter para começar a partida. [interested, animated voice] Olha aqui no meio da tela: de tempos em tempos cai um item azul. Quando a nave pega o item, o número do Escudo, aqui no canto, vira 5, e a nave pisca. [engaging, energetic, conversational voice] Enquanto o escudo está ligado, a pedra que bate na nave só sai, e a vida fica. [curious] Será que o escudo dura para sempre? [engaging, energetic, conversational voice] Isso eu deixo para você descobrir. [upbeat, encouraging voice] Agora é a sua vez: pegue o escudo, deixe uma pedra bater e repare no número do Escudo. Quando terminar, clique em Próxima parte.',
        },
        trechoDoMaterial<EscudoEtapa>(),
        {
          key: 'experiencia',
          title: 'O escudo que acaba',
          kind: 'experience',
          kids: ['E se a nave pegar o item de novo, com o escudo ainda ligado?'],
          screen: `A experiência aparece no tamanho da aula, com a cena parada. Do "Sabe a ampulheta" até o "a areia acaba", a tela fica parada, e a edição troca esse trecho por um desenho nosso com o Zappy virando uma ampulheta, com a areia descendo e um número passando de 5 para 0 [na edição: o Zappy e a ampulheta]. No "No seu jogo, a ampulheta", a tela volta para a experiência. ${telaDaExperienciaDoPoder('com a nave, as pedras, o item do escudo, o Escudo em zero e as três vidas, sem apontar controles nem testar')} Quando a pedra tira vida e o que acontece ao pegar o item de novo é a descoberta da criança, e quem acompanha cada teste é o Zappy, dentro da experiência.`,
          ponte:
            'Sua vez! Investigue quando a pedra tira vida e quando ela só sai, o que acontece quando o Escudo chega a zero e o que muda ao pegar o item de novo. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.',
          text: '[engaging, energetic, conversational voice] Um escudo que dura para sempre deixaria o jogo fácil demais. Por isso, o escudo tem um prazo. [confident, clear, unhurried voice] O jogo guarda esse prazo numa variável: um número que pode mudar durante a partida. [engaging, energetic, conversational voice] Sabe a ampulheta? Quando você vira, a areia começa a descer, e o tempo acaba quando a areia acaba. [engaging, energetic, conversational voice] No seu jogo, a ampulheta é a variável tempoDoEscudo. Pegar o item vira a ampulheta: o número vai para cinco. E, a cada segundo, ele perde um. [engaging, energetic, conversational voice] Na batida de uma pedra, o jogo faz uma pergunta: o escudo ainda tem tempo? [curious] E se a nave pegar o item de novo, com o escudo ainda ligado? [engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência. [upbeat, encouraging voice] Agora você vai investigar quando a pedra tira vida e quando ela só sai, e o que acontece quando o escudo acaba. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.',
        },
        montagemPoder<EscudoEtapa>({
          key: 'item',
          title: 'O item que cai pelo meio',
          etapa: 'item',
          objective:
            'Criar o relógio que solta um item de escudo pelo meio da tela, só na partida.',
          ponte:
            'Crie o relógio do item: a cada 4 segundos, só na partida, um item de escudo nasce no grupo itensEscudo, no meio da tela, e cai.',
          falas: [
            [
              'conversa',
              'O seu jogo já tem tudo para o escudo: o grupo itensEscudo, que vai guardar os itens, o desenho deles e o placar do Escudo, ainda em zero. Só que nenhum item cai. Vamos criar um relógio que solta um item a cada quatro segundos.',
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
              'Abra Jogo 2D, depois Tempo e depois Quadros e intervalos. Pegue A cada segundos e encaixe nesse espaço.',
              '[abrir categoria Jogo 2D > Tempo > Quadros e intervalos] [encaixar "A cada 2 segundos" abaixo de "A cada 1.5 segundos"]',
            ],
            ['instrucao', 'Troque o 2 por 4.', '[trocar "2" por "4" em "A cada 2 segundos"]'],
            ...guarda2D(RELOGIO_2D),
            [
              'instrucao',
              'Deixe o então desse Se à vista. Abra Jogo 2D, depois Grupos e depois Criar e percorrer. Pegue No grupo criar um sprite com imagem e encaixe nesse então.',
              `[apontar encaixe em "${SE_RELOGIO_2D}" no "então"] [abrir categoria Jogo 2D > Grupos > Criar e percorrer] [encaixar "No grupo inimigos criar um sprite" em "${SE_RELOGIO_2D}" no "então"]`,
            ],
            [
              'instrucao',
              'Troque o grupo inimigos por itensEscudo.',
              '[trocar "inimigos" por "itensEscudo" em "No grupo inimigos criar um sprite"]',
            ],
            [
              'instrucao',
              'No x, coloque 378. É o meio da tela, menos a metade da largura do item. No y, coloque menos 44, para o item nascer acima da tela.',
              `[trocar "100" por "378" em "${CRIAR_ITEM_2D}"] [trocar "100" por "-44" em "${CRIAR_ITEM_2D}"]`,
            ],
            [
              'instrucao',
              'Na largura e na altura, coloque 44.',
              `[trocar "32" por "44" em "${CRIAR_ITEM_2D}"] [trocar "32" por "44" em "${CRIAR_ITEM_2D}"]`,
            ],
            [
              'instrucao',
              'Escolha a imagem item-escudo-redondo. Deixe vx em zero e, no último número, logo depois de vy, coloque 2, para o item descer devagar.',
              `[trocar "inimigo" por "item-escudo-redondo" em "${CRIAR_ITEM_2D}"] aproximar o fim do bloco; editar somente o zero depois do rótulo vy para 2 e confirmar, em captura manual deste campo [apontar bloco "${CRIAR_ITEM_2D}"]`,
            ],
            [
              'descoberta',
              'Se quiser, troque a imagem por outra moldura de escudo: são quatro, e todas funcionam igual.',
            ],
            [
              'teste',
              'Clique no jogo e aperte Enter. Espere alguns segundos: o item cai pelo meio, a cada quatro segundos. Por enquanto, ele passa pela nave sem fazer nada.',
              '[tocar prévia 400 300] [tecla Enter] [aguardar 8 s] [apontar prévia 400 300]',
            ],
          ],
          steps: [
            'Em Enquanto estiver rodando, deixe visível o espaço logo abaixo de A cada 1.5 segundos, fora do fazer dele.',
            'Em Jogo 2D → Tempo → Quadros e intervalos, pegue A cada segundos, encaixe nesse espaço e troque o 2 por 4.',
            'Em Programação → Lógica & Se, encaixe um Se no fazer do relógio. Jogue a pergunta x > 0 na lixeira e, em Jogo 2D → Jogo e telas → Telas e partida, encaixe o estado do jogo é, com jogando.',
            'No então do Se, encaixe No grupo criar um sprite com imagem (Jogo 2D → Grupos → Criar e percorrer). Escolha itensEscudo, x 378, y −44, largura e altura 44, a imagem item-escudo-redondo, vx 0 e vy 2.',
          ],
          tests: [
            'Enter começa a partida: a cada 4 segundos, um item cai pelo meio da tela.',
            'Antes do Enter, nenhum item cai.',
          ],
          blockLabels: [
            'A cada 4 segundos',
            'Se o estado do jogo é jogando',
            'No grupo itensEscudo criar um sprite com imagem item-escudo-redondo',
          ],
          blockTypes: ['sz_g2d_every_seconds', ...TIPOS_GUARDA_2D, 'sz_g2d_spawn_image_in_group'],
          conferencia:
            'o relógio A cada 4 segundos fica fora de A cada quadro, com o Se do estado jogando, e dentro dele está a criação no grupo itensEscudo, em x 378 e y menos 44, com vy 2',
          mostrar: RELOGIO_2D,
          notaDeGravacao: ESPERA,
        }),
        montagemPoder<EscudoEtapa>({
          key: 'liga',
          title: 'Pegar o item liga o escudo',
          etapa: 'liga',
          objective:
            'Usar o encontro da nave com o grupo itensEscudo para tirar o item e pôr 5 em tempoDoEscudo.',
          ponte:
            'Programe o item: quando a nave encosta num item, ele sai do grupo, tempoDoEscudo vira 5 e toca o power-up.',
          falas: [
            [
              'conversa',
              'O item já cai, mas passa pela nave sem fazer nada. Pegar o item é um encontro, como a pedra batendo na nave. Só que, agora, o encontro liga o escudo.',
              '[apontar prévia 400 300]',
            ],
            encontrar('Enquanto estiver rodando'),
            [
              'instrucao',
              'Dentro de A cada quadro do jogo, encontre o então de Se jogando. Deixe à vista o espaço logo abaixo do encontro das pedras com a nave.',
              `[arrastar até "${BATIDA_2D}"] [apontar abaixo de "${BATIDA_2D}"]`,
            ],
            [
              'instrucao',
              'Abra Jogo 2D, depois Colisões e depois Encostar e bloquear. Pegue Para cada sprite do grupo que colidir com o sprite e encaixe nesse espaço.',
              `[abrir categoria Jogo 2D > Colisões > Encostar e bloquear] [encaixar "Para cada sprite do grupo" abaixo de "${BATIDA_2D}"]`,
            ],
            [
              'instrucao',
              'No grupo, escolha itensEscudo. Conserve o sprite nave. Em chamar o sprite de, troque inimigo por itemPego, tudo junto, com P maiúsculo.',
              '[trocar "asteroides" por "itensEscudo" em "Para cada sprite do grupo"] [trocar "inimigo" por "itemPego" em "Para cada sprite do grupo itensEscudo"]',
            ],
            [
              'instrucao',
              'Deixe o fazer desse encontro à vista. Abra Jogo 2D, depois Grupos e depois Participação e limpeza. Pegue Tirar o sprite do grupo e solte dentro desse fazer.',
              `[apontar encaixe em "${PEGAR_2D}"] [abrir categoria Jogo 2D > Grupos > Participação e limpeza] [encaixar "Tirar o sprite" em "${PEGAR_2D}"]`,
            ],
            [
              'instrucao',
              'No sprite, escolha itemPego. No grupo, escolha itensEscudo.',
              `[trocar "asteroide" por "itemPego" em "Tirar o sprite dentro de ${PEGAR_2D}"] [trocar "asteroides" por "itensEscudo" em "Tirar o sprite itemPego"]`,
            ],
            [
              'descoberta',
              'Sem tirar o item do grupo, ele continuaria encostando na nave a cada quadro, e o escudo ligaria de novo sem parar.',
            ],
            [
              'instrucao',
              'Abra Programação e depois Variáveis. Pegue Alterar variável para e encaixe logo abaixo de Tirar o sprite.',
              '[abrir categoria Programação > Variáveis] [encaixar "Alterar variável contador para" abaixo de "Tirar o sprite itemPego"]',
            ],
            [
              'instrucao',
              'Troque contador por tempoDoEscudo e o 1 por 5. São os cinco segundos do escudo.',
              '[trocar "contador" por "tempoDoEscudo" em "Alterar variável contador para"] [trocar "1" por "5" em "Alterar variável tempoDoEscudo para"]',
            ],
            [
              'instrucao',
              'Abra Jogo 2D, depois Som e depois Efeitos prontos. Encaixe Tocar efeito logo abaixo e escolha power-up.',
              '[abrir categoria Jogo 2D > Som > Efeitos prontos] [encaixar "Tocar efeito" abaixo de "Alterar variável tempoDoEscudo para"] [trocar "moeda" por "power-up" em "Tocar efeito dentro de Para cada sprite do grupo itensEscudo"]',
            ],
            [
              'teste',
              'Clique no jogo e aperte Enter. Deixe a nave no meio e espere o item. Quando ela pega o item, o item some, toca o power-up, e o Escudo, no canto, vira 5.',
              '[tocar prévia 400 300] [tecla Enter] [aguardar 8 s] [apontar prévia 700 55]',
            ],
            [
              'conversa',
              'Só que o número fica parado no cinco, e as pedras ainda tiram vida. A proteção e o prazo vêm nas próximas partes.',
            ],
          ],
          steps: [
            'Em Enquanto estiver rodando, dentro do então de Se jogando, deixe visível o espaço logo abaixo do encontro das pedras com a nave.',
            'Em Jogo 2D → Colisões → Encostar e bloquear, pegue Para cada sprite do grupo que colidir com o sprite e encaixe nesse espaço. Escolha itensEscudo e nave, e chame o sprite de itemPego.',
            'Dentro desse encontro: Tirar o sprite itemPego do grupo itensEscudo (Jogo 2D → Grupos → Participação e limpeza).',
            'Logo abaixo: Alterar variável tempoDoEscudo para 5 (Programação → Variáveis) e Tocar efeito power-up (Jogo 2D → Som → Efeitos prontos).',
          ],
          tests: [
            'Com a nave parada no meio, ela pega o item: o item some e o Escudo vira 5.',
            'O número ainda não desce: o prazo vem na última parte.',
          ],
          blockLabels: [
            'Para cada sprite do grupo itensEscudo que colidir com o sprite nave',
            'Tirar o sprite itemPego do grupo itensEscudo',
            'Alterar variável tempoDoEscudo para 5',
            'Tocar efeito power-up',
          ],
          blockTypes: [
            'sz_g2d_on_sprite_group_overlap',
            'sz_g2d_remove_from_group',
            'sz_js_var_assign',
            'sz_g2d_play_fx',
          ],
          conferencia:
            'o encontro de itensEscudo com a nave tira o itemPego do grupo itensEscudo e, logo abaixo, põe 5 em tempoDoEscudo',
          mostrar: PEGAR_2D,
          notaDeGravacao: ESPERA,
        }),
        montagemPoder<EscudoEtapa>({
          key: 'protege',
          title: 'Com escudo, a pedra só sai',
          etapa: 'protege',
          objective:
            'Fazer a batida perguntar pelo escudo: com tempoDoEscudo maior que 0, a pedra só sai; sem escudo, a nave perde uma vida.',
          ponte:
            'Faça a batida perguntar pelo escudo: Se tempoDoEscudo for maior que 0, toca quicar; senão, a nave perde uma vida.',
          falas: [
            [
              'conversa',
              'O Escudo já vira cinco, mas a pedra continua tirando vida. Na batida, o jogo precisa fazer uma pergunta: o escudo ainda tem tempo? Se tem, a pedra só sai. Se não tem, a nave perde uma vida.',
            ],
            encontrar('Enquanto estiver rodando'),
            [
              'instrucao',
              'Encontre o encontro das pedras com a nave e deixe à vista o espaço logo abaixo de Soltar explosão no sprite atingiuNave.',
              `[arrastar até "${BATIDA_2D}"] [apontar abaixo de "Soltar explosão no sprite atingiuNave"]`,
            ],
            [
              'instrucao',
              'Abra Programação e depois Lógica e Se. Pegue o bloco Se e encaixe logo abaixo da explosão. Machucar o sprite e Tocar efeito descem para baixo do Se.',
              `[abrir categoria Programação > Lógica & Se] [encaixar "Se" abaixo de "Soltar explosão no sprite atingiuNave"]`,
            ],
            [
              'instrucao',
              'A pergunta já vem x maior que zero. Clique no x e escolha tempoDoEscudo. Conserve o sinal de maior e o zero.',
              `[trocar "x" por "tempoDoEscudo" em "${SE_BATIDA_2D}"]`,
            ],
            [
              'conversa',
              'A resposta do não é a batida de antes: perder uma vida. Ela vai no senão, e o Se chega sem esse espaço.',
            ],
            [
              'instrucao',
              'Na linha de baixo do Se tem dois sinais de mais. Clique no segundo, o de antes da palavra senão.',
              `[abrir "senão" em "${SE_ESCUDO_2D}"]`,
            ],
            [
              'instrucao',
              'Arraste Machucar o sprite para dentro do senão. Tocar efeito batida vai junto, logo abaixo dele.',
              `[mover "Machucar o sprite nave" para "${SE_ESCUDO_2D}" no "senão"]`,
            ],
            [
              'instrucao',
              'Agora o sim. Deixe o então à vista. Abra Jogo 2D, depois Som e depois Efeitos prontos, encaixe Tocar efeito no então e escolha quicar.',
              `[apontar encaixe em "${SE_ESCUDO_2D}" no "então"] [abrir categoria Jogo 2D > Som > Efeitos prontos] [encaixar "Tocar efeito" em "${SE_ESCUDO_2D}" no "então"] [trocar "moeda" por "quicar" em "Tocar efeito dentro de ${SE_ESCUDO_2D}"]`,
            ],
            [
              'descoberta',
              'A pedra sai do grupo antes do Se, então ela sai com escudo ou sem escudo. Só a vida depende da resposta.',
            ],
            [
              'teste',
              'Clique no jogo, aperte Enter e pegue o item. Deixe uma pedra bater: ela some com um quique, e os corações continuam iguais.',
              '[tocar prévia 400 300] [tecla Enter] [aguardar 8 s] [apontar prévia 60 52]',
            ],
            ['pergunta', 'Mas o número do Escudo continua em cinco. Será que esse escudo acaba?'],
            [
              'conversa',
              'Do jeito que está, não acaba nunca: falta o prazo. Ele é a próxima parte.',
            ],
          ],
          steps: [
            'No encontro das pedras com a nave, deixe visível o espaço logo abaixo de Soltar explosão no sprite atingiuNave.',
            'Em Programação → Lógica & Se, encaixe um Se nesse espaço. Machucar o sprite e Tocar efeito descem para baixo dele.',
            'Na pergunta x > 0, escolha tempoDoEscudo no lugar de x. Conserve > e 0.',
            'Clique no segundo + do Se para abrir o senão e leve Machucar o sprite nave (com o Tocar efeito batida) para dentro dele.',
            'No então, encaixe Tocar efeito quicar (Jogo 2D → Som → Efeitos prontos).',
          ],
          tests: [
            'Com o Escudo maior que 0, a pedra que bate só some: as vidas continuam iguais.',
            'Sem pegar o item, a pedra tira uma vida, como antes.',
          ],
          blockLabels: [
            'Se tempoDoEscudo > 0',
            'Tocar efeito quicar',
            'senão: Machucar o sprite nave tirando 1',
          ],
          blockTypes: ['sz_js_if_else', 'sz_val_compare', 'sz_val_variable', 'sz_g2d_play_fx'],
          conferencia:
            'no encontro das pedras com a nave, depois da explosão, está o Se tempoDoEscudo maior que 0: no então, Tocar efeito quicar; no senão, Machucar o sprite nave e Tocar efeito batida, e nenhum Machucar fora do Se',
          mostrar: SE_ESCUDO_2D,
          notaDeGravacao: ESPERA,
        }),
        montagemPoder<EscudoEtapa>({
          key: 'acaba',
          title: 'O escudo acaba',
          etapa: 'acaba',
          objective:
            'Criar o relógio de 1 segundo que tira 1 de tempoDoEscudo enquanto ele é maior que 0 e faz a nave piscar.',
          ponte:
            'Dê um prazo ao escudo: a cada 1 segundo, Se tempoDoEscudo for maior que 0, ele perde 1 e a nave pisca.',
          falas: [
            [
              'conversa',
              'Agora o escudo protege, mas não acaba nunca. Lembra da ampulheta da experiência? A cada segundo, o número do escudo perde um, até chegar a zero.',
            ],
            encontrar('Enquanto estiver rodando'),
            [
              'instrucao',
              `Deixe à vista o espaço logo abaixo do relógio ${RELOGIO_2D}, o do item, fora do fazer.`,
              `[arrastar até "${RELOGIO_2D}"] [apontar abaixo de "${RELOGIO_2D}"]`,
            ],
            [
              'instrucao',
              'Abra Jogo 2D, depois Tempo e depois Quadros e intervalos. Pegue outro A cada segundos, encaixe nesse espaço e troque o 2 por 1.',
              `[abrir categoria Jogo 2D > Tempo > Quadros e intervalos] [encaixar "A cada 2 segundos" abaixo de "${RELOGIO_2D}"] [trocar "2" por "1" em "A cada 2 segundos"]`,
            ],
            [
              'instrucao',
              'Abra Programação e depois Lógica e Se, e encaixe um Se no fazer desse relógio.',
              `[apontar encaixe em "${CONTAGEM_2D}"] [abrir categoria Programação > Lógica & Se] [encaixar "Se" em "${CONTAGEM_2D}"]`,
            ],
            [
              'instrucao',
              'Na pergunta, clique no x e escolha tempoDoEscudo. Conserve maior que zero.',
              `[trocar "x" por "tempoDoEscudo" em "${SE_CONTAGEM_2D}"]`,
            ],
            ['pergunta', 'Por que perguntar, se é só tirar um?'],
            [
              'conversa',
              'Sem a pergunta, o número passaria do zero: menos um, menos dois. O Se faz o escudo parar no zero.',
            ],
            [
              'instrucao',
              'Deixe o então à vista. Abra Programação e depois Variáveis, pegue Somar 1 em variável e encaixe nesse então.',
              `[apontar encaixe em "${SE_TEMPO_2D}" no "então"] [abrir categoria Programação > Variáveis] [encaixar "Somar 1 em variável" em "${SE_TEMPO_2D}" no "então"]`,
            ],
            [
              'instrucao',
              'Troque o 1 por menos 1 e a variável por tempoDoEscudo. Somar menos um é o mesmo que tirar um.',
              '[trocar "1" por "-1" em "Somar 1 em variável"] [trocar "contador" por "tempoDoEscudo" em "Somar -1 em variável"]',
            ],
            [
              'instrucao',
              'Abra Jogo 2D, depois Desenho e efeitos e depois Efeitos. Pegue Fazer o sprite piscar e encaixe logo abaixo. Conserve nave e troque o 60 por 30.',
              '[abrir categoria Jogo 2D > Desenho e efeitos > Efeitos] [encaixar "Fazer o sprite" abaixo de "Somar -1 em variável tempoDoEscudo"] [trocar "60" por "30" em "Fazer o sprite nave piscar"]',
            ],
            [
              'descoberta',
              'Assim a nave pisca enquanto o escudo dura, e quem joga vê que ela está protegida.',
            ],
            [
              'teste',
              'Clique no jogo, aperte Enter e pegue o item. Agora o Escudo desce: cinco, quatro, três, dois, um, zero. Saia do meio e deixe uma pedra bater com o Escudo em zero: ela tira uma vida.',
              '[tocar prévia 400 300] [tecla Enter] [aguardar 8 s] [apontar prévia 700 55] [segurar tecla ArrowLeft por 0,8 s] [aguardar 6 s]',
            ],
          ],
          steps: [
            'Em Enquanto estiver rodando, deixe visível o espaço logo abaixo de A cada 4 segundos, fora do fazer dele.',
            'Em Jogo 2D → Tempo → Quadros e intervalos, pegue outro A cada segundos, encaixe nesse espaço e troque o 2 por 1.',
            'No fazer do relógio, encaixe um Se (Programação → Lógica & Se) e escolha tempoDoEscudo no lugar de x. Conserve > e 0.',
            'No então: Somar −1 em variável tempoDoEscudo (Programação → Variáveis) e, logo abaixo, Fazer o sprite nave piscar por 30 quadros (Jogo 2D → Desenho e efeitos → Efeitos).',
          ],
          tests: [
            'Depois de pegar o item, o Escudo desce de 5 a 0, um por segundo, e a nave pisca.',
            'Com o Escudo em 0, a pedra volta a tirar vida. O número nunca fica negativo.',
            'Pegar o item de novo volta o Escudo a 5.',
          ],
          blockLabels: [
            'A cada 1 segundos',
            'Se tempoDoEscudo > 0',
            'Somar -1 em variável tempoDoEscudo',
            'Fazer o sprite nave piscar por 30 quadros',
          ],
          blockTypes: [
            'sz_g2d_every_seconds',
            'sz_js_if_else',
            'sz_js_var_increment',
            'sz_g2d_blink',
          ],
          conferencia:
            'o relógio A cada 1 segundo fica fora de A cada quadro, com o Se tempoDoEscudo maior que 0, e no então estão Somar menos 1 em tempoDoEscudo e Fazer o sprite nave piscar',
          mostrar: CONTAGEM_2D,
          entrega: {
            reconhecimento:
              'Pronto, a sua nave ganhou um escudo com prazo: o item liga, a batida pergunta e o tempo acaba!',
            depois:
              'Depois do envio, ainda tem algumas perguntas para você pensar no escudo. Quando aparecer Projeto enviado!, clique em Próxima parte.',
            saida: 'Próxima parte',
          },
          notaDeGravacao: ESPERA,
        }),
        {
          key: 'revisao',
          title: 'Pense no escudo',
          kind: 'quiz',
          screen: 'Quiz com quatro perguntas: três previsões com cena e uma escolha de teste.',
          ponte: RECADO_DO_QUIZ,
          text: '',
        },
      ],
    },
    {
      slug: 'aula-2',
      title: 'O escudo na patrulha',
      dimension: '3d',
      trechos: [
        {
          key: 'abertura',
          title: 'O escudo chegou à patrulha',
          kind: 'intro',
          kids: ['Será que o escudo funciona igual no espaço em três dimensões?'],
          screen: `Do "Oi" até o "em três dimensões", a tela mostra o título O escudo na patrulha sobre a cena inicial do jogo pronto [na edição: título O escudo na patrulha]. No "Clique no jogo e aperte Enter", ampliar o jogo pronto [ampliar jogo], clicar no meio do jogo [tocar jogo] e apertar Enter [tecla Enter]. No "Olha aqui no meio", esperar o item chegar pelo meio, sem mexer na nave, até ela pegar o item [aguardar 9 s] [apontar jogo 480 320]. No "o Escudo, no alto à esquerda", apontar o texto do Escudo [apontar jogo 70 24]. No "Será que o escudo funciona igual", manter a nave parada. No "Agora é a sua vez", voltar ao tamanho da aula [voltar à aula]. No "Quando terminar, clique em Próxima parte", clicar em **Próxima parte** [próxima parte]. Não jogar a partida: ela é da criança. ${ESPERA}`,
          ponte:
            'Sua vez! Jogue a versão pronta: pegue o item que vem pelo meio, deixe uma pedra bater com o escudo ligado e veja o que acontece quando o Escudo chega a zero. Quando terminar, clique em Próxima parte.',
          text: '[upbeat, welcoming voice] Oi! Na Aula 1, você deu um escudo com prazo para a nave do jogo 2D. Agora o escudo chegou à Patrulha Espacial, em três dimensões! [engaging, energetic, conversational voice] A regra continua a mesma: pegar o item liga o escudo por cinco segundos, a pedra que bate com o escudo ligado só sai, e o escudo perde um a cada segundo. [engaging, energetic, conversational voice] Clique no jogo e aperte Enter para começar a patrulha. [interested, animated voice] Olha aqui no meio: o item vem na direção da nave. Quando ela pega, o Escudo, no alto à esquerda, vira 5, e a nave pisca. [curious] Será que o escudo funciona igual no espaço em três dimensões? [engaging, energetic, conversational voice] Isso eu deixo para você descobrir. [upbeat, encouraging voice] Agora é a sua vez: pegue o escudo e deixe uma pedra bater. Quando terminar, clique em Próxima parte.',
        },
        montagemPoder<EscudoEtapa>({
          key: 'item',
          title: 'O item vem pelo meio',
          etapa: 'item',
          objective:
            'Criar o relógio que cria uma cópia do item de escudo no meio, longe da nave, só na partida.',
          ponte:
            'Crie o relógio do item: a cada 4 segundos, só na partida, uma cópia de moldeEscudo nasce no grupo itensEscudo, em x 0, y 1 e z menos 28.',
          falas: [
            [
              'conversa',
              'Na patrulha, o escudo já está preparado: o molde do item, escondido, o grupo itensEscudo, o movimento dos itens na direção da nave e o texto do Escudo, em zero. Falta o relógio que cria os itens.',
              '[apontar prévia]',
            ],
            encontrar('Enquanto estiver rodando'),
            [
              'instrucao',
              'Siga até o relógio A cada 1.5 segundos, o dos asteroides, e deixe à vista o espaço logo abaixo dele.',
              '[arrastar até "A cada 1.5 segundos"] [apontar abaixo de "A cada 1.5 segundos"]',
            ],
            [
              'instrucao',
              'Abra Jogo 3D, depois Tempo e sorteio e depois Tempo. Pegue A cada segundos, encaixe nesse espaço e troque o 2 por 4.',
              '[abrir categoria Jogo 3D > Tempo e sorteio > Tempo] [encaixar "A cada 2 segundos" abaixo de "A cada 1.5 segundos"] [trocar "2" por "4" em "A cada 2 segundos"]',
            ],
            ...guardaPatrulha(RELOGIO_3D, 'o relógio A cada 4 segundos'),
            [
              'instrucao',
              'Deixe o então desse Se à vista. Abra Jogo 3D e depois Grupos. Pegue Criar uma cópia e encaixe nesse então.',
              `[apontar encaixe em "${SE_JOGANDO_RELOGIO_3D}" no "então"] [abrir categoria Jogo 3D > Grupos] [encaixar "Criar uma cópia" em "${SE_JOGANDO_RELOGIO_3D}" no "então"]`,
            ],
            [
              'instrucao',
              'No molde, escolha moldeEscudo. No grupo, escolha itensEscudo.',
              `[trocar "molde" por "moldeEscudo" em "Criar uma cópia dentro de ${RELOGIO_3D}"] [trocar "inimigos" por "itensEscudo" em "Criar uma cópia dentro de ${RELOGIO_3D}"]`,
            ],
            [
              'instrucao',
              'Na posição, conserve o x em 0, coloque 1 no y e menos 28 no z. O zero é o meio, e o menos 28 é longe, lá na frente da nave.',
              '[apontar bloco "Criar uma cópia de moldeEscudo"] [trocar "0" por "1" em "Criar uma cópia de moldeEscudo"] [trocar "0" por "-28" em "Criar uma cópia de moldeEscudo"]',
            ],
            [
              'teste',
              'Clique em Rodar de novo e aperte Enter. Espere: a cada quatro segundos, um item vem pelo meio. Por enquanto, ele passa pela nave sem fazer nada.',
              '[rodar de novo] [tecla Enter] [aguardar 9 s] [apontar prévia]',
            ],
          ],
          steps: [
            'Em Enquanto estiver rodando, deixe visível o espaço logo abaixo de A cada 1.5 segundos.',
            'Em Jogo 3D → Tempo e sorteio → Tempo, pegue A cada segundos, encaixe nesse espaço e troque o 2 por 4.',
            ...passosGuardaPatrulha('o relógio A cada 4 segundos'),
            'No então do Se, encaixe Criar uma cópia (Jogo 3D → Grupos), com o molde moldeEscudo, o grupo itensEscudo e a posição x 0, y 1, z −28.',
          ],
          tests: [
            'Enter começa a partida: a cada 4 segundos, um item vem pelo meio.',
            'Antes do Enter, nenhum item nasce.',
          ],
          blockLabels: [
            'A cada 4 segundos',
            'Se estado = jogando',
            'Criar uma cópia de moldeEscudo no grupo itensEscudo em x 0, y 1, z -28',
          ],
          blockTypes: ['sz_g3d_every_seconds', ...TIPOS_GUARDA, 'sz_g3d_spawn_copy'],
          conferencia:
            'o relógio A cada 4 segundos tem a guarda estado igual a jogando e, no então, a cópia de moldeEscudo no grupo itensEscudo em x 0, y 1 e z menos 28',
          mostrar: RELOGIO_3D,
          notaDeGravacao: ESPERA,
        }),
        montagemPoder<EscudoEtapa>({
          key: 'liga',
          title: 'Pegar o item liga o escudo',
          etapa: 'liga',
          objective:
            'Usar o encontro da nave com o grupo itensEscudo para tirar o item, pôr 5 em tempoDoEscudo e escrever o Escudo.',
          ponte:
            'Programe o item: quando a nave encosta num item durante a partida, ele sai do grupo, tempoDoEscudo vira 5 e o texto do Escudo mostra o número.',
          falas: [
            [
              'conversa',
              'Os itens já vêm, mas passam pela nave. Como no jogo 2D, pegar o item é um encontro que liga o escudo.',
            ],
            encontrar('Quando acontecer'),
            [
              'instrucao',
              `Deixe à vista o espaço logo abaixo do encontro ${BATIDA_3D}, fora do fazer dele.`,
              `[arrastar até "${BATIDA_3D}"] [apontar abaixo de "${BATIDA_3D}"]`,
            ],
            [
              'instrucao',
              'Abra Jogo 3D, Encostar e Encostar de novo. Pegue Quando heroi encostar em algum do grupo e encaixe nesse espaço.',
              `[abrir categoria Jogo 3D > Encostar > Encostar] [encaixar "Quando heroi encostar em algum do grupo" abaixo de "${BATIDA_3D}"]`,
            ],
            [
              'instrucao',
              'No primeiro nome, escolha nave. No grupo, escolha itensEscudo. No campo chamando de, troque item por itemPego.',
              '[trocar "heroi" por "nave" em "Quando heroi encostar em algum do grupo"] [trocar "estrelas" por "itensEscudo" em "Quando nave encostar em algum do grupo"] [trocar "item" por "itemPego" em "Quando nave encostar em algum do grupo itensEscudo"]',
            ],
            ...guardaPatrulha(PEGAR_3D, 'o encontro da nave com os itens'),
            [
              'instrucao',
              'Abra Jogo 3D e depois Grupos. Pegue Tirar o objeto do grupo, encaixe no então e escolha itemPego e itensEscudo.',
              `[abrir categoria Jogo 3D > Grupos] [encaixar "Tirar o objeto inimigo do grupo" em "${SE_PEGAR_3D}" no "então"] [trocar "inimigo" por "itemPego" em "Tirar o objeto inimigo do grupo"] [trocar "asteroides" por "itensEscudo" em "Tirar o objeto itemPego do grupo"]`,
            ],
            [
              'instrucao',
              'Abra Programação e depois Variáveis. Encaixe Alterar variável para logo abaixo, troque contador por tempoDoEscudo e o 1 por 5.',
              '[abrir categoria Programação > Variáveis] [encaixar "Alterar variável contador para" abaixo de "Tirar o objeto itemPego do grupo itensEscudo"] [trocar "contador" por "tempoDoEscudo" em "Alterar variável contador para"] [trocar "1" por "5" em "Alterar variável tempoDoEscudo para"]',
            ],
            [
              'conversa',
              'No 3D, o placar é um texto. Quando o número muda, o texto precisa ser escrito de novo.',
            ],
            [
              'instrucao',
              'Abra Jogo 3D, Placar, vida e telas e Na tela. Encaixe Escrever na tela logo abaixo e conserve em cima, à esquerda.',
              '[abrir categoria Jogo 3D > Placar, vida e telas > Na tela] [encaixar "Escrever na tela" abaixo de "Alterar variável tempoDoEscudo para"] [apontar bloco "Escrever na tela abaixo de Alterar variável tempoDoEscudo para"]',
            ],
            [
              'instrucao',
              'No texto, solte uma conta de juntar: Escudo, com dois-pontos e um espaço, mais o valor da variável tempoDoEscudo.',
              '[abrir categoria Programação > Matemática] [soltar "0 + 0" em cima do "Pegue as estrelas!" em "Escrever na tela abaixo de Alterar variável tempoDoEscudo para"] [abrir categoria Programação > Valores] [apontar bloco "Escrever na tela abaixo de Alterar variável tempoDoEscudo para"]',
            ],
            [
              'teste',
              'Clique em Rodar de novo e aperte Enter. Deixe a nave no meio: quando ela pega o item, o item some e o Escudo vira 5.',
              '[rodar de novo] [tecla Enter] [aguardar 9 s] [apontar prévia 70 24]',
            ],
          ],
          steps: [
            'Em Quando acontecer, deixe visível o espaço logo abaixo do encontro da nave com os asteroides.',
            'Em Jogo 3D → Encostar → Encostar, encaixe Quando heroi encostar em algum do grupo. Escolha nave, itensEscudo e chame o item de itemPego.',
            ...passosGuardaPatrulha('o encontro da nave com os itens'),
            'No então: Tirar o objeto itemPego do grupo itensEscudo (Jogo 3D → Grupos) e Alterar variável tempoDoEscudo para 5 (Programação → Variáveis).',
            'Logo abaixo: Escrever na tela, em cima, à esquerda, com "Escudo: " + valor da variável tempoDoEscudo.',
          ],
          tests: [
            'Com a nave parada no meio, ela pega o item: o item some e o Escudo vira 5.',
            'O número ainda não desce: o prazo vem na última parte.',
          ],
          blockLabels: [
            'Quando nave encostar em algum do grupo itensEscudo, chamando de itemPego',
            'Tirar o objeto itemPego do grupo itensEscudo',
            'Alterar variável tempoDoEscudo para 5',
            'Escrever na tela em cima, à esquerda',
          ],
          blockTypes: [
            'sz_g3d_on_touch_group',
            ...TIPOS_GUARDA,
            'sz_g3d_remove_from_group',
            'sz_js_var_assign',
            'sz_g3d_hud_text',
          ],
          conferencia:
            'o encontro da nave com itensEscudo tem a guarda da partida e, no então, tira o itemPego do grupo, põe 5 em tempoDoEscudo e escreve o Escudo em cima, à esquerda',
          mostrar: PEGAR_3D,
          notaDeGravacao: ESPERA,
        }),
        montagemPoder<EscudoEtapa>({
          key: 'protege',
          title: 'Com escudo, a pedra só sai',
          etapa: 'protege',
          objective:
            'Fazer a batida perguntar pelo escudo: com tempoDoEscudo maior que 0, a pedra só sai; sem escudo, a nave perde uma vida.',
          ponte:
            'Faça a batida perguntar pelo escudo: depois de tirar a pedra, Se tempoDoEscudo for maior que 0, toca o som pronto; senão, Machucar nave tirando 1 de vida.',
          falas: [
            [
              'conversa',
              'Agora a pergunta da batida, a mesma do jogo 2D: o escudo ainda tem tempo? Se tem, a pedra só sai. Se não tem, a nave perde uma vida.',
            ],
            encontrar('Quando acontecer'),
            [
              'instrucao',
              `No encontro ${BATIDA_3D}, deixe à vista o espaço logo abaixo de Tirar o objeto asteroideQueBateu.`,
              `[arrastar até "${BATIDA_3D}"] [apontar abaixo de "Tirar o objeto asteroideQueBateu do grupo asteroides"]`,
            ],
            [
              'instrucao',
              'Abra Programação e depois Lógica e Se. Encaixe um Se nesse espaço. Machucar e Tocar o som pronto descem para baixo do Se.',
              '[abrir categoria Programação > Lógica & Se] [encaixar "Se" abaixo de "Tirar o objeto asteroideQueBateu do grupo asteroides"]',
            ],
            [
              'instrucao',
              'Clique no x da pergunta e escolha tempoDoEscudo. Conserve o sinal de maior e o zero.',
              `[trocar "x" por "tempoDoEscudo" em "Se valor da variável x > 0 dentro de ${BATIDA_3D}"]`,
            ],
            [
              'instrucao',
              'Clique no segundo sinal de mais, o de antes da palavra senão, e arraste Machucar nave tirando 1 de vida para dentro do senão. O som vai junto.',
              `[abrir "senão" em "${SE_ESCUDO_3D}"] [mover "Machucar nave tirando 1 de vida" para "${SE_ESCUDO_3D}" no "senão"]`,
            ],
            [
              'instrucao',
              'No então, encaixe Tocar o som pronto, de Jogo 3D e Som. Conserve o som moeda: é o som do escudo segurando a pedra.',
              `[abrir categoria Jogo 3D > Som] [encaixar "Tocar o som pronto" em "${SE_ESCUDO_3D}" no "então"]`,
            ],
            [
              'descoberta',
              'Repare: aqui o Se fica dentro da guarda da partida. A batida só conta durante a partida, e só tira vida sem escudo.',
            ],
            [
              'teste',
              'Clique em Rodar de novo, aperte Enter e pegue o item. Deixe uma pedra bater: ela some, e os corações continuam iguais.',
              '[rodar de novo] [tecla Enter] [aguardar 9 s] [apontar prévia]',
            ],
            ['pergunta', 'E quando é que o escudo da patrulha acaba?'],
            ['conversa', 'Ainda não acaba: o prazo é a próxima parte.'],
          ],
          steps: [
            'No encontro da nave com os asteroides, deixe visível o espaço logo abaixo de Tirar o objeto asteroideQueBateu.',
            'Em Programação → Lógica & Se, encaixe um Se nesse espaço e escolha tempoDoEscudo no lugar de x. Conserve > e 0.',
            'Clique no segundo + para abrir o senão e leve Machucar nave tirando 1 de vida (com o som) para dentro dele.',
            'No então, encaixe Tocar o som pronto (Jogo 3D → Som).',
          ],
          tests: [
            'Com o Escudo maior que 0, a pedra que bate só some: as vidas continuam iguais.',
            'Sem pegar o item, a pedra tira uma vida, como antes.',
          ],
          blockLabels: [
            'Se tempoDoEscudo > 0',
            'Tocar o som pronto',
            'senão: Machucar nave tirando 1 de vida',
          ],
          blockTypes: ['sz_js_if_else', 'sz_val_compare', 'sz_val_variable', 'sz_g3d_play_effect'],
          conferencia:
            'no encontro da nave com os asteroides, dentro da guarda e depois de tirar a pedra, está o Se tempoDoEscudo maior que 0, com o som no então e Machucar nave no senão, e nenhum Machucar fora do Se',
          mostrar: SE_ESCUDO_3D,
          notaDeGravacao: ESPERA,
        }),
        montagemPoder<EscudoEtapa>({
          key: 'acaba',
          title: 'O escudo acaba',
          etapa: 'acaba',
          objective:
            'Criar o relógio de 1 segundo que tira 1 de tempoDoEscudo enquanto ele é maior que 0, escreve o Escudo e faz a nave piscar.',
          ponte:
            'Dê um prazo ao escudo: a cada 1 segundo, Se tempoDoEscudo for maior que 0, ele perde 1, o texto do Escudo é escrito de novo e a nave pisca.',
          falas: [
            [
              'conversa',
              'Falta o prazo, como no jogo 2D: a cada segundo, o escudo perde um, até o zero. Na patrulha, o texto do Escudo também precisa ser escrito de novo a cada segundo.',
            ],
            encontrar('Enquanto estiver rodando'),
            [
              'instrucao',
              `Deixe à vista o espaço logo abaixo do relógio ${RELOGIO_3D}, o do item.`,
              `[arrastar até "${RELOGIO_3D}"] [apontar abaixo de "${RELOGIO_3D}"]`,
            ],
            [
              'instrucao',
              'Abra Jogo 3D, Tempo e sorteio e Tempo. Encaixe outro A cada segundos nesse espaço e troque o 2 por 1.',
              `[abrir categoria Jogo 3D > Tempo e sorteio > Tempo] [encaixar "A cada 2 segundos" abaixo de "${RELOGIO_3D}"] [trocar "2" por "1" em "A cada 2 segundos"]`,
            ],
            [
              'instrucao',
              'Abra Programação e depois Lógica e Se, encaixe um Se no fazer desse relógio, clique no x e escolha tempoDoEscudo.',
              `[apontar encaixe em "${CONTAGEM_3D}"] [abrir categoria Programação > Lógica & Se] [encaixar "Se" em "${CONTAGEM_3D}"] [trocar "x" por "tempoDoEscudo" em "Se dentro de ${CONTAGEM_3D}"]`,
            ],
            [
              'instrucao',
              'No então, encaixe Somar 1 em variável, de Programação e Variáveis. Troque o 1 por menos 1 e escolha tempoDoEscudo.',
              `[abrir categoria Programação > Variáveis] [encaixar "Somar 1 em variável" em "${SE_TEMPO_3D}" no "então"] [trocar "1" por "-1" em "Somar 1 em variável"] [trocar "contador" por "tempoDoEscudo" em "Somar -1 em variável"]`,
            ],
            [
              'instrucao',
              'Logo abaixo, escreva o Escudo de novo: Escrever na tela, em cima, à esquerda, com Escudo mais o valor de tempoDoEscudo. É o mesmo texto da parte anterior.',
              '[abrir categoria Jogo 3D > Placar, vida e telas > Na tela] [encaixar "Escrever na tela" abaixo de "Somar -1 em variável tempoDoEscudo"] [apontar bloco "Escrever na tela abaixo de Somar -1 em variável tempoDoEscudo"]',
            ],
            [
              'instrucao',
              'Abra Jogo 3D, Objetos e Aparência. Encaixe Fazer piscar logo abaixo, escolha nave e troque o tempo por 0.5.',
              '[abrir categoria Jogo 3D > Objetos > Aparência] [encaixar "Fazer" abaixo de "Escrever na tela abaixo de Somar -1 em variável tempoDoEscudo"] [apontar bloco "Fazer nave piscar"]',
            ],
            ['pergunta', 'E sem o Se, o que aconteceria com o número?'],
            ['conversa', 'Ele passaria do zero, como no jogo 2D. O Se faz o escudo parar no zero.'],
            [
              'teste',
              'Clique em Rodar de novo, aperte Enter e pegue o item. O Escudo desce de cinco a zero. Saia do meio e deixe uma pedra bater com o Escudo em zero: ela tira uma vida.',
              '[rodar de novo] [tecla Enter] [aguardar 9 s] [apontar prévia 70 24] [segurar tecla ArrowLeft por 0,8 s] [aguardar 6 s]',
            ],
          ],
          steps: [
            'Em Enquanto estiver rodando, deixe visível o espaço logo abaixo de A cada 4 segundos.',
            'Em Jogo 3D → Tempo e sorteio → Tempo, encaixe outro A cada segundos nesse espaço e troque o 2 por 1.',
            'No fazer, encaixe um Se (Programação → Lógica & Se) e escolha tempoDoEscudo no lugar de x. Conserve > e 0.',
            'No então: Somar −1 em variável tempoDoEscudo, Escrever na tela em cima, à esquerda, com "Escudo: " + tempoDoEscudo, e Fazer nave piscar por 0,5 s (Jogo 3D → Objetos → Aparência).',
          ],
          tests: [
            'Depois de pegar o item, o Escudo desce de 5 a 0, um por segundo, e a nave pisca.',
            'Com o Escudo em 0, a pedra volta a tirar vida. O número nunca fica negativo.',
          ],
          blockLabels: [
            'A cada 1 segundos',
            'Se tempoDoEscudo > 0',
            'Somar -1 em variável tempoDoEscudo',
            'Escrever na tela em cima, à esquerda',
            'Fazer nave piscar por 0.5 s',
          ],
          blockTypes: [
            'sz_g3d_every_seconds',
            'sz_js_if_else',
            'sz_js_var_increment',
            'sz_g3d_hud_text',
            'sz_g3d_blink',
          ],
          conferencia:
            'o relógio A cada 1 segundo tem o Se tempoDoEscudo maior que 0, e no então estão Somar menos 1 em tempoDoEscudo, o texto do Escudo e Fazer nave piscar',
          mostrar: CONTAGEM_3D,
          entrega: {
            reconhecimento:
              'Pronto, a patrulha também tem escudo com prazo: o item liga, a batida pergunta e o tempo acaba!',
            depois:
              'Depois do envio, ainda tem duas perguntas para você pensar no escudo. Quando aparecer Projeto enviado!, clique em Próxima parte.',
            saida: 'Próxima parte',
          },
          notaDeGravacao: ESPERA,
        }),
        {
          key: 'revisao',
          title: 'Pense no escudo da patrulha',
          kind: 'quiz',
          screen: 'Quiz com duas perguntas: uma previsão com cena e um diagnóstico.',
          ponte: RECADO_DO_QUIZ,
          text: '',
        },
      ],
    },
  ]
}

/** O Passo a passo de uma dimensão (as montagens da aula), para o `passo-a-passo.md`. */
export function escudoAjuda(d: PoderDimensaoConstrutor) {
  const aula = escudoAulas().find((a) => a.dimension === d)!
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
