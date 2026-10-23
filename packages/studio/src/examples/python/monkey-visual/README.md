# Macaco e Morcego

Um exemplo educacional original de jogo completo com Python e a API oficial
Turtle. A lógica está em `main.py`: o macaco, a banana, os alvos voadores, a
colisão, a pontuação, o relógio, os sons e os controles. Não há um comando que
executa um jogo escondido. O mesmo programa é a base das entradas de
blocos/Ponte e de código da galeria.

## Jogar

- **← e →** fazem o macaco andar enquanto estão apertadas.
- **Espaço** lança a banana para cima. Ela só sai da mão do macaco: depois de
  lançada, some no topo da tela e reaparece no chão, num dos lados. O macaco
  precisa ir até ela para pegá-la e lançar de novo.
- O **morcego** voa de um lado para o outro e vale **10 pontos**. Depois de 30
  pontos chega um **hipopótamo voador**, maior e mais lento, que vale **5**.
  Quem é atingido cai e depois volta a voar, entrando por um lado da tela.
- A partida dura **30 segundos**.
- **P** pausa; **R** reinicia; **Esc** fecha. O recorde vale enquanto a janela
  estiver aberta.

Use o botão Jogar do estúdio para ativar o áudio. `lancar.wav`, `acertar.wav`,
`pegar.wav` e `fim.wav` são recursos originais do projeto e são fornecidos pela
galeria. O áudio usa o módulo portátil `sz_audio`, separado da biblioteca
Turtle. Com CPython/Tk, esses arquivos e o módulo `sz_audio` exportado, execute
`python main.py`.

## Explorar e modificar

As constantes no topo são o painel de controle: `DURACAO` muda a partida;
`VELOCIDADE_MACACO`, `VELOCIDADE_BANANA` e `ALCANCE_PEGAR` mudam o macaco e a
banana; `VELOCIDADE_MORCEGO`, `RAIO_MORCEGO` e `PONTOS_MORCEGO` mudam o
morcego; as constantes com `HIPOPOTAMO` mudam o hipopótamo, e
`ENTRADA_HIPOPOTAMO` decide quando ele chega.

A classe `Alvo` guarda o que todo bicho voador tem: velocidade, tamanho, pontos,
cores e se está caindo. Ela sabe `andar` (ir e voltar, ou cair), `renascer` e
dizer se foi `acertado`. `Morcego(Alvo)` e `Hipopotamo(Alvo)` **herdam** tudo e
só escolhem números diferentes no `super().__init__`. Para criar um bicho novo,
faça outra classe filha. A banana tem três estados em `estado["banana"]`:
`"mao"`, `"voando"` e `"chao"`; veja `lancar`, `mover_banana` e
`largar_banana`.

Três tartarugas persistentes desenham a cena: `cenario` pinta a floresta uma
vez, `pincel` carimba o macaco, a banana e os bichos a cada quadro e `painel`
escreve o placar. Uma única cadeia de `ontimer(..., 16)` mede o tempo com
`time.monotonic()`; a pausa congela a partida e reiniciar não adiciona outra
cadeia. Um quadro atrasado avança no máximo três quadros.

## Verificação e limites

`python test_model.py` verifica regras reais do programa sem abrir Tk, navegador
ou dispositivo de áudio: o arquivo é carregado sem os imports, e as tartarugas
viram gravadores que contam carimbos e timers. Isso verifica o modelo e seus
efeitos pedidos, não pixels, áudio ouvido, foco nem desempenho.

Autoria e licença estão em [NOTICE.md](NOTICE.md) e [LICENSE](LICENSE).
