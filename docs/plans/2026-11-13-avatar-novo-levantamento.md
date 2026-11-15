# Avatar novo (pack Cute Characters): o que é preciso para trocar

Levantamento de 13/11/2026. Nada foi mudado no código. Ele foi feito medindo os arquivos do pack
(no repositório privado `artes-3d`, pasta `biblioteca_aventura/avatar/`) e lendo o código do Sistema
Zero. O plano de integração que existe naquele repositório não foi usado.

## Decisões da dona que guiam o levantamento

- Troca tudo: avatar, esqueleto e peças. O configurador se adapta ao pack.
- As categorias e as cores são as do pack.
- O configurador ganha um filtro de menino ou menina, para mostrar menos peças de cada vez.
- Não há equivalência entre peças antigas e novas. Cada avatar que existe hoje é trocado por um
  avatar sorteado.
- O jogo Arquipélago só está aberto para a equipe. O que é necessário só para o jogo entra no fim
  e não é prioridade. A Íris fica como está: só o avatar do jogador muda.
- O filtro tem três opções: menina, menino e todos. Só o óbvio é marcado; o resto aparece nos dois.
- O sorteio dos avatares de hoje é só de menino, porque por enquanto só há meninos.
- Os arquivos do pack ficam num bucket do R2 (Cloudflare), configurado pela linha de comando.
- A troca vale para as duas comunidades, Kids e adulta.
- As moedas gastas no avatar antigo são devolvidas.
- Preços e o que é grátis: a proposta está em `2026-11-13-avatar-novo-precos.md`.
- Salvar passa a ser automático, com foto automática de frente (seção 5).
- Nenhuma peça sai do catálogo.
- O catálogo é o pack mais as peças que a arte está fazendo para completar. Ele cresce: peça nova
  tem de entrar sem mexer em código.

## Resumo

A troca tem quatro trabalhos grandes e um conjunto de trabalhos pequenos.

1. **Onde ficam os arquivos.** Hoje as peças ficam dentro do repositório, que é público. As do pack
   não podem ficar lá. É preciso um lugar privado de onde o site carrega as peças.
2. **O miolo 3D e as regras.** O código que monta o boneco, o catálogo e as regras de combinação
   são refeitos para o pack: outro esqueleto, cor embutida na peça, combinações diferentes.
3. **A tela "Meu avatar".** Categorias novas, filtro de menino e menina, sem fileira de cores, com
   as regras do pack (fantasia, chapéu e cabelo).
4. **O jogo Arquipélago.** O boneco novo tem outro tamanho e outras proporções. Faltam 12 das 19
   animações do jogo para o esqueleto novo, e os encaixes (banco, planador, corda, borda, patins,
   lanterna) precisam ser refeitos.

Os pequenos: sortear e trocar os avatares de hoje (com a foto de cada um), trocar as peças de
festa e de amizade do jogo, refazer testes, tutoriais e documentação.

O configurador pode ser trocado só com o que já existe na biblioteca do pack. O jogo depende das
animações que ainda não existem.

## 1. O pack, medido

| | Avatar de hoje | Pack novo |
|---|---|---|
| Esqueleto | 75 ossos, nomes `mixamorig:*`, em centímetros, deitado (o código gira e reduz) | 44 ossos, nomes sem prefixo (`Hips`, `Head`…), em metros, em pé |
| Dedos | 3 ossos por dedo | 2 ossos por dedo |
| Ossos para segurar objeto | não tem | `LeftHandProp` e `RightHandProp` |
| Altura do corpo | 2,13 m no jogo | 1,15 m |
| Peças | 129 | 404 (379 do pack e 25 cópias ajustadas) |
| Peso das peças | 39 MB | 141 MB |
| Triângulos por peça | até 24 mil | de 72 a 6.330 |
| Cor | a criança escolhe numa paleta; a peça é tingida pelo material `Color_` | embutida na peça, por uma textura única (atlas); cada cor é uma peça |
| Rosto | montado por partes: formato, olhos, sobrancelha, nariz | uma peça só (olhos, sobrancelhas e boca), em 46 versões |
| Animações que vêm junto | 7 poses do configurador | 28 clipes (parado, andar, correr, pulo, cair, subir escada, soco, chute…) |

