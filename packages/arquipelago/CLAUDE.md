# CLAUDE.md — @sistemazero/arquipelago

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
  enfeites do Bosque" em `tests/colisores-da-ilha.test.ts`.

## Ilhas completas (o Bosque, 27/10/2026)

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
- Playground: `?cartas=todas`, `?cartas=desligadas` (403) ou `?cartas=fora-do-ar` (424);
  `src/plataforma/cartas-falsas.ts` usa a régua do contrato com um currículo de mentira.

## Modo construção (28/10/2026, fase1-10 a fase1-12)

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
  `tests/projeto-azul.test.ts`.
- `mundo/objetos-da-casa.tsx`: os objetos postos (holograma do Blender ou azul no código; com
  aparência, o modelo), o "Abrir" e `GanharProjetos` (montado pela `Casa`). Painel:
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
- Playground: `?obra=exemplo` (`src/plataforma/obra-de-exemplo.ts`). Conferir no navegador: a
  câmera de obra abre sempre igual, então dá para calcular onde cada ponto da grade cai na tela.

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
  `tests/faces-coplanares.test.ts` roda em todos os GLBs do mundo, no Quadro das Cores e nas peças
  no lugar do jogo em cima do chão. O Bosque tem uma lista `PENDENTES_DO_BOSQUE` (pares que já
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
- `mundo/capi.tsx` (montado pelo `BosqueVivo`, dentro de `ComReserva`): o `capi.glb` copiado com
  `SkeletonUtils.clone` (tem esqueleto), na âncora `morador`, de costas para a `cabana`. Vira para
  a criança (`olharDaCapi`), acena, fala, comemora (`alegria` na loja da conversa) e pisca pelo
  morfo `piscar` dos olhos. O colisor `col-morador-capi` só segura o corpo.
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

## Salvamento e tempo

- `SalvamentoV4` (contrato) com versão; a V1, a V2 e a V3 migram sozinhas (`migrarDaV1`: nenhum
  percurso corrido; `migrarDaV2`: a Capi sem amizade e nenhum bicho; `migrarDaV3`: a casa de antes
  e nenhum projeto azul). Gravar aceita a versão de
  uma aba aberta antes da atualização e guarda migrada, mas essa aba não lê a resposta V4: só a
  primeira gravação dela fica, as seguintes falham até recarregar.
  Gravação por revisão (CAS). Revisão velha recebe 409
  `SALVAMENTO_DESATUALIZADO` e o jogo adota o que está guardado.
- Tempo livre do Kids: cada segundo ativo fica em IndexedDB por perfil; lotes de até 10 s são
  enviados com UUID e dia de São Paulo. O serviço trata repetições de forma idempotente; uma
  falha pausa o jogo até confirmar a fila. O limite padrão é 30 min e os pais podem alterá-lo.
  A comunidade adulta não tem limite diário nem usa esta fila. O dia do evento usa o relógio do
  aparelho, e os limites dessa confiança precisam ser considerados antes da abertura em produção.

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

A estação Mecanismos em `/movimento` funciona com a arte atual. No Bosque, só montar quando existirem `mecanismos-casa` e `mecanismos-rumo`. O script `arte/ilhas/bosque.py` cria as âncoras e paredes com vão. Falta regerar o GLB e conferir a casa após a outra sessão terminar a arte. Não montar a porta sobre a casa fechada antiga.


### Física viva: vento (28/10/2026)

O campo puro `sistemas/vento.ts` e sua versão GLSL usam a mesma conta. A hora vem do relógio do jogo; rajadas variam no espaço. `vegetacao-ao-vento.ts` encadeia os shaders existentes de pintura e pontes, incluindo cópias transparentes. Só deforma materiais de plantas e galhos altos, com raiz parada. Movimento reduzido usa 20% da amplitude visual, sem mudar a física.

Cipós livres recebem vento no passo fixo. O tronco do lago recebe força proporcional à parte exposta. Duas peças soltas tocáveis (folha e pena) têm arrasto e dormem ao cair. Folhas presas nas árvores e capim não têm corpos. Tudo monta apenas com o Bosque ativo, sem novos GLBs.


### Física viva: materiais e fogo (28/10/2026)

`sistemas/estados-dos-materiais.ts` guarda umidade, calor e combustível. A grade usa acumulador criado antes da simulação e lê todos os estados antes de propagar. Só passa calor entre peças do mesmo recinto. `MATERIAIS` concentra ignição, duração, calor e secagem. Pedra não acende; água zera o calor e apaga imediatamente.

A fogueira de `mundo/fogueira-viva.tsx` tem quatro peças dentro das pedras e um balde acessível. Só ilumina. Não causa dano nem consome inventário. Casas e plantas não são cadastradas no fogo. Posição no Bosque: `FOGUEIRA_DO_BOSQUE`, com teste de passagem contra o GLB. Estados transitórios reiniciam ao remontar a ilha. Modelos de arte não foram modificados nesta etapa.


### Física viva: mundo que reage (28/10/2026)

`objetos-reativos.tsx` monta quatro peças soltas no Bosque ativo. O controlador empurra os corpos dinâmicos, sem reposicionar o desenho para fingir empurrão. Colisores simples, peças paradas dormem e quedas para fora da ilha têm retorno. O galho baixo fora das copas quebra ao pisar; duas partes já montadas substituem o corpo inteiro, sem gerar geometria no passo. As posições ficam em `bosque.ts` e são conferidas contra o GLB.

`mundo-reativo.ts` guarda um conjunto fixo de 16 ondas. `ondinhas.tsx` lê a entrada e o deslocamento da criança e do tronco, desenha em uma malha instanciada e recorta no limite do lago. Não há simulação de fluido nem partículas criadas por quadro. Movimento reduzido baixa a opacidade. Estados transitórios pertencem à ilha ativa. Estações Peças soltas e Galho seco em `/movimento` usam as mesmas peças.

A casa da etapa 5 segue pendente de regeneração do `bosque.glb` pela sessão da arte. Código pronto não equivale a mecanismo já visível no modelo antigo. O plano da física viva registra medições, notas do cartão e a conferência que falta em celular físico.
