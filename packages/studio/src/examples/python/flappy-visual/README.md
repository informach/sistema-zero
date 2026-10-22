# Flappy: voo entre os canos

Um exemplo educacional original de jogo completo com Python e a API oficial
Turtle. A lógica está em `main.py`: gravidade, batida de asas, canos, colisões,
pontos, recorde, sons e controles. Não há um comando que executa um jogo
escondido. O mesmo programa é a base das entradas de blocos/Ponte e de código da
galeria.

## Jogar

- O pássaro começa parado. Aperte **Espaço** (ou **↑**, ou clique na tela) para
  voar. Cada batida de asas dá um impulso para cima, e a gravidade puxa para baixo.
- Os canos vêm da direita com um vão em altura sorteada. Passar por um cano vale
  **1 ponto**.
- Encostar num cano, no chão ou no teto termina o voo. O recorde vale enquanto a
  janela estiver aberta.
- Depois da batida, **Espaço** ou **R** prepara um voo novo. **P** pausa (aqui o
  Espaço é a asa); **Esc** fecha.

Use o botão Jogar do estúdio para ativar o áudio. `asa.wav`, `ponto.wav` e
`batida.wav` são recursos originais do projeto e são fornecidos pela galeria. O
áudio usa o módulo portátil `sz_audio`, separado da biblioteca Turtle. Com
CPython/Tk, esses arquivos e o módulo `sz_audio` exportado, execute
`python main.py`.

## Explorar e modificar

As constantes no topo são o painel de controle: `GRAVIDADE`, `IMPULSO` e
`QUEDA_MAXIMA` mudam o voo; `VELOCIDADE_CANOS`, `VAO`, `LARGURA_CANO` e
`DISTANCIA_CANOS` mudam a dificuldade; `COR_PASSARO`, `COR_CANO` e
`COR_BORDA_CANO` mudam as cores.

A classe `Passaro` guarda só a altura e a velocidade vertical: `cair` aplica a
gravidade e `bater_asas` troca a velocidade pelo impulso. A classe `Cano` guarda
a posição e o centro do vão. Os três canos são criados uma vez e reaproveitados:
quando um sai pela esquerda, `andar` o leva de volta para a direita e `sortear`
escolhe um vão novo. Em `acerta`, o pássaro é um círculo e cada cano é um
retângulo; o teste procura o ponto do cano mais perto do pássaro.

Uma única tartaruga carimba os canos e o pássaro a cada quadro, nessa ordem, para
o pássaro ficar sempre na frente. Uma única cadeia de `ontimer(..., 16)` mede o
tempo com `time.monotonic()`; a pausa congela o voo, reiniciar não adiciona outra
cadeia e um quadro atrasado avança no máximo dois quadros.

## Verificação e limites

`python test_model.py` verifica regras reais do programa sem abrir Tk, navegador
ou dispositivo de áudio: o arquivo é carregado sem os imports, e as tartarugas
viram gravadores que contam carimbos e timers. Isso verifica o modelo e seus
efeitos pedidos, não pixels, áudio ouvido, foco nem desempenho.

Autoria e licença estão em [NOTICE.md](NOTICE.md) e [LICENSE](LICENSE).
