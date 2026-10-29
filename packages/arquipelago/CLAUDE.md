# CLAUDE.md — @sistemazero/arquipelago

## Ajustes da arte aj-ligar-02 a 09 (29/10/2026)

- `sistemas/ajustes-da-arte.ts`: fase FNV-1a por id e clipe, patins +0,089 m só no desenho (`ELEVACAO_DOS_PATINS`),
  voo (borboleta 1,6 m, bem-te-vi 2,8 m, pássaro das Nuvens 3,2 m) e pelo menos 0,6 m acima
  do topo de obstáculos informado pelo chamador. A rota futura deve fornecer esse topo por ponto.
- `mundo/arte-animada.ts`: cópia de esqueleto e morfos, materiais noturnos próprios e descarte.
  `luz`, `perolaLuz`, `cristalLuz` e os quatro papéis das lanternas ficam sem emissão de dia
  e recuperam a força original à noite. Seguem `ambiente.noite`, como a casa e o lampião.
  `IlhaCompleta` também prepara essas luzes, inclusive materiais transparentes, para o Recife futuro.
- `useCopiaAnimada` configura `virar`, `abrir`, `abrir-interna` e `estourar` como LoopOnce com
  clampWhenFinished, além dos clipes de uma vez explícitos de cada personagem. `trocarClipe`
  exige id estável; só laços recebem fase, ações únicas sempre começam no primeiro quadro.
  Capi, Nico, Lumis da praia, bichos do Bosque e adotado usam a regra. Não usar a ordem da lista como id.
- `PecaDaArte` mantém âncora/giro fora da raiz do mixer, para o barco balançar sem sair da posição.
  Sua fala tem id e texto; Íris move B/C/D em todas as três submalhas da cabeça, a 12 letras/s,
  peso até 0,8, sem mexer no smile. Pausa congela o tempo, pontuação e fim fecham a boca.
  O id permite recomeçar uma fala de texto igual. A pausa usa o mixer e preserva clipes terminados.
- `CapsulaDoPinguim` deve ficar dentro do corpo do pinguim, fora da escala do desenho. Adulto:
  raio 0,13 m, meia altura 0,11 m em pé e 0,12 m deitado; centro y 0,24/0,14 m, z 0/0,24 m,
  giro X 0/90 graus. Filhote usa 60% das medidas. Só uma cápsula existe por vez.
- `AvatarDoJogo comPatins` eleva o desenho (`ELEVACAO_DOS_PATINS`, 0,089) e calça o par (`personagem/patins-nos-pes.tsx`),
  sem mudar a cápsula do jogador. A sala mostra também um par solto ao lado para conferir as rodas
  (some nas vistas de perto, `?vista=`). O jogo calça pela mochila (fase2-05, abaixo).
- ⚠️ As peças do avatar (`community-kids/public/avatar3d/parts`) já estão na escala do avatar do
  jogo: do arquivo delas ao `avatar-visual` a escala é 1 (medido em 29/10/2026). O `AV = 0.751` dos
  scripts de `arte/festas` não vale para elas; o patim é desenhado com ele e crescido por `1 / AV`.
  Peça vestida nova (mergulho) precisa conferir isso antes.
- `/arte` no playground exercita os componentes e os GLBs reais. Ainda não há Recife/Pico/Nuvens,
  Íris, pássaros, pinguins, baús animados ou festas montados no mundo. A implementação dessas
  mecânicas deve consumir estes componentes, sem copiar regras. Lumis da praia já acendem no jogo.
- Testes: `tests/ajustes-da-arte.test.ts`; navegador: compilar `playground/verificar-arte-browser.ts`
  para Node com `bun build --target=node --external playwright-core`. Provas e prints em
  `docs/qa/2026-10-29-arquipelago-ajustes-arte.md`. Nenhum Blender ou GLB foi alterado.

O jogo 3D **Arquipélago Vagalume** no navegador (React Three Fiber, Rapier, zustand). Proposta e
decisões da dona: Canvas `https://claude.ai/artifact/5eNo1oqsndxmV6MPLxaz1W` e `docs/arquipelago.md`.

## Regra de ouro: separado da plataforma

- Mudar o jogo não pode quebrar a plataforma, e mudar a plataforma não pode quebrar o jogo.
- **Imports permitidos** (teste `tests/fronteira.test.ts`): react, react-dom, three, zustand,
  `@react-three/{fiber,drei,rapier}`, `@sistemazero/arquipelago-contracts` e
  `@sistemazero/avatar-quarto`. Nada de `@sistemazero/ui`, member-shell, sessão, rota ou cookie.
- **Nenhum pacote da plataforma importa o jogo.** A página da plataforma lê o `manifesto.json`
  publicado e carrega `entrada-[hash].js` por URL.
- O avatar e o quarto vêm do `avatar-quarto` (os mesmos componentes da plataforma). As
  ferramentas (Pinta, Molda, Estúdio) nunca são copiadas: o jogo pede
  `plataforma.abrirFerramenta()` e a plataforma abre a ferramenta de verdade por cima do jogo,
  então qualquer melhoria nelas aparece no jogo sozinha.

## Entrada e porta

- **Pele adulta (fase3-13, 29/10/2026):** a voz das telas que falam da plataforma mora em
  `interface/voz.ts` (`VozDoJogo`, `VOZ_KIDS`, `VozContexto`, `useVoz`: telas de abrir, fechado,
  descanso e erro, o "voltar", a luneta, o Molda fechado e a compra no suporte). O adulto fica em
  `src/adulto/` (`voz-adulta.ts`, `estilos-adultos.ts`, juntos em `pele-adulta.ts`), e ⚠️ só o
  `jogo.tsx` chega lá, por `import()` (`usePele`): o build separa o pedaço e o Kids não o baixa
  (`tests/pele-do-jogo.test.tsx` trava). A `entrada.tsx` dá `.arq-adulto` à raiz e todo o CSS
  adulto vive dentro dela; o piso de 15 px é gerado do próprio `ESTILOS` (`pisoDaLetra`), então
  regra nova do Kids já nasce coberta. Texto novo que fale da plataforma, da jornada ou da família
  entra na voz (com a versão adulta), não solto no componente. Família (visitas, recordes) só com
  `plataforma.publico === 'kids'`. O mundo também lê a voz (o R3F 9 leva o contexto para dentro
  do `<Canvas>`): a placa da ponte fechada (`placaDaPonte`, `recadoDaIris`) e a fala da luneta.
  Navegador: `playground/verificar-pele-adulta-browser.ts`
  (`?publico=adulto`, computador e celular emulado, a tela de fechado e o Kids de sempre).

- `src/entrada.tsx`: `montarArquipelago(elemento, plataforma)` cria a própria raiz React, injeta o
  CSS (tudo com prefixo `arq-`) e devolve `desmontar()`. Confere `versaoContrato`.
- Tudo o que o jogo sabe da plataforma passa pelo objeto `Plataforma` do contrato (ler jornada,
  avatar e quarto, gravar quarto, `servico.buscar` para o serviço do jogo, abrir ferramenta,
  voltar, relatar erro).
- `src/plataforma/falsa.ts`: plataforma de mentira com serviço em memória (acesso, salvamento com
  revisão, tempo livre). Usada pelo playground e pelos testes.

## Pastas

- `estado/`: loja zustand (uma por montagem), contexto, relógios (necessidades, posição, tempo).
- `sistemas/`: regras puras e testadas (dia e noite, itens, necessidades, horta, receitas,
  fila de salvamento, tempo livre com `armazem-tempo.ts` e `fila-tempo.ts`, câmera, Zappy, ilhas
  completas, cipó, escalada, percurso, as medidas do corpo, a Capi (`moradores.ts`,
  `falas-da-capi.ts`, `conversa-da-capi.ts`), o esconde-esconde (`esconde.ts`), o caminho pelo
  chão (`caminho.ts`) e o bicho adotado (`bichos.ts`, `cuidar.ts`, `seguir.ts`)). Sem React. Os
  números de cada regra, em linguagem da dona: `docs/arquipelago-regras.md`.
- `mundo/`: medidas da ilha, céu, água, ilha central, casa com o quarto real, horta, bancada,
  farol, anel de ilhas com pontes, e o Bosque vivo (`bosque.ts`, `bosque-vivo.tsx`).
- `personagem/`: corpo cinemático com controlador do Rapier (andar, correr, pular, nadar, cipó,
  escalada), avatar com as mãos na corda no cipó, câmera e o Zappy.
- `controles/` e `interface/`: teclado, toque, HUD (com o cronômetro do percurso) e telas (com o
  resultado do percurso).
- `assets/`: arquivos importados como arquivo (o Bun copia com hash para `dist/cliente/`). Resolva
  sempre com `new URL(caminho, import.meta.url)`: o caminho é relativo à pasta do cliente, não à
  página. O Zappy (`assets/zappy.glb`, animações `voar` e `parado`, material `luz` na bunda) sai
  de `arte/zappy/zappy.py` (Blender sem tela, o mesmo `bpy` das peças do quarto).
- `assets/mundo/`: o mundo feito no Blender (chão, árvores, casa, horta, bancada, farol, píer,
  pontes e ilhas do anel), um script por peça em `arte/mundo/` (`build_all.py`, nós e materiais
  no README de lá). `mundo/modelos.tsx` carrega; cada peça mostra a forma simples do código até o
  modelo chegar. Colisão: veja "Colisão das peças" abaixo.

## Passo da física (28/10/2026, física viva etapa 1)

- `<Physics timeStep={PASSO_DA_FISICA} interpolate updatePriority={-1}>` (`mundo/cena.tsx`,
  `PASSO_DA_FISICA` = 1/60 s em `mundo/medidas.ts`): passos fixos, com o desenho dos corpos
  suavizado entre passos, e os passos rodam antes dos outros `useFrame`.
- Quem move corpo do Rapier calcula o movimento em `useBeforePhysicsStep` com o `dt` fixo
  (`personagem/personagem.tsx`, `mundo/bicho-adotado.tsx`); o desenho (pose, giro, clipes) fica no
  `useFrame`. O `rastro` sai da posição suavizada (o pai do grupo do avatar), então a câmera e o
  Zappy não tremem entre passos. ⚠️ Nunca mover corpo no `useFrame` partindo de `translation()`:
  num quadro sem passo o movimento se perde (a 144 Hz, mais da metade dos quadros).
- Movimento com peso e tolerância (controlador universal, parte 1, `sistemas/movimento.ts`):
  `aproximarVelocidade` com `PERFIS` por modo (chão, ar, água; ilhas novas acrescentam o delas) e
  `passoDoPulo` (coyote time e jump buffer, um toque um pulo). Testes:
  `tests/movimento-com-peso.test.ts`. Plano: `docs/plans/2026-10-28-arquipelago-controlador-universal.md`.
- Os números do corpo (velocidades, pulo, degrau, rampas) moram em `CORPO` (`sistemas/corpo.ts`),
  com `alcanceDoPulo`, `alcanceMaximoDoPulo` e `beiradaMaximaDoPulo` para desenhar vãos e beiradas
  (o degrau automático só vale pisando: o `personagem.tsx` o desliga no ar; agarrando a quina, a
  beirada vai a uns 3,65 m, `beiradaMaximaAgarrando` em `modos/borda.ts`).
- Sala de testes: `/movimento` no playground (`playground/movimento.tsx`, medidas em
  `playground/sala-de-movimento.ts`, `?estacao=Laguinho`), com o personagem e a câmera de verdade,
  uma estação por teste (cada uma com um obstáculo que passa e um que não) e o painel de medidas;
  `__peNaSala` dá o pé a cada quadro para scripts. Testes: `tests/sala-de-movimento.test.ts`.
- Modos de movimento (`sistemas/modos/`, contrato em `tipos.ts`): chão (com o nado), cipó e
  escalada são regras puras com `valendo`, `passo` (diz o deslocamento e quem leva o corpo: o
  controlador do chão, o do cipó ou direto) e `depois` (com o que o Rapier devolveu, troca de
  modo); entrar é `pegarCipo`/`agarrarTronco`, sair é `mudarModo`. O `personagem.tsx` só liga o
  modo ativo (`MODOS`) ao Rapier e ao desenho. Modo novo: um arquivo em `modos/`, uma entrada em
  `MODOS` e em `ModoDoCorpo`. Testes: `tests/modos.test.ts`. O limite do mar é a correnteza mansa
  (`sistemas/correnteza.ts`, regra 6.12 em `docs/arquipelago-regras.md`): cada ilha onde se nada põe
  a sua `RodaDeNado` em `movimento.rodasDeNado` (a central vale sempre, as do anel entram quando a
  ilha abre, em `mundo/anel.tsx`); o modo chão soma a correnteza ao `desloc` de quem nada no mar e
  `mundo/boias.tsx` desenha as boias de cada roda. Testes: `tests/correnteza.test.ts`. Equilíbrio no tronco caído
  (`modos/equilibrio.ts`): o eixo vem das âncoras `equilibrio-N-a`/`-b` do GLB
  (`movimento.equilibrios`, registradas pelo `BosqueVivo`); o chão entra nele pelo `eixoSobOsPes`.
  Escada reta (`modos/escada.ts`): âncoras `escada-N-base`, `-topo` e `-saida`
  (`movimento.escadas`); o chão pega pelo `escadaParaPegar` (embaixo, andando contra; em cima, do
  deque); os degraus colidem só para o corpo (`col-escada-reta`). Escorregador
  (`modos/escorregar.ts`): os pontos da pista vêm das âncoras `escorregador-curva-N`
  (`movimento.escorregadores`); pisar nela senta (`pistaSobOsPes`); a câmera tem o perfil
  `escorregar`. Agarrar a borda (`modos/borda.ts`): as quinas vêm das âncoras `borda-N-a`, `-b` e
  `-fora` (`movimento.bordas`; no Bosque, a pedra de agarrar entre a T3 e a T4); o chão pega no ar
  pelo `bordaAoAlcance`; marque quina só onde há espaço embaixo, pendurado e em cima (o teste da
  pedra em `tests/movimento-do-bosque.test.ts` confere).
  Clipes novos no `locomocao.glb` (Equilibrar, SubirEscada, PendurarBorda, SubirBorda,
  Escorregar), com o campo `especial` da `EntradaDaLocomocao` (antes `pendurado`); para ver:
  `/animacoes?equilibrar=1`, `?escada=1`, `?borda=1&subir=1`, `?escorregar=1`.
- Perfis de câmera (`sistemas/perfis-de-camera.ts`, `tests/perfis-de-camera.test.ts`): exploração,
  casa, conversa e percurso, um por vez (`perfilDaVez`), misturados por pesos que trocam em 0,5 s
  (`passoDosPesos`, `misturarPerfis`); a câmera aplica o "lá no alto" e a colisão por cima. Perfil
  novo (Construir) entra em `PERFIS_DE_CAMERA`.

## Qualidade automática (geral-05, 28/10/2026)

- `sistemas/qualidade.ts` contém detecção e transição puras. Metas: desktop 60, toque/coarse,
  CrOS ou até quatro núcleos 30; até dois núcleos começa leve, demais conservadores médios.
  Níveis completo/médio/leve: teto DPR 1,75/1,25/0,75, vento 1/0,5/0, ondas sim/sim/não,
  névoa 70 até 210/190/170 m. Nenhum parâmetro físico muda.
- Médias em janelas de 2 s: duas acima de 120% do orçamento reduzem, espera mínima 8 s;
  cinco até 105% aumentam, espera 20 s. Pausa, aba oculta e lacuna acima de 1 s zeram a amostra.
  Não há limitador artificial de FPS; a física continua em `PASSO_DA_FISICA` mesmo a 30 quadros.
- `mundo/qualidade-da-cena.tsx` adapta por montagem, sem estado global de decisão. A vegetação
  usa um uniform separado por cena via WeakMap, no desenho do material, sem alterar o vento
  das cordas nem `bosque-vivo.tsx`. Leve desmonta `OndinhasLigadas`, incluindo seus callbacks.
