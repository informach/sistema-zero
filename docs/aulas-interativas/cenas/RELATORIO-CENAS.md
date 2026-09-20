# Relatório das cenas: pedido, construído e o que sobrou

> ✅ **Trabalho concluído em 19/09/2026.** As 11 cenas novas foram construídas e os ajustes nas
> existentes foram aplicados. O catálogo passou de **45 para 56 cenas**, e os 27 manifestos das
> aulas passam no validador com zero avisos.
>
> Este documento deixou de ser lista de tarefas e virou registro: o que foi pedido, o que foi
> construído, e onde os dois divergem. Os três arquivos desta pasta trazem a especificação por
> cena.

## O quadro geral

| | Quantidade | Onde está a especificação |
|---|---:|---|
| Cenas novas pedidas, **todas construídas** | **11** | [CENAS-NOVAS.md](CENAS-NOVAS.md) |
| Cenas existentes ajustadas (A a L) | **14** | [CENAS-AJUSTES-1.md](CENAS-AJUSTES-1.md) |
| Cenas existentes ajustadas (M a Z) | **14** | [CENAS-AJUSTES-2.md](CENAS-AJUSTES-2.md) |
| **Total de cenas tocadas** | **39** | |

O catálogo tem **56 cenas**, e **193 metas**. As que ficam intocadas pertencem a níveis que estes
três cursos não alcançam: `camera`, `tilemap`, `cooldown`, `entity-state`, `circle-collision`,
`diagonal`, `mesh`, `axis-z`, `camera-3d` e `pick-ray`.

## O que motivou o trabalho

**Mais da metade das cenas existentes tinha meta faltando.** Não era ajuste fino: a cena não cobrava
aquilo para que foi feita. Eram **18 cenas quebrando a aula** e 10 prejudicando o aprendizado.

Casos exemplares, **todos já corrigidos**:

- `hitbox` estava com a lista de metas **vazia**, e a seção fechava sem a criança fazer nada.
- `gravity` não tinha a meta de pousar, que é o que dá nome à cena.
- `impulse` não tinha a comparação, que é a razão de a cena existir.
- `draw-loop` não cobrava o conceito raiz do curso inteiro.
- `acceleration` celebrava na frase de sucesso um resultado que nenhuma meta produzia.
- `symmetry` era cobrada por quatro metas na Aula 2 do Meu Jeito, e só uma existia.
- `velocity` era cobrada por três metas inexistentes, e a atividade nunca fechava.
- `fill-stroke` tinha perdido a meta `only-fill`, e o rastro ficou na numeração do roteiro da cena,
  que pulava do passo 1 para o passo 3.

## ⚠️ A regra que nasceu deste lote, e que todo autor precisa saber

**Meta nova entrou como meta de caso (`soNoCaso`), fora da missão de fábrica.** São **21 das 189**,
e elas **só valem quando a aula as declara** em `setup.goals`.

| Cena | Metas que só valem se declaradas |
|---|---|
| `once-vs-always` | `on-event`, `key-fires`, `flood` |
| `hitbox` | `early-hit`, `fair-hit` |
| `spawn` | `same-fall` |
| `velocity` | `still`, `up`, `down` |
| `score` | `score-waiting`, `score-kept` |
| `restart` | `back-to-menu` |
| `random` | `above` |
| `jump-sound` | `quiet-air`, `key-sound`, `tap-sound` |
| `impulse` | `compare` |
| `acceleration` | `spawned-ten` |
| `stage-size` | `follows` |
| `screen-reader` | `says-all-controls` |
| `camera-3d` | `back` |

Isso **invalida a saída que este documento descrevia antes**. Estava escrito que uma aula podia ser
importada sem declarar metas e "ganhar a cobrança quando a meta nascesse". Ela não ganha: o bloco
que herda continua cobrando só as metas de fábrica.

O caso concreto: no Dia 3 do Desafio, a cena do relógio herdava duas metas e a seção fechava **sem a
comparação de 40 para 20 quadros**, que é exatamente o que a instrução do bloco manda fazer. As 27
aulas foram revisitadas uma a uma por causa disso.

## A parametrização por preset: aceita e construída

A decisão de arquitetura que este relatório apontava como a primeira a tomar foi tomada. O motor
aceita **preset por aula** (caso preparado, elenco, fichas e rótulo de meta adaptáveis), e por isso
as 11 cenas atendem todos os usos em vez de virarem cerca de 20. A `once-vs-always` sozinha serve
cinco aulas em dois cursos, com cinco presets.

