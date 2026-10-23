# Ligue 4: quatro em linha

Um exemplo educacional original de jogo completo com Python e a API oficial
Turtle. A lógica está em `main.py`: colunas, queda das peças, vez de cada
jogador, vitória nas quatro direções, empate, placar, sons e controles. Não há
um comando que executa um jogo escondido. O mesmo programa é a base das entradas
de blocos/Ponte e de código da galeria.

## Jogar

- Dois jogadores se revezam: o vermelho começa e o amarelo responde.
- **Teclas 1 a 7** soltam a peça direto na coluna. **Setas ← →** movem a seta
  azul, e **Enter**, **Espaço** ou **↓** soltam ali. Clicar numa coluna também
  solta.
- A peça cai até a última casa livre da coluna. Enquanto ela cai, outra jogada é
  ignorada. Uma coluna cheia é recusada com um aviso, e a vez não passa.
- Quatro peças da mesma cor em linha vencem: na horizontal, na vertical ou nas
  duas diagonais. As quatro ganham um ponto branco. Com o tabuleiro cheio e
  ninguém ligando quatro, a rodada empata.
- **R** começa uma nova rodada; **Esc** fecha. O placar vale enquanto a janela
  estiver aberta.

Use o botão Jogar do estúdio para ativar o áudio. `encaixe.wav`, `recusa.wav`,
`vitoria.wav` e `empate.wav` são recursos originais do projeto e são fornecidos
pela galeria. O áudio usa o módulo portátil `sz_audio`, separado da biblioteca
Turtle. Com CPython/Tk, esses arquivos e o módulo `sz_audio` exportado, execute
`python main.py`.

## Explorar e modificar

As constantes no topo são o painel de controle: `COLUNAS` e `LINHAS` mudam o
tamanho do tabuleiro, `CELULA` o tamanho das casas, `QUEDA` a velocidade da peça
em pixels por segundo e `PISCAR` o ritmo da seta. As cores ficam em
`COR_TABULEIRO`, `COR_VERMELHO`, `COR_AMARELO` e `COR_CURSOR`.

O tabuleiro é uma lista de colunas, e cada coluna é uma pilha: a peça nova entra
no fim com `append`, então a linha onde ela pousa é só o tamanho da pilha. A
função `peca` responde vazio fora do tabuleiro, o que deixa `linha_vencedora`
simples: a partir da peça que acabou de pousar, ela anda nos dois sentidos de
cada uma das quatro `DIRECOES` contando peças iguais. Troque o `4` de
`len(casas) >= 4` por `3` e o jogo vira um Ligue 3.

As teclas numéricas usam `tecla_coluna`, uma função que devolve uma função
rápida (`lambda: escolher(coluna)`). Seis tartarugas persistentes desenham a
cena: `cenario` pinta o tabuleiro e os furos uma vez, `pincel` pinta as peças que
pousaram, `destaque` marca a vitória, `queda` é a peça caindo, `cursor` é a seta
e `painel` escreve o placar. Uma única cadeia de `ontimer(..., 16)` mede o tempo
com `time.monotonic()`, faz a peça cair e a seta pulsar; reiniciar não adiciona
outra cadeia. Um quadro atrasado conta no máximo 100 ms, então a peça nunca
atravessa o tabuleiro de uma vez.

## Verificação e limites

`python test_model.py` verifica regras reais do programa sem abrir Tk, navegador
ou dispositivo de áudio: o arquivo é carregado sem os imports, e as tartarugas
viram gravadores que contam chamadas e timers. Isso verifica o modelo e seus
efeitos pedidos, não pixels, áudio ouvido, foco nem desempenho. Não há
computador adversário: o jogo é para duas pessoas no mesmo teclado.

Autoria e licença estão em [NOTICE.md](NOTICE.md) e [LICENSE](LICENSE).