- `sistemas/conforto.ts` e `estado/conforto.ts` guardam `qualidade` na preferência local existente.
  O menu oferece Automática (padrão), Leve e Completa. URL `?qualidade=leve|completa` sobrepõe
  só durante a montagem, sem persistir. A escolha manual não altera a meta detectada.
- `__arquipelagoDesenho`: `qualidade`, `metaDeQuadros`, `dpr`, `amplitudeDoVento`,
  `vento.qualidadeAplicada` (escrito pelo material desenhado) e `ondas.ligadas`.
- `tests/qualidade.test.ts` usa o controlador e Rapier reais para comparar todos os 240 passos
  de caminhada/pulo em 4 s a 30/60 quadros, nos três níveis. `bun run test:qualidade-browser`
  confere Bosque, menu, preferência reaberta, caminhada/pulo e toque emulado no playground.
  Aceita `ARQUIPELAGO_CHROMIUM`; usa o Chromium Linux solicitado se existir, senão canal Chrome.
  Emulação/SwiftShader prova funcionamento, não a meta de FPS em aparelho físico.

## Colisão das peças (28/10/2026, pedido dela: "as moitas não têm colisão")

- Regra: o que se vê de pé e tem tamanho de objeto colide, sempre com forma simples (caixa ou
  cilindro arredondado, `Colisores` em `mundo/colisores.tsx`), nunca a malha de desenho (só o chão).
  Macio (moita, folhagem, cogumelo) fica um pouco menor que o desenho; duro fica do tamanho dele.
  Miúdo do chão (capim, flores, pedras do caminho, estrelas-do-mar, vitórias-régias, taboas,
  raízes) não colide. O personagem sobe sozinho até uns 0,58 (degrau de 0,45 mais a curva do pé
  numa quina): pedrinhas, tocas e pedras do lago ficam abaixo; o que deve parar o corpo (moitas,
  canteiros) tem pelo menos `ALTURA_QUE_SEGURA` (0,7).
- O que tem medida do jogo fica no código, em `mundo/colisao-da-ilha-central.ts` (casca da casa e
  a porta aberta ou fechada, troncos e a saia do pinheiro, canteiros, bancada, torre do farol,
  tampo do píer, corrimão das pontes inteiras). O que o Blender espalha vem dos nós `col-*` do
  GLB, lidos com `lerColisores` junto com o desenho: `terreno.glb` (moitas e pedras), `farol.glb`
  (pedras do pé e degraus), `pier.glb` (estacas, lampião e barquinho) e, no Bosque, `bosque.glb`
  (moitas, pedras, cogumelos, tocas, floreiras, pernas do escorregador). Ajudantes `col_caixa`,
  `col_cilindro`, `col_no_chao` no `arte/mundo/lib_mundo.py`; `exportar(..., colisores=col)`.
- Câmera: `SO_PARA_O_CORPO` (`colisores-da-ilha.ts`, pelo prefixo do nome) diz o que só segura o
  corpo: folhagem, cogumelos e peças finas (postes, estacas, colunas, floreiras, vasos, canteiros,
  barco, cavalete, corrimãos). Paredes, troncos, pedras e torre tapam a câmera.
- Testes: `tests/colisao-da-ilha-central.test.ts` (nós sem material, colisor debaixo do desenho,
  quem a câmera ignora, trilhas de pedra livres, porta, e uma busca em grade de 25 cm que chega da
  porta a cada canteiro, à bancada, ao farol, ao píer e à cabeça de cada ponte) e o bloco "os
  enfeites do Bosque" em `tests/colisores-da-ilha.test.ts`. A Vila Doce (29/10/2026) tem os dela no
  `vila-doce.glb` (casas e lojas até o topo plano, o percurso dos telhados, a fonte, as barracas e os
  enfeites de pé), conferidos em `tests/colisores-da-vila-doce.test.ts` (paradas do percurso em cima de
  colisor, vãos dentro do pulo andando, chegada e frente das lojas livres). O Recife (29/10/2026, ligado na
  fase3-01) também tem os dele no `recife.glb` (cais, casa da Maré, caverna para quem nada),
  em `tests/colisores-do-recife.test.ts`; os ajudantes dos testes ficam em `tests/ajuda-colisores.ts`. O Pico
  (29/10/2026, ligado na fase3-06) tem os dele no `pico.glb`, com a trilha cavada na montanha até o platô do
  cume, em `tests/colisores-do-pico.test.ts` (busca em grade da chegada ao platô, encosta que não se sobe), e o
  Vale dos Dinos no `vale-dos-dinos.glb`, em `tests/colisores-do-vale.test.ts`, e a Ilha das Nuvens no `nuvens.glb`,
  em `tests/colisores-das-nuvens.test.ts` (o tampo de cada plataforma é `col-cil-plataforma-N`: quem move o nó
  `plataforma-N` move o colisor junto). A grade de andar dos dois é
  `gradeDeAndar` (`tests/ajuda-colisores.ts`).

## Ilhas completas (o Bosque, 27/10/2026)

- Vila Doce (fase2-01, 29/10/2026): `vila-doce.glb` em `ILHAS_COMPLETAS`, com os colisores do
  Blender (`tests/colisores-da-vila-doce.test.ts`) e sem faces coplanares. Em `ILHAS_VIVAS` desde a
  fase2-02 (`mundo/vila-viva.tsx`, com o Bento; as lojas vêm depois). No navegador:
  `bun playground/verificar-vila-doce-browser.ts` (chegada até a praça e de pé em cada parada do
  percurso dos telhados).

- `src/sistemas/ilhas-completas.ts`: o ciclo puro `longe → carregando → pronta → ativa →
  descarregando`. Busca na cabeça da ponte (`naPonteDa`, faixa `BUSCA_NA_PONTE`), troca no meio dela
  (`DISTANCIA_DA_TROCA`), solta na volta à ilha central. Falha fica na versão leve até a pessoa se
  afastar.
- `src/mundo/carregar-ilha.ts`: `GLTFLoader` próprio (não o cache do `useGLTF`), no máximo UMA ilha
  completa na memória; soltar libera geometria, material e textura (até de arquivo que ainda chega).
- `src/mundo/ilha-completa.tsx` (`useIlhaCompleta`, `IlhaCompleta`): lê e prepara antes da troca,
  compila os shaders (`compileAsync`: inteira, pontilhada e as cópias transparentes) e faz o
  cross-fade da troca com `alphaHash` em `DURACAO_DA_TROCA`; a leve continua montada como reserva e
  só uma das duas colide. Jogo aberto em cima da ilha: o personagem espera no ar
  (`pedidos.chaoChegando`) até os colisores chegarem.
- O Bosque não é redondo (28/10/2026, para a cabana): cresce para o lado de fora (a ponta de campo
  do −x do modelo). A conta do contorno é a mesma da arte (`LOBO_DO_BOSQUE`, `raioDoChaoDaIlha` e
  `raioMaximoDaIlha` em `mundo/medidas.ts`); dela saem a roda de boias (`rodaDaIlhaNoModelo`, com o
  meio puxado para a ponta), a espera pelo chão ao abrir o jogo em cima da ilha, o "saiu da ilha" do
  percurso (`RAIO_DO_BOSQUE`) e o chão de antes da versão leve (`apoiosDaIlhaLeve`). Testes:
  `tests/bosque-crescido.test.ts`.
- Colisão: os nós `col-*` do GLB (`src/mundo/colisores-da-ilha.ts`; convenção no README de
  `arte/ilhas`), cuboide/cilindro arredondados (`BORDA_DOS_COLISORES`) e malha só no `col-terreno`.
  A malha de desenho nunca vira colisão.
- Câmera (`personagem/camera.tsx`, dentro do `<Physics>`): uma bolinha da cabeça e do peito até
  ela (`castShape`, grupos de `mundo/grupos.ts`: o guarda-corpo invisível não conta) a encosta na
  hora e a afasta aos poucos (`sistemas/camera.ts`); tapada de perto, gira para o lado livre e,
  sem lado livre, sobe por cima do ombro (`GRUA_DA_CAMERA`); lá no alto desce o ângulo
  (`CAMERA_NO_ALTO`). Copas, troncos e telhados (`copa-*`, `tronco-*`, `telhado-*`,
  `mundo/copas.ts`) entre a câmera e o avatar (cabeça, peito, pés, lados e o Zappy, raio contra a
  malha) esmaecem com transparência suave: trocam para cópias `transparent` sem `depthWrite`
  enquanto tapam e voltam aos materiais opacos depois. Soltar a ilha solta as cópias também.
- Prova de memória (playground): `__arquipelagoLevar(x, y, z, giro)` leva o personagem; na mesma
  pose da ilha central, antes e depois de duas visitas, as geometrias na placa (`geometrias`)
  nunca passam das penduradas na cena (`geometriasNaCena`) e ficam iguais entre as voltas.
- Medir: `localStorage['arquipelago:medir'] = '1'` deixa `renderer.info`, a posição, o giro, a
  câmera, as peças esmaecidas e o que a última ilha solta liberou em
  `globalThis.__arquipelagoDesenho` (`src/mundo/medidor.tsx`).
- Testes: `tests/ilhas-completas.test.ts` (ciclo, memória, esmaecer), `tests/camera-e-copas.test.ts`
  (distância da câmera, peças que esmaecem e a troca de materiais) e
  `tests/colisores-da-ilha.test.ts` (lê o `bosque.glb`: grupos, sem material, percurso nas copas de
  ponta a ponta, escada, escorregador, corredor da chegada livre, enfeites que seguram o corpo).

## Animações do avatar (28/10/2026)

- Clipes em `src/assets/avatar/locomocao.glb` (Andar, Correr, Pulo, Queda, Aterrissagem, Nado,
  Pendurado, Escalar, e os dos modos novos: Equilibrar, SubirEscada, PendurarBorda, SubirBorda,
  Escorregar),
  gerados por `arte/avatar/locomocao.py` no esqueleto Mixamo da plataforma: IK de dois ossos nas
  pernas, pé que gira sobre calcanhar e bola, bacia, peito, braços e cabeça. O "Idle" é o da
  plataforma (`Poses.glb`). O script enxuga o GLB: só giros e a posição da bacia.
- `src/sistemas/locomocao.ts` (puro, `tests/locomocao.test.ts`): pesos e tempo de cada clipe. Andar
  e correr na MESMA fase, que anda pela distância dividida pela passada (o pé não patina). As
  medidas dos ciclos ficam nos dois arquivos e precisam bater (o teste confere a duração e que o pé
  no apoio acompanha o chão).
- `personagem/avatar-do-jogo.tsx` aplica a regra às ações (`AvatarRig` com `extraClips` e
  `onAnimations`: o rig deixa de tocar a pose sozinho). O personagem escreve `movimento` (velocidade
  de verdade, chão, subida, nado, `pendurado`: `cipo` ou `escalada`); o desenho desce
  `FOLGA_DO_CONTROLADOR` para o pé encostar. Na escalada a velocidade é a 3D (subir conta), e o
  Escalar anda por `velocidade / CICLO_DE_ESCALAR.passada`. No cipó, `depoisDaPose` fecha as
  mãos na corda por cima do Pendurado.
- Conferir sem o jogo: `/animacoes` no playground (`playground/animacoes.tsx`), com o chão
  quadriculado correndo na velocidade do passo.

## Quadro das Cores (28/10/2026)

- Regra pura em `src/sistemas/quadro-das-cores.ts` (`quadrosDaIlha`, `novosFeitos`, `oQueFalta`,
  `motivoDoErro`); loja à parte em `src/estado/desafios.ts` (`lojaDosDesafios(loja, plataforma)`,
  uma por montagem via WeakMap, sem mexer no contexto).
- `src/mundo/quadro-das-cores.tsx`: o cavalete (`assets/itens/quadro-das-cores.glb`, nós `quadro`
  e `cor-1`..`cor-6`) perto da `chegada` da ilha completa; cada mancha tem material próprio e vai
  do `CINZA` à cor do arquivo. `src/interface/quadro-das-cores.tsx`: o painel (`painelAberto` na
  loja congela o personagem).
- A situação de cada desafio vem SEMPRE do serviço; o jogo só relê a lista depois do Estúdio.
  Regras e textos: `docs/arquipelago-regras.md` §7.11. Testes: `tests/quadro-das-cores.test.ts`.
- Desafio do dia (28/10/2026, §7.12): `desafioDeHoje` e `diaParaAvisar` em
  `sistemas/quadro-das-cores.ts`; o cartão "Desafio de hoje" (`CartaoDeHoje`) em cima dos seis
  quadros do painel; o aviso do Zappy (`AVISO_DO_DIA`) sai do cavalete
  (`mundo/quadro-das-cores.tsx`) uma vez por dia, guardado em `localStorage` por perfil. O banco de
  mentira (`plataforma/desafios-falsos.ts`) tem os três estados (`dia` na plataforma falsa,
  `?dia=pronto|feito|nenhum` no playground).
- A cor das ilhas do anel segue os quadros: seis pedaços em volta do centro (o 1 na chegada da
  ponte), regra em `sistemas/cor-da-ilha.ts` e tinta no shader em `mundo/pintura-da-ilha.ts`
  (`pinturaDaIlha(ilha)`: uniforms divididos por todos os materiais da ilha, leve, completa e as
  cópias das copas; `pintarMateriais` liga o `onBeforeCompile` uma vez por material). O `Anel` lê
  a lista dos desafios ao abrir o jogo; `usePinturaDaIlha` anda os pedaços. Testes:
  `tests/cor-da-ilha.test.ts`.

## Caderno dos Lumis (28/10/2026)

- O botão "Montar a rotina de um Lumi" do caderno abre o painel da rotina (fase2-07, abaixo).
- Regra pura em `src/sistemas/caderno-dos-lumis.ts` (`secoesDoCaderno`, `ondeAprender`,
  `lerCartas`, `motivoDoCadernoFechado`); loja à parte em `src/estado/cartas.ts`
  (`lojaDasCartas(loja, plataforma)`, uma por montagem via WeakMap, como a dos desafios) e o painel
  em `src/interface/caderno-dos-lumis.tsx` (`PAINEL_DO_CADERNO` em `painelAberto`, que congela o
  personagem). Abre pelo menu do jogo; cada abertura relê `GET /cartas`.
- Quem tem cada cartão vem SEMPRE do serviço (os de QUANDO e AÇÃO para todos, os de CONTROLE pelos
  blocos conquistados nos cursos do público da pessoa, equipe com todos). Montar a rotina é da
  Fase 2. Regras e textos: `docs/arquipelago-regras.md` §8.1. Testes:
  `tests/caderno-dos-lumis.test.ts`.
- ⚠️ `.arq-menu` é `content-box` com `width:100%`: no celular o menu e o Quadro passam 2 px de cada
  lado da tela. O caderno usa `box-sizing:border-box` (`.arq-caderno`).
- **Planta de interior (29/10/2026):** `planta-interior` é um objeto da casa (`OBJETOS_DA_CASA`,
1 × 1, dentro de cômodo novo) que chega com a primeira obra, da casa ou de uma cabana
(`ganharProjetos`). Conta como planta no aconchego (`PLANTAS_DA_OBRA`), e a dica sugere pô-la num
cômodo novo sem planta quando ela já foi ganha. Modelo e medidas em `arte/objetos/README.md`.
- ⚠️ **Barra do topo no celular (até 560px, 29/10/2026):** Viver/Construir (`.arq-modos`) fica à
  esquerda em `top:106px`, abaixo das necessidades e da segunda linha da direita (no meio do topo
  ela cobria as barras e o relógio, medido em 320 e 390). A dica do Zappy sobe para `bottom:236px`
  e estreita (`calc(100% - 152px)`) para não cobrir o direcional nem Pular/Usar; no Construir ela
  fica em `top:164px`, e o cronômetro em `162px`. Medir de novo ao pôr peça nova no topo.
- Playground: `?cartas=todas`, `?cartas=desligadas` (403) ou `?cartas=fora-do-ar` (424);
  `src/plataforma/cartas-falsas.ts` usa a régua do contrato com um currículo de mentira.

## Modo construção (28/10/2026, fase1-10 a fase1-12)

