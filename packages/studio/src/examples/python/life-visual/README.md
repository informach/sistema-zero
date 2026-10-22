# Jogo da Vida: a colônia que se desenha sozinha

Um exemplo educacional original do autômato celular de Conway, feito com Python
e a API oficial Turtle. A lógica está em `main.py`: grade, vizinhas, regras de
nascer e sobreviver, cursor, sons e controles. Não há um comando que executa um
jogo escondido. O mesmo programa é a base das entradas de blocos/Ponte e de
código da galeria.

## Jogar

- A grade tem **40 colunas e 30 linhas**. Cada casa está viva (verde) ou vazia.
- A cada geração, uma casa vazia com **exatamente 3** vizinhas vivas nasce, e
  uma casa viva com **2 ou 3** vizinhas continua viva. Todas as outras ficam
  vazias. As vizinhas são as oito casas em volta.
- As bordas **dão a volta**: quem sai pela direita aparece na esquerda, e quem
  sai por cima aparece embaixo. A grade funciona como a superfície de um pneu,
  então um planador nunca bate numa parede.
- **Espaço** (ou **P**) roda e pausa a evolução. Pausado, **N** dá um passo de
  cada vez.
- **Setas** movem o cursor rosa e **Enter** liga ou desliga a casa embaixo
  dele. Um **clique** numa casa faz o mesmo e leva o cursor até lá.
- **C** limpa a grade e pausa; **R** sorteia uma colônia nova; **Esc** fecha.
- O placar mostra a **geração** e a **população** (quantas casas estão vivas).

Use o botão Jogar do estúdio para ativar o áudio. `sortear.wav`, `marcar.wav`,
`passo.wav` e `limpar.wav` são recursos originais do projeto e são fornecidos
pela galeria. O áudio usa o módulo portátil `sz_audio`, separado da biblioteca
Turtle. Com CPython/Tk, esses arquivos e o módulo `sz_audio` exportado, execute
`python main.py`.

## Explorar e modificar

As constantes no topo são o painel de controle. `NASCE_COM` e `SOBREVIVE_COM`
são as regras: troque `[3]` por `[3, 6]` para ver a variante "HighLife", ou
`SOBREVIVE_COM` por `[1, 2, 3, 4, 5]` para uma colônia que cresce como um
labirinto. `DENSIDADE` é a porcentagem de casas vivas no sorteio, e
`INTERVALO_GERACAO` é o tempo entre gerações em milissegundos. Mude
`BORDAS_DAO_VOLTA` para `False` e as bordas viram paredes: o que passa delas
simplesmente deixa de contar. `COR_VIVA` e `COR_CURSOR` mudam as cores.

Comece por `vizinhas`, que lista as oito casas em volta, e por
`contar_vizinhos`: cada casa viva soma um ponto em cada vizinha, então só as
casas perto de vida aparecem na contagem. `proxima_geracao` aplica as regras e
devolve o conjunto novo de casas vivas. As setas usam funções rápidas
(`lambda: mover_cursor(1, 0)`) para passar a direção a uma única função.

Quatro tartarugas persistentes desenham a cena: `cenario` pinta o fundo e as
linhas da grade uma vez, `pincel` carimba um quadrado por casa viva, `cursor` é
a marca rosa e `painel` escreve o placar. O dicionário `carimbos` lembra qual
carimbo pertence a cada casa, e `aplicar` só apaga o que morreu e só carimba o
que nasceu, em vez de redesenhar as 1200 casas a cada geração. Uma única cadeia
de `ontimer(..., 16)` mede o tempo com `time.monotonic()`; pausar congela a
colônia e reiniciar não adiciona outra cadeia. Um quadro atrasado avança no
máximo duas gerações.

## Verificação e limites

`python test_model.py` verifica regras reais do programa sem abrir Tk, navegador
ou dispositivo de áudio: o arquivo é carregado sem os imports, e as tartarugas
viram gravadores que contam carimbos e timers. Os testes conferem o pisca-pisca,
o bloco parado, a volta pelas bordas, que só as casas que mudaram trocam de
carimbo, o cursor, a pausa, a limpeza, o reinício sem cadeia duplicada e o
limite de quadro atrasado. Isso verifica o modelo e seus efeitos pedidos, não
pixels, áudio ouvido, foco nem desempenho.

Autoria e licença estão em [NOTICE.md](NOTICE.md) e [LICENSE](LICENSE).
