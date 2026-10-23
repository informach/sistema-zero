# Pong: duelo de raquetes

Um exemplo educacional original de jogo completo com Python e a API oficial
Turtle. A lógica está em `main.py`: raquetes, bola, rebatidas, placar, saque,
computador, sons e controles. Não há um comando que executa um jogo escondido.
O mesmo programa é a base das entradas de blocos/Ponte e de código da galeria.

## Jogar

- **W** e **S** movem a raquete da esquerda; **↑** e **↓** movem a da direita.
  As raquetes andam enquanto a tecla está apertada e nunca saem do campo.
- **C** liga ou desliga o **computador** no lado direito. Ele segue a bola com
  velocidade limitada, então dá para vencer mandando a bola longe dele.
- A bola só volta quando está indo na direção da raquete. Bater na ponta da
  raquete manda a bola inclinada; bater no meio manda reto. Cada rebatida deixa
  a bola um pouco mais rápida, até um limite.
- Se a bola passa por uma raquete, o outro lado ganha um ponto e a bola recomeça
  no centro indo para quem sofreu o ponto. Quem fizer **7 pontos** vence.
- **Espaço** ou **P** pausa; **R** reinicia; **Esc** fecha.

Use o botão Jogar do estúdio para ativar o áudio. `rebater.wav`, `parede.wav`,
`ponto.wav` e `vitoria.wav` são recursos originais do projeto e são fornecidos
pela galeria. O áudio usa o módulo portátil `sz_audio`, separado da biblioteca
Turtle. Com CPython/Tk, esses arquivos e o módulo `sz_audio` exportado, execute
`python main.py`.

## Explorar e modificar

As constantes no topo são o painel de controle: `RAQUETE_ALTURA` e
`RAQUETE_X` mudam as raquetes; `VELOCIDADE_INICIAL`, `ACELERACAO` e
`VELOCIDADE_MAXIMA` mudam o ritmo da bola; `VELOCIDADE_COMPUTADOR` deixa o
computador mais fácil ou mais difícil; `PONTOS_VITORIA` muda o tamanho da
partida; `COR_ESQUERDA`, `COR_DIREITA` e `COR_BOLA` mudam as cores.

A classe `Raquete` guarda a posição e as teclas seguradas, e `mover` prende a
raquete dentro do campo. A classe `Bola` guarda posição e velocidade (`vx` e
`vy`). Depois veja `rebater`: a distância entre o centro da bola e o centro da
raquete vira o ângulo da volta. As teclas usam `ligar_tecla`, que cria duas
funções rápidas (`lambda`) para apertar e soltar a mesma tecla.

Uma única cadeia de `ontimer(..., 16)` mede o tempo com `time.monotonic()` e
divide cada quadro em passos curtos, para a bola rápida não atravessar a
raquete. A pausa congela a partida, reiniciar não adiciona outra cadeia e um
quadro atrasado avança no máximo dois quadros.

## Verificação e limites

`python test_model.py` verifica regras reais do programa sem abrir Tk, navegador
ou dispositivo de áudio: o arquivo é carregado sem os imports, e as tartarugas
viram gravadores que contam timers e chamadas. Isso verifica o modelo e seus
efeitos pedidos, não pixels, áudio ouvido, foco nem desempenho.

Autoria e licença estão em [NOTICE.md](NOTICE.md) e [LICENSE](LICENSE).
