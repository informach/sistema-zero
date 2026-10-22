# Pega-Ovos

Um exemplo educacional original de jogo completo com Python e a API oficial
Turtle. A lógica está em `main.py`: a cesta, os ovos, a colisão, a pontuação,
as vidas, a aceleração, os sons e os controles. Não há um comando que executa
um jogo escondido. O mesmo programa é a base das entradas de blocos/Ponte e de
código da galeria.

## Jogar

- **← e →** movem a cesta enquanto estão apertadas.
- As galinhas do poleiro soltam ovos de tempos em tempos. Um ovo comum vale
  **10 pontos**. De vez em quando cai um **ovo dourado**: ele é mais raro, cai
  mais depressa e vale **50 pontos**.
- Cada ovo pego deixa o jogo 5% mais rápido: o ovo leva menos tempo para cair e
  o próximo chega mais cedo, até um limite.
- Um ovo que chega à grama quebra e tira **1 de 3 vidas**. Sem vidas, o jogo
  termina.
- **Espaço** pausa; **R** reinicia; **Esc** fecha. O recorde vale enquanto a
  janela estiver aberta.

Use o botão Jogar do estúdio para ativar o áudio. `pegar.wav`, `dourado.wav`,
`quebrar.wav` e `fim.wav` são recursos originais do projeto e são fornecidos
pela galeria. O áudio usa o módulo portátil `sz_audio`, separado da biblioteca
Turtle. Com CPython/Tk, esses arquivos e o módulo `sz_audio` exportado, execute
`python main.py`.

## Explorar e modificar

As constantes no topo são o painel de controle: `VELOCIDADE_CESTA` e
`LARGURA_CESTA` mudam a cesta; `QUEDA_INICIAL` é quanto tempo (em
milissegundos) um ovo leva do poleiro ao chão e `ESPERA_INICIAL` é o tempo
entre um ovo e o próximo; `FATOR`, `QUEDA_MINIMA` e `ESPERA_MINIMA` decidem a
aceleração e os pisos; `PONTOS_OVO`, `PONTOS_DOURADO`, `CHANCE_DOURADO` e
`RAPIDEZ_DOURADO` mudam os ovos; `VIDAS` muda as chances.

A classe `Ovo` guarda a posição, a rapidez, os pontos e a cor de um ovo. A
classe `OvoDourado(Ovo)` **herda** tudo isso e muda só o que é diferente: chama
`super().__init__` com uma rapidez maior, troca os pontos e a cor e responde
outro som em `som`. Veja `soltar_ovo`, que sorteia qual dos dois nasce, e
`pegar`, que soma os pontos e encurta a queda e a espera com o mesmo `FATOR`.

Quatro tartarugas persistentes desenham a cena: `cenario` pinta o céu, a grama e
o poleiro uma vez, `pincel` carimba os ovos e a cesta a cada quadro, `manchas`
carimba os ovos quebrados na grama e `painel` escreve o placar. Uma única cadeia
de `ontimer(..., 16)` mede o tempo com `time.monotonic()`; a pausa congela a
partida e reiniciar não adiciona outra cadeia. Um quadro atrasado avança no
máximo três quadros.

## Verificação e limites

`python test_model.py` verifica regras reais do programa sem abrir Tk, navegador
ou dispositivo de áudio: o arquivo é carregado sem os imports, e as tartarugas
viram gravadores que contam carimbos e timers. Isso verifica o modelo e seus
efeitos pedidos, não pixels, áudio ouvido, foco nem desempenho.

Autoria e licença estão em [NOTICE.md](NOTICE.md) e [LICENSE](LICENSE).