**As categorias do pack (16 encaixes):**

| Encaixe | Peças | Observação |
|---|---:|---|
| Corpo | 16 | a mesma forma em 16 cores: 5 tons de pele, 8 cores vivas, branco, cinza e preto |
| Orelhas | 16 | uma por cor de corpo; entra sozinha com o corpo, não é escolha |
| Rosto | 46 | 23 de menina e 23 de menino; cada peça é um rosto com uma expressão (ver abaixo) |
| Cabelo | 38 | 30 comuns e 8 próprios para usar com chapéu ou enfeite |
| Chapéu | 64 | três tipos: comum (esconde o cabelo), capuz (esconde cabelo e orelhas) e o que vai sobre o cabelo (tiara, laço, boné aberto) |
| Óculos | 22 | |
| Acessório de rosto | 24 | bigodes, barbas, brincos, fones, máscaras, nariz de palhaço, chupeta |
| Roupa de cima | 59 | |
| Roupa inteira | 11 | vestidos, jardineira, macacão; desliga roupa de cima, calça, bermuda e meias |
| Calça | 16 | |
| Bermuda | 3 | não vai junto com calça; libera as meias |
| Meias | 3 | |
| Calçado | 22 | |
| Luvas | 12 | |
| Fantasia | 14 conjuntos (51 partes) | corpo inteiro: coelho, abelha, astronauta, robô…; desliga tudo menos corpo e rosto |
| Costas | 1 | a capa |

**Regras de combinação** (estão em `regras.json` da biblioteca): no máximo uma peça por encaixe;
a fantasia desliga os outros; ligar outro encaixe desliga a fantasia; há pares que não combinam
(a capa com 17 peças; alguns cabelos com alguns chapéus); e há um sorteio com chances por
categoria, que monta um avatar coerente.

**Os rostos, conferidos um a um.** São 46 peças, e não 4. O pack traz 40 (20 de menina e 20 de
menino) e a arte fez mais 6. Cada peça é o rosto inteiro (olhos, sobrancelhas e boca) com uma
expressão: normal, neutro, feliz, triste, bravo, malvado, surpreso, apaixonado, chorando, confuso,
fúria, gritando, língua de fora, e as três novas (compaixão, impaciência, atordoado). Os de menina
têm a boca vermelha; os de menino, a boca escura. Dentro de cada lado há dois desenhos de olho
(o 1, com 16 expressões, e o 2, com 7), e a diferença entre eles é pequena. O "4" é só esse
agrupamento, que serve para trocar de expressão sem trocar de desenho. Para a criança, o que muda
de uma peça para a outra é a expressão.

**Menino e menina no pack:** só o cabelo (18 de menino, 12 de menina, 8 sem marca) e o rosto (os 46)
vêm marcados. Roupas, chapéus, calçados e o resto não têm marca nenhuma.

**Três medidas técnicas que pesam:**

- Cada peça traz dentro dela uma cópia da mesma textura (286 KB). São 115 dos 141 MB. Com a textura
  servida uma vez só, as 404 peças somam perto de 26 MB e o navegador guarda uma textura em vez de
  uma por peça vestida.
- A textura vem em WebP dentro do GLB. O navegador abre sem WASM, mas pelo caminho que a política de
  segurança do Kids não libera hoje (`connect-src` sem `blob:`). As peças de hoje não têm textura,
  então isso nunca foi exercitado. Falta confirmar no navegador; a textura única resolve de qualquer
  jeito.
- Alguns óculos têm material de vidro transparente e algumas peças têm material que emite luz. O
  código de hoje só conhece `Color_` e `Skin_`.

## 2. Onde ficam os arquivos

