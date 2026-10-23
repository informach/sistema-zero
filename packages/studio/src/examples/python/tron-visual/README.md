# Tron: duelo de motos de luz

Um exemplo educacional original de jogo completo com Python e a API oficial
Turtle. A lógica está em `main.py`: grade, motos, rastros, colisões, rodadas,
placar, sons e controles. Não há um comando que executa um jogo escondido.
O mesmo programa é a base das entradas de blocos/Ponte e de código da galeria.

## Jogar

- Duas pessoas jogam no mesmo teclado. A moto **vermelha** vira com **A**
  (esquerda) e **D** (direita); a moto **azul** vira com **←** e **→**.
- A curva é relativa à moto: "esquerda" é a esquerda de quem está pilotando. Ela
  acontece no próximo passo, e segurar a tecla vira uma vez só.
- Cada moto anda uma casa por passo e deixa um rastro. Bater na borda, no próprio
  rastro ou no rastro da outra moto perde a rodada. Se as duas cabeças chegam à
  mesma casa, é empate e ninguém pontua.
- Cada rodada começa com uma contagem; dá para escolher a primeira curva antes da
  largada. A partida é melhor de cinco: vence quem ganhar **3 rodadas**.
- **Espaço** ou **P** pausa; **R** reinicia a partida; **Esc** fecha.

Use o botão Jogar do estúdio para ativar o áudio. `largada.wav`, `curva.wav`,
`batida.wav` e `vitoria.wav` são recursos originais do projeto e são fornecidos
pela galeria. O áudio usa o módulo portátil `sz_audio`, separado da biblioteca
Turtle. Com CPython/Tk, esses arquivos e o módulo `sz_audio` exportado, execute
`python main.py`.

## Explorar e modificar

As constantes no topo são o painel de controle: `CELULA`, `COLUNAS` e `LINHAS`
mudam a arena; `PASSO` muda a velocidade das motos; `CONTAGEM` e `PAUSA_RODADA`
mudam as esperas; `VITORIAS_PARA_VENCER` muda o tamanho da partida; as
constantes `COR_` mudam as cores dos rastros e das cabeças.

A classe `Moto` guarda a casa, a direção e a curva pedida. Comece por `proxima`,
que gira a direção 90 graus trocando `(dx, dy)` por `(-dy, dx)` ou `(dy, -dx)`.
Depois veja `dar_passo`, que decide quem bateu, e `terminar_rodada`, que conta as
vitórias. As casas ocupadas ficam num conjunto (`set`), então perguntar "esta
casa já tem rastro?" é rápido mesmo com a arena cheia.

O rastro é desenhado com carimbos (`stamp`) de uma única tartaruga: a cada passo
só a cabeça antiga vira rastro e a cabeça nova é carimbada. Uma única cadeia de
`ontimer(..., 16)` mede o tempo com `time.monotonic()`; a pausa congela a
partida, reiniciar não adiciona outra cadeia e um quadro atrasado avança no
máximo duas casas.

## Verificação e limites

`python test_model.py` verifica regras reais do programa sem abrir Tk, navegador
ou dispositivo de áudio: o arquivo é carregado sem os imports, e as tartarugas
viram gravadores que contam carimbos e timers. Isso verifica o modelo e seus
efeitos pedidos, não pixels, áudio ouvido, foco nem desempenho.

Autoria e licença estão em [NOTICE.md](NOTICE.md) e [LICENSE](LICENSE).
