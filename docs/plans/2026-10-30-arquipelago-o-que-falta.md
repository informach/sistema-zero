# Arquipélago: o que falta do plano depois da revisão de 30/10

Base: `staging` local `4f8a041d2` (revisão dos lotes com R1, R3, R4 e R5 integrados; sem push).
Este documento é a passagem para quem continua. Ele não repete as especificações: aponta para
elas e diz em que ordem fazer, o que é de Blender, o que é de código e o que é decisão da dona.

Fontes: [relatório da revisão](../../.audits/architectural-analysis-2026-10-30-arquipelago-revisao-dos-lotes.md),
[índice de estado](../arquipelago-estado-atual.md), [pedidos de arte](2026-10-30-arquipelago-pedidos-de-arte.md)
e [plano do E04](../superpowers/plans/2026-10-30-arquipelago-e04-criacao-avancada.md).

## 1. Para a sessão com Blender

As quatro entregas abaixo já estão especificadas, com medidas, nomes de nós e aceite, nos
[pedidos de arte](2026-10-30-arquipelago-pedidos-de-arte.md). O código do jogo não desenha peça
nem colisor que falte na arte, então cada uma destrava uma parte do E04.

| Ordem | Entrega | Onde | Seção dos pedidos | Aceite |
| --- | --- | --- | --- | --- |
| 1 | Clareira de 5 × 5 m com `lote-cabana-a`/`-b` para o iglu | `arte/ilhas-b/pico.py` → `src/assets/ilhas/pico.glb` | "o lote do iglu no Pico" | Novo teste em `tests/cabana.test.ts` que confere o lote plano e livre contra os colisores do `pico.glb` (o teste do Pico saiu com o iglu na V20) |
| 2 | Subida final por fora da torre: escada, duas quinas, equilíbrio, corrente de ar, `subida-farol-*` e `vagalume-farol-N` | `arte/mundo/farol.py` → `src/assets/mundo/farol.glb` | "3. A subida final pelo Farol" | Teste no molde de `tests/subida-ao-cume.test.ts` |
| 3 | Segundo andar: `piso-andar-*`, `escada-interna`, `piso-andar-vao`, `guarda-corpo-andar` | kit `arte/casa` → `src/assets/casa/` | "1. Segundo andar da casa" | `tests/faces-coplanares.test.ts` com as peças novas e a escada subida com a cápsula real |
| 4 | Nó `chao-do-lote` separado (e `enfeites-do-lote`) | `arte/mundo/terreno.py` → `src/assets/mundo/terreno.glb` | "2. Moldar o terreno" | Teste que lê o nó, a emenda e confere `alturaDaIlha` igual fora do lote |

A ordem vai do menor e mais isolado (uma clareira) ao que mexe em peça usada por todo o jogo (o
chão da sua ilha). Os caminhos de `arte/` acima são relativos a `packages/arquipelago/`.

Regras de toda entrega (README de cada pasta de `arte/` e seção "Entrega esperada" dos pedidos):
- Regerar pelo script do Blender, nunca editar GLB à mão. Atualizar o `relatorio.json` da pasta
  com as coordenadas finais das âncoras e os limites dos colisores novos.
- Não remover nem renomear nós, colisores, clipes e materiais existentes; conservar origem,
  escala e rotação de cada modelo.
- Sem faces coplanares de materiais diferentes nem emenda em T (`tests/faces-coplanares.test.ts`).
- Colisores `col-*` com forma simples; folgas do pedido dos portos (faixa de 1,5 m, degraus de
  até 0,30 m).
- Os cinco portos do barco já foram entregues e integrados: não refazer.

## 2. Depois da arte (código, sem Blender)

O salvamento V20 está a cerca de 600 bytes do teto no pior caso. Iglu, andar de cima e terreno
vão para um documento à parte no serviço, como descrito no plano do E04 ("O documento próprio da
obra"): `ObraEstendidaSchema` nos contratos, `GET/PUT /obra-estendida` com revisão no serviço,
fila e diário no jogo, desfazer no Construir. O iglu chegou a ter um commit (`3751feaaa`) e saiu
na integração da V20 por falta de espaço; ele volta por esse documento, não pelo salvamento.

A subida final é um percurso `farol-subida` com três estrelas, como os outros. Ela cabe no
documento próprio se a entrada de 96 bytes não couber na V20.

Cada parte precisa do aceite do pedido de arte, colisão com a cápsula real, prova no navegador
em computador e celular emulado e o teste de documento cheio do contrato novo.

## 3. O que não é Blender: conteúdo e decisões da dona

| Pendência | Situação | Quem decide ou faz |
| --- | --- | --- |
| Conteúdo dos quatro baús (§6.24 das regras) | Hoje o baú só registra o achado no álbum. A proposta pede Lumis raros e páginas extras do diário | A dona define quantas espécies novas, nomes e ilhas e o texto das páginas. Só depois disso há pedido de modelo para os Lumis (não modelar por suposição) |
| Aplicação do Inventor | A corrida da Vila ainda não comprova pulo com apoio, colisão e dificuldade | Conteúdo dos desafios, sem arte |
| Publicação dos quadros | 54 de 130 entradas locais pedem publicação; Bosque e Vila, nenhuma | Resolver repertório e objetivos antes; não marcar `publicar: true` em lote |
| Noite das Lanternas | Sem data, desligada (`sistemas/festas.ts`) | A dona |
| Qualificação Q01 | Ciclo autenticado nas duas comunidades, implantação conjunta, importação, canal de fotos, celular físico | Operação da dona |

## 4. Em andamento em outra sessão

O R2 (Python e Pro abrindo pelo jogo, elegibilidade e a release Python) está com a sessão
`implementar-levantamento-arquipelago`, no ramo `arquipelago/levantamento-c02-ambiente`. Não
mexer no diálogo do desafio, nas rotas dos desafios nem na autorização de execução enquanto ele
não for integrado.

## 5. Antes de começar

- Conferir `git worktree list` e o `git status` de cada worktree: várias sessões trabalham no
  Arquipélago ao mesmo tempo.
- Esta base não foi enviada ao remoto. Uma sessão em outra máquina só a recebe depois do push.
