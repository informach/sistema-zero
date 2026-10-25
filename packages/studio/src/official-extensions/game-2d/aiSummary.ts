import { basicSceneSummary as sceneSummary } from '../scene-2d/docs'
import { withGameTwoDLifecycleGuidance } from './pedagogy'

export const gameTwoDPromptSummary =
  withGameTwoDLifecycleGuidance(`Jogo 2D expõe window.SZGame2D e blocos facilitadores para crianças iniciantes.

CICLO DE VIDA: use as Áreas do projeto.
[[G2D_LIFECYCLE_MOLDS]]
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

TEXTO E NÚMEROS: sprites de texto aceitam variáveis, contas e listas. Criar no grupo
gera cópias independentes. Os dados do sprite separam resposta e aparência. Cliques
identificam alternativas, inclusive criadas depois. Receitas: Chuva de números e Quiz.

IMAGENS E MAPAS: use assets do projeto com os nomes corretos. Mapas vêm do Pinta,
upload ou grade da criança; não invente cenário automático. Prepare tamanho e posição
UMA vez, depois desenhe com drawTileMap(ctx, mapa). Sprites sem imagem usam cor.
Arte sem arquivos usa Figuras e tiles vetoriais. Confira o índice do contato antes
de trocar um tile de prêmio.

MAPA → MUNDO → FASE: Mundo é a área física (limites, mapas, figuras sólidas ou
plataformas e câmera) e pode existir sem Fases. Fase é opcional e genérica: Mundo +
posição inicial + evento de entrada; serve também para nave, puzzle ou uma tela fixa.
Entrar preserva o estado da área; Reiniciar restaura tiles e grupos registrados para a
Fase antes do evento de entrada recriar o conteúdo.
Cenas são estados de interface. Ondas são grupos/ritmos de inimigos dentro do mesmo
Mundo ou Fase, normalmente controladas por uma variável — não crie uma Fase por onda.
Para jogo de uma tela use só o necessário; para mapa rolável, prefira câmera do Mundo.

O runtime prepara automaticamente os metadados internos do canvas e anuncia as
telas de início, vitória e derrota sem repetir a cada quadro.

GRAVIDADE EXPLÍCITA: setGravity define o valor (padrão 0,6), sem mover. A cada quadro,
applyGravity vem antes do movimento dos sprites que caem. No terreno, use
platformerWithTerrain/jumpWithTerrain e collideWorld/collideCurrentLevel. Platformer
simples usa a borda como chão. Nos grupos, applyGravityToGroup vem antes de updateGroup
ou do atualizador de inimigos. Os helpers comuns não acrescentam gravidade.
Exceção: plataforma clássica inclui gravidade, aceleração e pulo variável. Ative os
controles semânticos uma vez em Ao iniciar e registre ações em Quando acontecer.
A ação pausar não muda o estado implicitamente.

VIDAS: inicialize a vida do sprite uma vez em ⚙️ Ao iniciar. Para contato contínuo,
use o bloco de machucar com invencibilidade; para perguntar pelo fim, prefira “as
vidas acabaram?”. “O sprite está invencível?” reflete se um novo dano seria ignorado;
combine com “não” antes de efeitos de dano. O HUD automático recebe o sprite e escolhe corações ou barra.
Sprite sem vida inicializada não é tratado como morto.

NÚCLEO INICIAL: quatro exemplos (Pegue a moeda, Herói que anda, Mini plataforma,
Sala com paredes), Cadê Todo Mundo? e A Chave do Farol. Todo Jogo 2D pertence ao
Iniciante 2D; as aulas apresentam as ferramentas gradualmente.

REGRAS: use Programação para regras e Jogo 2D para tela, desenho e interface.
Sem blocos HTML, CSS, SVG, Canvas ou código cru. A etapa direta usa HTML/CSS/Canvas
sem extensões. Não misture Jogo 2D Avançado nem bibliotecas externas.
${sceneSummary}`)