- O repositório `sistema-zero` é público no GitHub. Hoje as peças estão nele: 262 arquivos em
  `packages/community-kids/public/avatar3d` e outros 262, iguais, em `packages/community/public/avatar3d`.
- O pack é pago. O registro da compra, no `artes-3d`, diz: licença por assento, uso dentro de
  produto pronto, sem distribuir as peças soltas. Então peças, miniaturas e animações do pack não
  podem ser gravadas no repositório público.

O que precisa existir:

- Um bucket do R2 só para o avatar (decidido), de onde os dois apps e o jogo carregam esqueleto,
  peças, miniaturas e animações por endereço. A criação do bucket, o domínio e a liberação de
  acesso para os domínios da plataforma são feitos pela linha de comando da Cloudflare.
- O catálogo deixa de montar o endereço como `/avatar3d/parts/<id>.glb` e passa a usar o endereço
  do armazenamento, com versão no caminho (para trocar peças sem cache velho).
- O `locomocao.glb` do jogo hoje fica dentro do pacote (`packages/arquipelago/src/assets/avatar/`).
  O novo sai das animações do pack, então também vai para o armazenamento.
- Os testes que hoje abrem os GLB do `public/` não têm mais o que abrir no CI do repositório
  público. A conferência dos arquivos (ossos na ordem, materiais, tamanho) passa para o `artes-3d`,
  que gera um manifesto. O Sistema Zero testa contra o manifesto.
- Uma forma de desenvolver no computador sem os arquivos no repositório: apontar para o
  armazenamento.

## 3. O miolo 3D (`packages/avatar-quarto`)

É o código que a plataforma e o jogo dividem. Muda nos dois lados ao mesmo tempo.

- `avatar/catalog.ts`: refeito. Sai tudo o que é do avatar de hoje: as 15 categorias, as paletas,
  as peças de cor fixa, o "esconde" simples (chapéu esconde cabelo, vestido esconde blusa e calça) e
  os padrões. Entram as categorias do pack, os grupos de chapéu e de cabelo, as fantasias, os pares
  que não combinam, a orelha casada com o corpo, a marca de menino ou menina e os endereços novos.
- `avatar/avatar-rig.tsx`: o boneco deixa de ser girado e reduzido (`rotation π/2`, `scale 0.01`).
  Sai a "pele compartilhada" (hoje a cor da pele vem do rosto e pinta todas as peças); a pele passa
  a ser a peça do corpo. `Armature.glb` e `Poses.glb` dão lugar ao esqueleto do pack e a um arquivo
  de poses tirado dos clipes dele.
- `avatar/asset-part.tsx`: sai a tintura por `Color_` e `Skin_`. Entram o material da textura única
  (aplicado pelo código, uma vez), o vidro e o que emite luz.
- `avatar/visible-parts.ts`: passa a aplicar as regras do pack.
- `avatar/instance.ts` e `avatar/measure.ts`: a lógica fica; os testes de `avatar-instance` são
  refeitos com o esqueleto novo.
- O catálogo vira dados gerados pela arte (um arquivo com as peças, os grupos e as regras), lido
  pelo código. Assim as peças que a arte ainda está fazendo entram sem mudança de código.
- Novo: o sorteio do pack em TypeScript, puro, para ser usado pelo servidor (troca dos avatares e
  perfil novo) e pelo botão "Surpreenda-me".

## 4. Regras e loja (`packages/members`)

- `domain/avatar/avatar3d-catalog.ts`: lista nova de peças, com categoria, grátis ou moedas, preço
  e a marca de menino ou menina. Estilo novo no lugar de `char-v1`.
- `domain/avatar/avatar-config.ts`: formato novo do avatar gravado (versão 3: uma peça por encaixe,
  sem cor). A gravação continua estrita e passa a conferir também as combinações (hoje o servidor
  não confere o que esconde o quê). A leitura continua tolerante: qualquer coisa que não seja a
  versão 3 vira um avatar sorteado.