- Aconchego (fase1-15): `sistemas/construcao/aconchego.ts`, testes `tests/aconchego.test.ts`, painel `interface/aconchego.tsx`; calculado por edição, seleção transitória pela célula no Olhar, regras e números em §6.16.1, sem gravar pontos nem iniciar visitas ou festas.

- Plano e decisões: `docs/plans/2026-10-28-arquipelago-modo-construcao.md`; regras e números:
  `docs/arquipelago-regras.md` §6.16. O que a criança constrói fica em
  `salvamento.construcao` (contrato `SalvamentoV4`, `ObraSchema`).
- Regras puras em `src/sistemas/construcao/`: `lote.ts` (o lote da casa, células ocupadas, o quarto
  fixo e a obra inicial), `grade.ts` (arestas, trechos, arrasto, porta e janelas), `comodos.ts`
  (planta: o que as paredes fecham, cômodos, lambri ou lisa), `obra.ts` (esticar, apagar, porta,
  janela, piso, com o motivo de cada recusa), `pecas.ts` (as peças do kit com posição e giro,
  quinas, corte e colisores; a parede cortada colide como `col-obra-cortada-*`, só para o corpo) e
  `telhado.ts` (o corte no Viver e o telhado de duas águas dos cômodos retangulares; o giro do
  Blender em volta de z é o mesmo em volta do y do jogo), `quintal.ts` (cerca, caminho, canteiro;
  o canteiro do quintal é um canteiro da horta com id `q<x>_<z>`, e a horta segue a obra em
  `hortaComOQuintal`) e `ferramentas.ts` (o que cada ferramenta faz no arrasto e no toque, com a
  prévia) e `projeto-azul.ts` (ganhar a geladeira e a casinha, pôr e tirar objeto, a geladeira
  guardando alimentos, o Molda no posto Explorador). Testes: `tests/quintal.test.ts` e
  `tests/projeto-azul.test.ts`. Desde 28/10/2026 a página abre o Pinta e o Molda de verdade no
  molde (ponte em `member-shell/src/lib/arquipelago-objeto.ts`); o recado de quando não abre é
  `recadoDaFerramentaFechada`, e a plataforma de mentira responde com as mesmas recusas
  (`objetos: 'sem-acesso'`, `?objetos=sem-acesso` no playground).
- `mundo/objetos-da-casa.tsx`: os objetos postos (holograma do Blender ou azul no código; com
  aparência, o modelo ou a criação lida pela plataforma), o "Abrir" e `GanharProjetos` (montado pela `Casa`). Painel:
  `interface/projeto-azul.tsx` (`painelAberto` = `objeto:<id>`). Testes: `tests/construcao.test.ts` (inclusive o lote contra
  `alturaDaIlha` e contra todos os colisores que caem nele).
- `mundo/obra.tsx` (`ObraNoMundo`): desenha a obra com o kit (`src/assets/casa/*.glb`, contrato no
  README de `arte/casa`), cada peça uma cópia do nó; as portas abrem sozinhas perto da pessoa.
  A `Casa` troca a casa de antes pela construída quando há obra (`colisoresDaCasa(aberta, true)`
  tira a frente e a direita do quarto, que passam a ser do kit).
- Modo Construir: botões Viver e Construir e a barra de ferramentas em `interface/construir.tsx`;
  loja `estado/construcao.ts` (ferramenta, câmera de obra, Desfazer, `aplicar` com a fala da
  recusa); `mundo/construir.tsx` (montado pela `Casa` com o Construir aberto): câmera de obra, grade,
  prévia e o toque. ⚠️ A câmera do jogo (`personagem/camera.tsx`) escreve a posição a cada quadro
  ANTES da de obra: a de obra guarda a própria posição suavizada e só copia (suavizar a partir de
  `camera.position` faz as duas brigarem e a vista anda sozinha). O toque e a roda são pegos na
  captura do elemento pai do canvas, antes de chegarem à câmera do jogo.
- Cabana no Bosque (fase1-11): `mundo/cabana-do-bosque.tsx` (montado pelo `BosqueVivo`) lê o lote
  das âncoras `lote-cabana-a`/`-b` (`loteDaCabana` em `lote.ts`), registra-o na loja do Construir
  (`registrarCabana`) e diz se a pessoa está perto (`definirPertoDaCabana`). `abrir()` escolhe
  `onde` (`'casa'` ou o id do lote) e tudo o que grava passa por `obraDe`/`mudarObra` com esse
  `onde`. A ilha é girada no mundo: `ObraNoMundo` recebe `giro` e o `ModoConstruir` um
  `referencial` (`{x, z, giro}`); a câmera de obra, o toque e o corte trabalham no referencial do
  modelo e convertem com `noModelo`. Testes: `tests/cabana.test.ts`.
- Escolhas com desenho (pedido dela: "é importante ter o visual ali do desenho de cada item"): os tipos de
  janela, piso, caminho e os objetos aparecem na barra como miniatura com o nome embaixo
  (`Escolha` em `interface/construir.tsx`, mapas em `interface/miniaturas.ts`). As imagens saem
  dos próprios modelos por `arte/casa/miniaturas.py` (`src/assets/casa/miniaturas/`); escolha
  nova pede miniatura nova (`tests/miniaturas.test.ts`).
- Playground: `?obra=exemplo` (`src/plataforma/obra-de-exemplo.ts`). Conferir no navegador: a
  câmera de obra abre sempre igual, então dá para calcular onde cada ponto da grade cai na tela.

## A galeria de aparências (fase1-13, 29/10/2026)

- Regras puras em `sistemas/construcao/galeria.ts` (`usarAparencia`: vira a em uso e fica entre as
  guardadas, sem repetir, no teto sai a mais antiga; `aparenciasQueEleTem`; `estadoDoCartao`:
  comprar, falta, usar ou em uso; os recados), loja à parte em `estado/galeria.ts`
  (`lojaDaGaleria(loja, plataforma)`, uma por montagem via WeakMap: `GET /galeria` a cada painel de
  objeto que abre e `POST /galeria/compras` com uma chave nova), componentes em
  `interface/galeria.tsx` (`CartaoDaGaleria` ao lado do Pinta e do Molda, com confirmação;
  `SuasAparencias` para trocar sem cobrar).
- O Pinta e o Molda também passam por `usarAparencia`: o que ela fez fica guardado e o aconchego
  conta o "feito por você" pelas `aparencias` (comprar nunca tira esse ponto).
- Quem diz o que foi pago e o saldo é SEMPRE o serviço; o salvamento com uma da galeria não paga é
  recusado lá. A plataforma de mentira tem a mesma régua (`plataforma/galeria-falsa.ts`;
  `?moedas=` e `?galeria=fora-do-ar` no playground). Aparências próprias usam `carregar-aparencia.ts`; variação da galeria pede o arquivo e a escolha pelo `modelo` em
  `mundo/objetos-da-casa.tsx`.
- Testes: `tests/galeria.test.ts` e o caso da galeria em `tests/aconchego.test.ts`. Regras e
  textos: `docs/arquipelago-regras.md` §6.16 e §9.9.

## O Zappy vira junto com o personagem (27/10/2026, pedido dela)

- `src/sistemas/zappy.ts` (puro, `tests/zappy.test.ts`): voa à direita e um pouco atrás de onde
  ela OLHA (`lugarAoLado`, a direção do avatar, não o giro da câmera); numa virada o lugar gira em
  volta dela pelo lado curto (`suavizarAngulo`, `RAPIDEZ_EM_VOLTA`), sem atravessar o corpo.
- Olhar (`paraOndeOlhar`): andando, para onde ela vai (frente, costas ou lados); parada por
  `ESPERA_PARA_OLHAR_PARA_ELA`, para ela, com uma espiada na câmera a cada `PERIODO_DA_ESPIADA`.
- Inclina para dentro da curva pelo quanto girou (`inclinacaoNaCurva`) e mergulha um pouco andando
  (`mergulho`); o grupo usa `rotation.order = 'YXZ'` (giro no mundo, mergulho e inclinação no corpo).
- `rastro.direcao` e `rastro.velocidade` são escritos pelo personagem; `rastro.zappy` (onde ele
  está) pelo Zappy, e é dele que as copas do Bosque leem para esmaecer na frente dele.

## Sem pisca-pisca: faces coplanares, emendas e a câmera (28/10/2026)

- Pedido dela: a janela de fora da casa piscava. Causa: a veneziana e os frisos do lambri tinham a
  frente no MESMO plano (listras do friso piscando através dela) e a parede em volta da janela era
  feita de quatro caixas encostadas (junção em T: linha tracejada acima e abaixo do vão). Regras e
  conserto no README de `arte/mundo` (seção "Sem pisca-pisca").
- **Regra:** nenhum modelo tem faces coplanares de materiais diferentes se sobrepondo nem emenda em
  T. `scripts/faces-coplanares.ts` acha as duas coisas num GLB (por plano: normal e distância em
  grade; sobreposição por recorte de triângulos; emenda em T por vértice no meio de aresta vizinha);
  `tests/faces-coplanares.test.ts` roda em todos os GLBs do mundo, no Quadro das Cores, na Vila Doce
  (29/10/2026) e nas peças no lugar do jogo em cima do chão. O Bosque tem uma lista `PENDENTES_DO_BOSQUE` (pares que já
  existiam); par novo reprova.
- **Câmera:** `PERTO_DA_CAMERA` 0,25 e `LONGE_DA_CAMERA` 450 (`mundo/medidas.ts`, explicação lá).
  O `near` é quem dá precisão de profundidade (2,5 vezes a de 0,1) e o canto do plano de corte fica
  dentro da bolinha da sonda da câmera; o `far` só precisa alcançar as estrelas
  (`RAIO_DAS_ESTRELAS`) e passar da `NEVOA`. Sem `logarithmicDepthBuffer` (caro no celular). Não há
  sombras no jogo (nenhum `castShadow`), então não há acne de sombra a ajustar.

## Cipó, escalada e percurso nas copas (27/10/2026, Fase 1)

- Tudo do Bosque que mexe vem de `mundo/bosque-vivo.tsx` (`BosqueVivo`), montado pelo `anel.tsx`
  só com a ilha completa ATIVA, em coordenadas do mundo, fora do grupo da ilha. Os números no
  referencial do modelo ficam em `mundo/bosque.ts` (placa, vagalumes, tronco de escalar, raios dos
  deques) e são conferidos contra o `bosque.glb` em `tests/movimento-do-bosque.test.ts`.
- O que o personagem pega e escala mora em `contexto.movimento` (listas simples, sem alocar no laço
  da física): `cipos`, `troncos`, `aguas`, o `pedido` dos interativos, o `modo` (`chao`, `cipo`,
  `escalada`), `noChao`, o `foco` da câmera no balanço e a `corrida` em andamento.
- **Cipó** (`sistemas/cipo.ts`): o balanço de quem segura é um pêndulo num plano em pé (`rumo`),
  que a criança controla (o `movimento/cipo.glb` solto não é usado aqui). As mãos seguram
  onde os pés passam a `folgaDosPes` do chão (`comprimentoDaPegada`): segurar na alça do fim
  enterraria as pernas. Pega no chão (E / Usar, `raioDaDica`) ou no ar (a corda passa a
  `raioDaPegadaNoAr` das mãos), com a velocidade que o corpo traz. Bombeia como no parquinho: pedir
  para o lado em que já vai empurra, o contrário não freia, de través vira o plano. Pular (ou usar)
  solta com a velocidade do balanço (`impulsoAoSoltar`) mais um pulinho; no ar, o embalo fica até
  pisar e a direção pedida só corrige (`CONTROLE_NO_AR`). No cipó o corpo usa um controlador do
  Rapier SEM grudar no chão (o grudar freava o balanço). `maosAcimaDoCentro` é 0,3 (as mãos do
  avatar chibi não passam do queixo); a escalada tem o dela (`ESCALADA.maosAcimaDoCentro`, 1).
- **Corda física** (`sistemas/cordas.ts`, puro, `tests/cordas.test.ts`): cada cipó é uma corrente
  Verlet de `CORDAS.elos` elos presa no pivô; encosta no corpo DESENHADO (`movimento.corpoDesenhado`,
  que o personagem escreve a cada quadro a partir do grupo do avatar e de `CORPO.desenho`: cápsula
  do tronco e bola da cabeça), no tronco, nos outros cipós e no chão. Seguro, a corda do pivô até
  a pegada fica na linha até as mãos (esticada) e o resto cai solto e encosta no corpo. Solto, o
  balanço (`balanco`) é lido da corrente (o pegar no ar usa ele). Soltar marca
  `esperandoOCorpoSair`. `BosqueVivo` roda `passoDasCordas` e desenha.
- **Desenho da corda** (`mundo/cipo-desenhado.ts`): esconde a corda reta do nó `cipo-*` e põe um
  tubo refeito a cada quadro sobre a corrente (Catmull-Rom, lados levados de anel em anel), a alça
  na ponta e as folhas dobradas pela altura de repouso delas. Monta no efeito da ilha ativa e
  desmonta ao sair (a corda do arquivo volta).
- **Escalada** (`sistemas/escalada.ts`): o tronco da árvore dos cipós (`TRONCO_DOS_CIPOS`, um cone
  um pouco torto do tamanho da casca desenhada). Andar contra ele por `esperaParaGrudar` (ou pular
  nele) gruda; frente e trás sobem e descem, os lados seguem a tela, descer no pé solta, pular solta
  para fora (ou para onde se pede, se for para longe). Lá de cima, o pulo cai no `cipo-1`. A
  trepadeira em espiral (desenhada no código) mostra que aquele tronco sobe e esmaece com ele.
  Ainda não há nó `escalada-*` no GLB: o que falta passar para o Blender está no README de
  `arte/ilhas`.
- **Lago**: o nó `agua` (a elipse da caixa e a altura da superfície) com a bacia de 0,85 m no
  `col-terreno`: nada como no mar (mesma regra, `ENTRAR_NO_NADO`/`SAIR_DO_NADO`). O tronco que boia
  (`mundo/tronco-no-lago.tsx`) é um corpo dinâmico com quatro pontos de flutuação
  (`sistemas/empuxo.ts`, materiais em `sistemas/materiais-fisicos.ts`); a criança empurra
  (`setApplyImpulsesToDynamicBodies`, `MASSA_DA_CRIANCA`). O medidor mostra o tronco em
  `__arquipelagoDesenho.tronco`.
- **Mãos no cipó** (`personagem/bracos.ts`): IK de dois ossos fecha os punhos na corda depois da
  pose de cada quadro (`AvatarDoJogo` monta `DepoisDaPose` logo depois do `AvatarRig`, então roda
  depois do mixer). A corda passa ao lado esquerdo do rosto (`CORDA_NO_CORPO`) e o corpo pende
  `INCLINACAO_NO_CIPO` para trás; `personagem.tsx` põe o grupo do avatar de modo que esse ponto caia
  nas mãos (com o giro e a inclinação do balanço). No tronco o clipe Escalar já põe as mãos.
  Medidas do avatar (ombro, braço, cabeça) estão no comentário de `bracos.ts`: o rig recentra o
  avatar ao ficar de pé, então nada pode inclinar o grupo antes disso.
- **Percurso nas copas** (`sistemas/percurso.ts`, `PERCURSO_DAS_COPAS`): a placa ao pé da escada
  começa (E / Usar); cada deque alcançado vira ponto de volta; cair no chão da ilha depois do
  primeiro deque escurece, leva à `volta` do último deque e clareia (`corteSaiMs`, `corteVoltaMs`),
  nunca para a largada; sair da ilha, se afastar da largada antes de subir ou "Parar" desiste sem
  castigo. O tempo é o de jogo, somado quadro a quadro: menu, ferramenta aberta, aba escondida e
  o corte não contam, e passar de 1 hora desiste (o salvamento não guarda mais que isso). Chegar ao fim do escorregador mostra o
  resultado (estrelas, tempo, melhor tempo, "Correr de novo") e grava o melhor em
  `salvamento.percursos['bosque-copas']` (`juntarResultado`: cada estrela fica para sempre, o tempo
  é o menor). Os vagalumes só aparecem durante a corrida.
