# Motores do Clássico: o que existe, e o que o lote 4 mudou (21/11/2026)

Seção 8 da missão ("motores preparados para jogos grandes"): antes de mexer, o inventário do que
os cinco motores JavaScript já fazem. Feito por leitura do código, com arquivo e linha, num
levantamento independente e conferido nos pontos que este lote tocou. Pastas: `OE` =
`packages/studio/src/official-extensions`; `CORE` = `packages/core/src/studio` (onde mora o motor
das cenas do Pinta, `pinta-scene-player.ts`).

## O que cada motor já tem

| Capacidade | Jogo 2D | Jogo 2D Avançado | Jogo 3D | Mundo 3D | Jogo 3D Avançado |
|---|---|---|---|---|---|
| Passo | fixo 1/60 com acumulador (`game-2d/runtime/lifecycle.ts`) | variável (teto 0,1); fixo 1/60 com interpolação na campanha | variável, teto 0,1 | variável, teto 1/30 | variável, teto 1/30, subpassos de colisão |
| Atualizar separado de desenhar | não (o "a cada quadro" faz os dois) | sim | sim | sim | sim |
| Pool de entidades | não (só teto) | sim (por molde, pré-aquecido) | não | instâncias | sim (recursos de modelo com dono) |
| Índice espacial | parcial (grade do terreno, sort-and-sweep acima de 2048 pares) | sim (células de 64 a partir de 1600 pares) | não | colisores em grade | sim (grade 16×16) |
| Recorte fora da tela | só os tiles; sprites desenhados todos | tiles e entidades (margem 128) | frustum padrão do three | pedaços de 80 m com esfera própria | frustum padrão; recicla longe da origem |
| Instancing | (Canvas 2D) | (Canvas 2D) | não; geometria e material compartilhados | sim, em muitos lugares | não; clones compartilham geometria e material |
| Regiões / streaming | não (porta troca a cena inteira) | não (o RPG troca o mapa inteiro) | só o Kit Plataforma (17 colunas à frente, 11 atrás) | grama toroidal (só visual) | não |
| Qualidade adaptativa | (Canvas 2D) | (Canvas 2D) | sombra por nível | modo turbo | modo leve e composer |
| Descarte de GPU | (Canvas 2D) | (Canvas 2D) | recomeçar descarta mundos; fechar solta caches e o renderer | recomeçar leve no lugar; fechar descarta tudo | nova partida descarta pools e moldes; fechar descarta tudo |
| Persistência do jogo | não | sim (slots validados) | não | não | sim (`localStorage` com prefixo) |

As cenas do Pinta ("Criar cenário do meu desenho", Jogo 2D e Avançado): os tiles são recortados
pela câmera (`CORE/pinta-scene-player.ts`), mas as camadas de objetos e de arte são desenhadas
inteiras, e dentro de um conjunto o recorte não segue a câmera. A cena inteira é preparada de uma
vez (256×256 células, 32 camadas, 512 objetos por camada no máximo).

O orçamento de desenho dos três motores 3D (`OE/threeRenderBudgetRuntime.ts`) cuida do pixel
ratio, do tamanho da tela, do mapa de sombra e dos efeitos, e passa ao nível leve uma vez abaixo
de 45 quadros por segundo. Não cuida de draw calls, quantidade de objetos nem nível de detalhe:
esses são tetos de cada motor, mais o orçamento por modelo do carregador compartilhado.

## Os tetos que cortavam calados (seção 8.4)

A missão pede: "quando um limite for alcançado, o usuário deve receber uma mensagem clara e não um
jogo silenciosamente incompleto". O inventário achou cinco cortes sem recado. Os tetos não
mudaram; agora cada um avisa, uma vez por partida, no console do jogo (onde moram todos os avisos
dos motores):