- Serviços de ver, comprar e equipar: a forma muda pouco. A resposta ao app (`AvatarStateView`)
  perde paletas e ganha regras, grupos e a marca de menino ou menina.
- Compra por conjunto: a fantasia é vendida inteira (2 a 6 partes de uma vez). Hoje a compra é peça
  por peça.
- Devolução das moedas do avatar antigo: cada compra está no extrato com a chave
  `avatar-buy:<perfil>:<peça>`. Um script soma por perfil e credita o valor de volta, uma vez só.
- `ArquipelagoAvatarRepository` (peças que o jogo concede): só os ids mudam.
- Ação de aula `customize-avatar` (`application/learning/platform-action.service.ts`): hoje ela
  passa quando o avatar é diferente do padrão. Com avatar sorteado para todos, todo mundo já passa
  sem fazer nada. A regra precisa mudar para "salvou o avatar depois de receber o sorteado".
- Missões `avatar_part_buy` e a conquista `avatar-style-5`: continuam valendo, porque contam compras
  no extrato, não ids.
- Banco: nenhuma coluna nova. `avatar_configs.equipped` é JSON e `avatar_inventory` guarda ids. A
  preferência do filtro (menino, menina ou todos) cabe no mesmo JSON.
- Testes a refazer: `tests/unit/avatar.test.ts`, `tests/integration/avatar.test.ts`,
  `tests/unit/catalog-conformance.test.ts` (a parte do avatar), `tests/unit/avatar-festa-conformance.test.ts`,
  `tests/integration/adult-cosmetics.test.ts`, `tests/db/arquipelago-avatar.test.ts`,
  `tests/integration/platform-action-progression.test.ts` e o falso em memória.

## 5. A tela "Meu avatar" (`packages/member-shell`)

Arquivos: `components/cosmetics/avatar3d/` (`configurator.tsx` com 777 linhas, `configurator-adult.tsx`
com 440, `configurator-shared.ts`, `avatar-scene.tsx`, `camera-manager.tsx`, `photo-framing.ts`,
`thumb-canvas.tsx`, `seasonal-choices.tsx`) e `components/cosmetics/skin.ts`.

- **Categorias:** as do pack. Os três grupos de hoje (Rosto, Cabeça, Roupa) são redesenhados. Uma
  divisão possível: Corpo e rosto (cor do corpo, rosto, cabelo, acessório de rosto, óculos), Cabeça
  (chapéu), Roupa (roupa de cima, roupa inteira, calça, bermuda, meias, calçado, luvas, costas) e
  Fantasia.
- **Filtro de menino ou menina:** novo. Fica no alto do painel e vale para todas as categorias.
  Peça sem marca aparece nos dois.
- **Cores:** some a fileira de cores. A cor do corpo vira uma categoria com 16 bolinhas. Nas outras
  categorias a cor faz parte da peça.
- **Rosto:** a criança escolhe entre os rostos do lado dela (23 com o filtro ligado, 46 em "todos").
  Todos grátis. Mais adiante, a Cabine de fotos pode trocar só a expressão para a foto, sem mudar o
  rosto salvo.
- **Regras à vista:** vestir a fantasia tira as roupas e avisa; chapéu comum esconde o cabelo;
  tiara e laço pedem o cabelo próprio para chapéu; peça que não combina sai quando a outra entra.
- **Poses da Cabine:** hoje são 7 poses do `Poses.glb` (Parado, Relax, Estiloso, Soco, Ninja, Rei,
  Ocupado). No pack existem parado, olhando, soco, chute e defender. As outras saem ou são feitas.
- **Miniaturas:** a biblioteca já tem as 404, em WebP. O app procura PNG num caminho fixo e tem uma
  reserva que desenha a peça ao vivo com as medidas do esqueleto antigo. Os dois mudam. O gerador
  `gen:avatar-thumbs` deixa de ser necessário.