## A ação de motor que eu pedi e não era necessária

Este relatório pedia uma ação nova, `reset-stage`, para voltar o palco ao começo, exigida por 6 das
11 cenas novas. **Ela não foi construída, e fez-se melhor:** o motor já tinha um `reset`, que foi
reusado, com a interface chamando o gesto de "Voltar ao começo". O pedido nasceu de eu desconhecer o
que já existia.

## A fila de dependência entre cena e aula

Descoberto ao gerar os manifestos, testando contra o validador real do core. **Isto governa a
ordem do trabalho e não é negociável.**

| Situação | O que acontece na importação |
|---|---|
| A aula usa cena que **não existe** no catálogo | O manifesto inteiro é recusado. O validador deste projeto marca `AGUARDA` |
| A aula cobra **meta que não existe** numa cena que existe | O manifesto inteiro é recusado, e é `FALHA`, não `AGUARDA` |
| A aula usa cena existente sem declarar lista de metas | Passa, e herda a missão de fábrica da cena |

A terceira linha era a saída para o meio do caminho: uma aula podia ser importada sem declarar as
metas que ainda não existiam, e ganhar a cobrança depois. Foi o que se fez no Dia 3 do Desafio para
a meta `same-fall` da `spawn`. **Com a `spawn` ajustada, o Dia 3 deixou de herdar e passou a
declarar a lista dele** (`every-frame`, `with-timer`, `same-fall`), porque herdar cobrava só as duas
metas de fábrica e a seção fechava sem a comparação de 40 para 20 quadros.

⚠️ **A herança tem um custo que vale registrar para as outras aulas.** Meta nova criada como meta de
**caso** (`soNoCaso`) **não** entra sozinha na missão de fábrica. Quase todas as metas novas deste
lote entraram assim, e as exceções são `with-timer`, `positions`, `rule-removes` e `clean-track`,
que estão na missão de fábrica das cenas delas. Ou seja: o bloco que não declara lista não ganha a
cobrança quando a meta nasce, e cada aula que ficou herdando precisa ser revisitada uma a uma.

**Consequência prática:** os 27 manifestos não entram todos de uma vez. Os que usam cena nova
entram depois que a cena for construída, e a lista `AGUARDA` do validador é essa fila.

Para conferir a qualquer momento:

```
cd C:\Users\tocha\projects\sistema-zero && bun docs/aulas-interativas/qa/validar-manifestos.ts
```

⚠️ O `AGUARDA` **mascara os avisos de convenção** do resto do arquivo, porque o validador para no
schema. Para conferir uma aula bloqueada por inteiro, troque a cena nova por uma existente numa
cópia de prova, rode, e apague a cópia.

## A figura de elenco que faltava: resolvida

A lista `SCENE_FIGURES` do core era **fechada, com 11 figuras**, e nenhuma delas era um fundo
estrelado. A cena `layers` do Dia 1 do Desafio precisa de um cenário que cubra a nave, e o manifesto
declarava `asteroide` como placeholder, com o texto que a criança lê contradizendo o desenho que ela
vê.

**A figura `estrelas` foi criada.** A lista tem doze figuras, e a nova responde pelos nomes
"estrelas", "fundo estrelado" e "céu estrelado". O bloco `experiencia-camadas` do Dia 1 declara
`scenery` com o nome "fundo de estrelas" e a figura `estrelas`, e a ressalva saiu do relatório
daquela aula.

## A ordem de execução, e o que aconteceu com ela

Os seis passos que este relatório propunha foram todos cumpridos: a parametrização por preset foi
aceita, as metas que faltavam foram criadas, as cenas de relação com botão passaram de demonstração
para experimentação (o que fez o botão "Agora é sua vez" desaparecer, e ele era fórmula banida), a
`variable` foi ligada na Aula 11 do Corre Dino, e as 11 cenas novas foram construídas.

O único passo que não se cumpriu como escrito foi a ação `reset-stage`, e por bom motivo, explicado
acima.

**O que sobra é a gravação.** Os 27 manifestos estão prontos para importar, e a fila de dependência
entre cena e aula está vazia.

## Divergências entre o especificado e o construído

Em todas, **o código venceu** e a especificação foi atualizada para descrever o que existe.