- **Câmera**: no cipó o alvo vai para perto do meio do cipó e a câmera segue mais devagar; com
  `prefers-reduced-motion` ela olha só para o meio do cipó (quase parada). A bolinha da câmera que
  começa encostada num tronco e se afasta não conta como batida (`stopAtPenetration: false`).
- **Controles**: `controle.pulos` conta os toques de pular (o toque curto que desce e sobe no mesmo
  quadro solta o cipó). A dica mostra a tecla no teclado e o nome do botão no toque
  (`estado/preferencias.ts`: `useToque`, `useMenosMovimento`); no cipó o botão Pular vira Soltar.
  Controle físico (`controles/gamepad.ts`, Gamepad API, mapeamento padrão): analógico esquerdo
  anda (até o fim corre), direito gira a câmera, botão de baixo pula, o da direita usa, gatilho ou
  ombro direito corre, clique no analógico direito recentraliza, Start faz o que o Esc faz; zona
  morta 0,15; escreve no mesmo `Controle` (a ação não sabe de onde veio). A tecla C também
  recentraliza (`controle.recentrar`). No toque o joystick é flutuante: nasce onde o polegar pousa
  na metade esquerda de baixo (`arq-zona-joystick`). Testes: `tests/gamepad.test.ts`.
  Conforto da câmera no menu (`interface/conforto.tsx`, regras em `sistemas/conforto.ts`, loja
  `estado/conforto.ts` guardada em `localStorage['arquipelago:conforto']`): rapidez, distância,
  inverter, volta sozinha (desligada) e menos movimento. Testes: `tests/conforto.test.ts`.
- Prints do playground: `localStorage['arquipelago:medir'] = '1'`, `?novo=1&posicao=2&em=x,z` e
  `__arquipelagoLevar(x, y, z, giro)`. O Bosque fica com o centro em (77,05; 28,05), girado 2,79.

## A Capi no Bosque (28/10/2026, Fase 1)

- Plano: `docs/plans/2026-10-28-arquipelago-capi-e-bichos.md`; regras e números:
  `docs/arquipelago-regras.md` §6.15. Tudo o que muda o salvamento passa pelas funções puras de
  `sistemas/conversa-da-capi.ts` (`comecarConversa`, `presentear`, `entregar`).
- Presente dos quatro bichos: `receberPresenteDosBichos` em `sistemas/bichos.ts` entrega uma
  `salada` já existente e marca `presenteDosBichosEntregue` no mesmo snapshot V5, uma vez só.
  `comecarConversa` acrescenta o agradecimento por último, após eventual página do diário.
  Inventário no teto de saladas ou documento sem espaço nos 64 KB adia a entrega, sem marcar.
  Testes em `tests/capi-presente.test.ts` e `tests/salvamento-duravel.test.ts`.
  Playground: `?bichos=achados` prepara os quatro, sem entregar nem apagar a marca persistida;
  `?novo=1&bichos=achados` começa outro jogo para conferir a conversa no navegador.
- `mundo/capi.tsx` (montado pelo `BosqueVivo`, dentro de `ComReserva`): o `capi.glb` copiado com
  `SkeletonUtils.clone` (tem esqueleto), na âncora `morador`, de costas para a `cabana`. Vira para
  a criança (`olharDaCapi`), acena, fala, comemora (`alegria` na loja da conversa) e pisca pelo
  morfo `piscar` dos olhos. O colisor `col-morador-capi` só segura o corpo. Desde a fase2-02 tudo
  isso mora no morador genérico `mundo/morador.tsx` (o mesmo do Bento).
- `estado/moradores.ts`: a loja da conversa (uma por montagem, como a dos desafios): falas, passo e
  tela. O painel é `interface/capi.tsx` (`PAINEL_DA_CAPI` em `painelAberto`).
- Câmera da conversa: quem abre a conversa põe a cabeça de quem fala em `pedidos.conversa` (com o
  `miolo` da ilha) e limpa quando o painel fecha; o personagem vira para lá e a câmera enquadra as
  duas (`LADO_NA_CONVERSA`, `DISTANCIA_NA_CONVERSA`, `INCLINACAO_NA_CONVERSA`, `ABAIXO_NA_CONVERSA`).
- No Bosque não aparece mais o "Olhar em volta" da ilha (`ILHAS_VIVAS` em `anel.tsx`).
- Esconde-esconde (`mundo/bichos-do-bosque.tsx`, também no `BosqueVivo`): os quatro filhotes
  (`assets/bichos/*-filhote.glb`, `ESCALA_DOS_BICHOS`) nos esconderijos (âncoras `esconderijo-*`
  do `bosque.glb`, giro lido do quatérnio por `rumoDoNo`; `ESCONDERIJOS_NO_MODELO` fica de reserva),
  a pista e o "Achar", e a corrida até
  o cercadinho pelo caminho da grade (`sistemas/caminho.ts`, A* com encurtamento;
  `mundo/chao-livre.ts` monta a grade sobre os colisores da ilha no primeiro achado). O modelo
  animado com esqueleto vem de `mundo/animado.ts` (`useCopiaAnimada`, `trocarClipe`,
  `olhosNoInstante`), o mesmo da Capi. Testes contra o `bosque.glb`:
  `tests/esconde-no-bosque.test.ts`.
- Bicho adotado: adotar pela conversa com a Capi (tela "adotar" da loja da conversa,
  `adotarPelaCapi`); `mundo/bicho-adotado.tsx` (montado na `Cena`, fora das ilhas) é um corpo
  cinemático com controlador próprio que segue a criança (`sistemas/seguir.ts`) e troca de modelo
  ao crescer (filhote `*-filhote.glb`, adulto `*.glb`). ⚠️ O controlador da criança e o do bicho
  usam `EXCLUDE_KINEMATIC`: um passa pelo outro (nenhum outro corpo do jogo é cinemático). Painel
  de cuidar em `interface/bicho.tsx` (`PAINEL_DO_BICHO`, loja `estado/bicho.ts` com as falas e a
  reação que o modelo toca); regras em `sistemas/cuidar.ts`; a queda das medidas roda nos
  `Relogios`, junto com as necessidades. Testes: `tests/cuidar.test.ts`.

## O Bento na Vila Doce (fase2-02, 29/10/2026)

- Salvamento V7 (`moradores.bento`, o mesmo formato da Capi). Regras puras em `sistemas/bento.ts`
  (gostos, aniversário de São João, pedidos, `BENTO_NA_VILA`, `falasDoBento`) e
  `sistemas/conversa-do-bento.ts` (sobre o salvamento: `comecarConversaComOBento`,
  `presentearOBento`, `entregarAoBento`, `podeEntregarAoBento`, `oQueFaltaAoBento`). As contas de
  amizade e de pedido de itens são as de `moradores.ts`, agora gerais (`darPresente` recebe os
  gostos e o aniversário; `temOsItens`, `entregarItens`, `oQueFaltaDosItens`, `olharDoMorador`).
- No mundo: `mundo/morador.tsx` (`MoradorDaIlha`) é o morador parado que vira, acena, fala,
  comemora, pisca e abre a conversa; `mundo/capi.tsx` e `mundo/bento.tsx` só dizem o modelo, o
  painel, as medidas e onde ficam. O Bento fica na âncora `morador` da `vila-doce.glb`, de costas
  para a `padaria`, montado por `mundo/vila-viva.tsx` (`ILHAS_VIVAS['vila-doce']`).
- A loja da conversa é por morador (`lojaDaConversa(loja, 'bento')`, padrão `'capi'`); o painel é
  `interface/bento.tsx` (`PAINEL_DO_BENTO`), com os `Coracoes` e os `Presentes` exportados de
  `interface/capi.tsx`. Regras e textos: `docs/arquipelago-regras.md` §6.15.1. Testes:
  `tests/bento.test.ts`; navegador: `bun playground/verificar-bento-browser.ts`.
- Receitas do Bento (fase2-04): ingredientes e pratos em `sistemas/itens.ts`; `RECEITAS` com
  `onde` (`bancada` ou `forno`) e `bento` (o coração que ensina), `receitasConhecidas`,
  `receitasPossiveis`, `fazerReceita` e `PAINEL_DA_BANCADA` em `sistemas/receitas.ts`. A conversa
  (`conversa-do-bento.ts`) acrescenta `FALA_DA_RECEITA` e os ingredientes quando a amizade passa
  um coração, e a cesta da despensa (`cestaDoBento`) a cada entrega. O forno chega pelo
  `ganharProjetos` com o primeiro coração; o painel dele e o da bancada usam `ListaDeReceitas`
  (`interface/receitas.tsx`). Playground: `?bento=290` (amizade com o Bento). Testes:
  `tests/receitas-do-bento.test.ts`; navegador: `bun playground/verificar-receitas-browser.ts`.
- Diário da Vila (fase2-12): a página da Vila Doce chega pelo Bento com 2 corações
  (`CORACOES_DA_PAGINA_DA_VILA`, `FALA_DA_PAGINA_DO_BENTO`, `ganhouAPaginaDaVila` em
  `sistemas/diario.ts`) e o diário ganha a seção Receitas (`colecaoDeReceitas`). Testes em
  `tests/diario.test.ts`.
- Turnos nos balcões (fase2-03, salvamento V8 `turnos`): regras puras em `sistemas/turnos.ts`
  (`BALCOES`, `pedidosDoTurno`, `porNaBandeja`, `entregarBandeja`, `fecharTurno`), loja do painel
  em `estado/turno.ts` (`PAINEL_DO_TURNO`, `lojaDoTurno`), painel `interface/turno.tsx`. A
  sorveteria e a barraca de sucos abrem pelo E (`mundo/balcoes-da-vila.tsx`, âncoras `sorveteria`
  e `barraca-5`); a padaria, pelo "Ajudar no balcão" do painel do Bento. Só o primeiro turno do dia
  em cada balcão paga (ingredientes; na padaria, também `ajudarOBento`); moedas esperam o serviço.
  Regras: `docs/arquipelago-regras.md` §6.15.2. Testes: `tests/turnos.test.ts`; navegador:
  `bun playground/verificar-turnos-browser.ts`.
- Entrega pelos telhados (fase2-05, percurso `vila-telhados`): o percurso com tempo virou genérico
  (`ConfigDoPercurso` e `PERCURSOS_DO_JOGO` em `sistemas/percurso.ts`; as funções recebem a
  config, padrão o das copas) e o componente `mundo/corrida-na-ilha.tsx` (`CorridaNaIlha`: largada,
  cronômetro, coletáveis, queda com o corte e resultado) serve o Bosque e a Vila. Os pontos da
  Vila saem de `mundo/telhados.ts`. `CorridaNaTela` e `ResultadoDaCorrida` dizem o `percurso`, e o
  HUD lê nome, coletável e tempo da config. `podeConstruir` some com a barra durante a corrida.
  Testes: `tests/entrega-pelos-telhados.test.ts`; navegador: `bun playground/verificar-percursos-browser.ts`
  (com o SwiftShader a cena anda a ~1 quadro por segundo: espere o corpo sair e voltar, nunca um
  tempo fixo).
- Patins (fase2-05, `sistemas/patins.ts`): a primeira chegada da entrega traz o item `patins`
  (`premio` em `ConfigDoPercurso`); o botão da mochila calça (`loja.patins`, transitório, vale com
  o item na mochila: `comPatins`). `EntradaDoPasso.patins` muda o modo chão (rapidez 1,3 e o perfil
  `PERFIS.patins`, nunca nadando); o personagem divide a velocidade das animações pela rapidez. O
  par vira malha com o esqueleto do avatar (`patimNoEsqueleto`: geometria do arquivo no referencial
  das peças, pesos do pé e da canela por altura, `pesoDaCanela`), igual ao cano da bota do avatar, e
  o calçado do avatar some enquanto isso (pela geometria da peça `shoes-*` em uso). Não prender peça
  vestida pela pose parada: o pé gira uns 14° para fora da canela no Idle e a perna escapava da bota.
  O medidor mostra `patins` (malhas e altura das rodinhas). Regras: §6.13.2. Testes:
  `tests/patins.test.ts` e `tests/patins-nos-pes.test.ts`; navegador:
  `bun playground/verificar-patins-browser.ts` (`?patins=1`).
- Borrões da noite e Lumis da Vila (fase2-06, salvamento V9 `lumis`): regras puras em
  `sistemas/borroes.ts` (`borroesDaNoite` pelo dia do jogo, `passoDoBorrao` sem alocar, `prender`,
  `prenderBorrao`, `lumisNaVila`, `receberLanterna`, `lerPresos`/`gravarPresos`); no mundo,
  `mundo/borroes-da-vila.tsx` (montado pelo `VilaViva`: borrões à noite perto das âncoras `lumi-N`,
  Lumis morando nelas). A lanterna é item (`ITENS.lanterna`, equipamento) que o Bento dá do segundo
  encontro em diante; `loja.lanterna` (transitório) acende pelo botão da mochila e
  `personagem/lanterna-na-mao.tsx` a pendura na ponta dos dedos (sem luz de verdade: uma luz a mais
  recompila todos os materiais). Os presos da noite ficam no `localStorage` por perfil. O medidor
  mostra `borroes`, `lumisDaVila` e `lanternaNaMao`. Regras: §6.15.3. Testes: `tests/borroes.test.ts`;
  navegador: `bun playground/verificar-borroes-browser.ts` (`?lanterna=1&adiantar=12`).
- Descanso (fase2-13): `sistemas/descanso.ts` (energia por segundo no banco e na cama, `descansar`,
  `sonecaAcabou`, `lugarNoBanco`, `lugarNaCama`) e o modo do corpo `modos/descanso.ts` (entra pelo
  pedido `{ tipo: 'descanso', lugar }` do interativo, sai andando, pulando, usando ou pelo pedido
  `levantar`). O corpo do Rapier fica de pé ao lado do móvel e só o desenho vai para o assento ou o
  colchão (`personagem.tsx`; deitado, o desenho gira −90° em X, como no nado ele deita para a
  frente). Clipes "Sentar" e "Deitar" no `locomocao.glb`. A energia sobe nos `Relogios`
  (`loja.descanso`); a barrinha "Soneca" fica no HUD. Bancos: `mundo/bancos-da-vila.tsx` lê os
  colisores `col-banco-N` da ilha preparada (já girados com a ilha: não girar de novo). Testes:
  `tests/descanso.test.ts`; navegador: `bun playground/verificar-descanso-browser.ts`
  (`?energia=20`); medidor: `descanso`, `energia`, `avatar`.
- ⚠️ Olhos: o olho do Blender tem dois materiais e o three divide a malha em `-olhos_1` e
  `-olhos_2`. Até 29/10/2026 `useCopiaAnimada` procurava só `-olhos` e nenhum personagem ou bicho
  piscava. `malhasDosOlhos` (`mundo/animado.ts`) acha todas as partes e `olhosNoInstante` mexe em
  cada uma; `tests/olhos-dos-personagens.test.ts` confere todos os GLBs de personagens e bichos.

### Mini estúdio de blocos dos Lumis (fase2-14)

