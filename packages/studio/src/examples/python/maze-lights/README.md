# Labirinto das Luzes

Guie o explorador pelo labirinto, recolha as luzes e escape dos sete drones.
Você começa com três vidas. O jogo usa Python, Turtle e o módulo de som `sz_audio`.

## Como jogar

1. Clique em **Executar** e espere a abertura de 2,5 segundos.
2. Use as **setas** para mudar de direção. O explorador continua andando até encontrar uma parede.
3. Recolha todas as luzes para vencer. Os túneis nas bordas de cima e de baixo ligam as duas pontas do mapa.
4. Evite os drones: uma colisão tira uma vida e reposiciona os personagens.

As luzes pequenas valem 2 pontos. As grandes valem 50 e aumentam sua velocidade por 3 segundos.
Esse bônus **não** dá invencibilidade nem permite comer os drones.
A luz no ponto inicial é retirada sem dar pontos.

Ao vencer ou perder as três vidas, o placar final aparece por 3 segundos e a janela fecha.
**Esc** encerra a partida. Para jogar de novo no Estúdio, use **Parar** e **Executar**.
No computador, execute `main.py` novamente.

## Experimente mudar o jogo

- `constants.py`: velocidades, tamanho das células e alcance do radar dos drones.
- `mazes.py`: mapa em texto. `X` é parede, `.` é luz pequena e `O` é luz grande.
- `renderer.py`: cores, formas geométricas e painel.
- `actors.py`: movimento, colisão com paredes e perseguição.
- `main.py`: teclas, pontuação, vidas, sons e encerramento.

Mude uma coisa de cada vez e teste. Ao editar o mapa, mantenha todas as linhas com a mesma largura
e deixe espaço para o explorador e os drones começarem separados.

Os sons `opening.wav`, `collect.wav` e `collision.wav` ficam junto de `main.py`.
Mantenha seus nomes ou atualize também os caminhos usados no código.

## Continuar no computador ou no VS Code

Exporte o **código-fonte**, extraia o ZIP inteiro e abra a pasta no VS Code.
Siga o `LEIA-ME-Sistema-Zero.txt` incluído na exportação para criar o ambiente Python
e instalar o pacote de áudio que acompanha o projeto. Depois, no terminal dessa pasta,
execute `python main.py`.

Turtle faz parte do Python e precisa do Tk instalado no computador; não instale um pacote chamado
`turtle` pelo pip. `sz_audio` é um módulo separado, incluído na exportação quando o ambiente do projeto
oferece essa versão. Ele usa dependências de áudio nativas, indicadas no pacote exportado.
O `requirements.txt` deste exemplo fica vazio porque o jogo no Estúdio usa os módulos do seu ambiente.

O som começa sem bloquear o programa. A janela e o laço normal do Turtle mantêm esta partida aberta;
fechar a janela ou parar o projeto também encerra o áudio. Um programa de console muito curto pode
terminar antes de o som acabar.

## Créditos

Este jogo adapta código MIT de **TheWannabeCoder**. As formas geométricas e os três sons são próprios
do **Sistema Zero**. Leia `NOTICE.md` e mantenha o arquivo `LICENSE` ao compartilhar sua versão.
