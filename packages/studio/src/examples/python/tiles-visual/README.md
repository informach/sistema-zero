# Quebra-cabeça de 15: deslize até ordenar

Um exemplo educacional original de jogo completo com Python e a API oficial
Turtle. A lógica está em `main.py`: grade, vizinhos do espaço vazio,
embaralhamento, contagem de movimentos e tempo, vitória, sons e controles. Não há
um comando que executa um jogo escondido. O mesmo programa é a base das entradas
de blocos/Ponte e de código da galeria.

## Jogar

- O objetivo é deixar as peças de 1 a 15 em ordem, da esquerda para a direita e
  de cima para baixo, com o espaço vazio no último canto.
- **Setas** deslizam a peça vizinha do vazio no sentido da seta: **←** traz para o
  vazio a peça que está à direita dele, **↓** traz a peça de cima, e assim por
  diante. O espaço vazio tem uma moldura azul. Clicar numa peça que encosta no
  vazio também a desliza.
- Uma peça que está no lugar certo fica verde. Os movimentos são contados, e o
  relógio começa no primeiro movimento.
- **P** ou **Espaço** pausam (o relógio para e as peças não andam); **R**
  embaralha de novo; **Esc** fecha. O melhor resultado, com menos movimentos,
  vale enquanto a janela estiver aberta.

Use o botão Jogar do estúdio para ativar o áudio. `deslizar.wav`,
`bloqueio.wav`, `embaralhar.wav` e `vitoria.wav` são recursos originais do
projeto e são fornecidos pela galeria. O áudio usa o módulo portátil `sz_audio`,
separado da biblioteca Turtle. Com CPython/Tk, esses arquivos e o módulo
`sz_audio` exportado, execute `python main.py`.

## Explorar e modificar

As constantes no topo são o painel de controle: `EMBARALHAR` diz quantos
movimentos aleatórios bagunçam a grade (experimente 10 para um começo fácil),
`CELULA` muda o tamanho das peças e `PISCAR` o ritmo da moldura. As cores ficam
em `COR_PECA`, `COR_CERTA` e `COR_VAZIO`.

A grade é uma lista de dezesseis números, lida linha por linha, e o `0` é o
espaço vazio. `vizinhos` devolve as casas que encostam numa casa, e é a peça de
uma dessas casas que pode trocar de lugar com o vazio em `deslizar`. O segredo
de `embaralhar` é nunca sortear posições: ele parte do quebra-cabeça resolvido e
faz movimentos de verdade, sem desfazer o anterior, e no fim leva o vazio de
volta ao canto. Por isso todo embaralhamento tem solução.

As setas usam funções rápidas (`lambda: empurrar(-1, 0)`) para passar a direção
a uma única função. Cinco tartarugas persistentes desenham a cena: `cenario`
pinta a moldura do tabuleiro uma vez, `pincel` carimba um quadrado por peça,
`numeros` escreve os números, `vazio` é a moldura do espaço livre e `painel`
escreve o placar. Uma única cadeia de `ontimer(..., 16)` mede o tempo com
`time.monotonic()`, conta os segundos e faz a moldura pulsar; a pausa congela a
partida e reiniciar não adiciona outra cadeia. Um quadro atrasado conta no
máximo 100 ms.

## Verificação e limites

`python test_model.py` verifica regras reais do programa sem abrir Tk, navegador
ou dispositivo de áudio: o arquivo é carregado sem os imports, e as tartarugas
viram gravadores que contam carimbos e timers. Isso verifica o modelo e seus
efeitos pedidos, não pixels, áudio ouvido, foco nem desempenho. As peças trocam
de lugar de uma vez, sem animação de deslizar.

Autoria e licença estão em [NOTICE.md](NOTICE.md) e [LICENSE](LICENSE).
