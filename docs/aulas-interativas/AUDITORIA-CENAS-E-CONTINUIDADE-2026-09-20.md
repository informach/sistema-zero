# Auditoria das cenas e da continuidade · 20/09/2026

## O que foi conferido

Os **53 usos** de cena nos 27 manifestos foram comparados ao `CATALOGO-CENAS.json` e às regras de
conclusão da plataforma. Todos os 53 são obrigatórios, têm ao menos duas metas efetivas, referem
metas existentes e não repetem a mesma meta dentro da missão. As 28 seções sem pistas próprias
recebem as pistas do modelo; quando a aula restringe metas, o player reduz a ajuda para a meta que
falta. Há 31 palpites antes ou durante a ação, 30 checkpoints explícitos e 10 experiências sem
pergunta adicional. Nestas dez, a conclusão vem das ações e do resultado observado, sem pergunta
de memória acrescentada só para preencher uma regra.

**Decisão didática:** manter as metas exigidas. As duas cenas mais extensas têm cinco passos que
formam uma comparação causal: `score` na Aula 11 do Corre Dino mostra o placar disparando, o erro
na abertura, o acerto na abertura, o crescimento jogando e a parada no fim; `frames` na Aula 3 do
Meu Jeito compara quadros parados, prévia rápida, pausa, prévia lenta e quadros iguais. Tirar um
passo agora reduziria a prova do conceito. No ensaio, medir se alguma dessas duas sequências vira
repetição cansativa antes de simplificar.

**Pergunta duplicada corrigida:** o quiz do Dia 3 do Desafio repetia quase literalmente o
checkpoint de `collision-pair`. Agora apresenta três pedras e pede o efeito de um tiro sobre uma
delas. O checkpoint continua perguntando quem é o `asteroide` daquela colisão; o quiz pede aplicar
a ideia ao jogo.

## Inventário dos 53 usos

`P` indica palpite; `C`, checkpoint. `sem pergunta` indica que as metas da cena são a própria prova.

| Aula | Seção | Cena | Metas | Pergunta |
|---|---|---|---:|---|
| Corre Dino 1 | `limite-da-tela` | `stage-size` | 3 | sem pergunta |
| Corre Dino 1 | `coordenadas` | `coordinates` | 3 | sem pergunta |
| Corre Dino 1 | `criar-e-mostrar` | `world` | 2 | sem pergunta |
| Corre Dino 2 | `quadros` | `draw-loop` | 3 | sem pergunta |
| Corre Dino 2 | `uma-vez-e-sempre` | `once-vs-always` | 3 | sem pergunta |
| Corre Dino 2 | `camadas` | `layers` | 3 | sem pergunta |
| Corre Dino 3 | `gravidade-modelo` | `gravity` | 2 | P |
| Corre Dino 3 | `impulso-modelo` | `impulse` | 2 | sem pergunta |
| Corre Dino 4 | `area-que-espera` | `once-vs-always` | 3 | P |
| Corre Dino 4 | `dedo-e-pulo` | `jump-sound` | 3 | sem pergunta |
| Corre Dino 5 | `espaco-e-tempo` | `spawn` | 2 | sem pergunta |
| Corre Dino 5 | `numero-negativo` | `velocity` | 3 | P |
| Corre Dino 6 | `visivel-guardado` | `cleanup` | 2 | P |
| Corre Dino 7 | `condicao` | `game-state` | 3 | P |
| Corre Dino 8 | `convite` | `controls` | 3 | P |
| Corre Dino 9 | `trocar-nao-limpa` | `restart` | 3 | P |
| Corre Dino 10 | `caixa-decide` | `hitbox` | 3 | P |
| Corre Dino 11 | `guardar-mudar-mostrar` | `variable` | 3 | P |
| Corre Dino 11 | `quando-o-placar-cresce` | `score` | 5 | P |
| Corre Dino 12 | `sorteio-tira-na-hora` | `random` | 3 | P |
| Corre Dino 13 | `regua-negativos` | `number-line` | 4 | P |
| Corre Dino 13 | `o-que-o-freio-segura` | `acceleration` | 4 | P |
| Desafio 1 | `uma-vez-e-sempre` | `once-vs-always` | 3 | P / C |
| Desafio 1 | `coordenadas` | `coordinates` | 3 | P / C |
| Desafio 1 | `criar-e-mostrar` | `world` | 2 | sem pergunta |
| Desafio 1 | `o-quadro` | `draw-loop` | 3 | P / C |
| Desafio 1 | `camadas` | `layers` | 3 | P / C |
| Desafio 2 | `terceira-area` | `once-vs-always` | 3 | P / C |
| Desafio 2 | `escrito-e-lido` | `fixed-vs-read` | 3 | P / C |
| Desafio 2 | `sinal-da-velocidade` | `velocity` | 2 | P / C |
| Desafio 2 | `tiro-que-sai-da-tela` | `cleanup` | 2 | P / C |
| Desafio 3 | `avalanche` | `spawn` | 2 | C |
| Desafio 3 | `sorteio` | `random` | 3 | C |
| Desafio 3 | `trombada` | `collision-pair` | 3 | P / C |
| Desafio 4 | `caixa-de-pontos` | `variable` | 3 | C |
| Desafio 4 | `respiro` | `invincibility` | 3 | P / C |
| Desafio 4 | `vidas-uma-vez` | `once-vs-always` | 3 | C |
| Desafio 5 | `estado-do-jogo` | `game-state` | 3 | C |
| Desafio 5 | `reiniciar` | `restart` | 2 | C |
| Meu Jeito 1 | `copia` | `copy-vs-original` | 3 | P / C |
| Meu Jeito 2 | `espelho` | `symmetry` | 4 | C |
| Meu Jeito 2 | `luz` | `shading` | 3 | C |
| Meu Jeito 3 | `quadros` | `frames` | 5 | C |
| Meu Jeito 3 | `fantasma` | `onion-skin` | 3 | C |
| Meu Jeito 4 | `cores-vetor` | `fill-stroke` | 3 | C |
| Meu Jeito 4 | `bordas` | `pixel-vector` | 3 | P / C |
| Meu Jeito 5 | `camadas` | `layers` | 3 | P / C |
| Meu Jeito 5 | `tanto-que-muda` | `motion-amount` | 3 | P / C |
| Meu Jeito 6 | `nomes` | `unique-names` | 3 | P / C |
| Meu Jeito 6 | `folha-e-tamanho` | `sheet-vs-sprite` | 4 | C |
| Meu Jeito 7 | `dois-relogios` | `two-clocks` | 3 | P / C |
| Meu Jeito 8 | `copia-do-mural` | `published-copy` | 3 | P / C |
| Meu Jeito 8 | `mesma-mecanica` | `same-rules-new-skin` | 3 | P / C |