- **Câmera e foto:** `CAM_POS`, `CAM_TARGET` e o enquadramento do retrato (os 45% de cima) foram
  afinados para o corpo de hoje. O boneco novo é mais cabeçudo: os números são refeitos.
- **Salvar sozinho, com foto (pedido da dona).** Hoje nada é gravado até a criança apertar "Salvar"
  ou "Tirar foto": se ela sair ou atualizar a página, perde tudo. Passa a ser assim:
  - cada peça escolhida é gravada sozinha, sem botão de salvar. A gravação espera a criança parar
    de mexer por um instante (perto de 1 segundo) e junta os toques seguidos numa gravação só;
  - junto vai a foto de frente, no enquadramento de retrato, tirada do boneco que já está na tela;
  - ao sair da página, o que estiver pendente é enviado antes;
  - a Cabine de fotos continua: quem quiser escolhe uma pose e tira outra foto, que passa a valer;
  - peça que ainda não foi comprada não é gravada. Enquanto a criança só experimenta uma peça paga,
    vale o último estado com peças que ela tem;
  - um aviso discreto ("Salvo") no lugar do botão.
- **O custo disso é baixo.** A foto sai do desenho que já está rodando: é um quadro a mais de
  512 por 512 pontos, alguns milésimos de segundo, sem travar. O envio é de uma imagem pequena
  (o servidor já converte para WebP e já apaga a foto anterior do perfil). Com a espera entre os
  toques, uma visita ao "Meu avatar" gera de 5 a 15 envios, em vez de 1. O armazenamento cobra por
  milhão de gravações: o valor é desprezível. O cuidado é não enviar a cada toque, e sim a cada
  pausa.
- **Comprar:** fica em dois toques, com prévia. A compra já veste e já grava.
- **Sugestões de festa** (`seasonal-choices.tsx`): mesma tela, ids novos.
- **Comunidade adulta:** usa o mesmo catálogo e os mesmos arquivos, com a pele adulta do
  configurador. A troca vale para as duas.
- Testes a refazer: `tests/cosmetics-skin.test.tsx`, `tests/kids-cosmetics-layout.test.tsx`,
  `tests/avatar-seasonal-choices.test.tsx`, e em `community-kids` o `tests/avatar3d-catalog.test.ts`
  inteiro.
- Pela regra da casa, a tela nova é aprovada antes num Canvas com a foto do app de verdade.

## 6. Trocar os avatares de hoje por sorteados

- Para cada perfil com avatar gravado (Kids e adulto), sortear um avatar pelas regras do pack e
  gravar no lugar. Um script roda uma vez, primeiro no ambiente de testes, depois em produção.
- **O sorteio desta troca é só de menino** (decidido: por enquanto só há meninos). Rosto e cabelo de
  menino, roupas neutras, e só expressões simpáticas (normal, neutro, feliz). O filtro desses perfis
  já nasce em "menino".
- Para o que vier depois, a plataforma não sabe se o perfil é de menino ou de menina. O perfil novo
  escolhe o lado na primeira vez que abre o "Meu avatar", e a escolha vale para o filtro e para o
  "Surpreenda-me".
- **A foto é o ponto de atenção.** O rosto que aparece no menu, no perfil, no ranking, no Mural e na
  área dos pais é uma foto tirada no navegador da criança na hora em que ela salva. O servidor não
  desenha 3D. Então trocar só o avatar gravado deixa a foto antiga no ar. Há três saídas:
  1. o mesmo script abre cada avatar sorteado num navegador de verdade (como o gerador de miniaturas
     faz hoje), tira a foto e envia. Ninguém fica com a cara antiga nem sem cara;
  2. apagar a foto: aparece a inicial do nome até a criança abrir o "Meu avatar" e salvar;
  3. tirar a foto no navegador da criança, escondido, na primeira visita.
- Peças compradas do avatar antigo deixam de existir. O inventário antigo é apagado e as moedas
  gastas nelas são devolvidas (decidido), pelo valor exato do extrato.