| Motor | Teto | Recado |
|---|---|---|
| Jogo 2D | 400 sprites num grupo ou tipo de inimigo (em todos os caminhos: soltar, pôr no grupo, tiros, obstáculos, ovos, asteroides, inimigos e a lista mexida direto no modo Código) | "um grupo (ou tipo de inimigo) chegou a 400 sprites e o novo não entrou. Use "Tirar do grupo quem sair da tela" ou "Destruir o sprite" para abrir vaga." |
| Jogo 2D | 80 partículas por emissão; 400 na tela | "Soltar partículas" solta no máximo 80 de cada vez: soltei 80. / chegou a 400 partículas ao mesmo tempo e as novas não apareceram. Solte menos de cada vez. |
| Jogo 2D Avançado | 1000 partículas | chegou a 1000 partículas ao mesmo tempo e as novas não apareceram. Use menos partículas no "Criar o efeito". |
| Jogo 3D Avançado | 120 faíscas por explosão; 300 por efeito ao mesmo tempo; 64 enfeites | um efeito 3D solta no máximo 120 faíscas de cada vez: usei 120. / um efeito chegou a 300 faíscas ao mesmo tempo e as novas não apareceram. / espalhar enfeites usa no máximo 64: espalhei 64. |

Testes, todos vermelhos na versão anterior: `game-2d/__tests__/limitWarnings.test.ts`,
`game-2d-advanced/__tests__/runtime.test.ts` ("os tetos avisam") e
`game-3d-advanced/__tests__/runtime.test.ts` ("os tetos avisam").

## O peso dos motores (os tetos de payload desceram)

Nenhum teto de payload pode subir, e o Jogo 2D estava a 40 bytes do dele (o teto é em bytes de
UTF-8, e os recados têm acento). O que se achou: o Jogo 2D mandava **54,7 KB de comentários de
bloco** (`/** … */`) a cada criança, a cada execução; o compactar só tirava os comentários de linha.
`compactOfficialRuntimeSource(…, { stripBlockComments: true })` tira o comentário que começa uma
linha (ali ele não pode estar dentro de uma string nem de uma expressão regular), com modo
cauteloso para um `/*` aberto no meio do código e recusa de linha com barra de continuação.
`bundle.test.ts` prova, com o parser do TypeScript (que sabe onde começa uma expressão regular),
que o programa impresso sem comentários é o MESMO antes e depois. O typecheck do runtime passou a
ler a fonte, que é o mesmo programa e tem os tipos JSDoc.

| Runtime | Antes | Depois | Tetos |
|---|---|---|---|
| Jogo 2D (sem cenário) | 422.457 bytes, 120.628 gzip | 368.597 bytes, 95.223 gzip (−13% e −21%) | 422.500 → 369.500; 121.500 → 96.000 |
| Jogo 2D com cenário | 447.878 caracteres | 394.456 | 449.000 → 397.000 |
| Jogo 3D Avançado | 220.689 caracteres, 64.974 gzip (Windows) | 218.501, 63.889 | 220.700 → 218.600; gzip Windows 65.000 → 64.000; Linux 62.600 → 61.750 (estimado; o CI mede) |
| Jogo 3D Avançado sem cenário | 213.058, 62.755 | 210.870, 61.667 | 213.150 → 210.950; Windows 62.900 → 61.800; Linux 60.550 → 59.600 |

No 3D Avançado o compactar não mudou: os comentários no fim das linhas de `var` (que iam para o
jogo, 3,5 KB no total do motor) foram para uma linha própria. O Avançado 2D e os outros dois 3D
ainda levam comentários de bloco: é a mesma economia esperando um lote que meça e desça os tetos
deles, com o gzip do Linux medido no CI.

As cinco aulas protegidas passaram no navegador com os motores novos (`e2e/protected-lessons.spec.ts`,
5 de 5), a matriz dos cursos (43) e os testes completos dos três motores mexidos (Jogo 2D e cenas
3.345, Avançado 1.237, 3D Avançado 576).

## O que falta na seção 8, sem enfeite

- **Regiões e streaming genéricos** (8.3): nenhum motor 2D tem, e só o Kit Plataforma do 3D. Para
  a criança, isso é bloco novo (definir regiões, o que fica salvo ao sair delas): precisa de
  proposta aprovada por ela antes de existir.
- **Homologações D (2D extenso) e E (3D com regiões)**: não montadas.
- **Recorte de sprites fora da tela no Jogo 2D** e **das camadas de objetos das cenas do Pinta**
  (este no `packages/core`, da frente do Pinta): a medir com um jogo grande antes de mexer.
- **Memória e GPU em 10 ciclos com as contas do renderer** (geometrias, texturas, programas): a
  liberação de recursos do lote 2 mede o processo e os documentos; a conta do three dentro do
  jogo ainda não.
- **Instancing no Jogo 3D e no 3D Avançado**: só se um perfil apontar.
