export const gameKitPromptSummary = `Jogo 2D Avançado expõe window.SZGameKit e usa blocos reais de motor 2D.

ÁREAS: “🧩 Meus moldes” guarda o que só define uma receita (moldes, fichas, visuais,
efeitos, caminhos, regiões, sons carregados) e nada acontece ao criá-la;
“⚙️ Ao iniciar” contém setup/setupFull e declara dados, personagens e mapas;
inclua setStageDescription com objetivo, controles e perigos visuais para leitores
de tela; o runtime gerencia semântica e foco de canvas/painéis automaticamente.
“⚡ Quando acontecer” contém os chapéus de clique, aviso, estado e mapa;
“🔁 Enquanto estiver rodando”
contém onUpdate, onDraw, onDrawHud e cadências periódicas. O Estúdio registra as
áreas e chama o boot automaticamente: não gere start() nem onGameStart().
Movimento e física usam dt em segundos.
Comandos contínuos ficam dentro dessas raízes ou em funções/métodos chamados por
elas, nunca diretamente em Ao iniciar ou eventos. Tween/fade, rastro, inclinação
e o atirador automático da onda são configurados uma vez e nunca dentro de loop.

CAMPANHA PROFISSIONAL: para aventuras com muitas fases, use fixedSetup,
defineCampaign, um defineCampaignStage por fase e startCampaign. A fase é um
documento estático validado pelo editor visual; não gere rawJS nem objetos
dinâmicos para ela. O relógio é fixo em 60 Hz e as regras contínuas próprias vão
em onFixedUpdate. Prefira actionDown/actionPressed/actionReleased às teclas
físicas para teclado, toque e controle funcionarem juntos. Saves usam slots 1–3;
replay grava ações determinísticas. O exemplo canônico é “Reino Zero Pro”, com
8 mundos e 32 fases vetoriais.

PARTIDA E ESTADOS: setState(nome) apenas troca o estado e nunca apaga progresso.
restartGame() começa uma partida limpa e executa novamente as três áreas.
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
