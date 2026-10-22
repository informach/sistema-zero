# Space Arena — Patrulha das Estrelas

Um jogo educacional original: pilote uma nave, recolha cinco melhorias e proteja
a arena dos 25 drones. A partida termina em vitória quando os drones acabam ou
em derrota quando a nave perde suas três vidas. É possível jogar novamente sem
executar o programa inteiro outra vez.

## Controles

| Tecla | Ação |
| --- | --- |
| S | Iniciar; após vitória ou derrota, jogar novamente |
| Esquerda / direita | Girar a nave enquanto a tecla está pressionada |
| Cima | Acelerar; ao soltar, a nave conserva a velocidade |
| Baixo | Frear |
| Espaço | Disparar enquanto a tecla está pressionada, respeitando a recarga |
| P | Pausar ou continuar; as teclas pressionadas são liberadas na pausa |
| C | Alternar entre câmera que acompanha a nave e visão geral da arena |
| R | Reiniciar a partida |
| Esc | Fechar a janela e encerrar os sons |

Os comandos S/P/C/R/Esc são atendidos ao soltar a tecla, evitando repetições
automáticas indesejadas. O radar lateral mostra toda a arena, a nave, os drones
e as melhorias. Os drones vermelhos perseguem, os lilás patrulham e os amarelos
se aproximam quando a nave entra no seu alcance. O contato causa dano; após um
impacto há um intervalo de proteção visível na cor da nave. Cada drone vale
100 pontos. Cada melhoria vale 50, recupera 25 de energia e fortalece os tiros.

## Fonte, blocos e modo Ponte

`main.py` contém todo o programa. A fonte usa construções Python comuns:
funções nomeadas, condições, repetições, listas e dicionários. Não há classes,
herança, lambdas, comprehensions, `global`, `nonlocal` ou execução de texto.
Nenhuma chamada esconde a implementação de um jogo em uma extensão.

O exemplo foi escrito para composição visual com os codecs gerais do Estúdio.
A qualificação da conversão integral AST → blocos → Python e as entradas da
galeria são verificações do integrador; os testes inertes desta pasta não
comprovam essa conversão nem a aparência gráfica.

Sugestões de edição:

- Mude `IMPULSO`, `GIRO` e `VELOCIDADE_MAXIMA` e compare aceleração e frenagem.
- Altere `CORES` e os polígonos de `register_shape` para criar sua própria equipe.
- Modifique `mover_inimigos` para experimentar estratégias de perseguição.
- Altere o alcance do radar ou a suavização em `mover_camera`.
- Troque a quantidade de pontos ou a recuperação de energia em `recolher_bonus`.

O desenho usa a API oficial `turtle`, com os mesmos nomes e argumentos que
aparecem no Python exportado. O áudio usa **sz_audio 1.0.0**, módulo portátil
separado da biblioteca padrão; não faz parte do Turtle oficial.

## Recursos e execução no computador

Execute `main.py` em um ambiente Python com Turtle/Tk e `sz_audio` instalados,
com estes cinco WAVs originais na raiz do projeto:

`bgm.wav`, `thruster.wav`, `missile_fire.wav`, `explosion.wav`, `powerup.wav`.

A galeria/exportação deve fornecer os arquivos e declarar o módulo de áudio.
Não há download, chamada de shell nem fallback silencioso para áudio ausente.
A música e o propulsor têm vozes em loop; soltura da tecla, pausa, reinício e
fechamento encerram as vozes correspondentes. Retomar uma pausa recomeça a
música, pois a API portátil oferece iniciar/parar, não seek/pause de uma voz.
Explosões simultâneas compartilham um efeito. Tiros e pickups reutilizam cada
um seu canal; não há crescimento ilimitado de sons.

Os desenhos são polígonos, círculos e quadrados criados no próprio código.
Não são necessários GIFs nem mídias de repositórios externos.

## Organização e limites

O modelo mantém 25 drones, 30 tiros, 20 estrelas, cinco melhorias, 30 partículas
de explosão e 20 de propulsão. Entidades inativas permanecem nos pools e são
reutilizadas. O corte visual fora da câmera não elimina entidades da simulação.
Três canetas Turtle desenham o mundo/radar, o painel e os avisos. Os carimbos do
quadro anterior são apagados; texto estável não é reescrito em todos os quadros.

Uma única cadeia `ontimer` atende a partida. O intervalo nominal é 60 Hz,
compensando o tempo gasto na atualização, sem executar quadros extras para
recuperar atraso. Reiniciar altera o modelo, mas não agenda outro timer.
Pausa não avança física nem partículas. Fechar revoga a cadeia; um callback
já agendado verifica o estado antes de trabalhar. Não há threads do jogo.

Este é um projeto novo, não uma cópia nem uma certificação do Space Arena do
corpus de compatibilidade. O corpus e seus testes permanecem separados. Veja
`NOTICE.md` para a procedência e `LICENSE` para os termos do exemplo.

## Verificações inertes

Na raiz do repositório:

```text
python -B -m unittest discover -s packages/studio/src/examples/python/space-arena-visual -p test_model.py
```

Os testes executam as funções reais com dependências gráficas/sonoras falsas,
sem abrir Tk, navegador ou dispositivo de áudio. Verificam pools, física,
tiros/dano/pontos, vidas, pickups, partículas, pausa, vitória, controles nomeados,
agendamento único e saída. Isso não substitui a partida e o áudio reais, os
testes de desempenho ou a qualificação visual dos três modos.