- A plataforma abre a ferramenta `rotina-lumi` por cima do jogo. O botão “Montar com blocos” fica no painel Rotina. Cancelar ou falhar mantém os cartões e o rascunho; “Testar”, o Lumi no mundo, o HUD e “Da última vez” continuam no jogo.
- Contrato transitório versão 1 em `arquipelago-contracts/src/rotina-ferramenta.ts`: espécie, id da abertura, rotina compacta, cartões das outras rotinas, cartões do serviço e mundo pequeno (horta, mochila, geladeira). O retorno contém só a rotina, espécie e abertura. Sem campo novo no salvamento V10.
- `rotina-execucao.ts`, `rotina-validacao.ts`, `horta.ts` e `rotina-mundo.ts` no contrato são o núcleo puro compartilhado. O jogo adapta o salvamento; a prévia usa uma cópia. A horta e a geladeira normais também usam as operações extraídas. Não há import do jogo pela plataforma.
- A ponte comum relê `GET /cartas` ao abrir e ao guardar. Os controles dependem dessa resposta, inclusive Contar mais um. O jogo confere novamente permissões, espécie, versão, abertura, alterações concorrentes e teto de 32 antes de guardar sobre o estado atual.
- Editor Blockly em `member-shell/src/components/arquipelago-rotina/` (a porta da plataforma para o jogo; saiu do Studio em 29/10/2026 para o Studio não depender dos contratos do jogo), carregado sob demanda pela plataforma, com conversão nos dois sentidos. Do Studio ele usa só o visual do Blockly (`@sistemazero/studio/blockly-theme`). Cada bloco corresponde a um cartão. Até 16 blocos, 3 níveis e 32 no conjunto. Peças soltas, controles vazios e cartões bloqueados impedem guardar.
- No computador, blocos e prévia ficam lado a lado. No celular, “Blocos” e “Prévia” alternam a área. A miniatura esquemática mostra canteiros e geladeira, o Lumi no passo, o bloco destacado e o registro. “Prever”, “Pausar prévia”, “Próximo passo” e “Recomeçar” nunca mudam o jogo. Como o antigo teste completo, a prévia usa o instante da abertura, sem acelerar o crescimento da horta pelo Esperar.
- Tema da comunidade Kids, com os tokens oficiais de cores, fontes Baloo 2/Nunito do host, botões com degrau e foco visível. A área do Blockly recebe as mesmas cores; seus menus ficam dentro do diálogo e voltam ao host ao fechar.
- JavaScript/TypeScript somente, sem Python, seletor de linguagem ou código livre. A aparência futura da miniatura pode receber arte própria; nenhum GLB foi alterado.
- Playground `?rotina=editor&lumis=quindim:1&cartas=todas` carrega um host de QA da plataforma, fora do bundle do jogo. `rotina=cancelado` e `rotina=indisponivel` exercitam as reservas. `cartas=fora-do-ar`/`desligadas` mantém as recusas do serviço.
- Provas: `member-shell/tests/arquipelago-rotina-blocks.test.ts`, `arquipelago/tests/mini-estudio-lumis.test.ts`, rotina existente e teto V10. Navegador: `arquipelago/playground/verificar-mini-estudio-browser.ts`.

## A rotina dos Lumis (fase2-07, 29/10/2026)

- Contrato: `arquipelago-contracts/src/rotinas.ts` (o formato curto dos cartões: `c`, `a`, `n`,
  `se`, `d`, `casos`; `LIMITES_DA_ROTINA`) e o salvamento V10 (`rotinas`, uma por Lumi preso).
- Regras puras em `sistemas/rotina.ts`: `validarRotina` (começa com um Quando, os de controle na
  mão pela leitura de `GET /cartas`, `cartasNaMao`), `guardarRotina`, a montagem do rascunho
  (`Alvo`, `porCartao`, `tirarCartao`, `moverCartao`, `mudarCartao`, `alvoExiste`) e o intérprete
  (`comecarExecucao` cria a pilha uma vez; `proximoPasso` devolve sempre `e.passo` e não cria nada;
  `aplicarPasso` usa `regar` e `colher` de `horta.ts` e `guardarNaGeladeira`; o colhido vai para
  a mochila na hora, e a `carga` só lembra o que levar à geladeira, então parar no meio não perde
  nada). `rodarRotina` roda inteira (testes e a prévia do "Testar").
- Loja à parte em `estado/rotina.ts` (`lojaDaRotina`: o Lumi escolhido, a fila, o que ele faz agora
  e a última vez; `abrirRotina`). Painel `interface/rotina.tsx` (`PAINEL_DA_ROTINA`), aberto pelo
  caderno ("Montar a rotina de um Lumi") e perto de um Lumi da Vila ("Ensinar a rotina", de fundo,
  em `mundo/borroes-da-vila.tsx`); o aviso `RotinaAndando` fica no HUD, no alto à direita (no
  celular, 154 px do topo).
- No mundo: `mundo/rotina-dos-lumis.tsx` (`RotinaDosLumis`, na `Cena`): a virada de
  `ambiente.noite` põe na fila as rotinas daquele Quando (`quandoDaVirada`, `rotinasDoQuando`);
  um Lumi de cada vez aparece na horta com `useCopiaAnimada` (escala 0,5) e toca `andar`,
  `trabalhar`, `parado` e `feliz` (`trocarClipe`). Os lugares saem de `lugarDoCanteiro` (exportado
  de `mundo/horta.tsx`) e `lugarDaGeladeira`. O medidor mostra `lumiDaRotina`.
- ⚠️ O pior caso do salvamento ficava a 29 bytes do teto de 64 KB com as rotinas no teto (era
  290 na V10; o `recife` da V11 custa 54, o percurso `pico-cume` uns 96, o `vale` da V12 80, os
  corais da V13 12 e a banda da V14 19; medido em 29/10/2026, `tests/salvamento-v10.test.ts`):
  campo novo no salvamento precisa achar espaço antes (encurtar outro campo ou mudar o formato
  numa versão nova).
- Regras e textos: `docs/arquipelago-regras.md` §8.2. Testes: `tests/rotina.test.ts`; navegador:
  `playground/verificar-rotina-browser.ts` (`?lumis=quindim:1&cartas=todas`, compilar para Node no
  Windows).
- ⚠️ **Decidido em 29/10/2026 (fase2-14, com outra sessão): a montagem da rotina vai para um mini
  estúdio de blocos.** Os cartões do painel viram blocos próprios dos Lumis, num editor da
  plataforma aberto por cima do jogo pelo `plataforma.abrirFerramenta` (como o Pinta, o Molda e o
  Estúdio de desafio), com a prévia passo a passo ao lado. Ele reaproveita peças do Estúdio, mas não
  é o Estúdio. O formato guardado continua o `RotinaSchema` (V10, sem salvamento novo). Os blocos na
  mão continuam vindo de `GET /cartas`, e o jogo continua rodando a rotina no mundo. Não copiar o
  editor para dentro do jogo (`tests/fronteira.test.ts`). Até ele chegar, o painel de cartões segue
  valendo.

## Recordes da família e visitas (fase3-12, 29/10/2026)

- Regras puras em `sistemas/visitas.ts` (`leituraDosIrmaos`, `leituraDaCasa`, `recordesDaFamilia`,
  `obraVisivel`, `hortaVisivel`, `objetoCompleto`, `quartoVisivel`, `CHEGADA_DA_VISITA`,
  `QUARTO_DA_VISITA`, `RAIO_DA_VISITA`/`saiuDaVisita`, `falaDaChegada`, `falaDaSaida` e os textos); loja à parte em `estado/familia.ts` (`lojaDaFamilia(loja, plataforma)`: `GET /irmaos` a
  cada resultado e a cada abertura do painel, e `abrirCasa`). Na loja principal, `visita` e
  `visitar(v | null)`: com a visita, ⚠️ o `mudar` não faz nada (nada é gravado).
- No mundo, `mundo/casa.tsx` (a obra e o quarto do irmão, 29/10/2026; vazio se não chegou; a cama
  e a porta nova sem ação), `mundo/objetos-da-casa.tsx` (completo pelo irmão, nenhum "Abrir") e
  `mundo/horta.tsx` (a horta do irmão, nenhuma ação) leem pelas regras acima;
  `mundo/rotina-dos-lumis.tsx` não começa nem continua rotina na visita. ⚠️ O `personagem.tsx` não
  escolhe alvo na visita (nada do mundo age) e termina a visita quando ela passa da praia da ilha
  central (`saiuDaVisita`, fora de um teleporte pendente): lá fora o jogo dela precisa gravar.
- Interface em `interface/visitas.tsx`: `RecordesDaFamilia` (no `Resultado` do HUD),
  `PainelDasVisitas` (`PAINEL_DAS_VISITAS`, pelo menu) e `FaixaDaVisita` (no lugar de
  `ModosDoJogo`, `top:68px`; no celular `top:106px`, longe do direcional).
- Plataforma de mentira: `plataforma/familia-falsa.ts` (`?familia=irmaos|sozinha|desligada|fora-do-ar`;
  a Ana tem quarto, o Tomás tem `quarto: null`, o caso do Members fora).
  Regras e textos: `docs/arquipelago-regras.md` §6.20. Testes: `tests/visitas.test.ts`; navegador:
  `playground/verificar-visitas-browser.ts` (compilar para Node no Windows; o roteiro espera os 20 s
  da fila do jogo antes de conferir que a visita não grava).

## Diário e pegadas (28/10/2026, Fase 1)

- Regras puras em `sistemas/diario.ts` (páginas da Íris e a coleção do Bosque, derivadas do
  salvamento, sem campo novo) e `sistemas/pegadas.ts` (`FORMA_DA_PEGADA`, as elipses de cada
  pegada no quadro de 64, e `rastroNoCaminho`). Regras e números: `docs/arquipelago-regras.md`
  §6.17. Testes: `tests/diario.test.ts` e `tests/pegadas.test.ts`.
- Painel em `interface/diario.tsx` (`PAINEL_DO_DIARIO` em `painelAberto`), aberto pelo menu. O
  desenho da pegada no diário (`interface/pegadas.tsx`, SVG) e no chão
  (`mundo/rastro-de-pegadas.tsx`, uma malha instanciada por bicho) saem das mesmas elipses.
- A página do Bosque chega pela Capi: `comecarConversa`, `presentear` e `entregar` põem
  `FALA_DA_PAGINA` no fim das falas quando a amizade passa de `CORACOES_DA_PAGINA`; por isso
  `presentear` e `entregar` devolvem `falas` (lista) e `responder` da loja da conversa recebe a lista.
- O rastro sai no `BichosDoBosque`, à toa (`requestIdleCallback`), pelo mesmo
  `caminhoAteOCercado` da corrida até o cercadinho (que monta a grade se ainda não houver).

## Álbum de coleções e modo foto (fase2-09, 29/10/2026)

- Álbum: regras puras em `sistemas/album.ts` (`albumDoSalvamento` e uma função por seção, cada uma
  com `conta` = tem, total e faltam), derivadas só do salvamento, sem campo novo. Bichos e receitas
  vêm de `colecaoDoBosque` e `colecaoDeReceitas` do diário, e o painel (`interface/album.tsx`,
  `PAINEL_DO_ALBUM`, aberto pelo menu) desenha com os `Bicho` e `Receita` exportados de
  `interface/diario.tsx`. Os Lumis: `ESPECIES_DE_LUMI` (nome, ilha, comum ou rara e a cor do
  material `corpo` do GLB, conferida no teste); sem miniatura desenhada ainda, um círculo da cor.
- Modo foto: `PAINEL_DA_FOTO` em `painelAberto` (a pausa dos painéis para o personagem; a câmera
  segue girando). O `Hud` troca tudo pela `ModoFoto` (`interface/foto.tsx`), como na luneta;
  `AtalhoDaFoto` escuta o F. A captura mora dentro do `<Canvas>` (`mundo/foto.tsx`, `CameraDaFoto`,
  registrada por montagem em `estado/foto.ts`): `capturarQuadro` faz `gl.render` e `toBlob` na mesma
  chamada. ⚠️ Não ligar `preserveDrawingBuffer` (o teste confere `mundo/cena.tsx`). A foto só é
  baixada no aparelho; nada vai para o serviço nem para o Clube.
- Regras e textos: `docs/arquipelago-regras.md` §6.17.1. Testes: `tests/album.test.ts`; navegador:
  `playground/verificar-album-browser.ts` (compilar para Node no Windows, `ARQUIPELAGO_CHROMIUM`
  aceito), que semeia um salvamento com um pouco de cada coleção no `localStorage` do playground.

## Salvamento e tempo

- `SalvamentoV12` (contrato) com versão; as anteriores migram sozinhas (`migrarDaV1`: nenhum
  percurso corrido; `migrarDaV2`: a Capi sem amizade e nenhum bicho; `migrarDaV3`: a casa de antes
  e nenhum projeto azul; `migrarDaV4`: presente dos bichos ainda não entregue; `migrarDaV5`: a
  aparência em uso guardada; `migrarDaV6`: o Bento novo; `migrarDaV7`: nenhum turno feito; `migrarDaV8`: nenhum Lumi preso; `migrarDaV9`: nenhuma rotina; `migrarDaV10`: nenhum achado do Recife; `migrarDaV11`: nenhuma descoberta do Vale).
  Gravar aceita a versão de
  uma aba aberta antes da atualização e guarda migrada, mas essa aba não lê a resposta atual: só a
  primeira gravação dela fica, as seguintes falham até recarregar.
  Gravação por revisão (CAS). Revisão velha recebe 409
  `SALVAMENTO_DESATUALIZADO` e o jogo adota o que está guardado.
- Tempo livre do Kids: cada segundo ativo fica em IndexedDB por perfil; lotes de até 10 s são
  enviados com UUID e dia de São Paulo. O serviço trata repetições de forma idempotente; uma
  falha pausa o jogo até confirmar a fila. O limite padrão é 30 min e os pais podem alterá-lo.
  A comunidade adulta não tem limite diário nem usa esta fila. O dia do evento usa o relógio do
  aparelho, e os limites dessa confiança precisam ser considerados antes da abertura em produção.

## O Recife e a Maré (fase3-01, 29/10/2026)

O Recife está em `ILHAS_COMPLETAS` e `RecifeVivo` em `ILHAS_VIVAS`. Segue o ciclo existente de
carregar, preparar, esmaecer e soltar; a Maré e a lagoa só ficam montadas com a ilha ativa. O
Quadro das Cores usa a montagem genérica na chegada. Nenhum navio ou sistema de mergulho entra
nesta fase.

`mundo/recife.ts` lê as âncoras `casa-mare` e `morador` e a elipse do nó `agua`. O GLB recebido
em `02cfe22f4` já tem a bacia no terreno, com fundo de 0,85. A água entra em `movimento.aguas`
e sai na desmontagem. A roda de nado já registrada em `anel.tsx` usa raio 28,6 no Recife,
incluindo a aproximação à boca da caverna. `raioDaEsperaDaIlha` espera os colisores até 24 do
centro, também fora do contorno da ilha leve, sem acrescentar chão invisível.

`mundo/mare.tsx` usa `MoradorDaIlha`: cópia animada, aceno, giro, piscar e conversa. O cilindro
`col-morador-mare` segura só o corpo, com raio 0,46 e altura 1,45; cabeça a 1,2. As distâncias
e os tempos seguem o Bento. `sistemas/mare.ts` retorna o mesmo salvamento na apresentação;
o morador genérico só chama `mudar` quando recebe outra referência. Não criar amizade,
presentes ou pedidos nesta fase. A amizade espera uma próxima versão, sem alterar a V10.

Plano e decisões propostas: `docs/plans/2026-10-29-arquipelago-recife.md`. Testes:
`tests/recife.test.ts`, `tests/colisores-do-recife.test.ts`, `tests/lagos-das-ilhas.test.ts`,
`tests/ilhas-completas.test.ts` e `tests/faces-coplanares.test.ts`. Navegador:
`playground/verificar-recife-browser.ts`, com `?posicao=4`, computador e celular emulado.
O nado faz parte do modo `chao`: a conferência verifica a cintura na superfície e o corpo
sem apoio, em vez de procurar um modo chamado `nadar`.

Barco entre as ilhas (fase3-04): no `pier.glb`, o barquinho a remo é o nó `barquinho-decorativo`
(casco no `col-barco-1`) e as âncoras `barco` (linha d'água, proa para o mar) e `embarque` (tampo,
fora do alcance da luneta) dizem onde o barco da viagem atraca; no Recife, `barco` e `cais`. O
`barco.glb` tem a âncora `passageiro`, filha do nó animado `barco`. Testes: `tests/ancoras-do-barco.test.ts`.

Sob tetos baixos, `desvioVerticalDaCamera` também compara passar abaixo do alvo pela folga de
`FOLGA_DA_CAMERA`, com a sonda real e o ganho mínimo da grua. A posição horizontal exata pode
tangenciar o teto; não retirar colisores para resolver isso. O desvio entra e sai suavemente,
sem alterar a preferência. Testes em `camera-sob-teto.test.ts` e no roteiro do Recife.

## O Pico Gelado e o Floco (fase3-06, 29/10/2026)

