# Cobrinha: jardim da lagarta

Um exemplo educacional original de jogo completo com Python e a API oficial
Turtle. A lógica está em `main.py`: grade, movimento, crescimento, colisões,
pontuação, sons e controles. Não há um comando que executa um jogo escondido.
O mesmo programa é a base das entradas de blocos/Ponte e de código da galeria.

## Jogar

- **Setas** viram a cabeça. Voltar para dentro de si mesma não é uma curva, e a
  curva só acontece no próximo passo.
- Cada fruta vale **1 ponto** e faz a cobra crescer **duas casas**. Bater na
  borda ou no próprio corpo termina a partida; a ponta da cauda sai do lugar no
  mesmo passo, então segui-la de perto é permitido.
- **1** começa a **Cobrinha**: passo fixo de 120 ms. **2** começa a **Lagarta**:
  mais lenta no início, ela acelera 7% a cada fruta (até 60 ms por passo).
- **Espaço** pausa; **R** reinicia no mesmo modo; **Esc** fecha. O recorde vale
  enquanto a janela estiver aberta.

Use o botão Jogar do estúdio para ativar o áudio. `abertura.wav`, `comer.wav` e
`bater.wav` são recursos originais do projeto e são fornecidos pela galeria. O
áudio usa o módulo portátil `sz_audio`, separado da biblioteca Turtle. Com
CPython/Tk, esses arquivos e o módulo `sz_audio` exportado, execute
`python main.py`.

## Explorar e modificar

As constantes no topo são o painel de controle: `CELULA`, `COLUNAS` e `LINHAS`
mudam o jardim; `PASSO_COBRINHA`, `PASSO_LAGARTA`, `ACELERACAO` e
`PASSO_MINIMO` mudam o ritmo; `COR_CABECA`, `COR_CORPO` e `COR_FRUTA` mudam as
cores. Em `dar_passo`, troque `cobra.crescer += 2` para crescer mais.

A classe `Cobra` guarda o corpo como uma lista de casas `(coluna, linha)`, com a
cabeça no fim. Comece por `proxima`, `ocupa` e `andar`; depois veja `dar_passo`,
que decide comer, crescer ou terminar. As teclas usam funções rápidas
(`lambda: virar(1, 0)`) para passar a direção a uma única função.

Cinco tartarugas persistentes desenham a cena: `cenario` pinta o jardim uma vez,
`pincel` carimba um quadrado por segmento, `fruta` se move até a próxima fruta e
`painel` escreve o placar. A cada passo só mudam três carimbos (cabeça nova,
cabeça antiga e cauda), em vez de redesenhar a cobra inteira. Uma única cadeia
de `ontimer(..., 16)` mede o tempo com `time.monotonic()`; a pausa congela a
partida e reiniciar não adiciona outra cadeia. Um quadro atrasado avança no
máximo duas casas.

## Verificação e limites

`python test_model.py` verifica regras reais do programa sem abrir Tk, navegador
ou dispositivo de áudio: o arquivo é carregado sem os imports, e as tartarugas
viram gravadores que contam carimbos e timers. Isso verifica o modelo e seus
efeitos pedidos, não pixels, áudio ouvido, foco nem desempenho.

Autoria e licença estão em [NOTICE.md](NOTICE.md) e [LICENSE](LICENSE).