**O padrão geral:** onde a especificação pedia meta com id novo, a implementação manteve o id de
fábrica na missão padrão e registrou o id proposto como meta de caso. Vale para as cinco cenas da
tabela. Em `restart` e em `random` não há mais divergência: cada uma tem hoje um id só para a
descoberta, `clean-track` e `positions`, as duas na missão de fábrica.

| Cena | A especificação pedia | Ficou como |
|---|---|---|
| `stage-size` | `follows` | `resized`, com texto idêntico. `follows` virou alias |
| `impulse` | `compare` | `other-height`, idem |
| `hitbox` | `early-hit`, `fair-hit` | `contact`, `area-contrast`. **Pedidos diferentes:** os de fábrica não contam o resultado nem o número |
| `score` | `score-waiting`, `score-kept` | `score-start`, `score-end`. **São comparações:** o motor exige o contraste antes |
| `acceleration` | `spawned-ten` | `variation-limit`, idem |

Quatro cenas chegaram a ter **dois ids para a mesma descoberta**, e isso **está resolvido**: cada
uma ficou com um id só, na missão de fábrica. `spawn` cobra `with-timer`, `random` cobra
`positions`, `cleanup` cobra `rule-removes` e `restart` cobra `clean-track`.

Outras divergências pontuais, todas favoráveis ao construído:

- **`once-vs-always` ficou melhor que o pedido:** quatro frases de sucesso escolhidas pela lista de
  metas, em vez de duas.
- **`fixed-vs-read`, meta `box-marks`:** o código pede também atirar com o centro lido. É mais
  honesto, porque com número fixo a marca não sai do meio da caixa.
- **`two-clocks`:** o relógio de nascimento virou ação própria `birth-every`, que a especificação
  não previa.
- **`same-rules-new-skin`:** o `playable` saiu como duas ações, de mover e de atirar.
- **`sheet-vs-sprite`:** a meta `size-apart` **existe**, ao contrário do que dois relatórios
  afirmavam. Fica fora da Aula 6 por escolha, não por ausência.
- Cinco cenas passaram a guardar palpite e pergunta final nelas mesmas, e o do bloco prevalece
  quando existe.

## Pendências que dependem de decisão, não de execução

**Republicar no Mural. Decidida, e fechada.** O documento de design da plataforma (`sistema-zero/docs/plans/2026-09-19-cenas-presets-design.md`) registra que o serviço do Mural cria outro post quando recebe uma nova chave de publicação, e que a mesma chave apenas evita duplicar o mesmo envio. Ou seja, **republicar põe uma publicação nova, e não atualiza a que já estava lá**. A `published-copy` foi construída com a terceira meta `republish` e o rótulo "O Mural ganhou uma publicação nova com a cor nova", a Aula 8 do Meu Jeito cobra as três metas, e nenhum texto do projeto afirma atualização.

**O grupo `world` do catálogo** passa de 3 para 7 cenas com as novas e deixa de significar "o mundo do jogo" para significar "o projeto como coisa". Não bloqueia nada, mas convém decidir se vira grupo próprio.

**A meta `lives.over`** fica órfã: nenhuma das 27 aulas usa a cena `lives` depois do redesenho.

## Correções ao que foi dito antes

Três diagnósticos deste relatório caíram no caminho, e ficam registrados para quem ler o histórico:

- A `game-state` **não** estava sem uso. Já estava ligada no Corre Dino Aula 7, seção 5. Quem nunca
  a tinha ligado era o Desafio, que usava uma comparação em HTML pior no lugar dela.
- A afirmação de que faltavam metas em `symmetry`, `onion-skin`, `fill-stroke`, `pixel-vector`,
  `gravity`, `draw-loop`, `random` e `cleanup` **era erro de medição**, não do código. O extrator
  usado na primeira auditoria perdia metas cujos campos vinham em ordem diferente ou com campos
  extras. Refeito com casamento de chaves, não falta nenhuma.
- O pedido da ação `reset-stage` nasceu de desconhecimento: o `reset` já existia.

## Como conferir tudo de novo

Reextrair o catálogo do código e revalidar os 27 manifestos:

```
cd C:\Users\tocha\projects\sistema-zero && bun docs/aulas-interativas/qa/validar-manifestos.ts
```

Estado em 19/09/2026: **27 válidos, 0 esperando cena, 0 reprovados, 0 avisos de convenção.**