O Pico está em `ILHAS_COMPLETAS` e `PicoVivo` (`mundo/pico-vivo.tsx`) em `ILHAS_VIVAS`, no mesmo
ciclo do Recife. Os colisores vêm todos do `pico.glb` (a trilha cavada até o platô do cume, o palco,
o iglu fechado e, desde a fase3-07, a caverna de cristal atrás da montanha). O Floco
(`mundo/floco.tsx`, `MoradorDaIlha`) fica no topo do tablado (âncora `palco`), voltado à marca
`morador` (`lugarDoFloco` em `mundo/pico.ts`); medidas e falas em `sistemas/floco.ts` (raio 0,43,
altura 1,49, cabeça 1,19, alcance 2,6). A apresentação usa o painel genérico
`interface/apresentacao.tsx` (`PainelDeApresentacao`), o mesmo da Maré. Sem amizade nem salvamento
novo. Percurso, trenó e caverna são da fase3-07; iglu, festival e banda, da fase3-08 (abaixo). Testes:
`tests/pico.test.ts`; navegador: `playground/verificar-pico-browser.ts` (`?posicao=5`).

## A subida ao cume, o trenó e a caverna de cristal do Pico (fase3-07, 29/10/2026)

Plano: `docs/plans/2026-10-29-arquipelago-pico-percurso-treno-caverna.md`; regras e números em
`docs/arquipelago-regras.md` (seção da fase3-07).

- **Subida ao cume** (`pico-cume` em `PERCURSOS` do contrato, sem versão nova; `PERCURSO_DO_CUME`
  em `sistemas/percurso.ts`): `mundo/subida.ts` lê as âncoras `subida-largada`, `subida-1..4`,
  `floco-1..5`, `cume` e a linha `treno-curva-N` (para o rumo das voltas) e monta os
  `PontosDoPercurso`; o `PicoVivo` roda o `CorridaNaIlha` genérico com flocos de neve brancos.
  ⚠️ O pior caso do salvamento ganhou a entrada `pico-cume` (uns 96 bytes): sobravam uns 140 do
  teto de 64 KB; depois da V12, da V13 e da V14 sobravam 29 (a V15 abriu espaço: 4579).
- **Trenó** (`sistemas/treno.ts`, `mundo/treno-do-pico.tsx`): não é um modo novo. A trilha vira uma
  pista do MESMO modo `escorregar`, com o atrito do gelo (`MATERIAIS.gelo`), teto de 4,5 m/s e
  `soPorPedido` (andar na trilha não senta; só o pedido `escorregar` do "Descer de trenó", do
  começo da pista). O nó `treno-desenho` (origem na base do trenó; `treno` é a âncora) vai
  debaixo de quem desce, virado para `rastro.direcao`, e volta ao platô no fim. ⚠️ Os modos guiados também passam pela colisão
  (`passoComColisao`: bloqueado, volta ao chão), e o colisor do trenó parado ocupa o começo da
  pista: por isso `col-treno-*` é uma PEÇA (`pecaDoColisor` em `mundo/colisores-da-ilha.ts`), num
  corpo do Rapier próprio com `userData.peca`, e o personagem o ignora no `escorregar` (como o
  barco no modo barco). Peça nova que o corpo usa entra em `PECAS_QUE_O_CORPO_USA`. O escorregar
  agora para na pausa (`e.parado`), e o relógio do modo (`noModo`) também.
- **Caverna:** a espera pelo chão e a roda de nado crescem para o lado da caverna
  (`CAVERNA_DO_PICO` em `mundo/medidas.ts`). O cristal raro (`sistemas/cristal-raro.ts`,
  `mundo/cristal-do-pico.tsx`): "Pegar o cristal" de pé no alto da saliência põe o item
  `cristal-rosa` na mochila uma vez; com ele lá, o nó `caverna-joia` some. O item é uma
  `lembranca` (`sistemas/itens.ts`): não se come nem se dá de presente, senão voltaria ao pedestal.
- Testes: `tests/subida-ao-cume.test.ts`, `tests/cristal-raro.test.ts`, o trenó em
  `tests/modos.test.ts`, os colisores em `tests/colisores-do-pico.test.ts`; navegador:
  `playground/verificar-pico-browser.ts`.

## O iglu, a banda e o festival de inverno do Pico (fase3-08, 29/10/2026)

Regras e textos: `docs/arquipelago-regras.md` (seção da fase3-08); plano:
`docs/plans/2026-10-29-arquipelago-pico-iglu-festival-banda.md`.

- **Iglu oco** (`arte/ilhas-b/pico.py`, `IGLU`): a cúpula é o nó `telhado-iglu`, que esmaece como
  os telhados (`mundo/copas.ts`). O anel `col-parede-iglu` (menos o corredor da porta) segura o
  corpo onde a cúpula ainda passa da cabeça; o teste em grade de `tests/colisores-do-pico.test.ts`
  confere teto e passagem. Os bancos de gelo são `col-banco-N`: o `PicoVivo` monta o
  `BancosDaVila` (genérico) com os colisores da ilha.
- **Regra pura** em `sistemas/banda.ts`: `INSTRUMENTOS` (a ordem dos bits de `pico.banda`, V14),
  `devolverInstrumento`, `festivalDeInverno`, os rótulos e falas, `falasDoFloco` (a conversa do
  Floco agora sai daqui) e `fazerChocolateNoIglu` (a receita do chocolate quente sem os corações do
  Bento; o primeiro traz a lareira por `ganharProjeto`, o projeto azul é a própria marca). A banda
  chega em `ganharProjetos` com `pico.banda === 7`.
  Duas sessões juntam os bits (`conciliar-salvamento.ts`): levar ao palco não gasta nada.
- **No mundo**: `mundo/banda-do-pico.tsx` (`BandaDoPico`, montado pelo `PicoVivo`) lê as âncoras
  `instrumento-*`, `banda-*`, `musico-*`, `palco`, `morador` e `fogareiro`; os instrumentos são
  cópias dos nós do `banda.glb` da casa (posição zerada), com colisor `col-instrumento-*` do tamanho
  da caixa deles (só para o corpo); os pinguins (`pinguim.glb`, escala 1,8) ficam no palco com
  `col-morador-pinguim-N`, curvados sem o instrumento e balançando quando ele volta (menos
  movimento: parados); as notas do festival sobem do palco com a banda completa. Tudo respeita a
  pausa, a troca da ilha (0,99) e o somente leitura.
- ⚠️ O pior caso do salvamento ficou com 29 bytes de folga depois da V14 (a V15 abriu espaço: 4579).
- Testes: `tests/banda.test.ts`, o bloco do iglu em `tests/colisores-do-pico.test.ts`, o Floco em
  `tests/pico.test.ts`; navegador: `playground/verificar-pico-browser.ts`.

## O planador e o vento da parede de gelo (fase3-09, 29/10/2026)

Plano: `docs/plans/2026-10-29-arquipelago-planador.md`; regras e números em `docs/arquipelago-regras.md`.

- **Item e presente** (`sistemas/planador.ts`): `planador` em `ITENS` (equipamento, 🪁), dado pelo
  Floco na primeira conversa do festival (`comecarConversaComOFloco`, `pegarPlanador`); sem versão
  nova do salvamento. Tocar no item da mochila diz como usar (`COMO_USAR_O_PLANADOR`).
- **Modo `planar`** (`sistemas/modos/planar.ts`, em `MODOS` e `ModoDoCorpo`): entra pelo modo chão
  (`podeAbrirOPlanador`, `abrirOPlanador`, com `EntradaDoPasso.planador`), leva o corpo pelo
  controlador do chão e fecha pulando, pisando ou na água. `PLANADOR` guarda os números. O HUD diz
  "Fechar o planador"; no toque, o botão Pular vira Fechar. Na locomoção, usa o clipe Pendurado.
- **Corrente de ar** (`CorrenteDeAr` em `movimento.correntes`, `subidaDaCorrente`; na coluna dela,
  `naColunaDaCorrente`, o ar segura no lugar quem plana sem pedir direção): a do Pico vem da
  âncora `corrente-de-ar` (`mundo/corrente-de-ar.tsx`, `correnteDoPico`, montada pelo `PicoVivo`,
  com flocos de neve subindo). `CORRENTE_DO_PICO` (raio 1, altura 4,75) é a medida que leva do alto
  dela ao alto da parede (`topo-da-parede`).
- **Desenho**: `personagem/planador-aberto.tsx` (`PlanadorAberto`, o `planador.glb` com o clipe
  `planar` dentro do desenho do avatar, barra em `BARRA_NO_AVATAR`), só com o item na mochila e
  visível no modo planar; o corpo inclina `INCLINACAO_NO_PLANADOR` para a frente.
- Testes: `tests/planador.test.ts` e o bloco da fase3-09 em `tests/colisores-do-pico.test.ts`;
  navegador: `playground/verificar-pico-browser.ts`.

## O Vale dos Dinos e a Jade (fase4-01, 29/10/2026)

O Vale está em `ILHAS_COMPLETAS` e `ValeVivo` em `ILHAS_VIVAS`, com os 62 colisores do GLB
existente e o mesmo ciclo do Pico. `RAIO_VISITAVEL_DO_VALE` espera o chão até 16 m: o terreno
inclinado passa dos 14,4 m da ilha leve e sua saia chega a 15,614 m. Não cria chão fora da ilha.
Jade usa `MoradorDaIlha`, na âncora `morador` do chão, olhando para `chegada` (`mundo/vale.ts`).
A varanda não tem acesso nesta fase e a torre é fechada. Medidas do `jade.glb` em
`sistemas/jade.ts`: raio 0,41, altura 1,5, cabeça 1,15, alcance 2,2. Só o corpo colide.
As duas falas usam `PainelDeApresentacao`, sem amizade, pedidos, presentes ou mudança da V10.
Escavar, ninhos, filhote e museu interativos continuam nas fases4-02 e 4-03.
Testes: `tests/vale.test.ts`, `tests/colisores-do-vale.test.ts` e o Vale já incluído em
`tests/faces-coplanares.test.ts`. Navegador: `playground/verificar-vale-browser.ts`, `?posicao=6`;
prints em `docs/qa/2026-10-29-vale`. Nenhum GLB ou gerador foi alterado.

## Rodar

- `bun run dev`: playground em `http://127.0.0.1:4520` (parâmetros na URL: `posicao`, `publico`,
  `limite`, `liberado`, `novo`, `persistir`, `em=x,z[,y]`, `adiantar`, `cartas`). Serve `/avatar3d` e `/room3d`
  do `public/` do community-kids.
- `bun run build`: `dist/cliente/` com chunks com hash e `manifesto.json` validado pelo contrato.
- `bun test`, `bun run typecheck`, `bun run test:tempo-browser` (Chrome instalado).
- `tests/tempo-api.integration.test.ts` requer `ARQUIPELAGO_TEMPO_TEST_DATABASE_URL` apontando
  para banco Postgres local descartável cujo nome começa com `arquipelago_test`; aplicar as
  migrações do serviço antes do teste. Sem essa variável o teste é pulado.

## Conferência do escorregador, física viva etapa 3

O modo existente foi preservado. `tests/modos.test.ts` compara a descida, a posição final e o embalo em 30, 60 e 144 quadros por segundo, sempre com passos físicos de 1/60 s. A sala `/movimento?estacao=Escorregador` permite conferir a entrada e a saída no controlador real.

## Pontes vivas, etapa 4

As três pontes do Bosque cedem até 0,10 m e balançam até 0,025 m. A mola usa rigidez 32 e amortecimento 9, com velocidade vertical limitada a 0,3 m/s. As pontas têm deslocamento zero. As caixas contínuas do piso e dos corrimãos são plataformas cinemáticas marcadas por `plataformaDoMundo`, aceitas pelo controlador sem fazer o bicho adotado bloquear o caminho. Desenho e colisão usam a mesma deformação. Arquivos: `sistemas/pontes-vivas.ts` e `mundo/pontes-vivas.tsx`.

A ponte usa uma mola limitada com duas pontas fixas, em vez de adaptar a corda dos cipós, que tem uma ponta presa e outra livre. Isso mantém o percurso previsível. O GLB atual já fornece âncoras e caixas suficientes. Nada precisa ser regerado nesta etapa. O medidor, dentro de `Physics`, passa a informar `fisica.corposAtivos`, `fisica.passoMs` e `pontes`.


### Física viva: mecanismos (28/10/2026)

`mundo/mecanismos.tsx` usa duas dobradiças Rapier, com limites e mola. A porta abre pelo empurrão normal do controlador. A placa lê o caixote apoiado, não a proximidade do personagem. O chão sob o alçapão fica inteiro. Colisores simples e fora do grupo da câmera. A porta tem folga acima da placa para não prender a dobradiça.

A estação Mecanismos em `/movimento` usa o arranjo da sala (`ARRANJO_DA_SALA`: tudo logo atrás da porta). No Bosque (`bosque.glb` regerado em 28/10/2026), a porta fica na parede da casa na árvore virada para a escada (âncoras `mecanismos-casa`, a dobradiça, e `mecanismos-rumo`, para dentro). A parede virada para o tronco não serve: entre ela e o tronco não passa ninguém. A placa, o caixote e o alçapão ficam no anel do deque do outro lado do tronco (âncoras `mecanismos-placa`, `-caixote` e `-alcapao`, lidas por `BosqueVivo` como `arranjo`), perto da guarda. O lado do tronco fica livre para o percurso, e o alçapão fica onde a guarda não o segura ao abrir. As medidas estão em `CASA_NA_ARVORE` e `MECANISMOS_NO_DEQUE` (`arte/ilhas/bosque.py`):
- a casa tem 1,7 × 1,8 m e 2,2 m de altura;
- a verga fica a 2,1 m: a cápsula do corpo vai a 1,8 m dos pés, mais a folga do controlador;
- o vão é 10 cm mais largo que a folha;
- a folha fica fora da espessura da parede, porque a folha colide com a casa e, encostada, abria sozinha.

O caixote que cai abaixo do chão (meio metro) volta ao começo: na troca da ilha o chão pode chegar depois dele. Testes contra o GLB: `tests/casa-na-arvore.test.ts` (a passagem pela porta, a cabeça sob a verga, o caminho do caixote, onde empurrar, o anel livre e o giro inteiro do alçapão). No navegador: `bun playground/verificar-mecanismos-browser.ts` (a criança atravessa a porta, empurra o caixote até a placa e o alçapão abre, 1,24 rad).


### Física viva: vento (28/10/2026)

O campo puro `sistemas/vento.ts` e sua versão GLSL usam a mesma conta. A hora vem do relógio do jogo; rajadas variam no espaço. `vegetacao-ao-vento.ts` encadeia os shaders existentes de pintura e pontes, incluindo cópias transparentes. Só deforma materiais de plantas e galhos altos, com raiz parada. Movimento reduzido usa 20% da amplitude visual, sem mudar a física.

Cipós livres recebem vento no passo fixo. O tronco do lago recebe força proporcional à parte exposta. Duas peças soltas tocáveis (folha e pena) têm arrasto e dormem ao cair. Folhas presas nas árvores e capim não têm corpos. Tudo monta apenas com o Bosque ativo, sem novos GLBs.


### Física viva: materiais e fogo (28/10/2026)

`sistemas/estados-dos-materiais.ts` guarda umidade, calor e combustível. A grade usa acumulador criado antes da simulação e lê todos os estados antes de propagar. Só passa calor entre peças do mesmo recinto. `MATERIAIS` concentra ignição, duração, calor e secagem. Pedra não acende; água zera o calor e apaga imediatamente.

A fogueira de `mundo/fogueira-viva.tsx` tem quatro peças dentro das pedras e um balde acessível. Só ilumina. Não causa dano nem consome inventário. Casas e plantas não são cadastradas no fogo. Posição no Bosque: `FOGUEIRA_DO_BOSQUE`, com teste de passagem contra o GLB. Estados transitórios reiniciam ao remontar a ilha. Modelos de arte não foram modificados nesta etapa.


### Física viva: mundo que reage (28/10/2026)

