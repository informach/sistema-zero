# Pac-Man: labirinto criativo

Um exemplo educacional original de jogo completo com Python e a API oficial
Turtle. A lógica está em `main.py`: mapa, movimento, perseguição, pontuação,
colisões, sons e controles. Não há um comando que executa um jogo escondido.
O mesmo programa é a base das entradas de blocos/Ponte e de código da galeria.

## Jogar

- Setas movem o personagem. Uma curva pedida antes de uma esquina fica guardada
  até haver uma passagem; paredes bloqueiam o movimento.
- Bolinhas valem **2 pontos**. As quatro especiais valem **50 pontos** e aumentam
  a velocidade de 4 para 7 por **3 segundos**. Elas não eliminam inimigos.
- Sete inimigos patrulham o mapa. A até sete casas de distância, perseguem o
  jogador ou antecipam sua direção. Os olhos mostram a direção de cada inimigo.
- O túnel central liga as bordas esquerda e direita. Colete todas as bolinhas
  para vencer. Você tem **três vidas**, com proteção breve após renascer.
- **Espaço/P** pausa; **R** reinicia; **Esc** fecha. A abertura dura 2,5 segundos.
  Vitória ou derrota mostram o placar e fecham após 3 segundos; R inicia outra
  partida durante essa mensagem.

Use o botão Jogar do estúdio para ativar o áudio. `opening.wav`, `collect.wav`,
`power.wav` e `collision.wav` são recursos originais do projeto e são fornecidos
pela galeria. O áudio usa o módulo portátil `sz_audio`, separado da biblioteca
Turtle. A exportação desktop precisa incluir esses quatro arquivos e o módulo
`sz_audio` distribuído pelo estúdio. Com CPython/Tk e esses recursos disponíveis,
execute `python main.py`; não é necessário instalar outro motor gráfico.

## Explorar e modificar

`MAPA` tem 31 colunas e 25 linhas: `#` é parede, `.` é bolinha e `o` é especial.
Ao mudar o mapa, mantenha o nascimento `(15, 23)`, os sete `NINHOS` e o túnel na
linha 12 em passagens abertas. Todas as bolinhas precisam continuar alcançáveis.
A tela lógica mede 1010 × 860; as regras trabalham em casas de 28 unidades.

Comece pela função `destino` para entender paredes/túnel e por `mover` para
entender curvas e alinhamento. Depois explore `escolher_direcao`, `coletar` e
`atualizar`. `estado` guarda a partida; cada personagem é um dicionário. As
funções e coleções são Python comum, sem classes, herança, lambdas ou trechos
de fonte opacos. Para experiências repetíveis, acrescente `random.seed(2026)`
no início de `reiniciar_modelo` e compare as decisões dos inimigos.

Um Turtle carimba o cenário, outro escreve o painel e oito representam o jogador
e os sete inimigos. São **dez Turtle persistentes**, reutilizadas no reinício.
Paredes e bolinhas ficam no cenário até serem removidas ou até o reinício.
Os personagens se movem sem criar e apagar carimbos a cada quadro. As formas
compostas dos inimigos só são trocadas quando a direção dos olhos muda.
Uma única cadeia de `ontimer(..., 16)` mede o tempo com `time.monotonic()`:
a pausa congela os tempos
da partida, e reiniciar não adiciona outra cadeia. Sons são encerrados no
reinício e no fechamento. O movimento limita o avanço de um quadro atrasado
para manter o controle e a colisão; isso não é uma promessa de desempenho.

## Verificação e limites

`python test_model.py` verifica regras reais do programa sem abrir Tk, navegador
ou dispositivo de áudio. Os testes carregam a AST sem os imports de mídia e
usam gravadores explícitos para observar chamadas de som, carimbo e agendamento.
Isso verifica o modelo e seus efeitos solicitados, não pixels, áudio ouvido,
foco, desempenho nem compatibilidade de execução real.

`python test_renderer.py` usa o motor Turtle do estúdio e seu backend reais,
com transporte JSON gravador. Verifica que dez quadros de movimento estável
reutilizam os objetos dos personagens, sem criar nem apagar itens, e que um
Esc recebido durante `update()` encerra o áudio sem reabri-lo no reinício.
Também não substitui a execução no navegador nem mede FPS.

Este exemplo é uma implementação própria e não substitui o corpus de referência
do [aceite Pac-Man](../../../../../../docs/plans/2026-10-16-pacman-aceite.md).
Em particular, o corpus continua cobrindo herança Turtle, cinco módulos e GIFs;
este exemplo usa funções e polígonos originais. A conversão visual integral e a
execução no estúdio precisam de seus próprios recibos de qualificação.

Autoria e licença estão em [NOTICE.md](NOTICE.md) e [LICENSE](LICENSE).
