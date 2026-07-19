export const gameKitPromptSummary = `Jogo 2D Avançado expõe window.SZGameKit e usa blocos reais de motor 2D.

ORDEM: setup/setupFull uma vez; declarar dados/personagens/mapas e ganchos;
start() por último. Movimento e física usam dt em segundos. onUpdate roda apenas
em "jogando"; onDraw redesenha o quadro; onDrawHud desenha sem câmera.

PARTIDA E ESTADOS: setState(nome) apenas troca o estado e nunca apaga progresso.
restartGame() começa uma partida limpa; onGameStart(fn) prepara cada partida nova.
onEnterState(nome, fn) reage a toda entrada naquele estado, inclusive ao voltar de
loja/inventário. Botões Jogar/Jogar de novo devem chamar restartGame().

MAPAS RPG: são duas responsabilidades obrigatoriamente separadas.
- "Criar mapa-cenário" / rpgCreateMap(nome, colunas, linhas, desenho) declara o
  espaço e o visual autoral: formas vetoriais, mapa de peças do Pinta ou imagem.
- "Quando entrar no mapa-cenário" / rpgOnEnterMap(nome, fn) declara paredes,
  NPCs, portas, encontros e demais comportamentos daquela entrada.
rpgSetStartMap(nome) escolhe o início. Sem ele, o primeiro mapa criado é o fallback.
Referência inexistente produz diagnóstico e cai no primeiro mapa válido. O herói
entra dentro dos limites, na célula livre mais próxima. Mapa-cenário e mapa de
peças devem ter as mesmas dimensões. Nunca invente mapa ou decoração automática.

IMAGENS: seletores de imagem carregam o asset escolhido automaticamente. loadImage
é opcional e serve para pré-carregar ou dar apelido. Um asset inválido mantém um
fallback visível e gera diagnóstico.

REGRAS: não misture com a extensão Jogo 2D, pois ambas controlam o canvas. Use
estados/telas para menu, pausa, derrota e vitória; objetivo alcançável e feedback
visual; reinício completo. Prefira os kits prontos de RPG, plataforma, luta,
monstrinhos, nave, defesa e cartas; só use peças de motor avançadas quando o projeto
precisar. Velocidade sempre × dt; start uma vez; sem bibliotecas externas.`
