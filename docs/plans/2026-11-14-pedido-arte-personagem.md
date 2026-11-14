# Pedido à arte: o personagem do jogo e os pontos de interação

Data: 14/11/2026. De: Sistema Zero (jogo Arquipélago). Para: a sessão de arte (`artes-3d`).
Decisões da dona por trás deste pedido: D1 a D6 do levantamento
(`docs/plans/2026-11-14-arquipelago-personagem-levantamento.md`, no `sistema-zero`).

## 1. O que mudou no jogo

- **O herói do jogo é o avatar do pack Cute Characters no tamanho nativo (1,15 m)**, igual ao da
  plataforma. Nada é reescalado: nem o avatar, nem a Morada, nem as bibliotecas de aventura.
- **O jogo vai ser refeito com a biblioteca de aventura** (doce, reino e as demais), com ilhas de
  100 a 200 m. A exceção é a ilha principal, que é a casa da criança: lá ela constrói livremente
  com a Morada (casa, móveis, quintal, plantação).
- **O personagem passa a ser um módulo único:** as medidas saem do esqueleto, as animações são
  feitas para esse corpo, e pés e mãos são ajustados por IK em tempo real.
- **As interações** (subir, agarrar, pendurar, sentar, montar) passam a ser guiadas por pontos
  declarados no catálogo de cada peça, com um vocabulário só para todas as bibliotecas.

O pedido tem três partes:
- animações e encaixes do avatar (seções 2 e 3);
- peças de equipamento (seção 4);
- o vocabulário de pontos de interação (seção 5).

A seção 6 diz como conferimos, e a 7 a ordem de entrega.

## 2. Animações do avatar

### 2.1 Regras para todas

- **Mesmo esqueleto e mesmas convenções do pack:**
  - 44 ossos, sem mexer nas matrizes de ligação;
  - 30 quadros por segundo;
  - nomes em português no catálogo, no formato de `esqueleto/catalogo.json → animacoes`.
- **Deslocamento como o pack:** fica na translação do `Hips`, e o `Root` fica parado. O jogo tira
  o deslocamento na carga e usa o valor como passada.
- **Ciclos fechados:** o último quadro emenda no primeiro, sem salto.
- **Feitas para este corpo,** com cabeça grande e braço curto (cerca de 0,26 m do ombro ao punho
  na escala nativa):
  - as mãos não atravessam a cabeça nem o tronco;
  - nas poses de agarrar e pendurar, as mãos ficam na altura do topo da cabeça, não acima dela,
    porque o jogo leva as mãos ao ponto certo por IK;
  - o Mixamo pode servir de rascunho.
- **No catálogo, por animação, além dos campos que já existem:**
  - `pes`: os quadros em que cada pé toca o chão e sai dele (`[{pe: "esq"|"dir", toca, sai}]`);
  - `maos`: nas animações de segurar, os quadros em que cada mão está agarrada, para o IK
    saber quando prender;
  - `passada_m` e `subida_m`, medidos do `Hips`, para conferirmos com a nossa medida.

### 2.2 A lista, por prioridade

**P1: o que o jogo mais usa e o pack não tem.**

| id | O que é | Laço |
|---|---|---|
| `nadar` | nado de frente, cabeça fora d'água | sim |
| `boiar` | parado na água | sim |
| `entrar_na_agua` / `sair_da_agua` | transição | não |
| `pendurar_borda` | pendurado pelas mãos numa quina, parado | sim |
| `andar_pendurado_esquerda` / `andar_pendurado_direita` | deslocar-se pendurado | sim |
| `subir_borda` | sair do pendurado para cima da borda | não |
| `pendurar_cipo` | pendurado num cipó ou corda, balançando | sim |
| `sentar` / `sentado` / `levantar` | sentar num assento a cerca de 0,30 m na escala nativa (cadeira de criança da Morada), a pose sentada e o levantar | não / sim / não |
| `deitar` / `deitado` / `levantar_da_cama` | deitar de barriga para cima, a pose deitada e o levantar | não / sim / não |

**P2: modos do jogo.**

