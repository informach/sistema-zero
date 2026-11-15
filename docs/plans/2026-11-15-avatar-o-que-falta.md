# Avatar novo: o que falta para a migração completa (plataforma e jogo)

Levantamento de 15/11/2026. Arte conferida no `origin/main` do artes-3d em `4538ddbba` (15/11, 06:01);
plataforma no catálogo `packages/core/src/avatar/catalog.generated.ts` (última migração: arte
`bb7e5e7c7`, 14/11). Conferência por `bun run avatar:conferir`.

## Andamento (15/11/2026, ramo `feat/avatar-migracao-final`)

- **Plataforma, itens 1 a 4: feitos.** Entrega nova migrada (7 peças, 3 objetos de mão, a animação,
  as 9 camadas, as regras); `trocas_fantasia` na migração, no core (`withCurrentSet`) e no Members;
  preços pela régua; testes do core, do Members (banco de fotos × sorteio) e das abas do
  configurador verdes. A arte depois disso (`6b6f70232`) só mexeu na Terra Doce: "Tudo migrado".
- **A pegada da arte** (`pegada.clipe_dedos`) vira `fingers` no catálogo; o jogo fecha a mão por ela.
- **Jogo, item 1: feito** (`sistemas/gestos.ts`): levantar do banco e da cama; pegar do chão;
  plantar, plantar alto e regar com o regador; o balde na pesca e no banho do bicho; comemorar;
  dançar na festa e com a banda; dirigir e vagonete prontos como modos. Na sela alta do dino, o corte
  direto (pedido da arte); o montar e o desmontar ficam para sela baixa. A varinha está pronta como
  objeto de mão e entra quando a história a der.
- **Jogo, item 2:** fotos dos clipes novos no visualizador (`/animacoes?gesto=…`).
- **Pedidos à arte (coordenação, 15/11):** a pose de montado com as pernas mais abertas para o dino
  (sela a 0,70 m nativos, 0,21 a 0,37 m de largura onde ficam as pernas); o planador dobrado para o
  encaixe `costas` (não existe na biblioteca); o regador não é carregado andando.
- **Faltam:** item 5 (staging e produção); jogo, itens 3 (pista com as peças reais), 4 (IK das
  mãos), 5 (costas, espera o planador dobrado) e 6 (`pontos_de_jogo`, com a fatia da Faísca).

## 1. O que a arte entregou

O pedido de 14/11 (`docs/plans/2026-11-14-pedido-arte-personagem.md`) está **todo entregue**:

- os seis encaixes novos (`cabeca_topo`, `olhos`, `costas`, `pe_esquerdo`, `pe_direito`, além das duas mãos);
- as 41 animações próprias: P1 (17), P2 (9 + `montar`, `montado`, `desmontar`), P3 (`comemorar`,
  `pegar_do_chao`, `plantar`, `plantar_alto`, `regar`, `dancar` e cinco laços de dança), `acenar`,
  `acender`, `dirigir` e, novo, `ajoelhado_no_vagonete`;
- a lanterna, a barra do planador e os patins;
- os `pontos_de_jogo` em 305 peças das sete bibliotecas, com acertos no lote 8 (15/11);
- a conferência da arte estendida às animações novas (0 falhas).

**Entregue depois da nossa última migração (falta migrar):**

| O quê | Itens |
|---|---|
| Peças novas (7) | Cachecol, Coroa de princesa, Elmo de cavaleiro, Gorro com pompom, Protetor de orelha, Capa de cavaleiro, Vestido de princesa |
| Objetos de mão novos (3) | Balde, Regador, Varinha de luz (cada um com o arquivo solto) |
| Animação nova | `ajoelhado_no_vagonete` |
| Clipes de camada novos (9) | `segurar_braco_dir_largo_*` (parado, andar e correr nas direções): o braço afastado para segurar o regador e o balde |
| Dados do esqueleto | o `regar_alto` refeito (42°) e as medidas dos clipes novos |
| Regras | `trocas_fantasia` (tipo novo): dentro da fantasia de cavaleiro, o Elmo de cavaleiro entra no lugar do elmo de chifres do pack, que sai do sorteio; as três peças de costas com `nao_combina` (peitoral do cavaleiro e as duas jaquetas acolchoadas) |

Nada saiu da arte e nenhuma peça já migrada mudou.

## 2. Plataforma

**Em produção e completo com a arte de 14/11:** configurador novo (Kids e adulto, filtro, salvar
sozinho com foto), servidor v3, troca dos avatares e devolução das moedas, preços revisados, tutoriais
publicados, avatar antigo removido do código (`6e17b5a4f`), PR #258 na `main`.

**Falta:**

1. **Migrar a entrega nova** (`bun run avatar:migrar --tudo --destino r2`): as 7 peças, os 3 objetos
   de mão, a animação, os 9 clipes de camada e as regras.
