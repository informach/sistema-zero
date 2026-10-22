# Canhão

Um exemplo educacional original de jogo completo com Python e a API oficial
Turtle. A lógica está em `main.py`: o canhão, a mira, a bala com gravidade, os
alvos, a colisão, a pontuação, os sons e os controles. Não há um comando que
executa um jogo escondido. O mesmo programa é a base das entradas de
blocos/Ponte e de código da galeria.

## Jogar

- **↑ e ↓** mudam o ângulo do cano. **← e →** mudam a força. Os dois números
  aparecem no placar, e a mira desenhada mostra os dois: ela gira com o ângulo e
  se afasta do canhão com a força.
- **Espaço** atira. Também dá para **clicar** num ponto da tela: o canhão mira
  naquela direção, escolhe a força pela distância e atira. Só existe uma bala
  por vez; a próxima sai quando ela deixar a tela.
- A gravidade puxa a bala para baixo, então ela faz uma curva.
- Os alvos entram pela direita e andam para a esquerda. Uma bala que passa
  perto derruba o alvo e vale **1 ponto**. Se um alvo chegar ao seu lado da
  tela, o jogo termina.
- **P** pausa; **R** reinicia; **Esc** fecha. O recorde vale enquanto a janela
  estiver aberta.

Use o botão Jogar do estúdio para ativar o áudio. `tiro.wav`, `acerto.wav` e
`fim.wav` são recursos originais do projeto e são fornecidos pela galeria. O
áudio usa o módulo portátil `sz_audio`, separado da biblioteca Turtle. Com
CPython/Tk, esses arquivos e o módulo `sz_audio` exportado, execute
`python main.py`.

## Explorar e modificar

As constantes no topo são o painel de controle: `ANGULO_INICIAL`,
`FORCA_INICIAL`, `PASSO_ANGULO`, `ANGULO_MIN`, `ANGULO_MAX`, `FORCA_MIN` e
`FORCA_MAX` mudam a mira; `GRAVIDADE` muda a curva da bala; `RAIO_ACERTO` diz
quão perto a bala precisa passar; `VELOCIDADE_ALVO` e `ESPERA_ALVOS` mudam os
alvos. Experimente `GRAVIDADE = 0` para ver a bala andar em linha reta.

A classe `Projetil` usa `math.cos` e `math.sin` para transformar ângulo e força
em velocidade horizontal (`vx`) e vertical (`vy`); a cada quadro, `andar` tira
um pouco de `vy` por causa da gravidade. A classe `Alvo` anda para a esquerda e
sabe dizer se a bala está `perto`. Veja também `clicar`, que usa `math.atan2`
para descobrir o ângulo até o ponto clicado. As setas usam funções rápidas
(`lambda: mirar(PASSO_ANGULO, 0)`) para passar quanto mudar a uma única função.

Quatro tartarugas persistentes desenham a cena: `cenario` pinta o céu e a base
uma vez, `mira` redesenha o cano e a mira só quando eles mudam, `pincel` carimba
os alvos e a bala a cada quadro e `painel` escreve o placar. Uma única cadeia de
`ontimer(..., 16)` mede o tempo com `time.monotonic()`; a pausa congela a
partida e reiniciar não adiciona outra cadeia. Um quadro atrasado avança no
máximo três quadros.

## Verificação e limites

`python test_model.py` verifica regras reais do programa sem abrir Tk, navegador
ou dispositivo de áudio: o arquivo é carregado sem os imports, e as tartarugas
viram gravadores que contam carimbos e timers. Isso verifica o modelo e seus
efeitos pedidos, não pixels, áudio ouvido, foco nem desempenho.

Autoria e licença estão em [NOTICE.md](NOTICE.md) e [LICENSE](LICENSE).
