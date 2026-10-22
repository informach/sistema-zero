# Jogo da Memória: oito pares escondidos

Um exemplo educacional original de jogo completo com Python e a API oficial
Turtle. A lógica está em `main.py`: cartas, pares, a espera antes de desvirar,
tentativas, tempo, vitória, sons e controles. Não há um comando que executa um
jogo escondido. O mesmo programa é a base das entradas de blocos/Ponte e de
código da galeria.

## Jogar

- Dezesseis cartas viradas para baixo escondem oito pares de figuras coloridas.
- **Setas** movem o cursor azul e **Enter** ou **Espaço** viram a carta dele.
  Clicar numa carta também a vira.
- Vire duas cartas. Se forem iguais, ficam abertas com fundo verde. Se forem
  diferentes, ficam à mostra por um instante e desviram sozinhas; enquanto isso,
  nenhuma outra carta vira.
- Cada dupla virada conta uma tentativa, e o relógio corre desde o começo. Achar
  os oito pares termina a partida.
- **P** pausa; **R** embaralha um jogo novo; **Esc** fecha. O melhor resultado,
  com menos tentativas, vale enquanto a janela estiver aberta.

Use o botão Jogar do estúdio para ativar o áudio. `virar.wav`, `acerto.wav`,
`erro.wav` e `vitoria.wav` são recursos originais do projeto e são fornecidos
pela galeria. O áudio usa o módulo portátil `sz_audio`, separado da biblioteca
Turtle. Com CPython/Tk, esses arquivos e o módulo `sz_audio` exportado, execute
`python main.py`.

## Explorar e modificar

As constantes no topo são o painel de controle: `TEMPO_DESVIRAR` diz quantos
milissegundos as cartas erradas ficam à mostra, `CELULA` muda o tamanho das
cartas e `PISCAR` o ritmo do cursor. `FIGURAS` é a lista dos oito pares: troque
uma cor ou uma forma e o baralho muda junto. As cores do verso e da frente ficam
em `COR_VERSO`, `COR_FRENTE` e `COR_ACHADA`.

A classe `Carta` guarda a figura, a cor e se a carta está virada ou já achada, e
o método `combina` responde se duas cartas formam um par. `baralho` cria duas
cartas de cada figura e as embaralha com `random.shuffle`. Em `virar`, a
primeira carta só é lembrada; a segunda decide entre par achado e espera. A
espera não usa `sleep`: o número `estado["espera"]` diminui a cada quadro, e
quando chega a zero `desvirar` fecha as duas.

As figuras não são imagens: `registrar_formas` cria a estrela, o losango, o
hexágono e a cruz com listas de pontos, e `poligono` calcula pontos em volta do
centro com seno e cosseno. Quatro tartarugas persistentes desenham a cena:
`pincel` carimba as cartas, `simbolo` carimba as figuras, `cursor` é a moldura
que anda e `painel` escreve o placar. Uma única cadeia de `ontimer(..., 16)`
mede o tempo com `time.monotonic()`, conta a espera e faz o cursor pulsar; a
pausa congela a partida e reiniciar não adiciona outra cadeia. Um quadro
atrasado conta no máximo 100 ms.

## Verificação e limites

`python test_model.py` verifica regras reais do programa sem abrir Tk, navegador
ou dispositivo de áudio: o arquivo é carregado sem os imports, e as tartarugas
viram gravadores que contam carimbos e timers. Isso verifica o modelo e seus
efeitos pedidos, não pixels, áudio ouvido, foco nem desempenho. As cartas viram
de uma vez, sem animação de giro.

Autoria e licença estão em [NOTICE.md](NOTICE.md) e [LICENSE](LICENSE).