| id | O que é | Laço |
|---|---|---|
| `escalar` | subir uma parede ou tronco com mãos e pés | sim |
| `equilibrar` | andar num tronco estreito, braços abertos | sim |
| `escorregar` | descer sentado num escorregador | sim |
| `planar` | pendurado na barra do planador, pernas soltas | sim |
| `montar` / `montado` / `desmontar` | subir num animal ou veículo, a pose montado e o descer | não / sim / não |
| `patinar` | deslizar de patins | sim |
| `empurrar` | empurrar um objeto pesado | sim |

**P3: gestos e vida.**

| id | O que é | Laço |
|---|---|---|
| `pegar_do_chao` | abaixar e pegar algo do chão | não |
| `acenar` | acenar com a mão | não |
| `comemorar` | pular de alegria | não |
| `plantar` / `regar` | na horta | não |
| `dancar` | dança curta | sim |

## 3. Encaixes no esqueleto

Hoje o esqueleto tem dois encaixes, `mao_esquerda` e `mao_direita` (`LeftHandProp` e
`RightHandProp`), em `pontos_de_segurar`. Pedimos mais quatro, **sem acrescentar ossos** (as
matrizes e a conferência de 44 ossos continuam iguais):

- **`cabeca_topo`:** o topo da cabeça, onde pousa o passarinho e de onde se mede a cabeça.
- **`costas`:** onde fica uma mochila ou o planador fechado.
- **`pe_esquerdo` / `pe_direito`:** a sola de cada pé, onde os patins encaixam.

Formato proposto: aceitar, além do nome de osso que já existe, um objeto
`{ "osso": "Head", "posicao": [x, y, z], "rotacao": [x, y, z, w] }`, no referencial do osso, em
metros na escala nativa. Os dois encaixes que já existem podem continuar como texto.

Também pedimos `olhos` (a altura dos olhos na pose de descanso), para a câmera mirar certo. Pode
vir como um encaixe a mais, preso ao `Head`.

## 4. Peças de equipamento do jogo

- **Patins** feitos para o pé do avatar, como peça da categoria de calçado. Eles substituem o
  calçado enquanto a criança está de patins, encaixam em `pe_esquerdo` e `pe_direito`, e as
  rodas ficam abaixo da sola. Precisamos da altura que os patins somam ao corpo.
- **Lanterna de mão e barra do planador**, no tamanho da mão do avatar. Cada peça com o ponto da
  pegada, a origem na pegada, encaixando no `mao_direita`; a barra do planador com as duas
  pegadas.

## 5. O vocabulário de pontos de interação (D6)

### 5.1 O campo

Pedimos um campo novo e único no catálogo de toda biblioteca (aventura, Morada e as que vierem):
`pontos_de_jogo`, uma lista. Cada ponto tem `tipo` e os dados daquele tipo, sempre no referencial
da peça (Y para cima, frente +Z, metros, origem no meio da base, como os catálogos já fazem):

| tipo | Dados | Para quê |
|---|---|---|
| `subir` | `pe` [x,y,z], `topo` [x,y,z], `degraus`, `passo_m`, `parede` ("−Z"…), `saida` [x,y,z] | escada de mão; inclui o `escalavel` do doce |
| `agarrar` | `de` [x,y,z], `ate` [x,y,z] (a quina como um segmento), `fora` (o lado de fora) | borda e parapeito em que se pendura |
| `pendurar` | `pivo` [x,y,z], `comprimento_m` | cipó e corda |
| `equilibrar` | `de`, `ate` (o eixo), `largura_m` | tronco caído, viga |
| `escorregar` | `pontos` [[x,y,z]…] (a curva), `largura_m` | escorregador, tobogã |
| `sentar` | `ponto` [x,y,z], `direcao` [x,y,z], `altura_m` | cadeira, banco, sofá; inclui os `pontos.sentar` da Morada e os `assentos` dos barcos |
| `deitar` | `ponto`, `direcao`, `cabeceira` [x,y,z] | cama; inclui os `pontos.deitar` da Morada |
| `montar` | `sela` [x,y,z], `direcao`, `altura_m` | animal, veículo, boia; inclui o `assento` dos veículos |
| `embarcar` | `pontos` [{nome, posicao}] | barcos; inclui o `embarque` |
| `entrar` | `vao` {largura_m, altura_m}, `direcao`, `posicao` | porta, portão, arco, iglu; inclui o `entrada` e o `vao_m` |
| `apoiar` | `nome`, `centro`, `tamanho` | lugar para pôr um objeto; inclui os `slots` da Morada |
| `usar` | `ponto`, `direcao`, `acao` ("abrir", "girar_manivela", "apertar"…) | baú, manivela, botão, alavanca; liga com os `interativos` |
| `plantar` | `celulas` [[x,z]…], `tamanho_celula_m` | canteiro, horta |

