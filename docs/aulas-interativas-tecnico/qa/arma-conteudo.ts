/**
 * A fonte editorial do Poder "Troca de arma" (Construtor): as falas gravadas, as notas de tela, as
 * falas do Zappy na página e os passos do caderno das duas aulas. O gerador (`gerar-arma.ts`) monta
 * manifestos, roteiros e caderno a partir daqui.
 *
 * A Aula 1 (2D) tem abertura, material, experiência (`weapon-swap`), três construções e o envio na
 * quarta; o quiz fecha a aula. A Aula 2 (3D) tem abertura, três construções e o envio na quarta; o
 * quiz fecha a aula. A tecla da troca é o E (o Jogo 3D não tem X).
 *
 * ⚠️ Duplicar um bloco (botão direito → Duplicar) não tem marca do robô de gravação: esses gestos
 * vão em captura manual, como no Tiro triplo.
 */
import type { ArmaEtapa } from './arma-projeto'
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
import type { PoderAula } from './poder-gerador'

const ESPERA =
  'Os tempos de espera são estimativas (o item nasce a cada 4 s desde que o jogo abre): acertar no Verificar plano.'
const DUPLICAR =
  'Duplicar (botão direito no bloco → Duplicar) e levar a cópia ao lugar, em captura manual: o robô não tem marca para esse gesto.'

const RELOGIO_2D = 'A cada 4 segundos'
const SE_RELOGIO_2D = `Se o estado do jogo é jogando dentro de ${RELOGIO_2D}`
const CRIAR_ITEM_2D = 'No grupo itensPlasma criar um sprite'
const BATIDA_2D = 'Para cada sprite do grupo asteroides que colidir com o sprite nave'
const PEGAR_2D = 'Para cada sprite do grupo itensPlasma'
const ENTER_2D = 'Quando apertar a tecla Enter'
const TECLA_E_2D = 'Quando apertar a tecla tecla E'
const SE_E_2D = `Se o estado do jogo é jogando dentro de ${TECLA_E_2D}`
const SE_LIBERADO_2D = `Se valor da variável plasmaLiberado dentro de ${TECLA_E_2D}`
const ESPACO_2D = 'Quando apertar a tecla barra de espaço'
const SE_ESPACO_2D = `Se o estado do jogo é jogando dentro de ${ESPACO_2D}`
const SE_ARMA_2D = `Se valor da variável arma dentro de ${ESPACO_2D}`
const LASER_2D = 'No grupo tiros criar um sprite'
const LEGENDA_2D = 'Escrever SETAS: mover   ESPAÇO: disparar'

const RELOGIO_3D = 'A cada 4 segundos'
const SE_JOGANDO_RELOGIO_3D = `Se valor da variável estado dentro de ${RELOGIO_3D}`
const BATIDA_3D = 'Quando nave encostar em algum do grupo asteroides'
const PEGAR_3D = 'Quando nave encostar em algum do grupo itensPlasma'
const SE_PEGAR_3D = `Se valor da variável estado dentro de ${PEGAR_3D}`
const ENTER_3D = 'Quando apertar a tecla Enter'
const TECLA_E_3D = 'Quando apertar a tecla E'
const SE_LIBERADO_3D = `Se valor da variável plasmaLiberado dentro de ${TECLA_E_3D}`
const ESPACO_3D = 'Quando apertar a tecla espaço'
const SE_ESPACO_3D = `Se valor da variável estado dentro de ${ESPACO_3D}`
const SE_ARMA_3D = `Se valor da variável arma dentro de ${ESPACO_3D}`
const LASER_3D = 'Criar uma cópia de moldeTiro'

export const armaExperiencia = {
  title: 'A experiência: a troca de arma',
  idea: 'A nave guarda numa variável qual é a arma: laser ou plasma. O item libera a troca, a tecla E troca a arma, e o Espaço pergunta qual arma está escolhida antes de criar o tiro. Uma partida nova começa de novo com o laser.',
  goals: [
    'Antes de pegar o item, aperte E e olhe a arma.',
    'Pegue o item e aperte E de novo.',
    'Dispare com o laser e com o plasma e compare os dois tiros.',
    'Com o plasma escolhido, comece uma partida nova e olhe a arma.',
  ],
  observe:
    'Antes e depois de cada tecla, observe a placa da arma e o tiro que sai. O Zappy te mostra o que testar, e você pode repetir quantas vezes quiser.',
}

