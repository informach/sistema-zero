# Bolhas no Fundo do Mar

Um exemplo educacional original de jogo completo com Python e a API oficial
Turtle. A lógica está em `main.py`: o submarino, as bolhas, a colisão, a
pontuação, o relógio, os sons e os controles. Não há um comando que executa um
jogo escondido. O mesmo programa é a base das entradas de blocos/Ponte e de
código da galeria.

## Jogar

- **Setas** guiam o submarino enquanto estão apertadas. Ele fica sempre dentro
  da tela.
- As bolhas nascem do lado direito e nadam para a esquerda, cada uma com um
  tamanho e uma rapidez. Encostar numa bolha a estoura, e ela vale **o raio mais
  a velocidade**: bolha grande e rápida vale mais.
- A partida começa com **30 segundos**. A cada **1000 pontos** você ganha mais
  30 segundos. Quando o relógio chega a zero, o jogo mostra os pontos e quantos
  bônus de tempo você ganhou.
- **Espaço** pausa; **R** reinicia; **Esc** fecha. O recorde vale enquanto a
  janela estiver aberta.

Use o botão Jogar do estúdio para ativar o áudio. `estourar.wav`, `bonus.wav` e
`fim.wav` são recursos originais do projeto e são fornecidos pela galeria. O
áudio usa o módulo portátil `sz_audio`, separado da biblioteca Turtle. Com
CPython/Tk, esses arquivos e o módulo `sz_audio` exportado, execute
`python main.py`.

## Explorar e modificar

As constantes no topo são o painel de controle: `VELOCIDADE_SUB` e `RAIO_SUB`
mudam o submarino; `RAIO_MIN`, `RAIO_MAX`, `VELOCIDADE_MAX`, `CHANCE_BOLHA` e
`MAX_BOLHAS` mudam as bolhas; `TEMPO_INICIAL`, `BONUS_PONTOS` e `BONUS_TEMPO`
mudam o relógio; `COR_SUB`, `COR_BOLHA` e `COR_MAR` mudam as cores. Diminua
`CHANCE_BOLHA` para o mar ficar cheio de bolhas.

A classe `Bolha` guarda só o modelo de cada bolha: posição, raio e velocidade.
Comece por `andar`, `encosta` e `valor`; depois veja `atualizar`, que move o
submarino, solta bolhas novas, estoura as que encostam e desconta o tempo. A
conta de `encosta` compara a distância entre os centros com a soma dos raios,
sem raiz quadrada. As setas usam funções rápidas
(`lambda: segurar("cima", True)`) para passar o nome da tecla a uma única
função.

Três tartarugas persistentes desenham a cena: `cenario` pinta o mar uma vez,
`pincel` carimba as bolhas e o submarino a cada quadro e `painel` escreve o
placar. Nenhuma tartaruga nova nasce durante o jogo, e `MAX_BOLHAS` limita
quantos carimbos existem de uma vez. Uma única cadeia de `ontimer(..., 16)` mede
o tempo com `time.monotonic()`; a pausa congela a partida e reiniciar não
adiciona outra cadeia. Um quadro atrasado avança no máximo três quadros.

## Verificação e limites

`python test_model.py` verifica regras reais do programa sem abrir Tk, navegador
ou dispositivo de áudio: o arquivo é carregado sem os imports, e as tartarugas
viram gravadores que contam carimbos e timers. Isso verifica o modelo e seus
efeitos pedidos, não pixels, áudio ouvido, foco nem desempenho.

Autoria e licença estão em [NOTICE.md](NOTICE.md) e [LICENSE](LICENSE).
