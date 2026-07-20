import { withGameTwoDLifecycleGuidance } from './pedagogy'

export const gameTwoDPromptSummary =
  withGameTwoDLifecycleGuidance(`Jogo 2D expõe window.SZGame2D e blocos facilitadores para crianças iniciantes.

CICLO DE VIDA: use as Áreas do projeto.
[[G2D_LIFECYCLE_START]]
[[G2D_LIFECYCLE_EVENTS]]
[[G2D_LIFECYCLE_LOOP]]
O antigo “Quando o jogo começar” corresponde hoje à Área “Ao iniciar”. O Estúdio
liga o motor automaticamente. Reiniciar limpa a partida e executa de
novo as três áreas; não gere onStart nem um bloco manual de boot.

QUADROS E EVENTOS: todos os blocos “A cada quadro” são compostos pelo mesmo
agendador, em passos fixos de 60 Hz. Tecla, clique e contato são registrados uma
vez em ⚡ Quando acontecer, nunca dentro de “A cada quadro”. Comandos contínuos,
como checagens de grupo, ficam dentro do quadro ou em funções/métodos chamados
por ele, nunca diretamente em Ao iniciar ou em eventos. Movimento, desenho e HUD
seguem o mesmo fluxo. Um erro interrompe somente o bloco afetado.

ORDEM DIDÁTICA: preparar palco; criar personagens e grupos; definir tela “inicio”;
descrever objetivo e controles com “Descrever o jogo para leitor de tela”;
registrar Enter para começar/reiniciar; atualizar e desenhar somente na tela
“jogando”; mostrar instruções, vitória e derrota nas telas correspondentes.
Jogos precisam de controles, objetivo alcançável, feedback e novo jogo.

IMAGENS E MAPAS: use assets do projeto; nomes precisam coincidir. Tilemaps vêm do
Pinta/upload ou de uma grade declarada pela criança, nunca de cenário inventado
automaticamente. Sprites sem imagem continuam visíveis por cor.

O runtime prepara automaticamente os metadados internos do canvas e anuncia as
telas de início, vitória e derrota sem repetir a cada quadro.

VIDAS: inicialize a vida do sprite uma vez em ⚙️ Ao iniciar. Para contato contínuo,
use o bloco de machucar com invencibilidade; para perguntar pelo fim, prefira “as
vidas acabaram?”. “O sprite está invencível?” reflete se um novo dano seria ignorado;
combine com “não” antes de efeitos de dano. O HUD automático recebe o sprite e escolhe corações ou barra.
Sprite sem vida inicializada não é tratado como morto.

REGRAS: não misture com Jogo 2D Avançado. Não use bibliotecas externas nem JS cru
quando houver bloco equivalente. A paleta completa permanece disponível; as aulas
escolhem explicitamente quais blocos apresentar.`)