- Perfil novo: hoje nasce com um avatar padrão fixo. Pode continuar assim (com um padrão do pack) ou
  nascer sorteado.
- Fotos antigas no armazenamento: podem ficar ou ser apagadas depois.

## 7. O jogo Arquipélago

### 7.1 O tamanho

O avatar de hoje mede 2,13 m no jogo e o mundo foi feito em volta disso: o corpo físico de 1,8 m,
a câmera, as portas, os bancos, a sela, os bichos (ampliados 1,8 vez "para a criança de 2,1 m") e os
moradores. O boneco do pack mede 1,15 m. Há dois caminhos:

- **Ampliar o desenho do boneco novo 1,85 vez no jogo**, para ele continuar com 2,13 m. O corpo
  físico, a câmera, o mundo e cerca de 60 testes que dependem do corpo físico ficam como estão. Só
  muda o que depende da proporção (braço, perna, cabeça, mão, pé).
- **Usar 1,15 m**: o mundo inteiro precisa ser refeito em volta do boneco menor.

O levantamento abaixo considera o primeiro caminho.

### 7.2 As animações (`src/assets/avatar/locomocao.glb`)

O jogo usa 19 clipes, hoje feitos a partir do Mixamo por `arte/avatar/mixamo.py`, cada um encaixado
nas medidas do jogo.

| Situação | Clipes |
|---|---|
| O pack tem a base (7) | Parado, Andar, Correr, Pulo, Queda, Aterrissagem, SubirEscada |
| Não existem para o esqueleto novo (12) | Nado, NadoParado, Corda, Planar, Escalar, Equilibrar, PendurarBorda, SubirBorda, Escorregar, Sentar, Montar, Deitar |

- Mesmo os 7 que existem precisam do tratamento do jogo: sem deslocamento, ciclo fechado, passada
  medida para o pé não patinar.
- Os 12 que faltam podem vir dos mesmos arquivos do Mixamo (os dois esqueletos têm ossos com os
  mesmos nomes principais), passados para o esqueleto novo por um script irmão do `mixamo.py`. Os
  arquivos de origem ficam fora do repositório.
- O risco está nas proporções. O boneco novo tem braço curto e cabeça grande. Os clipes em que as
  mãos sobem (planador, pendurar na borda, subir a borda, corda, escalar) não fecham só com a
  passagem: a mão não passa da cabeça. As poses e as alturas do jogo precisam ser redesenhadas.
- Depois de gerar, os números de `src/sistemas/locomocao.ts` (passadas e durações de cada clipe)
  são trocados pelos do resumo novo.

### 7.3 Código que procura osso pelo nome

- `src/personagem/bracos.ts`: os braços no cipó (ombro, cotovelo e punho por nome, e a conta que
  supõe o tamanho dos ossos de hoje).
- `src/personagem/lanterna-na-mao.tsx`: a lanterna presa em `mixamorigRightHand`, com escala e
  deslocamentos feitos para a mão de hoje. No esqueleto novo existe o osso próprio `RightHandProp`.
- `src/personagem/patins-nos-pes.tsx`: os patins presos nos ossos do pé e da canela, e a conta que
  esconde o calçado lendo o encaixe `shoes`.
- `src/personagem/planador-aberto.tsx`: a barra numa posição fixa (1,25 m de altura, 0,2 m à frente).

### 7.4 Medidas que dependem da proporção

- Corpo desenhado para cordas e passarinho (`CORPO.desenho` em `src/sistemas/corpo.ts`): altura e
  raio da cabeça, tronco.
- Banco, cama e sela (`src/sistemas/descanso.ts`, `src/sistemas/montaria.ts`): assento a 0,53 m,
  bacia 0,18 m atrás, costas, pés.
- Borda, cipó e escalada (`src/sistemas/modos/borda.ts`, `src/sistemas/cipo.ts`,
  `src/sistemas/escalada.ts`): a altura das mãos acima do centro.
