# Vidente: a roda das respostas

Um exemplo educacional original de roda da sorte com Python e a API oficial
Turtle. A lógica está em `main.py`: as fatias, o ponteiro desenhado, o giro com
atrito, a resposta escolhida, o histórico, os sons e os controles. Não há um
comando que executa um jogo escondido. O mesmo programa é a base das entradas
de blocos/Ponte e de código da galeria.

## Jogar

- Pense numa pergunta de sim ou não e aperte **Espaço**. O ponteiro amarelo
  sai com uma velocidade sorteada, vai perdendo força com o atrito e para numa
  das **8 respostas**, que aparece em destaque no alto da tela.
- A cada fatia que o ponteiro cruza toca um tique, e um som diferente avisa
  quando ele para.
- **←** e **→** mexem o ponteiro devagar, 15 graus por vez, quando ele está
  parado. Apertar Espaço enquanto ele gira não acelera nada.
- Embaixo ficam as **3 últimas respostas**.
- **P** pausa, **R** recomeça com o ponteiro para cima e o histórico vazio, e
  **Esc** fecha. Esta roda não tem clique: tudo funciona pelo teclado.

Use o botão Jogar do estúdio para ativar o áudio. `abertura.wav`, `tique.wav` e
`parar.wav` são recursos originais do projeto e são fornecidos pela galeria. O
áudio usa o módulo portátil `sz_audio`, separado da biblioteca Turtle. Com
CPython/Tk, esses arquivos e o módulo `sz_audio` exportado, execute
`python main.py`.

## Explorar e modificar

As constantes no topo são o painel de controle. `RESPOSTAS` é a lista das
respostas: troque os textos pelos seus, ou ponha 6 ou 10 respostas, e a roda se
redesenha com o número certo de fatias. `VELOCIDADE_MINIMA` e
`VELOCIDADE_MAXIMA` (em graus por segundo) limitam o sorteio da força do giro,
`ATRITO` diz quanto da velocidade sobra a cada passo (0.985 é 98,5%) e
`VELOCIDADE_PARADA` é quando o ponteiro desiste. `PASSO_SETA` é o tamanho do
empurrão das setas. `CORES_FATIAS` e `COR_PONTEIRO` mudam as cores.

Comece por `fatia_apontada`, que transforma o ângulo do ponteiro no número da
fatia, e por `passo_do_giro`, que gira, aplica o atrito, toca o tique ao trocar
de fatia e chama `parar` quando a velocidade fica pequena. As setas usam
funções rápidas (`lambda: empurrar(1)`) para passar o sentido a uma única
função.

Três tartarugas persistentes desenham a cena: `cenario` pinta a roda e escreve
as respostas uma única vez, `ponteiro` tem a forma de seta registrada com
`register_shape` e só muda de direção, e `painel` escreve o título e o
histórico. Uma única cadeia de `ontimer(..., 16)` mede o tempo com
`time.monotonic()`; a física anda em passos fixos de 16 ms, a pausa congela o
giro e reiniciar não adiciona outra cadeia. Um quadro atrasado avança no máximo
dois passos de física.

## Verificação e limites

`python test_model.py` verifica regras reais do programa sem abrir Tk, navegador
ou dispositivo de áudio: o arquivo é carregado sem os imports, e as tartarugas
viram gravadores que guardam as chamadas e os timers. Os testes conferem a
divisão das fatias, o giro que desacelera e para numa resposta, um tique por
fatia cruzada, as setas, o histórico de três, a pausa, o reinício sem cadeia
duplicada e o limite de quadro atrasado. Isso verifica o modelo e seus efeitos
pedidos, não pixels, áudio ouvido, foco nem desempenho. A roda é uma
brincadeira: as respostas são sorteadas e não preveem nada.

Autoria e licença estão em [NOTICE.md](NOTICE.md) e [LICENSE](LICENSE).