export function armaAulas(): PoderAula<ArmaEtapa>[] {
  return [
    {
      slug: 'aula-1',
      title: 'Laser ou plasma',
      dimension: '2d',
      trechos: [
        {
          key: 'abertura',
          title: 'Uma arma nova',
          kind: 'intro',
          kids: ['O que muda no tiro quando a arma muda?'],
          screen: `Do "Oi" até o "uma arma nova", a tela mostra o título Troca de arma sobre a cena inicial do jogo pronto [na edição: título Troca de arma]. No "Clique no jogo e aperte Enter", ampliar o jogo pronto [ampliar jogo], clicar no meio do jogo [tocar jogo] e apertar Enter [tecla Enter]. No "Olha a placa da arma", apontar a placa [apontar jogo 700 82]. No "O que muda no tiro", manter a cena parada. No "Agora é a sua vez", voltar ao tamanho da aula [voltar à aula]. No "Quando terminar, clique em Próxima parte", clicar em **Próxima parte** [próxima parte]. Não pegar o item nem trocar a arma: a descoberta é da criança.`,
          ponte:
            'Sua vez! Jogue a versão pronta: pegue o item roxo, aperte E e dispare com as duas armas. Quando terminar, clique em Próxima parte.',
          text: '[upbeat, welcoming voice] Oi! A sua nave vai ganhar uma arma nova. [engaging, energetic, conversational voice] O jogo é a Nave Contra Asteroides que você montou: as setas movem a nave, e o Espaço dispara. [engaging, energetic, conversational voice] Clique no jogo e aperte Enter para começar a partida. [interested, animated voice] Olha a placa da arma, aqui do lado: ela mostra laser. De vez em quando, um item roxo cai pelo meio da tela. Pegue o item e aperte a tecla E. [curious] O que muda no tiro quando a arma muda? [engaging, energetic, conversational voice] Isso eu deixo para você descobrir. [upbeat, encouraging voice] Agora é a sua vez: troque de arma e dispare. Quando terminar, clique em Próxima parte.',
        },
        trechoDoMaterial<ArmaEtapa>(),
        {
          key: 'experiencia',
          title: 'A troca de arma',
          kind: 'experience',
          kids: ['E se você apertar E antes de pegar o item?'],
          screen: `A experiência aparece no tamanho da aula, com a cena parada. Do "Sabe a mochila" até o "na sua mão", a tela fica parada, e a edição troca esse trecho por um desenho nosso com o Zappy trocando a raquete por uma rede na mochila, mas só depois de achar a rede [na edição: o Zappy e a mochila]. No "No seu jogo, a arma", a tela volta para a experiência. ${telaDaExperienciaDoPoder('com a nave embaixo, a placa mostrando laser e o item ainda no alto, sem apontar controles nem testar')} O que a tecla E faz antes do item e o que a partida nova faz com a arma é a descoberta da criança, e quem acompanha cada teste é o Zappy, dentro da experiência.`,
          ponte:
            'Sua vez! Investigue a tecla E antes e depois do item, dispare com as duas armas e comece uma partida nova. O Zappy te mostra o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.',
          text: '[engaging, energetic, conversational voice] Até agora, o Espaço criava sempre o mesmo laser. Agora a nave vai ter duas armas. [confident, clear, unhurried voice] O jogo guarda numa variável qual é a arma, e o Espaço pergunta essa variável antes de criar o tiro. [engaging, energetic, conversational voice] Sabe a mochila? Você só troca a raquete pela rede depois de achar a rede, e o que você joga depende do que está na sua mão. [engaging, energetic, conversational voice] No seu jogo, a arma é o que está na mão da nave, e o item é a rede que libera a troca. [curious] E se você apertar E antes de pegar o item? [engaging, energetic, conversational voice] O que você acha? Isso você vai testar na experiência. [upbeat, encouraging voice] Agora você vai investigar a troca de arma. O Zappy vai te mostrando o que testar, e você pode repetir quando quiser. Quando terminar, clique em Próxima parte.',
        },
        montagemPoder<ArmaEtapa>({
          key: 'item',
          title: 'O item de plasma',
          etapa: 'item',
          objective:
            'Criar o relógio que solta o item pelo meio, só na partida, e o encontro que libera o plasma.',
          ponte:
            'Crie o item: a cada 4 segundos, só na partida, um item nasce no grupo itensPlasma, no meio; quando a nave encosta nele, o item sai e plasmaLiberado vira verdadeiro.',
          falas: [
            [
              'conversa',
              'O seu jogo já tem tudo para a troca de arma: o grupo itensPlasma, o desenho do item e as variáveis arma e plasmaLiberado. Primeiro, o item precisa cair. Depois, pegar o item libera o plasma.',
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
              'No então desse Se, encaixe No grupo criar um sprite com imagem, de Jogo 2D, Grupos e Criar e percorrer. Troque o grupo inimigos por itensPlasma.',
              `[abrir categoria Jogo 2D > Grupos > Criar e percorrer] [encaixar "No grupo inimigos criar um sprite" em "${SE_RELOGIO_2D}" no "então"] [trocar "inimigos" por "itensPlasma" em "No grupo inimigos criar um sprite"]`,
            ],
            [
              'instrucao',
              'Coloque 378 no x e menos 44 no y. Na largura e na altura, coloque 44.',
              `[trocar "100" por "378" em "${CRIAR_ITEM_2D}"] [trocar "100" por "-44" em "${CRIAR_ITEM_2D}"] [trocar "32" por "44" em "${CRIAR_ITEM_2D}"] [trocar "32" por "44" em "${CRIAR_ITEM_2D}"]`,
            ],
            [
              'instrucao',
              'Escolha a imagem item-plasma-redondo e, no último número, logo depois de vy, coloque 2.',
              `[trocar "inimigo" por "item-plasma-redondo" em "${CRIAR_ITEM_2D}"] aproximar o fim do bloco; editar somente o zero depois do rótulo vy para 2 e confirmar, em captura manual deste campo [apontar bloco "${CRIAR_ITEM_2D}"]`,
            ],
            [
              'conversa',
              'Agora o encontro. Pegar o item é uma batida, como a da pedra na nave, só que libera o plasma.',
            ],
            [
              'instrucao',
              'Dentro de A cada quadro do jogo, deixe à vista o espaço logo abaixo do encontro das pedras com a nave. Abra Jogo 2D, Colisões e Encostar e bloquear, e encaixe Para cada sprite do grupo que colidir com o sprite.',
              `[arrastar até "${BATIDA_2D}"] [apontar abaixo de "${BATIDA_2D}"] [abrir categoria Jogo 2D > Colisões > Encostar e bloquear] [encaixar "Para cada sprite do grupo" abaixo de "${BATIDA_2D}"]`,
            ],
            [
              'instrucao',
              'No grupo, escolha itensPlasma. Em chamar o sprite de, troque inimigo por itemPego.',
              '[trocar "asteroides" por "itensPlasma" em "Para cada sprite do grupo"] [trocar "inimigo" por "itemPego" em "Para cada sprite do grupo itensPlasma"]',
            ],
            [
              'instrucao',
              'No fazer, encaixe Tirar o sprite do grupo, de Grupos e Participação e limpeza. Escolha itemPego e o grupo itensPlasma.',
              `[abrir categoria Jogo 2D > Grupos > Participação e limpeza] [encaixar "Tirar o sprite" em "${PEGAR_2D}"] [trocar "asteroide" por "itemPego" em "Tirar o sprite dentro de ${PEGAR_2D}"] [trocar "asteroides" por "itensPlasma" em "Tirar o sprite itemPego"]`,
            ],
            [
              'instrucao',
              'Logo abaixo, encaixe Alterar variável para, de Programação e Variáveis. Troque contador por plasmaLiberado e, no lugar do 1, solte o valor verdadeiro, de Programação e Valores.',
              '[abrir categoria Programação > Variáveis] [encaixar "Alterar variável contador para" abaixo de "Tirar o sprite itemPego"] [trocar "contador" por "plasmaLiberado" em "Alterar variável contador para"] [abrir categoria Programação > Valores] [apontar bloco "Alterar variável plasmaLiberado para"]',
            ],
            [
              'instrucao',
              'Por último, encaixe Tocar efeito, de Jogo 2D, Som e Efeitos prontos, e escolha power-up.',
              '[abrir categoria Jogo 2D > Som > Efeitos prontos] [encaixar "Tocar efeito" abaixo de "Alterar variável plasmaLiberado para"] [trocar "moeda" por "power-up" em "Tocar efeito dentro de Para cada sprite do grupo itensPlasma"]',
            ],
            [
              'teste',
              'Clique no jogo e aperte Enter. Deixe a nave no meio: o item cai, a nave pega e toca o som. A tecla E ainda não faz nada.',
              '[tocar prévia 400 300] [tecla Enter] [aguardar 8 s] [apontar prévia 400 400]',
            ],
          ],
          steps: [
            'Em Enquanto estiver rodando, logo abaixo de A cada 1.5 segundos: A cada 4 segundos (Jogo 2D → Tempo → Quadros e intervalos), com um Se e a pergunta o estado do jogo é jogando.',
            'No então: No grupo itensPlasma criar um sprite com imagem item-plasma-redondo, x 378, y −44, largura e altura 44, vx 0 e vy 2.',
            'Logo abaixo do encontro das pedras com a nave: Para cada sprite do grupo itensPlasma que colidir com o sprite nave, chamando de itemPego.',
            'Dentro dele: Tirar o sprite itemPego do grupo itensPlasma, Alterar variável plasmaLiberado para verdadeiro e Tocar efeito power-up.',
          ],
          tests: [
            'Antes do Enter, nenhum item cai; na partida, um item cai pelo meio a cada 4 segundos.',
            'Com a nave parada no meio, ela pega o item e o som toca.',
          ],
          blockLabels: [
            'A cada 4 segundos',
            'No grupo itensPlasma criar um sprite com imagem item-plasma-redondo',
            'Para cada sprite do grupo itensPlasma que colidir com o sprite nave',
            'Alterar variável plasmaLiberado para verdadeiro',
          ],
          blockTypes: [
            'sz_g2d_every_seconds',
            ...TIPOS_GUARDA_2D,
            'sz_g2d_spawn_image_in_group',
            'sz_g2d_on_sprite_group_overlap',
            'sz_g2d_remove_from_group',
            'sz_js_var_assign',
            'sz_val_boolean',
          ],
          conferencia:
            'o relógio A cada 4 segundos cria o item no grupo itensPlasma só na partida, e o encontro com itensPlasma tira o item e muda plasmaLiberado para verdadeiro',
          mostrar: PEGAR_2D,
          notaDeGravacao: ESPERA,
        }),
        montagemPoder<ArmaEtapa>({
          key: 'troca',
          title: 'A tecla E troca a arma',
          etapa: 'troca',
          objective:
            'Na tecla E, durante a partida: só com o plasma liberado, laser vira plasma e plasma vira laser.',
          ponte:
            'Programe a troca: Quando apertar a tecla E, com a guarda da partida, Se plasmaLiberado = verdadeiro, então Se arma = laser, arma vira plasma; senão, arma vira laser.',
          falas: [
            [
              'conversa',
              'Agora a troca. A tecla E só pode trocar depois do item, então ela faz uma pergunta antes: o plasma está liberado?',
            ],
            encontrar('Quando acontecer'),
            [
              'instrucao',
              'Logo abaixo de Quando apertar a tecla Enter, encaixe outro Quando apertar a tecla, de Jogo 2D, Controles e Teclado, ações e toque. Escolha a tecla E.',
              `[arrastar até "${ENTER_2D}"] [abrir categoria Jogo 2D > Controles > Teclado, ações e toque] [encaixar "Quando apertar a tecla" abaixo de "${ENTER_2D}"] [trocar "→ seta direita" por "tecla E" em "Quando apertar a tecla → seta direita"]`,
            ],
            ...guarda2D(TECLA_E_2D),
            [
              'instrucao',
              'No então desse Se, encaixe outro Se. Escolha plasmaLiberado no x, o sinal de igual e, no lugar do zero, o valor verdadeiro.',
              `[abrir categoria Programação > Lógica & Se] [encaixar "Se" em "${SE_E_2D}" no "então"] [apontar bloco "${SE_LIBERADO_2D}"]`,
            ],
            [
              'instrucao',
              'Dentro dele, mais um Se: arma igual ao texto laser. Abra o senão desse Se.',
              `[abrir categoria Programação > Lógica & Se] [apontar bloco "${SE_LIBERADO_2D}"]`,
            ],
            [
              'instrucao',
              'No então, Alterar variável arma para o texto plasma. No senão, Alterar variável arma para o texto laser. Logo abaixo, Tocar efeito, com o efeito selecionar.',
              `[abrir categoria Programação > Variáveis] [apontar bloco "${SE_LIBERADO_2D}"]`,
            ],
            [
              'teste',
              'Clique no jogo e aperte Enter. Aperte E antes do item: nada muda. Pegue o item e aperte E: o som de trocar toca. A placa ainda não aparece.',
              '[tocar prévia 400 300] [tecla Enter] [tecla e] [aguardar 8 s] [tecla e]',
            ],
            ['pergunta', 'Como saber qual é a arma agora?'],
            ['conversa', 'Por enquanto, não dá para ver. A placa da arma é a próxima parte.'],
          ],
          steps: [
            'Em Quando acontecer, logo abaixo de Quando apertar a tecla Enter: Quando apertar a tecla E (Jogo 2D → Controles → Teclado, ações e toque), com um Se e a pergunta o estado do jogo é jogando.',
            'No então: Se plasmaLiberado = verdadeiro.',
            'Dentro: Se arma = "laser", com o senão aberto: no então, Alterar variável arma para "plasma"; no senão, Alterar variável arma para "laser". Logo abaixo, Tocar efeito selecionar.',
          ],
          tests: [
            'Antes do item, a tecla E não troca nada.',
            'Depois do item, a tecla E troca a arma e toca o som.',
          ],
          blockLabels: [
            'Quando apertar a tecla E',
            'Se plasmaLiberado = verdadeiro',
            'Se arma = "laser"',
            'Alterar variável arma para "plasma"',
          ],
          blockTypes: [
            'sz_g2d_on_key',
            ...TIPOS_GUARDA_2D,
            'sz_val_compare',
            'sz_js_var_assign',
            'sz_val_text',
          ],
          conferencia:
            'na tecla E, dentro da guarda da partida, o Se plasmaLiberado igual a verdadeiro troca arma entre laser e plasma',
          mostrar: SE_LIBERADO_2D,
          notaDeGravacao: ESPERA,
        }),
        montagemPoder<ArmaEtapa>({
          key: 'placar',
          title: 'A placa da arma',
          etapa: 'placar',
          objective: 'Mostrar na tela qual é a arma: Arma, dois-pontos, mais o valor de arma.',
          ponte:
            'Mostre a arma: no fim de A cada quadro do jogo, Escrever "Arma: " + arma, em x 700 e y 82.',
          falas: [
            [
              'conversa',
              'A arma é uma variável, e o que está numa variável não aparece sozinho na tela.',
            ],
            encontrar('Enquanto estiver rodando'),
            [
              'instrucao',
              'Logo abaixo da legenda SETAS mover, ESPAÇO disparar, encaixe Escrever, de Jogo 2D, Vida e placar e Indicadores e texto na tela.',
              `[arrastar até "${LEGENDA_2D}"] [abrir categoria Jogo 2D > Vida e placar > Indicadores e texto na tela] [encaixar "Escrever" abaixo de "${LEGENDA_2D}"]`,
            ],
            [
              'instrucao',
              'No texto, solte uma conta de juntar: o texto Arma, dois-pontos e um espaço, mais valor da variável arma. Coloque 700 no x e 82 no y.',
              '[abrir categoria Programação > Valores] [apontar bloco "Escrever abaixo de Escrever SETAS: mover   ESPAÇO: disparar"]',
            ],
            [
              'teste',
              'Clique no jogo e aperte Enter. A placa mostra Arma laser. Pegue o item, aperte E e veja a placa mudar. Dispare: ainda sai o laser.',
              '[tocar prévia 400 300] [tecla Enter] [apontar prévia 700 82] [aguardar 8 s] [tecla e] [tecla Space]',
            ],
            ['pergunta', 'A placa diz plasma, mas o tiro é o laser. Por quê?'],
            [
              'conversa',
              'Porque o Espaço ainda não pergunta a arma. Na próxima parte, ele vai perguntar.',
            ],
          ],
          steps: [
            'No fim de A cada quadro do jogo, logo abaixo da legenda dos controles: Escrever (Jogo 2D → Vida e placar → Indicadores e texto na tela) com "Arma: " + valor da variável arma, x 700, y 82.',
          ],
          tests: ['A placa mostra Arma: laser e muda para plasma quando a tecla E troca a arma.'],
          blockLabels: ['Escrever "Arma: " + arma'],
          blockTypes: ['sz_g2d_draw_label', 'sz_math_arithmetic', 'sz_val_variable'],
          conferencia: 'no fim do quadro, Escrever mostra Arma, dois-pontos, mais o valor de arma',
          mostrar: LEGENDA_2D,
          notaDeGravacao: ESPERA,
        }),
        montagemPoder<ArmaEtapa>({
          key: 'disparo',
          title: 'O Espaço pergunta a arma',
          etapa: 'disparo',
          objective:
            'No Espaço, Se arma = plasma, criar o plasma no grupo tirosPlasma; senão, o laser de sempre.',
          ponte:
            'No Espaço, dentro de Se jogando: Se arma = plasma, o plasma no grupo tirosPlasma; senão, o laser de sempre.',
          falas: [
            ['conversa', 'Agora o Espaço precisa perguntar: qual é a arma?'],
            encontrar('Quando acontecer'),
            [
              'instrucao',
              'Encontre Quando apertar a tecla barra de espaço e encaixe um Se no começo do então do Se jogando. O laser e o som descem para baixo dele.',
              `[arrastar até "${ESPACO_2D}"] [abrir categoria Programação > Lógica & Se] [encaixar "Se" em "${SE_ESPACO_2D}" no "então"]`,
            ],
            [
              'instrucao',
              'Na pergunta, escolha arma no x, o sinal de igual e, no lugar do zero, o texto plasma.',
              `[trocar "x" por "arma" em "Se dentro de ${ESPACO_2D}"] [apontar bloco "${SE_ARMA_2D}"]`,
            ],
            [
              'instrucao',
              'Abra o senão e leve o laser, com o som, para dentro dele.',
              `[abrir "senão" em "${SE_ARMA_2D}"] [mover "${LASER_2D}" para "${SE_ARMA_2D}" no "senão"]`,
            ],
            [
              'instrucao',
              'Duplique o laser e leve a cópia para o então. Na cópia, troque o grupo por tirosPlasma, a imagem por plasma-roxo, o menos 5 por menos 12, o menos 24 por menos 32, a largura por 24, a altura por 32 e o vy por menos 4.',
              `[apontar bloco "${LASER_2D} dentro de ${SE_ARMA_2D}"]`,
            ],
            [
              'instrucao',
              'Logo abaixo do plasma, Tocar efeito, com o efeito laser.',
              `[abrir categoria Jogo 2D > Som > Efeitos prontos] [apontar bloco "${SE_ARMA_2D}"]`,
            ],
            [
              'descoberta',
              'O plasma vai para outro grupo, tirosPlasma, que já vem pronto: ele anda mais devagar e também acerta as pedras.',
            ],
            [
              'teste',
              'Clique no jogo e aperte Enter. Dispare: sai o laser. Pegue o item, aperte E e dispare: sai o plasma, grande e lento.',
              '[tocar prévia 400 300] [tecla Enter] [tecla Space] [aguardar 8 s] [tecla e] [tecla Space]',
            ],
          ],
          steps: [
            'No Espaço, dentro do então de Se jogando, encaixe um Se no começo (Programação → Lógica & Se). O laser e o som descem para baixo dele.',
            'Na pergunta: arma = "plasma".',
            'Abra o senão e leve o laser, com o som, para dentro dele.',
            'Duplique o laser para o então e troque: grupo tirosPlasma, imagem plasma-roxo, x centro x da nave − 12, y da nave − 32, largura 24, altura 32, vy −4. Logo abaixo, Tocar efeito laser.',
          ],
          tests: [
            'Com o laser, o Espaço cria o laser fino.',
            'Depois de trocar, o Espaço cria o plasma grande e lento.',
            'Uma partida nova volta ao laser.',
          ],
          blockLabels: [
            'Se arma = "plasma"',
            'então: o plasma em tirosPlasma',
            'senão: o laser de sempre',
          ],
          blockTypes: ['sz_js_if_else', 'sz_val_compare', 'sz_g2d_spawn_image_in_group'],
          conferencia:
            'no Espaço, dentro do Se jogando, o Se arma igual a plasma cria o plasma em tirosPlasma; no senão, o laser de antes',
          mostrar: SE_ARMA_2D,
          notaDeGravacao: `${ESPERA} ${DUPLICAR}`,
          entrega: {
            reconhecimento:
              'Pronto, a sua nave tem duas armas: o item libera o plasma, a tecla E troca e o Espaço pergunta qual arma está na mão!',
            depois:
              'Depois do envio, ainda tem algumas perguntas para você pensar na troca de arma. Quando aparecer Projeto enviado!, clique em Próxima parte.',
            saida: 'Próxima parte',
          },
        }),
        {
          key: 'revisao',
          title: 'Pense na troca de arma',
          kind: 'quiz',
          screen: 'Quiz com quatro perguntas: três previsões com cena e uma escolha de teste.',
          ponte: RECADO_DO_QUIZ,
          text: '',
        },
      ],
    },
    {
      slug: 'aula-2',
      title: 'A troca de arma na patrulha',
      dimension: '3d',
      trechos: [
        {
          key: 'abertura',
          title: 'A troca chegou à patrulha',
          kind: 'intro',
          kids: ['No espaço em três dimensões, a placa da arma muda sozinha?'],
          screen: `Do "Oi" até o "em três dimensões", a tela mostra o título A troca de arma na patrulha sobre a cena inicial do jogo pronto [na edição: título A troca de arma na patrulha]. No "Clique no jogo e aperte Enter", ampliar o jogo pronto [ampliar jogo], clicar no meio do jogo [tocar jogo] e apertar Enter [tecla Enter]. No "Olha o texto Arma", apontar o texto [apontar jogo 70 24]. No "No espaço em três dimensões", manter a cena parada. No "Agora é a sua vez", voltar ao tamanho da aula [voltar à aula]. No "Quando terminar, clique em Próxima parte", clicar em **Próxima parte** [próxima parte]. Não pegar o item: a partida é da criança.`,
          ponte:
            'Sua vez! Jogue a versão pronta: leve a nave para a esquerda, pegue o item, aperte E e dispare. Quando terminar, clique em Próxima parte.',
          text: '[upbeat, welcoming voice] Oi! Na Aula 1, você programou a troca de arma no jogo 2D. Agora ela chegou à Patrulha Espacial, em três dimensões! [engaging, energetic, conversational voice] Clique no jogo e aperte Enter para começar a patrulha. [interested, animated voice] Olha o texto Arma, no alto à esquerda: ele mostra laser. O item de plasma vem pela esquerda. [curious] No espaço em três dimensões, a placa da arma muda sozinha? [engaging, energetic, conversational voice] Isso eu deixo para você descobrir. [upbeat, encouraging voice] Agora é a sua vez: pegue o item e troque de arma. Quando terminar, clique em Próxima parte.',
        },
        montagemPoder<ArmaEtapa>({
          key: 'item',
          title: 'O item vem pela esquerda',
          etapa: 'item',
          objective:
            'Criar o relógio que cria uma cópia do item à esquerda, só na partida, e o encontro que libera o plasma.',
          ponte:
            'Crie o item: a cada 4 segundos, só na partida, uma cópia de moldePlasmaItem em x −4, y 1, z −20; quando a nave encosta nela, o item sai e plasmaLiberado vira verdadeiro.',
          falas: [
            [
              'conversa',
              'Na patrulha, a troca de arma já tem o molde do item, o grupo itensPlasma, o movimento dos itens e as variáveis. Falta o relógio do item e o encontro que libera o plasma.',
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
              'No então, encaixe Criar uma cópia, de Jogo 3D e Grupos. Escolha moldePlasmaItem e o grupo itensPlasma.',
              `[abrir categoria Jogo 3D > Grupos] [encaixar "Criar uma cópia" em "${SE_JOGANDO_RELOGIO_3D}" no "então"] [trocar "molde" por "moldePlasmaItem" em "Criar uma cópia dentro de ${RELOGIO_3D}"] [trocar "inimigos" por "itensPlasma" em "Criar uma cópia dentro de ${RELOGIO_3D}"]`,
            ],
            [
              'instrucao',
              'Na posição, coloque menos 4 no x, 1 no y e menos 20 no z. O menos 4 é a faixa da esquerda.',
              '[trocar "0" por "-4" em "Criar uma cópia de moldePlasmaItem"] [trocar "0" por "1" em "Criar uma cópia de moldePlasmaItem"] [trocar "0" por "-20" em "Criar uma cópia de moldePlasmaItem"]',
            ],
            encontrar('Quando acontecer'),
            [
              'instrucao',
              `Logo abaixo do encontro ${BATIDA_3D}, encaixe Quando heroi encostar em algum do grupo, de Jogo 3D, Encostar e Encostar. Escolha nave, itensPlasma e chame o item de itemPego.`,
              `[arrastar até "${BATIDA_3D}"] [abrir categoria Jogo 3D > Encostar > Encostar] [encaixar "Quando heroi encostar em algum do grupo" abaixo de "${BATIDA_3D}"] [trocar "heroi" por "nave" em "Quando heroi encostar em algum do grupo"] [trocar "estrelas" por "itensPlasma" em "Quando nave encostar em algum do grupo"] [trocar "item" por "itemPego" em "Quando nave encostar em algum do grupo itensPlasma"]`,
            ],
            ...guardaPatrulha(PEGAR_3D, 'o encontro da nave com os itens'),
            [
              'instrucao',
              'No então: Tirar o objeto do grupo, com itemPego e itensPlasma, e logo abaixo Alterar variável plasmaLiberado para verdadeiro.',
              `[abrir categoria Jogo 3D > Grupos] [encaixar "Tirar o objeto inimigo do grupo" em "${SE_PEGAR_3D}" no "então"] [trocar "inimigo" por "itemPego" em "Tirar o objeto inimigo do grupo"] [trocar "asteroides" por "itensPlasma" em "Tirar o objeto itemPego do grupo"] [abrir categoria Programação > Variáveis] [encaixar "Alterar variável contador para" abaixo de "Tirar o objeto itemPego do grupo itensPlasma"] [trocar "contador" por "plasmaLiberado" em "Alterar variável contador para"]`,
            ],
            [
              'teste',
              'Clique em Rodar de novo e aperte Enter. Leve a nave para a borda da esquerda: o item vem, a nave pega e toca o som.',
              '[rodar de novo] [tecla Enter] [segurar tecla ArrowLeft por 0,8 s] [aguardar 7 s]',
            ],
          ],
          steps: [
            'Em Enquanto estiver rodando, logo abaixo de A cada 1.5 segundos: A cada 4 segundos (Jogo 3D → Tempo e sorteio → Tempo).',
            ...passosGuardaPatrulha('o relógio A cada 4 segundos'),
            'No então: Criar uma cópia de moldePlasmaItem no grupo itensPlasma, em x −4, y 1, z −20.',
            'Em Quando acontecer, logo abaixo do encontro com os asteroides: Quando nave encostar em algum do grupo itensPlasma, chamando de itemPego, com a guarda da partida.',
            'No então: Tirar o objeto itemPego do grupo itensPlasma e Alterar variável plasmaLiberado para verdadeiro.',
          ],
          tests: [
            'Antes do Enter, nenhum item nasce; na partida, um item vem pela esquerda a cada 4 segundos.',
            'Na borda da esquerda, a nave pega o item.',
          ],
          blockLabels: [
            'A cada 4 segundos',
            'Criar uma cópia de moldePlasmaItem no grupo itensPlasma',
            'Quando nave encostar em algum do grupo itensPlasma',
            'Alterar variável plasmaLiberado para verdadeiro',
          ],
          blockTypes: [
            'sz_g3d_every_seconds',
            ...TIPOS_GUARDA,
            'sz_g3d_spawn_copy',
            'sz_g3d_on_touch_group',
            'sz_g3d_remove_from_group',
            'sz_js_var_assign',
            'sz_val_boolean',
          ],
          conferencia:
            'o relógio A cada 4 segundos cria a cópia de moldePlasmaItem em x menos 4 só na partida, e o encontro com itensPlasma tira o item e muda plasmaLiberado para verdadeiro',
          mostrar: PEGAR_3D,
          notaDeGravacao: ESPERA,
        }),
        montagemPoder<ArmaEtapa>({
          key: 'troca',
          title: 'A tecla E troca a arma',
          etapa: 'troca',
          objective: 'Na tecla E, durante a partida e só com o plasma liberado, trocar a arma.',
          ponte:
            'Programe a troca: Quando apertar a tecla E, com a guarda da partida, Se plasmaLiberado = verdadeiro, então Se arma = laser, arma vira plasma; senão, arma vira laser.',
          falas: [
            ['conversa', 'A mesma troca do jogo 2D. No Jogo 3D, a tecla E também está na lista.'],
            encontrar('Quando acontecer'),
            [
              'instrucao',
              'Logo abaixo de Quando apertar a tecla Enter, encaixe outro Quando apertar a tecla, de Jogo 3D e Controles. Escolha a tecla E.',
              `[arrastar até "${ENTER_3D}"] [abrir categoria Jogo 3D > Controles] [encaixar "Quando apertar a tecla" abaixo de "${ENTER_3D}"] [trocar "W (frente)" por "E" em "Quando apertar a tecla W (frente)"]`,
            ],
            ...guardaPatrulha(TECLA_E_3D, 'a tecla E'),
            [
              'instrucao',
              'No então, Se plasmaLiberado igual a verdadeiro. Dentro, Se arma igual ao texto laser, com o senão aberto: no então, arma vira plasma; no senão, arma vira laser.',
              `[abrir categoria Programação > Lógica & Se] [apontar bloco "${SE_LIBERADO_3D}"]`,
            ],
            [
              'teste',
              'Clique em Rodar de novo, aperte Enter, pegue o item na esquerda e aperte E. A troca acontece, mas o texto ainda não mostra a arma.',
              '[rodar de novo] [tecla Enter] [segurar tecla ArrowLeft por 0,8 s] [aguardar 7 s] [tecla KeyE]',
            ],
            ['pergunta', 'Como saber qual é a arma agora, na patrulha?'],
            ['conversa', 'Por enquanto, não dá para ver. O texto da arma é a próxima parte.'],
          ],
          steps: [
            'Em Quando acontecer, logo abaixo de Quando apertar a tecla Enter: Quando apertar a tecla E (Jogo 3D → Controles).',
            ...passosGuardaPatrulha('a tecla E'),
            'No então: Se plasmaLiberado = verdadeiro; dentro, Se arma = "laser", com o senão aberto: no então, Alterar variável arma para "plasma"; no senão, Alterar variável arma para "laser".',
          ],
          tests: ['Antes do item, a tecla E não troca nada; depois do item, troca.'],
          blockLabels: [
            'Quando apertar a tecla E',
            'Se plasmaLiberado = verdadeiro',
            'Se arma = "laser"',
          ],
          blockTypes: [
            'sz_g3d_on_key',
            ...TIPOS_GUARDA,
            'sz_val_compare',
            'sz_js_var_assign',
            'sz_val_text',
          ],
          conferencia:
            'na tecla E, dentro da guarda da partida, o Se plasmaLiberado igual a verdadeiro troca arma entre laser e plasma',
          mostrar: SE_LIBERADO_3D,
          notaDeGravacao: ESPERA,
        }),
        montagemPoder<ArmaEtapa>({
          key: 'placar',
          title: 'O texto da arma',
          etapa: 'placar',
          objective:
            'Escrever a arma na tela em Ao iniciar e de novo a cada troca: Arma, dois-pontos, mais o valor de arma.',
          ponte:
            'Mostre a arma: em Ao iniciar e logo depois da troca, Escrever na tela, em cima, à esquerda, "Arma: " + arma.',
          falas: [
            [
              'conversa',
              'No Jogo 3D, o texto da tela só muda quando é escrito de novo. Por isso, ele vai em dois lugares.',
            ],
            encontrar('Ao iniciar'),
            [
              'instrucao',
              'Logo abaixo do placar dos acertos, Escrever na tela, em cima, à esquerda, com Arma, dois-pontos e um espaço, mais o valor de arma.',
              '[abrir categoria Jogo 3D > Placar, vida e telas > Na tela] [encaixar "Escrever na tela" abaixo de "Escrever na tela em cima, à direita"] [apontar bloco "Escrever na tela abaixo de Escrever na tela em cima, à direita"]',
            ],
            encontrar('Quando acontecer'),
            [
              'instrucao',
              'Na tecla E, logo depois do Se arma igual a laser, ainda dentro do Se plasmaLiberado, escreva o mesmo texto de novo.',
              `[abrir categoria Jogo 3D > Placar, vida e telas > Na tela] [apontar bloco "${SE_LIBERADO_3D}"]`,
            ],
            [
              'teste',
              'Clique em Rodar de novo. O texto mostra Arma laser. Aperte Enter, pegue o item na esquerda e aperte E: o texto muda para plasma.',
              '[rodar de novo] [apontar prévia 70 24] [tecla Enter] [segurar tecla ArrowLeft por 0,8 s] [aguardar 7 s] [tecla KeyE]',
            ],
          ],
          steps: [
            'Em Ao iniciar, logo abaixo do placar dos acertos: Escrever na tela, em cima, à esquerda, "Arma: " + arma.',
            'Na tecla E, dentro do Se plasmaLiberado, logo depois do Se arma = "laser": o mesmo Escrever na tela.',
          ],
          tests: ['O texto mostra Arma: laser e muda para plasma quando a tecla E troca a arma.'],
          blockLabels: ['Escrever na tela em cima, à esquerda "Arma: " + arma'],
          blockTypes: ['sz_g3d_hud_text', 'sz_math_arithmetic', 'sz_val_variable'],
          conferencia: 'o texto Arma está em Ao iniciar e é escrito de novo logo depois da troca',
          mostrar: SE_LIBERADO_3D,
          notaDeGravacao: ESPERA,
        }),
        montagemPoder<ArmaEtapa>({
          key: 'disparo',
          title: 'O Espaço pergunta a arma',
          etapa: 'disparo',
          objective:
            'No Espaço, Se arma = plasma, a cópia do plasma no grupo tirosPlasma; senão, o laser de sempre.',
          ponte:
            'No Espaço, dentro de Se jogando: Se arma = plasma, uma cópia de moldePlasma no grupo tirosPlasma; senão, o laser de sempre.',
          falas: [
            ['conversa', 'Agora o Espaço da patrulha também pergunta a arma.'],
            encontrar('Quando acontecer'),
            [
              'instrucao',
              'Encontre Quando apertar a tecla espaço e encaixe um Se no começo do então do Se jogando. Na pergunta, escolha arma no x, o sinal de igual e, no lugar do zero, o texto plasma.',
              `[arrastar até "${ESPACO_3D}"] [abrir categoria Programação > Lógica & Se] [encaixar "Se" em "${SE_ESPACO_3D}" no "então"] [trocar "x" por "arma" em "Se dentro de ${ESPACO_3D}"] [apontar bloco "${SE_ARMA_3D}"]`,
            ],
            [
              'instrucao',
              'Abra o senão e leve a cópia do laser, com a nota, para dentro dele.',
              `[abrir "senão" em "${SE_ARMA_3D}"] [mover "${LASER_3D}" para "${SE_ARMA_3D}" no "senão"]`,
            ],
            [
              'instrucao',
              'Duplique a cópia para o então e troque moldeTiro por moldePlasma e tiros por tirosPlasma. Na nota, 330 e 120.',
              `[apontar bloco "${LASER_3D} dentro de ${SE_ARMA_3D}"]`,
            ],
            [
              'teste',
              'Clique em Rodar de novo e aperte Enter. Dispare: sai o laser. Pegue o item, aperte E e dispare: sai o plasma.',
              '[rodar de novo] [tecla Enter] [tecla Space] [segurar tecla ArrowLeft por 0,8 s] [aguardar 7 s] [tecla KeyE] [tecla Space]',
            ],
          ],
          steps: [
            'No Espaço, dentro do então de Se jogando: Se arma = "plasma", com o senão aberto.',
            'No senão: a cópia do laser e a nota de sempre.',
            'No então: Criar uma cópia de moldePlasma no grupo tirosPlasma, na posição x da nave, y 1, z −1.6, e Tocar a nota 330 por 120.',
          ],
          tests: [
            'Com o laser, o Espaço cria o laser.',
            'Depois de trocar, o Espaço cria o plasma.',
            'Voltar ao início começa de novo com o laser.',
          ],
          blockLabels: [
            'Se arma = "plasma"',
            'então: a cópia de moldePlasma',
            'senão: o laser de sempre',
          ],
          blockTypes: ['sz_js_if_else', 'sz_val_compare', 'sz_g3d_spawn_copy'],
          conferencia:
            'no Espaço, o Se arma igual a plasma cria a cópia de moldePlasma em tirosPlasma; no senão, o laser de antes',
          mostrar: SE_ARMA_3D,
          notaDeGravacao: `${ESPERA} ${DUPLICAR}`,
          entrega: {
            reconhecimento:
              'Pronto, a patrulha também tem duas armas: o texto mostra a arma e o Espaço pergunta antes de criar o tiro!',
            depois:
              'Depois do envio, ainda tem duas perguntas para você pensar na troca de arma. Quando aparecer Projeto enviado!, clique em Próxima parte.',
            saida: 'Próxima parte',
          },
        }),
        {
          key: 'revisao',
          title: 'Pense na troca de arma da patrulha',
          kind: 'quiz',
          screen: 'Quiz com duas perguntas: uma previsão com cena e um diagnóstico.',
          ponte: RECADO_DO_QUIZ,
          text: '',
        },
      ],
    },
  ]
}

export function armaAjuda(d: PoderDimensaoConstrutor) {
  const aula = armaAulas().find((a) => a.dimension === d)!
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