## Critérios que atravessam aulas

| Escolha ou passagem | Resultado conferido |
|---|---|
| Força do pulo escolhida entre 12 e 18 na Aula 3 do Corre Dino | Critérios posteriores não cravam `JUMP: 14`; os dois da Aula 7 que ainda cravavam esse valor foram corrigidos. |
| Som escolhido para o pulo na Aula 4 | O campo `FX` não volta como exigência fixa de `jump` nos critérios posteriores. O som de derrota da Aula 9 é outro gesto, ensinado com valor próprio. |
| Área de colisão escolhida na Aula 10 | Os critérios posteriores não exigem `PERCENT: 80`. |
| Relógio de pontos e limite de velocidade nas Aulas 11 a 13 | Os critérios verificam a estrutura sem cravar `SECS: 1`, `-9` ou `5 s` para essas escolhas. Os `SECS: 1.4` que permanecem são do relógio dos cactos, com valor fixo ensinado na Aula 5. |
| Desafio Dia 5 para Meu Jeito Aula 1 | O Dia 5 entrega o projeto completo; a Aula 1 orienta importar esse projeto, testar a partida e escolher o cartão completo na entrega. O cartão vazio serve só para descobrir extensões. |
| Desenhos do Pinta para o Estúdio no Meu Jeito | As aulas de desenho preservam `nave`, `asteroide` e as animações nomeadas; as Aulas 6 e 7 usam esses nomes ao importar e animar. As entregas pela galeria continuam onde estavam. |

**Salvamento:** o Estúdio embutido exibe `Salvo` para o rascunho local. O aviso `Guardado na sua
conta` pertence à ferramenta completa. Os 17 briefings de fechamento e os cinco roteiros escritos
do Desafio passaram a mostrar o aviso que existe na aula. A entrega ao professor guarda uma cópia;
o rascunho ainda não enviado continua no navegador da criança.

**Limite da auditoria:** os manifestos e a plataforma provam estrutura e critérios; a carga
cognitiva e o valor emocional de cada etapa precisam ser observados com participantes reais.
