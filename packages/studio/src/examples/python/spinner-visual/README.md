# Spinner: impulso e atrito

Um exemplo educacional original de exploração com Python e a API oficial Turtle.
A lógica está em `main.py`: ângulo, impulso, atrito, contagem de voltas, sons e
controles. Não há um comando que executa um programa escondido. O mesmo programa
é a base das entradas de blocos/Ponte e de código da galeria.

## Jogar

- **Espaço** (ou um clique) dá um impulso no sentido em que o spinner já está
  girando. Parado, ele começa no sentido horário.
- **→** empurra no sentido horário e **←** no anti-horário. Empurrar contra o
  giro freia e, com força suficiente, inverte o sentido.
- O atrito tira velocidade aos poucos até o spinner parar; ele nunca começa a
  girar ao contrário sozinho.
- O painel mostra a velocidade em voltas por segundo, as voltas completas desde
  o último impulso e o **recorde** de voltas com um impulso só. Cada volta
  completa faz um clique.
- **P** pausa (aqui o Espaço é o impulso); **R** zera o spinner e mantém o
  recorde; **Esc** fecha.

Use o botão Jogar do estúdio para ativar o áudio. `impulso.wav` e `clique.wav`
são recursos originais do projeto e são fornecidos pela galeria. O áudio usa o
módulo portátil `sz_audio`, separado da biblioteca Turtle. Com CPython/Tk, esses
arquivos e o módulo `sz_audio` exportado, execute `python main.py`.

## Explorar e modificar

As constantes no topo são o painel de controle: `IMPULSO`, `ATRITO` e
`VELOCIDADE_MAXIMA` mudam a física; `COMPRIMENTO_BRACO` e `TAMANHO_BOLA` mudam o
desenho; `COR_DESTAQUE`, `COR_BOLA`, `COR_BRACO` e `COR_CENTRO` mudam as cores.
Troque o `120` de `posicao_bola` e o `range(3)` de `desenhar` para criar um
spinner de quatro braços.

O estado é um ângulo e uma velocidade em graus por segundo. Comece por
`impulsionar`, que soma velocidade e respeita o limite, e por `frear`, que tira
velocidade sem passar do zero. Em `atualizar`, o giro acumulado desde o último
impulso vira voltas completas. As setas usam funções rápidas
(`lambda: impulsionar(-1)`) para passar o sentido a uma única função.

O spinner é redesenhado a cada quadro por uma tartaruga só, com linhas e pontos
(`dot`). Uma única cadeia de `ontimer(..., 16)` mede o tempo com
`time.monotonic()`; a pausa congela o giro, reiniciar não adiciona outra cadeia
e um quadro atrasado avança no máximo dois quadros.

## Verificação e limites

`python test_model.py` verifica regras reais do programa sem abrir Tk, navegador
ou dispositivo de áudio: o arquivo é carregado sem os imports, e as tartarugas
viram gravadores que contam timers e chamadas. Isso verifica o modelo e seus
efeitos pedidos, não pixels, áudio ouvido, foco nem desempenho.

Autoria e licença estão em [NOTICE.md](NOTICE.md) e [LICENSE](LICENSE).