2. **Ensinar a regra nova `trocas_fantasia`** ao `scripts/avatar/migrar.ts`, ao core
   (`@sistemazero/core/avatar`) e ao configurador: ao vestir a fantasia de cavaleiro, a peça trocada é
   a nossa. Teste no core.
3. **Preço e público das 7 peças**, pela régua do README do avatar: cachecol, gorro com pompom e
   protetor de orelha como acessórios de frio comuns; coroa, elmo, capa e vestido de princesa na faixa
   especial; vestido e coroa de princesa marcados como de menina (o óbvio, pela regra do filtro).
4. **Testes:** `core/avatar`, o banco de fotos da troca × sorteio grátis (`members tests/db/avatar-swap.test.ts`)
   e o configurador.
5. **Staging e produção** (members, community, community-kids e arquipelago-api), conferindo as peças
   novas no configurador nas duas comunidades.

Restos sem efeito para a criança: a leitura tolerante do formato antigo (`version: 2`) no Members fica
como rede de segurança; comentários com "Mixamo" no jogo (`playground/verificar-animacoes-browser.ts`,
`tests/ik.test.ts`) e a menção ao `locomocao.glb` no `CLAUDE.md` do jogo saem na limpeza.

## 3. Jogo

**Já funcionando (em staging):** o avatar do pack no tamanho nativo, as medidas tiradas do esqueleto
(câmera nos olhos, cápsula, passarinho pelo topo da cabeça), os clipes de andar e correr em quatro
direções, nadar, boiar, entrar e sair da água, andar na água rasa, pendurar e andar pendurado, subir a
borda, cipó, sentar, deitar, sentado no barco, acenar, acender, equilibrar, escorregar, patinar (com as
rodas girando), planar (com a barra nas mãos), escalar, montado, empurrar, a lanterna na mão com os
dedos no cabo, o pé no chão por IK, o fantasma com a roupa de quem correu, ir tocando e tocar num
objeto para usar.

**Falta:**

1. **Ligar as animações que o jogo ainda não usa:**
   - `levantar` e `levantar_da_cama` (hoje a criança só sai do banco e da cama, sem levantar);
   - `montar` e `desmontar` (hoje entra direto no montado);
   - `pegar_do_chao` ao colher, pegar concha, chave, cristal e fóssil;
   - `plantar`, `plantar_alto` e `regar` na horta, com o **Regador** na mão e os clipes de braço
     afastado; o **Balde** na pesca e na água para os bichos;
   - `comemorar` ao terminar desafio, achar coleção e acender facho;
   - `dancar` (seis laços) nas festas e na banda do Pico;
   - `dirigir` e `ajoelhado_no_vagonete` quando os veículos e o vagonete entrarem no mundo;
   - a **Varinha de luz** como objeto de mão (prêmio de festa ou do Lumi de luz).
2. **Conferir na tela o que ainda não foi visto:**
   - as rodas dos patins, o braço com a lanterna, acender, empurrar;
   - a água rasa, andar pendurado, os passos de lado e de costas;
   - entrar e sair da água, acenar, o barco, o fantasma;
   - tocar num objeto, os botões do "Agora", a viagem rápida.
3. **A pista de conferência com as peças reais da arte** (escada, platô, cipó de corda, tora,
   escorregador, lago, canoa, cadeira, banco, sofá e cama da Morada, portão, canteiro): o personagem faz
   cada ação sozinho e uma foto vira a referência aprovada. As fotos vão para a dona aprovar.
4. **IK das mãos** na borda, no degrau da escada, no cipó, na barra do planador e na alça: hoje só os
   pés têm IK.
5. **O encaixe `costas`:** o jogo ainda não o usa. Ele leva o planador dobrado nas costas quando a
   criança não está planando; o modelo dobrado sai do planador aberto que o jogo já tem.
6. **Ler os `pontos_de_jogo`** do catálogo da arte no lugar dos nomes de nós do Blender: é o que faz
   qualquer peça nova da biblioteca funcionar com o avatar sem código. Entra com o mundo novo da
   história (a Faísca primeiro).
7. **Limpeza final do jogo:** o mundo antigo continua pela ponte de escala 1,85 até cada ilha ganhar a
   versão nova; a Íris e os moradores feitos no jogo continuam com o esqueleto deles (decisão de 13/11).

## 4. Ordem

1. Plataforma, itens 1 a 5, de uma vez (a entrega nova inteira em produção).
2. Jogo, item 1 (as animações e os objetos de mão), com a conferência do item 2 na mesma rodada.
3. Jogo, itens 3, 4 e 5 (pista com as fotos de referência, IK das mãos, costas).
4. Jogo, item 6, junto da fatia vertical da Faísca da história nova.
