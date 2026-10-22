# Genius: repita a sequência

Um exemplo educacional original de jogo completo com Python e a API oficial
Turtle. A lógica está em `main.py`: a sequência que cresce, a demonstração que
pisca, a vez de repetir, o erro, o recorde, sons e controles. Não há um comando
que executa um jogo escondido. O mesmo programa é a base das entradas de
blocos/Ponte e de código da galeria.

## Jogar

- Quatro cores formam um anel: **verde em cima**, **vermelho à direita**, **azul
  embaixo** e **amarelo à esquerda**. Cada uma tem a sua nota.
- O jogo mostra a sequência piscando as cores, uma de cada vez. Enquanto ele
  mostra, suas teclas e cliques são ignorados.
- Depois é a sua vez: repita na mesma ordem com as **setas** (↑ verde, → vermelho,
  ↓ azul, ← amarelo) ou clicando nas cores. A bolinha branca marca a última cor
  que você tocou.
- Acertou a sequência inteira? Ela ganha mais um passo e é mostrada de novo.
  Errou? A partida termina, o jogo diz qual era a cor certa e mostra a maior
  sequência que você completou.
- Quando a partida termina, **Enter**, **Espaço** ou um clique no meio começam
  outra; **R** recomeça a qualquer momento. **P** pausa; **Esc** fecha. O
  recorde vale enquanto a janela estiver aberta.

Use o botão Jogar do estúdio para ativar o áudio. `verde.wav`, `vermelho.wav`,
`azul.wav`, `amarelo.wav` e `erro.wav` são recursos originais do projeto e são
fornecidos pela galeria. O áudio usa o módulo portátil `sz_audio`, separado da
biblioteca Turtle. Com CPython/Tk, esses arquivos e o módulo `sz_audio`
exportado, execute `python main.py`.

## Explorar e modificar

As constantes no topo são o painel de controle: `ACESO` é quanto tempo cada cor
fica acesa na demonstração, `APAGADO` a pausa entre elas, `TOQUE` quanto a cor
brilha quando você toca e `PAUSA_RODADA` o respiro antes da próxima rodada.
Diminua `ACESO` e `APAGADO` para um Genius mais rápido. As listas `CORES`,
`CORES_ACESAS` e `SONS` usam a mesma ordem das setas: cima, direita, baixo e
esquerda.

A sequência é uma lista de números de 0 a 3, e cada rodada acrescenta um com
`random.randint`. Nada usa `sleep`: `mostrar_sequencia` acende, espera, apaga e
passa ao próximo passo só olhando o contador `estado["espera"]`, que diminui a
cada quadro. Em `tocar`, a cor tocada é comparada com o passo da vez; o clique
vira cor em `clicar`, comparando a distância ao centro e qual lado está mais
longe.

O anel não é imagem: `setor` calcula um pedaço de anel com seno e cosseno, e a
mesma forma é carimbada quatro vezes, girada para cada direção. Quatro
tartarugas persistentes desenham a cena: `cenario` carimba as cores apagadas
uma vez, `luz` é a cor acesa por cima, `dedo` marca o seu toque e `painel`
escreve o placar. Uma única cadeia de `ontimer(..., 16)` mede o tempo com
`time.monotonic()`; a pausa congela a partida e reiniciar não adiciona outra
cadeia. Um quadro atrasado conta no máximo 100 ms, então a demonstração nunca
pula passos.

## Verificação e limites

`python test_model.py` verifica regras reais do programa sem abrir Tk, navegador
ou dispositivo de áudio: o arquivo é carregado sem os imports, e as tartarugas
viram gravadores que contam chamadas e timers. Isso verifica o modelo e seus
efeitos pedidos, não pixels, áudio ouvido, foco nem desempenho. Não há tempo
limite para responder: você pode pensar o quanto quiser em cada passo.

Autoria e licença estão em [NOTICE.md](NOTICE.md) e [LICENSE](LICENSE).