- Linha d'água (`CINTURA` em `src/sistemas/modos/chao.ts`).
- Zappy no ombro (`ALTURA_DO_ZAPPY`), o passarinho acima da cabeça, e os pontos que esmaecem copas
  e telhados.
- Patins: a elevação do pé (`ELEVACAO_DOS_PATINS` em `src/sistemas/ajustes-da-arte.ts`) e a bota do
  `patins.glb`, que foi modelada para cobrir as calças e os calçados de hoje. A bota é refeita.
- Retrato da barra do jogo (`src/mundo/retrato-do-avatar.tsx`): mede o boneco, então funciona; só o
  enquadramento é reafinado.

### 7.5 Peças citadas pelo jogo

- Presentes de amizade (`packages/arquipelago-contracts/src/roupas.ts`): 7 peças, uma por morador
  (`acc-09`, `top-04`, `glasses-05`, `hat-01`, `hat-04`, `outfit-02`, `hat-02`). Escolher 7 no pack.
- Festas (`packages/arquipelago-contracts/src/vestuario-festas.ts`): 8 peças de conquista e 8
  sugestões, em 4 festas. Escolher as novas.
- O formato do id está travado por uma regra (`letras-letrasOuNúmeros`). Os ids da biblioteca do
  pack têm sublinhado e terminam em `_pacote`. Ou a plataforma dá ids próprios e curtos às peças, ou
  a regra muda.
- Testes que citam ids e rótulos: `arquipelago-contracts/tests/vestuario-festas.test.ts`,
  `arquipelago-contracts/tests/roupas.test.ts`, `arquipelago/tests/roupas.test.ts`.
- A plataforma de mentira do jogo (`src/plataforma/falsa.ts`) e os servidores do playground servem
  o avatar de `community-kids/public`: passam a usar o armazenamento.
- O avatar não está no salvamento do jogo. Nenhuma versão de salvamento muda.

### 7.6 Quem mais usa o boneco

- Fantasma do irmão (`src/mundo/fantasma-familiar.tsx`): é o mesmo boneco, translúcido. Acompanha a
  troca sozinho.
- Íris: é a única moradora feita com peças do avatar de hoje (`arte/personagens/iris.py`). O arquivo
  dela (`iris.glb`) é independente e continua funcionando. Decidido: ela fica como está. Para poder
  gerá-la de novo um dia, as peças antigas que ela usa são guardadas junto do script dela. Os outros sete moradores têm esqueleto próprio e não mudam.
- Quarto da casa, abertura, visitas e cena da chegada: não usam o boneco.

### 7.7 Testes do jogo a refazer

- `tests/locomocao.test.ts`: abre o `Armature.glb` do `public/`, confere os nomes dos ossos e que o
  pé não patina.
- `tests/patins-nos-pes.test.ts`: abre peças do `public/` e confere que cabem na bota.
- `tests/ajustes-da-arte.test.ts`, `tests/descanso.test.ts`, `tests/cordas.test.ts`,
  `tests/espaco-dos-bichos.test.ts`: números do corpo desenhado.

## 8. O resto

- `packages/community-kids` e `packages/community`: sai a pasta `public/avatar3d` das duas; saem os
  scripts `scripts/avatar-blender/` e o `gen-avatar-thumbs.ts` (ou vão para um arquivo morto, por
  causa da Íris); a rota `/meu-avatar` fica.
- `packages/palco-gravacao`: copia o `public` do Kids, com o avatar junto. Deixa de copiar.
- `packages/admin`: só mostra a foto pronta. Não muda.
- Política de segurança do Kids (`next.config.ts`): carregar de outro endereço `https` já é
  permitido; o armazenamento precisa liberar o acesso vindo dos domínios da plataforma.
- Documentação: `docs/gamificacao.md` §6, os `CLAUDE.md` de `avatar-quarto`, `member-shell`,
  `members`, `community-kids` e `arquipelago`.