- Os campos que já existem (`escalavel`, `assentos`, `assento`, `embarque`, `entrada`, `vao_m`,
  `pontos` e `slots` da Morada) podem continuar como estão. O `pontos_de_jogo` é o que o jogo vai
  ler; os antigos podem ser gerados a partir dele, ou o contrário, como for mais simples para a
  arte.
- Peça que se move ou abre (porta, elevador, trampolim) declara o ponto na posição de repouso e
  diz em que `partes` ou `interativos` ele está preso.

### 5.2 Por onde começar

As peças da pista de conferência, na ordem:
1. `reino/objetos/escada_mao_3m` e `doce/interacao/escada_baixa` → `subir`
2. `reino/terreno/plato_grama_7x7_1_5m` e `plato_grama_7x7_3m` → `agarrar` nas quatro quinas de cima
3. `templo/natureza/cipo_pendurado` → `pendurar`
4. `reino/objetos/tora` → `equilibrar`
5. um escorregador da aventura → `escorregar`
6. `reino/terreno/lago_nadavel` → a água (já tem `agua`; conferir `nadavel` e a profundidade)
7. `reino/objetos/canoa` → `embarcar` e `sentar`
8. da Morada: uma cadeira de criança, um banco, um sofá e uma cama → `sentar` e `deitar`
9. `reino/castelo/muro_portao` e uma porta da Morada → `entrar`
10. um canteiro do quintal da Morada → `plantar`

Depois disso, todas as peças das cenas já montadas (terra doce, reino, faroeste, inverno, templo,
estádio), cena por cena.

## 6. Como conferimos

- O `avatar:migrar` do Sistema Zero lê o `origin/main` da arte e passa para o nosso catálogo:
  - os ossos em repouso (`lista_ossos`);
  - os encaixes (`pontos_de_segurar`);
  - as animações com `passada_m`, `subida_m`, `pes` e `maos`;
  - mais adiante, os `pontos_de_jogo`.
  
  Os nossos testes leem esse catálogo.
- Na pista de conferência, cada animação e cada ponto é feito pelo personagem no jogo e
  fotografado. A dona aprova as fotos de referência.
- O que ajudaria muito do lado da arte: estender o `avatar_confere.py` e o
  `personagens_confere.py` para as animações novas. Por exemplo:
  - o pé não escorrega nos quadros de apoio;
  - o ciclo fecha;
  - as mãos não atravessam a cabeça;
  - nos clipes de segurar, as mãos chegam à altura do topo da cabeça.

## 7. Ordem de entrega

1. Encaixes do esqueleto (seção 3) e os campos novos nas 29 animações que já existem (`pes`,
   `passada_m`, `subida_m`). É rápido e destrava o nosso passo 1.1.
2. `pontos_de_jogo` nas peças da pista (seção 5.2).
3. Animações P1.
4. Patins, lanterna e barra do planador (seção 4).
5. Animações P2.
6. `pontos_de_jogo` nas cenas montadas.
7. Animações P3.

Cada lote entra na `origin/main` da arte como hoje. Avisem o nome do lote; o nosso
`avatar:conferir` mostra o que é novo.

## 8. O que não pedimos

- **Nenhuma mudança no esqueleto atual:** ossos, matrizes e as 415 peças ficam como estão.
- **Nenhuma reescala** de peça ou de biblioteca.
- **Nenhum plano de integração:** a integração no jogo é nossa, e este pedido é só sobre os
  arquivos e os catálogos.
