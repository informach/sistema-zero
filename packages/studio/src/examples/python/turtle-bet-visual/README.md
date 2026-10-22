# Corrida com Aposta: quem chega primeiro?

Um exemplo educacional original de corrida de tartarugas com Python e a API
oficial Turtle. A lógica está em `main.py`: a pista, as quatro corredoras, os
passos sorteados, a chegada, o placar de apostas, os sons e os controles. Não
há um comando que executa um jogo escondido. O mesmo programa é a base das
entradas de blocos/Ponte e de código da galeria.

## Jogar

- Escolha a sua tartaruga com **1**, **2**, **3** ou **4**, ou clicando na raia
  dela. A setinha branca mostra a aposta. A tartaruga **vermelha** (raia 1)
  começa apostada.
- **Espaço** dá a largada. A cada passo, cada tartaruga anda um número sorteado
  de 2 a 12 pixels.
- Vence a primeira que cruzar a linha de chegada. Se mais de uma cruzar no
  **mesmo passo**, vence a que foi mais longe. Se elas estiverem exatamente na
  mesma distância, vence a da raia de cima, como numa foto de chegada lida de
  cima para baixo.
- O placar conta as apostas **certas** e **erradas** da sessão. Depois da
  chegada, troque a aposta se quiser e aperte **Espaço** para outra corrida.
- **P** pausa, **R** zera o placar e realinha as tartarugas, e **Esc** fecha.

Use o botão Jogar do estúdio para ativar o áudio. `largada.wav`, `chegada.wav`
e `acerto.wav` são recursos originais do projeto e são fornecidos pela galeria.
O áudio usa o módulo portátil `sz_audio`, separado da biblioteca Turtle. Com
CPython/Tk, esses arquivos e o módulo `sz_audio` exportado, execute
`python main.py`.

## Explorar e modificar

As constantes no topo são o painel de controle: `PASSO_CORRIDA` é o tempo entre
um passo e outro, `PASSO_MINIMO` e `PASSO_MAXIMO` limitam o sorteio de cada
passo, `LARGADA` e `CHEGADA` são as linhas da pista, e `CORES` e `NOMES` dão
cor e nome a cada corredora. Ponha uma quinta cor e um quinto nome nas listas e
a pista ganha uma raia a mais (diminua `ESPACO_RAIAS` para ela caber; a quinta
se escolhe pelo clique, ou somando uma tecla `"5"` em `iniciar`).

A classe `Corredora` guarda o modelo de cada tartaruga: cor, raia e quanto ela
já andou. `andar` soma o passo e `cruzou` diz se ela passou da chegada. Depois,
veja `dar_passo`, que move as quatro, e `vencedora_da_chegada`, que aplica a
regra do desempate. As teclas usam funções rápidas (`lambda: apostar(2)`) para
passar a raia a uma única função.

Quatro tartarugas persistentes desenham a cena: `pista` pinta as raias, as
linhas e os números uma única vez, `pincel` carimba as quatro corredoras com a
forma `turtle`, `marcador` é a setinha da aposta e `painel` escreve o placar. A
cada passo só os quatro carimbos são trocados. Uma única cadeia de
`ontimer(..., 16)` mede o tempo com `time.monotonic()`; a pausa congela a
corrida e reiniciar não adiciona outra cadeia. Um quadro atrasado dá no máximo
dois passos.

## Verificação e limites

`python test_model.py` verifica regras reais do programa sem abrir Tk, navegador
ou dispositivo de áudio: o arquivo é carregado sem os imports, e as tartarugas
viram gravadores que contam carimbos e timers. Os testes conferem a largada, a
aposta por tecla e por clique, os passos sorteados, a chegada, o desempate, o
placar, a pausa, o reinício sem cadeia duplicada e o limite de quadro atrasado.
Isso verifica o modelo e seus efeitos pedidos, não pixels, áudio ouvido, foco
nem desempenho. A corrida é sorteio puro: nenhuma tartaruga tem vantagem.

Autoria e licença estão em [NOTICE.md](NOTICE.md) e [LICENSE](LICENSE).