- Tutoriais do "Como fazer" que mostram o "Meu avatar" e os prints deles.
- Aulas gravadas que mostram a tela do avatar (existe uma ação de aula "personalizar o avatar").
- Avatar antigo: as peças de hoje são livres (Quaternius) ou nossas. Podem ser apagadas ou
  guardadas fora do `public/`.

## 9. O que a integração precisa receber da arte

Tudo isto sai do `artes-3d`, para o armazenamento privado:

1. O esqueleto e o arquivo de poses do configurador.
2. As peças sem a textura dentro, e a textura uma vez só.
3. As miniaturas.
4. O catálogo em dados: id, categoria, rótulo, grupo, marca de menino ou menina, o que não combina,
   as fantasias e o sorteio.
5. As 19 animações do jogo no esqueleto novo, com o resumo de durações e passadas.
6. Lanterna, patins e planador ajustados à mão e ao pé novos.
7. O manifesto de conferência (ossos, materiais, tamanhos) que os testes do Sistema Zero leem.

Os itens 1 a 4 e o 7 bastam para trocar a plataforma. Os itens 5 e 6 são do jogo.

## 10. Decisões

**Já decididas (13/11/2026):** nenhuma peça sai do catálogo; arquivos num bucket do R2; filtro com menina, menino e todos, só com
o óbvio marcado; troca nas duas comunidades; sorteio só de menino nesta troca; moedas do avatar
antigo devolvidas; salvar sozinho com foto de frente; Íris como está; o jogo por último.

**Propostas minhas, para conferir:**
1. Preços, o que é grátis e a marca de menina ou menino de cada peça:
   `2026-11-13-avatar-novo-precos.md`. Foi feita pelo nome das peças; falta conferir com as
   miniaturas.
2. A foto na troca dos avatares de hoje: o script já tira e envia a foto de cada sorteado.
3. Divisão por tipo dentro das categorias grandes (chapéu e roupa de cima), para mostrar menos
   peças de cada vez.

**Ficam para a etapa do jogo:** o tamanho do boneco no jogo, as 7 peças de amizade e as 16 de
festa, e as expressões na Cabine de fotos.

## 11. Ordem de execução

A plataforma vem primeiro. O que é só do jogo fica para o fim.

1. **Bucket no R2.** Criar o bucket do avatar, o domínio e a liberação de acesso, e a forma de os
   apps carregarem por endereço. Vale para tudo o que vem depois.
2. **Arquivos prontos para a web.** A partir da biblioteca da arte: esqueleto, poses, peças sem a
   textura dentro, a textura uma vez só, miniaturas, o catálogo em dados (com preço e a marca de
   menina ou menino) e o manifesto de conferência. Tudo enviado ao bucket. Os passos 1 e 2 podem
   andar juntos.
3. **Miolo 3D novo** (`avatar-quarto`): montar o boneco do pack, aplicar as regras de combinação e
   o sorteio.
4. **Servidor** (`members`): catálogo e formato novos, conferência das combinações, compra por
   conjunto e a regra nova da ação de aula.
5. **Tela "Meu avatar"**, nas duas comunidades: primeiro o Canvas com a foto do app de verdade para
   aprovação; depois as categorias do pack, o filtro, a divisão por tipo e o salvar sozinho com foto.
6. **Ensaio no ambiente de testes:** rodar a troca (sorteio só de menino, foto de cada um,
   devolução das moedas) e conferir as telas onde a foto aparece.
7. **Produção:** publicar e rodar a troca.
8. **Limpeza:** pastas e scripts do avatar antigo, testes, documentação e tutoriais do "Como fazer".
9. **Jogo**, por último: o tamanho do boneco, as 19 animações, os encaixes (lanterna, patins,
   planador, banco, sela) e as peças de amizade e de festa.

Entre o passo 7 e o passo 9 o jogo abre para a equipe com o boneco novo sem as animações dele
(parado, sem andar direito, com lanterna e patins fora do lugar), porque os dois usam o mesmo
boneco. Ele só não pode abrir ao público nesse intervalo.