`objetos-reativos.tsx` monta quatro peças soltas no Bosque ativo. O controlador empurra os corpos dinâmicos, sem reposicionar o desenho para fingir empurrão. Colisores simples, peças paradas dormem e quedas para fora da ilha têm retorno. O galho baixo fora das copas quebra ao pisar; duas partes já montadas substituem o corpo inteiro, sem gerar geometria no passo. As posições ficam em `bosque.ts` e são conferidas contra o GLB.

`mundo-reativo.ts` guarda um conjunto fixo de 16 ondas. `ondinhas.tsx` lê a entrada e o deslocamento da criança e do tronco, desenha em uma malha instanciada e recorta no limite do lago. Não há simulação de fluido nem partículas criadas por quadro. Movimento reduzido baixa a opacidade. Estados transitórios pertencem à ilha ativa. Estações Peças soltas e Galho seco em `/movimento` usam as mesmas peças.

⚠️ Até 28/10/2026 os colisores da ilha completa e das pontes vivas iam com `collisionGroups={cond ? GRUPO : undefined}`. O `@react-three/rapier` aplica `undefined` como o grupo 0, então nenhum corpo dinâmico tocava a ilha: o caixote, as peças soltas, o galho, a folha e a pena atravessavam o chão e voltavam ao lugar. Só o personagem, cujo controlador não olha grupos, pisava. Use `gruposDoColisor` (`mundo/grupos.ts`); `tests/grupos-de-colisao.test.ts` recusa o padrão. O plano da física viva registra medições, notas do cartão e a conferência que falta em celular físico.

### Nico e Lumis da praia (28/10/2026)

`mundo/habitantes-da-praia.tsx` liga os GLBs existentes de Nico, Estrelinha e Búzio à ilha
central. Usa `useCopiaAnimada`, `trocarClipe` e uma `ComReserva` por modelo. As posições,
escalas e o aceno ficam em `sistemas/habitantes-da-praia.ts`. Nico acena ao entrar no alcance
de quatro metros, com intervalo mínimo de oito segundos, e vira para a criança a até seis
metros (`olharDoNico`, girando como a Capi). Os Lumis, com uns 37 cm (escala 0,5), descansam com
fases diferentes. A pausa do jogo congela as ações; movimento reduzido usa a velocidade do helper.

`habitantes-da-praia-colisao.ts` cria um cilindro arredondado por corpo, em metros e fora da
escala do desenho, com prefixo `col-morador-` para deixar a câmera passar. Os Lumis não têm
colisor aumentado para bloquear degraus. O colisor só monta quando seu modelo carrega.
Os testes carregam os GLBs reais e verificam clipes, dimensões, praia seca e regras do aceno.

Esta entrega é visual. Captura, rotinas, coleta de conchas e cartas não foram implementadas.
Não havia outro componente de Lumi no mundo para reaproveitar. Decisão e conferência em
`docs/plans/2026-10-28-arquipelago-praia-nico-e-lumis.md`. Nenhuma arte foi regenerada.

## Luneta do píer (geral-04, 28/10/2026)

- Regras puras: `sistemas/luneta.ts` escolhe a próxima ilha fechada do contrato e escreve a fala
  do Zappy e o recado da Íris. Depois das Nuvens, mostra o Farol. Os nomes de apresentação dos
  postos kids ficam locais, sem importar a plataforma. A abertura continua vindo de `ILHAS`.
- `mundo/luneta.tsx`, montada por `IlhaCentral`, usa o GLB pronto e gira o nó `tubo` em dois
  eixos. Colisor simples `col-cil-estaca-luneta`, só para o corpo. Interação E / Usar abre
  `painelAberto: 'luneta'`, aproveitando a pausa existente. Nada entra no salvamento.
- `personagem/camera.tsx` continua a única dona da câmera. O perfil `luneta` tem 45 graus de
  campo de visão e enquadramento adaptado ao aspecto da tela (`mundo/luneta-medidas.ts`).
  Guarda e restaura a pose anterior, suspende giro/zoom manual durante a observação e não
  altera o rastro. Movimento reduzido elimina a animação do zoom e dos sinais de vida.
- `interface/luneta.tsx` substitui o HUD durante a observação, com fala persistente, botão
  Voltar focado e Esc do HUD. Vulto e brilho só montam nessa vista. Não chamar o carregador
  de ilhas completas a partir da câmera da luneta.
- `mundo/placa-da-ponte.tsx` recebe a última tábua visível de cada ponte fechada. Usa a face
  `texto` do GLB, UV projetado e CanvasTexture próprios. Desmontar libera apenas os recursos
  criados, preservando a arte compartilhada. O interativo lê o mesmo recado da face.
- Números e comportamento em `docs/arquipelago-regras.md`, seção Luneta. Testes:
  `tests/luneta.test.ts` e `playground/verificar-luneta-browser.ts` (modelo dos mecanismos).
  Este último aceita `ARQUIPELAGO_CHROMIUM`; tenta o Chromium Linux fornecido se existir,
  senão usa Chrome. No Windows, também pode compilar com `bun build` para Node e executar
  com `node`, como registrado no plano. A conferência usa somente a plataforma falsa.

## Minijogos aprovados (desafios-16, 29/10/2026)

Fliperama chega ao ler o primeiro minijogo aprovado, pela regra ganharProjetos. Loja transitória estado/minijogos.ts relê ao voltar de ferramenta. Lista no painel do objeto; player pertence à plataforma. Capa na face tela, recursos próprios descartados.

Plano e testes: docs/plans/2026-10-29-arquipelago-minijogos.md.

## Festas da estação na Vila (fase2-10, 29/10/2026)

`sistemas/festas.ts` concentra o calendário puro pelo dia de São Paulo. Carnaval vai do sábado à
terça (Páscoa menos 47 dias, aprovado em 29/10/2026); Junina ocupa junho. Fim de ano tem proposta desativada de 20/12 a 06/01;
Lanternas não tem data. As duas decisões pertencem à dona. Não ativar por inferência.
`estado/festas.ts` relê a data a cada 30 segundos e ao voltar à aba. O override de QA
fica em WeakMap da plataforma falsa, registrado só pelo playground, nunca pela URL de produção.

`mundo/festa-na-vila.tsx` monta apenas durante a festa. Os GLBs de festas são catálogos:
`catalogo-da-festa.ts` copia nós individuais e emenda varais pelos vazios, preservando os
alvos dos clipes. Carregamento privado com aborto, materiais emissivos próprios e descarte
de mixers/geometrias/materiais ao sair. Não descartar recursos de um cache compartilhado.
`arranjo-da-festa.ts` guarda posições e colisores, conferidos contra o GLB real da Vila.
Luzes acompanham a noite; animações respeitam pausa e movimento reduzido.

A fogueira abre `ListaDeReceitas` via E ou Usar, só na Junina. A receita usa um milho e
gera `pipoca-de-festa`, com fome +15 e diversão +30 ao comer. Abrir e cozinhar revalidam
o calendário. Painel fecha ao sair/terminar. O aviso é local por perfil, festa e ano;
não acrescentar festa ao salvamento, não criar necessidade nova e não expirar a pipoca.

Testes: `tests/festas.test.ts` e `playground/verificar-festa-browser.ts`. O browser usa
plataforma falsa, verifica os fluxos em 1280 e 390 pixels e aceita `ARQUIPELAGO_CHROMIUM`.
Relatório, prints e decisões pendentes em `docs/qa/2026-10-29-primeira-festa-da-estacao.md`.

## Barco entre as ilhas (fase3-04)

- `sistemas/barco.ts` prepara a rota entre os portos e avança a travessia guiada em passo fixo.
  `modos/barco.ts` usa o mesmo corpo e o controlador livre com colisões; não libera nado nem
  pulo no mar. A resposta opcional `obstruido` mantém o apoio e permite devolver ao cais.
- `mundo/barcos.tsx` usa as âncoras dos GLBs, `useCopiaAnimada` e `trocarClipe`. O mixer do
  barco viajante é manual: `avancar` e leitura da âncora na prioridade menos 0,5, depois da
  física (menos 1) e antes do personagem (0). Não ler a âncora só depois do personagem:
  isso deixa o avatar um quadro atrás, principalmente em aparelhos lentos.
- `mundo/portos.ts` lê só os metadados dos GLBs. Não manter uma segunda cópia completa do
  Recife para ler âncoras. `RecifeVivo` informa colisores prontos e opacidade de 0,99; sair da
  ilha limpa o sinal. Espera a 27 m, retorno automático após 20 s sem carga.
- O barco aparece só com o Recife aberto. Substitui nó e colisor do barquinho decorativo.
  Boias abrem corredor visual de 5 m de meia largura; a correnteza não muda. Rota externa a
  120 m, velocidade 12 m/s reduzida a 2 m/s nos cais. Regras completas em
  `docs/arquipelago-regras.md`, seção fase3-04.
- Não guardar posição no mar nem estado do barco. Pausa congela clipe e travessia. A câmera
  acompanha o corpo estável, sem giro automático ou balanço, inclusive com movimento reduzido.
- Playground `?barco=central|recife`, medidor `.barco`, testes `barco.test.ts` e
  `barco-colisao.test.ts`. `playground/verificar-barco-browser.ts` confere os dois sentidos,
  pausa, controles, espera por carga, ilha fechada e toque, com SwiftShader e
  `ARQUIPELAGO_CHROMIUM`. Prints em `docs/qa/2026-10-29-barco/`. Nenhum GLB gerado nesta tarefa.

## Mergulho do Recife (fase3-02, 29/10/2026)

- Regra pura em `sistemas/modos/mergulho.ts`, sobre o contrato dos modos. O sensor registrado em
  `movimento.mergulhos` delimita a água. O mesmo controlador livre do cipó resolve colisões;
  sem degrau automático, snap ou corpo novo. Passo fixo 1/60 s, corrente somada, pausa sem avanço.
- `sistemas/mergulho.ts` centraliza alcance, velocidades, corrente e posições dos modelos.
  Entrada pela âncora `mergulho`, Espaço/Q ou Subir/Descer, gamepad inferior/esquerdo.
  Não há fôlego nem punição. Sair pela superfície volta ao nado. Câmera baixa até 3 m, sem
  grua automática; menos movimento congela os mixers de balanço.
- `mundo/mergulho-do-recife.tsx` é filho do Recife. Carga privada dos GLBs existentes do navio,
  labirinto, baú e página, com descarte de carga parcial/tardia e uncache dos mixers. Não usar
  `buscarIlha` para cada peça. Colisores da arte, ativação só depois de todos estarem montados.
- O Recife retém o cenário a 55 m e o ativa a 51 m para cobrir a exploração submersa de raio
  48 m. Boias a 52,6 m. Posições locais: navio (18,0,-30), labirinto (-1,0,27). Não deslocar o
  piso global de -3,5 m. Os testes usam a cápsula real e os col-* dos arquivos reais.
- V11 acrescenta `recife: { bau, pagina, tesouro }`. Recompensa pura/idempotente em
  `achados-do-recife.ts`, +15 diversão no baú e no tesouro; página abre diário. Não criar moedas
  locais. Entrada grava um ponto seguro; `relogios.tsx` não salva posição temporária no mergulho.
- Testes: `mergulho.test.ts`, `mergulho-colisores.test.ts`, migração V11 no contrato e HTTP no
  serviço. `playground/verificar-mergulho-browser.ts` usa SwiftShader e controles reais do jogo
  com gamepad emulado, em computador e celular emulado. `ARQUIPELAGO_CHROMIUM` escolhe o Chrome.
  Evidências, comandos e limites em `docs/qa/2026-10-29-mergulho/README.md`.

### Visão nos corredores estreitos

Quando a colisão aproxima a câmera a menos de 1,4 m do centro do corpo no mergulho, só o desenho
do avatar fica oculto, para não mostrar seu interior. Ele reaparece a partir de 1,65 m. Essa
folga evita piscar na borda. A cápsula, a posição, as animações e os comandos não mudam.
A escolha da ilha completa é única nas áreas de carga sobrepostas; durante o mergulho, o Recife
mantém a prioridade até a saída, mesmo que a pessoa se aproxime da área de outra ilha.

## Pegadas, escavação e ninhos do Vale (fase4-02, 29/10/2026)

`DescobertasDoVale` só monta com `ValeVivo`. Regras puras em `sistemas/vale.ts`; progresso
na V12 (`vale`) e coleção em `diario.ts`. Escavar tem três ações, sem prazo; cuidar é observar
os ovos e se afastar, sem tocar nem mover a arte. A Jade reconhece os três ninhos.

`exploracao-do-vale.ts` usa as âncoras locais, normaliza os colisores preparados girados e
inclui o Quadro das Cores com as mesmas medidas de `lugar-do-quadro.ts`. Não usar diretamente
os colisores girados contra âncoras locais. A busca `acharCaminho` aceita conferência contínua
opcional dos segmentos; o Bosque mantém o padrão anterior. Uma malha instanciada desenha
as pegadas de três dedos. O osso vem do nó separado do GLB de props e não colide, por ser
miúdo no chão. Não gerar modelos ou transformar cenário unido em objetos independentes.

Pausa, visita e somente leitura bloqueiam as ações. Movimento reduzido não perde nenhuma
etapa, pois não há animação nova. União de conquistas em `conciliar-salvamento.ts`, sem
somar inventário. Testes leem os GLBs, caminham na grade e conferem o caminho com a ilha
girada e o cavalete. `playground/verificar-vale-browser.ts` confere computador e toque.
Regras e números em `docs/arquipelago-regras.md`, seção da fase4-02. Filhote e museu ficam fora.

## Nuvens e Iriê (fase4-06, 29/10/2026)

- `nuvens.glb` entra em `ILHAS_COMPLETAS`; `NuvensVivo` entra em `ILHAS_VIVAS`.
  A altura compartilhada `ALTURA_DAS_NUVENS = 7` também determina o final da ponte.
  `RAIO_VISITAVEL_DAS_NUVENS = 19.2` cobre vértices até 18,7404 m e o raio do corpo.
- `sistemas/irie.ts`, `mundo/nuvens.ts` e `mundo/irie.tsx`: apresentação no morador genérico,
  âncora morador voltada a chegada, meio com y 7. Raio 0,39, altura 1,49, olhos 1,19.
  Sem amizade, recompensas ou campos novos no salvamento.
- `sistemas/plataformas-das-nuvens.ts`: ciclo puro de 20 s, elevação 2,4 m, viagens de 6 s
  com suavização cúbica e paradas de 4 s. Vizinhas alternam a fase. Pausa não avança.
- `mundo/plataformas-das-nuvens.tsx` prepara os quatro pares desenho/âncora/tampo antes da troca.
  Os quatro tampos saem da lista fixa e viram corpos cinemáticos `plataformaDoMundo`.
  O controlador existente leva quem está em cima. Não mover personagem por teleporte.
  O desenho lê a posição interpolada depois da física, antes da câmera e do medidor.
  As malhas continuam pertencendo à ilha para o descarte compartilhado, sem clones de recursos.
- O medidor expõe `plataformasDasNuvens`; sua leitura de corpo sob demanda só existe quando
  `arquipelago:medir` está ligado. Nenhuma leitura pesada foi acrescentada ao laço normal.
- Testes: `nuvens.test.ts`, `plataformas-das-nuvens.test.ts`, `colisores-das-nuvens.test.ts`.
  `playground/verificar-nuvens-browser.ts` aceita ARQUIPELAGO_CHROMIUM e ARQUIPELAGO_PRINTS.
  Relatório e limites em `docs/qa/2026-10-29-nuvens/README.md`. Nenhum Blender nesta fase.

## Corais, aquário e mapa do Recife (fase3-03, 29/10/2026)

- Regras puras: `sistemas/corais-do-recife.ts` (`PONTOS_DOS_CORAIS`, os quatro tipos com o nó
  vivo, o desbotado e a âncora `coral-muda-N` do `recife.glb`; `CORAIS`, `replantarCoral`, `coraisReplantados`, as falas, `PEIXES_DO_AQUARIO`,
  `peixesVisiveis` e `aquarioNoPainel`) e `sistemas/mapa.ts` (`ilhasNoMapa`, `abertasNoMapa`,
  `PAINEL_DO_MAPA`). Salvamento V13 (`recife.corais`, bits).
