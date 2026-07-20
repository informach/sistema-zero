export const gameTwoDPromptSummary = `Jogo 2D expõe window.SZGame2D e blocos facilitadores para crianças iniciantes.

CICLO DE VIDA: use as Áreas do projeto. “Ao iniciar” prepara tela,
sprites/grupos/variáveis; “Eventos” recebe somente os chapéus “Quando…”; “Loop
principal” recebe “A cada quadro”, “A cada N quadros” e “A cada N segundos”. O
antigo “Quando o jogo começar” corresponde hoje à Área “Ao iniciar”. O Estúdio
liga o motor automaticamente. Reiniciar limpa a partida e executa de
novo as três áreas; não gere onStart nem um bloco manual de boot.

QUADROS E EVENTOS: todos os blocos “A cada quadro” são compostos pelo mesmo
agendador, em passos fixos de 60 Hz. Tecla, clique e contato são registrados uma
vez em Eventos, nunca dentro de “A cada quadro”. Movimento, desenho, checagens de
grupo e HUD ficam dentro do quadro. Um erro interrompe somente o bloco afetado.

ORDEM DIDÁTICA: preparar palco; criar personagens e grupos; definir tela “inicio”;
registrar Enter para começar/reiniciar; atualizar e desenhar somente na tela
“jogando”; mostrar instruções, vitória e derrota nas telas correspondentes.
Jogos precisam de controles, objetivo alcançável, feedback e novo jogo.

IMAGENS E MAPAS: use assets do projeto; nomes precisam coincidir. Tilemaps vêm do
Pinta/upload ou de uma grade declarada pela criança, nunca de cenário inventado
automaticamente. Sprites sem imagem continuam visíveis por cor.

REGRAS: não misture com Jogo 2D Avançado. Não use bibliotecas externas nem JS cru
quando houver bloco equivalente. A paleta completa permanece disponível; as aulas
escolhem explicitamente quais blocos apresentar.`
