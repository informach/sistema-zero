# Jogo da Velha: três em linha

Um exemplo educacional original de jogo completo com Python e a API oficial
Turtle. A lógica está em `main.py`: casas, vez de cada jogador, vitória, empate,
placar, computador adversário, sons e controles. Não há um comando que executa
um jogo escondido. O mesmo programa é a base das entradas de blocos/Ponte e de
código da galeria.

## Jogar

- **Teclas 1 a 9** marcam a casa como no teclado numérico: 7, 8 e 9 são a linha
  de cima, 4, 5 e 6 a do meio, 1, 2 e 3 a de baixo.
- **Setas** movem o cursor azul e **Enter** ou **Espaço** marcam a casa dele.
  Clicar numa casa também marca.
- O X sempre começa. Uma casa ocupada é recusada com um aviso, e a vez não passa.
- Três iguais numa linha, coluna ou diagonal vencem, e a linha vencedora ganha um
  traço verde. Com as nove casas cheias e nenhuma linha, a rodada empata.
- **C** liga ou desliga o computador: você joga com o X e ele responde com o O.
  Trocar de modo zera o placar. **R** começa uma nova rodada; **Esc** fecha.
  O placar vale enquanto a janela estiver aberta.

Use o botão Jogar do estúdio para ativar o áudio. `jogada.wav`, `recusa.wav`,
`vitoria.wav` e `empate.wav` são recursos originais do projeto e são fornecidos
pela galeria. O áudio usa o módulo portátil `sz_audio`, separado da biblioteca
Turtle. Com CPython/Tk, esses arquivos e o módulo `sz_audio` exportado, execute
`python main.py`.

## Explorar e modificar

As constantes no topo são o painel de controle: `CELULA` muda o tamanho das
casas, `DEMORA_COMPUTADOR` quanto tempo o computador pensa, `PISCAR` o ritmo do
cursor, e as cores `COR_X`, `COR_O`, `COR_CURSOR` e `COR_VITORIA` mudam a cara
do tabuleiro.

O tabuleiro é uma lista de nove textos (`""`, `"X"` ou `"O"`), numerada como o
teclado numérico. `LINHAS` guarda as oito trincas que vencem, e
`linha_vencedora` procura uma delas preenchida pela mesma peça. O computador
mora em `escolher_casa`: primeiro tenta fechar uma linha dele, depois bloqueia a
sua, depois prefere o centro e os cantos. Troque a ordem da lista
`["O", "X"]` e veja ele ficar mais distraído.

As teclas numéricas usam `tecla_casa`, uma função que devolve uma função rápida
(`lambda: tocar(casa)`), e as setas passam a direção com `lambda: mover(1, 0)`.
Cinco tartarugas persistentes desenham a cena: `cenario` traça a grade uma vez,
`pincel` desenha o X e o O, `destaque` risca a vitória, `cursor` é a moldura que
anda pelas casas e `painel` escreve o placar. Uma única cadeia de
`ontimer(..., 16)` mede o tempo com `time.monotonic()`, faz o cursor pulsar e
espera o computador; reiniciar não adiciona outra cadeia. Um quadro atrasado
conta no máximo 100 ms.

## Verificação e limites

`python test_model.py` verifica regras reais do programa sem abrir Tk, navegador
ou dispositivo de áudio: o arquivo é carregado sem os imports, e as tartarugas
viram gravadores que contam chamadas e timers. Isso verifica o modelo e seus
efeitos pedidos, não pixels, áudio ouvido, foco nem desempenho. O computador
segue regras simples e pode perder; ele não calcula todas as jogadas possíveis.

Autoria e licença estão em [NOTICE.md](NOTICE.md) e [LICENSE](LICENSE).
