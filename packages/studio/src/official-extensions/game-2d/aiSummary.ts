export const gameTwoDPromptSummary = `Jogo 2D expõe window.SZGame2D e blocos facilitadores para crianças iniciantes.

CICLO DE VIDA: use um único “Quando o jogo começar” como raiz. Dentro dele,
prepare a tela, crie sprites/grupos/variáveis, registre eventos e coloque os
blocos “A cada quadro”. Reiniciar limpa a partida e executa essa raiz novamente.
Projetos antigos sem essa raiz ainda reiniciam recarregando o preview.

QUADROS E EVENTOS: todos os blocos “A cada quadro” são compostos pelo mesmo
agendador, em passos fixos de 60 Hz. Tecla, clique e contato são registrados uma
vez no início, nunca dentro de “A cada quadro”. Movimento, desenho, checagens de
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
