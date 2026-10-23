# Céu Estrelado: luneta e constelações

Um exemplo educacional original de desenho generativo com Python e a API
oficial Turtle. A lógica está em `main.py`: a geometria das estrelas, o céu que
se enche sozinho, a luneta, as constelações, os sons e os controles. Não há um
comando que executa um jogo escondido. O mesmo programa é a base das entradas
de blocos/Ponte e de código da galeria.

## Jogar

- O céu ganha uma estrela nova a cada 350 milissegundos, num lugar sorteado, com
  **5, 7, 9 ou 11 pontas**, tamanho e cor também sorteados.
- **Setas** movem a luneta azul e **Enter** põe uma estrela exatamente ali. Um
  **clique** põe uma estrela no ponto clicado.
- **C** liga as estrelas que você pôs à mão numa constelação, na ordem em que
  elas foram postas. Com a constelação ligada, cada estrela nova à mão entra na
  linha na hora. **C** de novo apaga as linhas.
- **Espaço** (ou **P**) pausa o céu, **L** limpa todas as estrelas, **R**
  recomeça do céu vazio e **Esc** fecha.
- O céu tem um **teto de 150 estrelas**. Quando ele enche, o céu para de se
  encher e também não aceita estrelas à mão; o placar avisa, e **L** abre espaço
  de novo. Parar foi uma escolha: recomeçar sozinho apagaria uma constelação que
  você ainda estava desenhando.

Use o botão Jogar do estúdio para ativar o áudio. `abertura.wav`, `brilho.wav`,
`constelacao.wav` e `limpar.wav` são recursos originais do projeto e são
fornecidos pela galeria. O áudio usa o módulo portátil `sz_audio`, separado da
biblioteca Turtle. Com CPython/Tk, esses arquivos e o módulo `sz_audio`
exportado, execute `python main.py`.

## Explorar e modificar

As constantes no topo são o painel de controle: `RITMO_ESTRELA` muda a
velocidade com que o céu se enche, `MAX_ESTRELAS` é o teto, `PONTAS` lista os
números de pontas sorteados e `TAMANHO_MINIMO`/`TAMANHO_MAXIMO` limitam o
tamanho. `CORES_ESTRELAS`, `COR_LUNETA` e `COR_LINHA` mudam as cores. Tente pôr
`3` ou `13` em `PONTAS`: qualquer número ímpar funciona.

A classe `Estrela` guarda o modelo de cada estrela: posição, pontas, tamanho,
cor e se foi feita à mão. O segredo está em `angulo`: em cada ponta a caneta
gira `180 - 180 / pontas` graus, e depois de todas as pontas ela volta ao lugar
de onde saiu. `raio` e `rumo_inicial` calculam onde a caneta começa para a
estrela ficar centrada no ponto escolhido. As setas usam funções rápidas
(`lambda: mover_luneta(1, 0)`) para passar a direção a uma única função.

Quatro tartarugas persistentes desenham a cena: `pincel` desenha cada estrela
uma única vez, `linhas` desenha a constelação, `luneta` é a marca azul e
`painel` escreve o placar. Nenhuma estrela é redesenhada depois de pronta. Uma
única cadeia de `ontimer(..., 16)` mede o tempo com `time.monotonic()`; a pausa
congela o céu e reiniciar não adiciona outra cadeia. Um quadro atrasado põe no
máximo duas estrelas.

## Verificação e limites

`python test_model.py` verifica regras reais do programa sem abrir Tk, navegador
ou dispositivo de áudio: o arquivo é carregado sem os imports, e as tartarugas
viram gravadores que guardam as chamadas e os timers. Os testes refazem o
caminho da caneta para conferir que toda estrela fecha em volta do próprio
centro, e conferem o ritmo, a luneta, a constelação, o teto, a limpeza, a pausa,
o reinício sem cadeia duplicada e o limite de quadro atrasado. Isso verifica o
modelo e seus efeitos pedidos, não pixels, áudio ouvido, foco nem desempenho.

Autoria e licença estão em [NOTICE.md](NOTICE.md) e [LICENSE](LICENSE).
