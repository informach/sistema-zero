# Qualificação Q01 do levantamento de 30/10/2026

Fecho dos lotes do levantamento integrado (`docs/arquipelago-levantamento-2026-10-30.md`). Separa
o que foi provado neste computador do que só se prova com implantação, conta real, importação de
conteúdo ou aparelho físico. Nada da segunda lista está marcado como feito.

## Provado localmente

| Lote | Prova |
| --- | --- |
| V19, N05 e os percursos | Contratos com o documento cheio, verificador dos percursos no navegador |
| N01 a N07, festas | Suítes do jogo e verificadores próprios de cada lote (registro dos lotes) |
| N08a e N08b | Testes do serviço com Postgres descartável, do BFF e do jogo; verificadores no navegador |
| N11, N12, E02, S01, E04 quintal | Testes dirigidos contra os colisores reais e verificadores no navegador |
| C01b | Executor real nos quatro pacotes revisados |
| C03a (Pega-conchas) | Executor real: 6 testes, 23 cenários, 181 conferências; cavalete no navegador, computador e celular |
| C03b (projeto autoral) | Executor real do critério que roda o jogo; critérios de estrutura no teste do pacote; cavalete do Farol no navegador |
| Suíte do jogo | 1.440 testes aprovados, 1 ignorado, depois do C03b |
| Ciclos de memória | `playground/verificar-memoria-das-ilhas-browser.ts`, abaixo |

### Ciclos de memória das seis ilhas

Com a jornada inteira aberta, o verificador visita as seis ilhas do anel (a completa carrega),
volta à ilha central (a completa sai) e mede o renderer na mesma pose, cinco voltas seguidas:

| Volta | Geometrias na placa | Geometrias na cena | Texturas |
| --- | --- | --- | --- |
| 1 | 590 | 473 | 45 |
| 2 | 601 | 473 | 47 |
| 3 | 608 | 473 | 47 |
| 4 | 608 | 473 | 47 |
| 5 | 608 | 473 | 47 |

As três primeiras voltas aquecem: o cache compartilhado dos modelos (moradores e peças já vistos)
termina de encher entre a segunda e a terceira. Três rodadas pararam no mesmo teto (608 ou 609
geometrias, 47 texturas) e, depois dele, nada cresce. As 135 geometrias da placa que não estão na
cena são esse cache, carregado de propósito; a diferença não cresce. A cena (473) é igual em
todas as voltas.
SwiftShader no Chrome sem tela: prova de que não há acúmulo, não de quadros por segundo.

## Para a dona (não feito aqui)

### Implantação, nesta ordem

1. **Serviço do jogo:** as migrações `0017_percursos_da_v19` e `0018_visitas_de_amigos` do
   `arquipelago-api`. O serviço e o jogo sobem juntos, porque o salvamento passou para a V20 (o
   serviço aceita e migra as anteriores).
2. **Gateway e BFF:** as rotas novas de `api-gateway` (`arquipelago-routes.ts`: amigos e clube) e
   do `member-shell` (`routes/arquipelago.ts` e `routes/arquipelago-clube.ts`), junto com o
   serviço.
3. **Hub:** o Clube das fotos usa o clube `clube-dos-criadores` e o canal `fotos-do-arquipelago`,
   que precisa existir com publicação de membros e aprovação ligada (`postingPolicy: 'members'`,
   `requiresApproval: true`). Sem ele, o BFF responde `sem-clube` e o botão "Mandar para o
   Clube" não aparece no modo foto.
4. **Jogo:** o build novo do pacote do jogo (manifesto publicado).

### Conteúdo para importar no Admin (seção Jogo)

Os manifestos ficam em `docs/desafios-do-jogo/`. A importação passa pela barreira C01a no
serviço, que confere de novo os blocos pelos cursos da comunidade:

- `sua-ilha/` (Pega-conchas, seis quadros) e `farol/` (projeto autoral), Kids e adulto;
- os quadros revisados no C01b de `recife/`, `pico/`, `vale/` e `nuvens/`.

O C02 (Python, texto e Pro) traz os próprios pacotes em `recife-python/`, `pico-python/`,
`vale-texto/` e `nuvens-pro/`. O Recife e o Pico apontam a release Python ativa em staging e
produção (`2026-10-25-integrated-games-2`, com Pygame Zero) e passaram na distribuição publicada
com a imagem publicada do executor (17 execuções, 49 conferências); o Vale espera os cursos do
Arquiteto. O jogo abre os desafios em Python e Pro (C02b): o Python pede o ambiente ao serviço do
jogo, que pede ao Members, e o Pro compila no executor pela rota do desafio. Provado em testes de
cada camada; a abertura de verdade no navegador depende do runtime publicado, da pilha inteira e
do conteúdo importado, e fica para a conta real.

### Com conta real e aparelho físico

- A jornada autenticada inteira nas duas comunidades: desafio aberto pelo Quadro, aprovação no
  serviço, a cor voltando, a atração no fliperama e o desafio do dia. Esta sessão não subiu a
  pilha inteira (regra de uma coisa pesada por vez).
- Celular de verdade: toque, 30 quadros por segundo nas ilhas completas, leitura da abertura e
  dos painéis com crianças.
- As permissões dos pais (visitas de outras crianças e fotos no Clube) ligadas nas duas famílias.

### Arte

Os pedidos em `docs/plans/2026-10-30-arquipelago-pedidos-de-arte.md`: o lote do iglu no Pico e,
do E04, a escada e o piso do segundo andar, o chão do lote para moldar o terreno e o caminho da
subida final no Farol. O conteúdo dos baús dos segredos (Lumis raros e páginas extras do diário)
espera texto e espécies novas.

### Achado de outra frente

O verificador `verificar-moveis-browser` dos móveis (V20, outra sessão) falha também numa cópia
limpa do `origin/staging` de 30/10 (o arrasto do Olhar não move a vista). Não é efeito dos lotes
do levantamento; fica para a sessão dos móveis.