- No mundo: `mundo/corais-do-recife.tsx` (carga privada do `recife-props.glb`, como o mergulho;
  os lugares saem das âncoras `coral-muda-N` (`lugaresDasMudas`); cada coral é uma cópia do nó
  desbotado ou do vivo, a muda crescendo em `useFrame` com a pausa e o menos movimento) e `mundo/mesa-de-mapas.tsx` (o interativo na âncora `mapa`), os dois montados
  pelo `RecifeVivo` e valendo só com a ilha a 0,99 de opacidade. O aquário: `PeixesDoAquario` em
  `mundo/objetos-da-casa.tsx` (os peixes pelo salvamento, os quatro na visita, e o `nadar`).
- Interface: `interface/aquario.tsx` (no `PainelDoObjeto`) e `interface/mapa.tsx` (`PainelDoMapa`,
  no HUD). O que abre uma ilha fechada vem da voz (`ilhaFechadaNoMapa`), porque fala da jornada.
- O aquário chega em `ganharProjetos` com o primeiro coral. Regras e textos:
  `docs/arquipelago-regras.md`, seção da fase3-03. Testes: `tests/corais-do-recife.test.ts`;
  navegador: `playground/verificar-recife-browser.ts`. Os pedidos de arte (as âncoras e os corais
  desbotados de verdade) foram feitos na conferência; o plano é
  `docs/plans/2026-10-29-arquipelago-recife-corais-aquario-mapa.md`.

## Aparências autorais no mundo (29/10/2026)

`mundo/carregar-aparencia.ts` lê `plataforma.lerAparencia?`, valida bytes pelo contrato e mantém
recursos privados de cada objeto. Molda encaixa na caixa sem inverter +z; Pinta recorta
`planificacaoDoMolde` nas faces preparadas. Nunca transformar malha autoral em colisor.
A reserva permanece durante leitura, falha, excesso ou página antiga. Mudança de id, retorno da
oficina (inclusive mesmo id), visita e desmontagem cancelam e liberam recursos, inclusive tardios.
Não usar `useGLTF` para estas criações nem descartar geometrias/texturas do catálogo na pintura.
Visitas não leem criação alheia. As faces do Pinta (29/10/2026) estão na geladeira, no forno, no aquário, no museu,
na casinha e no vaso da planta (a lareira e a banda, de propósito, não), conferidas contra o
catálogo por `tests/faces-dos-objetos.test.ts`. A galeria de mentira guarda as compras à parte do
salvamento (`CHAVE_DA_GALERIA`, que o `?novo=1` apaga), como o serviço. A capa do fliperama prevalece na tela; a animação do aquário do
catálogo continua quando esse modelo aparece. Testes: `aparencias.test.ts`; verificador:
`playground/verificar-aparencias-browser.ts`. Plano e pedidos de faces de arte:
`docs/plans/2026-10-29-arquipelago-molda-no-mundo.md`. Regras e tetos em §6.16.

## O filhote do Vale e o museu (fase4-03, 29/10/2026)

Plano: `docs/plans/2026-10-29-arquipelago-filhote-e-museu.md`; regras e textos em
`docs/arquipelago-regras.md` (seção da fase4-03).

- **Salvamento V15** (`vale.filhote`): regras puras em `sistemas/filhote-do-vale.ts` (aquecer,
  nome, comida, carinho, o dia cuidado, o tamanho, o passeio e `juntarFilhotes`, usado pela
  `conciliar-salvamento.ts`). A Jade entrega o ovo na conversa (`sistemas/jade.ts`), uma vez, com os
  três ninhos cuidados.
- **No mundo**: `mundo/filhote-do-vale.tsx` (`FilhoteDoVale`, montado pelo `ValeVivo` na sua própria
  `ComReserva`): o chão quente na âncora `pe-do-vulcao` (o `ovo-dino` do GLB de props com 0,47 m e
  um círculo amarelo, para não sumir na lava) e, depois que choca, o filhote (`triceratops-filhote.glb`, `andar`, `parado`,
  `pular`) passeando por `PASSEIO_DO_FILHOTE` (pontos no referencial do GLB, conferidos no teste,
  também a reta entre eles). Nada colide. Pausa, visita, somente leitura e a troca da ilha (0,99)
  bloqueiam as ações.
- **Painel**: `interface/filhote.tsx` (`PAINEL_DO_FILHOTE`, loja `estado/filhote.ts` com a fala e o
  pulinho), primeiro o nome, depois "Dar comida" e "Fazer carinho" com o que já foi feito hoje.
- **Museu**: chega em `ganharProjetos` com `vale.escavacao === 3`; o painel do objeto mostra a
  coleção do Vale (`interface/museu.tsx`, `colecaoDoVale`, que ganhou o filhote; os ícones são
  `ICONE_DO_VALE` de `interface/diario.tsx`).
- Testes: `tests/filhote-do-vale.test.ts`; navegador: `playground/verificar-filhote-browser.ts`
  (semeia o salvamento no `localStorage` do playground, um contexto limpo por começo).

## A montaria do Vale (fase4-04, 29/10/2026)

Plano: `docs/plans/2026-10-29-arquipelago-montaria.md`; regras em `docs/arquipelago-regras.md`.

- Regras em `sistemas/montaria.ts`; modo `montar` em `sistemas/modos/montar.ts` (em `MODOS`), que
  entra pelo pedido `montar` e sai pelo E / Usar. ⚠️ `mudarModo` solta a sela em qualquer troca de
  modo (o dino fica onde estava): não limpar `c.montaria` à mão.
- `personagem.tsx`: montada, o controlador usa a cápsula de montada (`MONTARIA.raio`, pé no mesmo
  lugar, `GRUPO_DE_NINGUEM` de `mundo/grupos.ts`), o desenho sobe `MONTARIA.subidaDoDesenho` no
  clipe Sentar e `velPedida` fica a do dino. `aceitaColisorDoMundo` ignora os colisores do próprio
  corpo.
- `mundo/montaria-do-vale.tsx` (no `ValeVivo`, com a sua `ComReserva`): `movimento.montaria`, o
  interativo, o desenho e o colisor do dino parado (`col-montaria`, só para o corpo, volta quando a
  criança sai de cima, `longeParaVoltar`).
- Testes: `tests/montaria.test.ts` (regras, modo e o lugar no GLB); navegador:
  `playground/verificar-montaria-browser.ts`.

## Balão das Nuvens (fase4-09, 29/10/2026)

- Regras puras em `sistemas/balao.ts` (`BALAO`, `Voo`, `passoDoBalao`); modo `balao` em
  `sistemas/modos/balao.ts`, guiado (`direto`) como o barco: o voo começa de onde a física deixou o
  corpo, e o corpo parado mais alto que o pedido é pouso. Pousado, o cesto pressiona o apoio
  (`BALAO.pressao`) para soltar sozinho se o apoio sair (plataforma descendo).
- `mundo/balao-das-nuvens.tsx` (montado pelo `NuvensVivo`): `nuvens-balao.glb` em carga privada
  (sai com a ilha), `AnimationMixer` próprio do `flutuar`, `Voo` em `movimento.balao`, interativo
  "Subir no balão", caixa do cesto parado com `userData.balao` (o personagem ignora no modo
  `balao`) e `voo.visual` (o nó animado) para desenhar a criança no cesto, na prioridade −0,5.
- "Descer do balão" não é interativo do mundo: o personagem põe `DESCER_DO_BALAO` no alvo quando o
  cesto está pousado, e o "usar" é gasto pelo modo. Saída perto do lugar: `voo.saida` vira
  `pedidos.teleporte` no desenho.
- Perfil de câmera `balao`; o toque troca "Pular" por "Subir"; a posição não é gravada no voo; o
  Construir some no balão. O medidor expõe `balao`.
- Testes: `balao.test.ts` (regras e modo), `balao-das-nuvens.test.ts` (lugar livre, alcance a pé e
  saída contra os colisores). Verificador: `playground/verificar-balao-browser.ts`. Pedidos de arte
  no plano `docs/plans/2026-10-29-arquipelago-balao.md` (feitos: a âncora `balao` foi para perto do
  poste, em (5,6; 6,0), e o cesto ganhou a âncora `passageiro`, que o código ainda não lê).


## Final no alto do Farol (fase4-11, 29/10/2026)

- `sistemas/final-do-farol.ts`: acesso na Lenda, pausas, quatro trechos da página, seis fachos e apresentação da Íris. `estado/farol.ts` isola o progresso por montagem com WeakMap, sem campo no salvamento. Não inferir conclusão apenas de jornada 8.
- `mundo/final-do-farol.tsx`, montado pelo Farol: carregamento privado com AbortController, descarte ao sair, sala a y 40, âncoras lidas no referencial local mesmo depois de montar a cena. `mundo/alto-do-farol.ts` concentra medidas, colisores simples temporários e alvos do anel. Substituir esses colisores pelos nós definitivos quando a sessão de arte os entregar. Não usar o carregador de ilhas completas para o interior.
- A câmera existente continua a única dona da vista. O perfil `farol` usa 65 graus, com panorama adaptado ao aspecto. Ao sair, restaura a pose anterior. Na sequência, sala, avatar e Zappy 3D ficam ocultos; a fala do Zappy permanece no painel. O céu retira a névoa apenas nessa vista. Não carregar ilhas completas por causa da câmera. O facho de exploração fica oculto durante os seis fachos do final e respeita pausa e menos movimento fora dele.
- `interface/farol.tsx` usa o estilo dos painéis de moradores. Não dar foco automático ao botão da sala: isso captura WASD. A leitura recebe foco. Esc e Descer usam a mesma saída. Os relógios não guardam a posição do interior nem iniciam cochilo nele, mas o limite de tempo da plataforma continua valendo.
- `paginasDoDiario(s, leuOFinal)` recebe a informação da sessão, sem mudar `Salvamento`. A Íris só monta após a sequência e usa `MoradorDaIlha`, sem amizade. A porta fechada passa por `VozDoJogo`, inclusive para adultos.
- Testes em `tests/final-do-farol.test.ts`; conferência em `playground/verificar-final-farol-browser.ts`, com SwiftShader, computador e celular emulado. Plano com pedidos de arte e campo futuro em `docs/plans/2026-10-29-arquipelago-final-do-farol.md`. Prints em `docs/qa/2026-10-29-final-farol/`.

O minijogo do Vale (fase4-05) está em `docs/desafios-do-jogo/vale`, com provas no executor e roundtrip Blockly. É só o pacote de desafios; esta entrega não importa nem publica no Admin e não altera o Vale vivo.

## Saltos, corrida de balão e constelações das Nuvens (fase4-07, 29/10/2026)

- **Percursos da sessão.** `PERCURSOS_DA_SESSAO` (`nuvens-saltos`, `nuvens-balao`) ficam fora de
  `PERCURSOS` do contrato (o pior caso do salvamento não tem folga). `IdDoPercurso` é a união;
  `percursoGravado` decide: `terminarCorrida` (em `mundo/corrida-na-ilha.tsx`, usada também pela
  corrida de balão) grava em `salvamento.percursos` ou em `recordesDaSessao` da loja. A tela de
  resultado não mostra os recordes da família para os da sessão. `pedidoDoPercurso` agora diz o
  percurso (as Nuvens têm dois) e cada `CorridaNaIlha` só avança a corrida dela
  (`loja.corrida.percurso`). Coletável feminino: `todasAsColetaveis` e `coletaveisPegas`.
- **Saltos:** `mundo/saltos-das-nuvens.ts` lê os tampos dos colisores (`col-cil-degrau-nuvem-3`,
  `col-cil-plataforma-N`). ⚠️ Os colisores da ilha preparada vêm girados com ela:
  `tamposDosSaltos(colisores, giro)` desfaz o giro antes do `percursoNoMundo`. A volta de queda
  numa plataforma lê `PlataformaDasNuvens.elevacao`, escrita a cada passo da física.
- **Corrida de balão:** regra pura em `sistemas/corrida-de-balao.ts` (`ARGOLAS`,
  `LUGARES_DAS_ARGOLAS`, `passouPelaArgola`, `passoDaCorridaDeBalao`); desenho em
  `mundo/corrida-de-balao.tsx` (toros no código, com as cores dos `fio1` a `fio6`). O tempo-alvo
  vem do piloto do teste, que voa pelas regras de `sistemas/balao.ts`.
- **Constelações:** regra pura em `sistemas/constelacoes.ts`; mirante em
  `mundo/constelacoes-das-nuvens.tsx` (carga privada do `nuvens-constelacoes.glb`, colisores por
  `ColisoresSoltos`, lugar na constante `MIRANTE_DAS_NUVENS` até a âncora pedida). A vista escreve
  `movimento.mira` (`mundo/vista-da-luneta.ts`), que a câmera usa no perfil `luneta`; o visor é
  `interface/estrelas.tsx` (classes `arq-mirante-*`; ⚠️ `arq-estrelas` é a lista da tela de
  resultado). O painel aberto conta como pausa no `jogoPausado`: o acender das estrelas desconta
  só o próprio painel. As estrelas não usam a neblina da cena (`fog = false`). A mira aponta para
  o centro das estrelas da figura (`meioDasEstrelas`): o pivô do nó fica fora do desenho.
- Testes: `saltos-das-nuvens.test.ts`, `corrida-de-balao.test.ts`, `constelacoes.test.ts`.
  Verificador: `playground/verificar-nuvens-aventura-browser.ts` (`ARQUIPELAGO_PARTE=noite` roda
  só as constelações; cada parte abre um contexto novo do navegador). O medidor expõe `corrida`,
  `mira` e `constelacoes`, e `__arquipelagoLerCorpo` devolve o olho da vista.

## Clima da sua ilha (fase4-08, 29/10/2026)

- Regra pura em `sistemas/clima.ts` (`CLIMA`, `pedeAgua`, `regarComSede`, `chuvaNaHorta`). O
  bônus mexe só no `regadoEm` (vai para trás): nenhum campo novo. `climaLiberado` = Nuvens abertas.
- A escolha mora na loja (`clima`, `escolherClima`, sessão) e no menu (`interface/clima.tsx`). O
  relógio do HUD mostra o símbolo. A Iriê tem a terceira fala (o verificador da fase4-06 avança por
  ela).
- `mundo/clima-da-ilha.tsx` (montado na cena): escreve `ambiente.luzDoClima` e
  `ambiente.cinzaDoClima` (opcionais; o `Ceu` multiplica o sol e o preenchimento e puxa o céu para
  `CEU_FECHADO`), desenha as gotas (`LineSegments` que seguem a criança, nome `chuva-da-ilha`) e a
  cada 1 s de jogo chama `chuvaNaHorta`. A horta (`mundo/horta.tsx`) usa `climaDaHorta` para o
  "Regar" da janela, a gota azul (`gota-da-sede`) e o bônus.
- O medidor expõe `clima` e `horta` (semente, regado, progresso). Testes: `clima.test.ts`.
  Verificador: `playground/verificar-clima-browser.ts` (espera o relógio de verdade: a alface pede
  aos 54 s). Pedido de arte (cata-vento perto da horta) no plano
  `docs/plans/2026-10-29-arquipelago-clima-da-ilha.md`.

## Minijogo "Jardim que floresce" (fase4-10, 29/10/2026)

- Fora do pacote do jogo: `docs/desafios-do-jogo/nuvens/` (fontes, manifesto, README, conferência
  visual), com as provas em `arquipelago-contracts/tests/manifesto-das-nuvens.test.ts`,
  `studio/src/blockly/__tests__/nuvensManifest.test.ts`, `arquipelago-api` (manifestos) e
  `studio-runtime/tests/nuvens-browser.test.ts` (executor real, com `SZ_CHECK_CHROMIUM`).
- "A cada N segundos" (`g2d:everySeconds`) tem de ser bloco raiz do projeto, ao lado do laço; o
  executor recusa `checkpoints: []` (ausente ou com pontos) e espera de mais de 10 s num passo.
