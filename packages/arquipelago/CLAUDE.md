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
  fila de salvamento, tempo livre). Sem React.
- `mundo/`: medidas da ilha, céu, água, ilha central, casa com o quarto real, horta, bancada,
  farol, anel de ilhas com pontes.
- `personagem/`: corpo cinemático com controlador do Rapier (andar, correr, pular, nadar),
  avatar, câmera e o Zappy.
- `controles/` e `interface/`: teclado, toque, HUD e telas.
- `assets/`: arquivos importados como arquivo (o Bun copia com hash para `dist/cliente/`). Resolva
  sempre com `new URL(caminho, import.meta.url)`: o caminho é relativo à pasta do cliente, não à
  página. O Zappy (`assets/zappy.glb`, animações `voar` e `parado`, material `luz` na bunda) sai
  de `arte/zappy/zappy.py` (Blender sem tela, o mesmo `bpy` das peças do quarto).
- `assets/mundo/`: o mundo feito no Blender (chão, árvores, casa, horta, bancada, farol, píer,
  pontes e ilhas do anel), um script por peça em `arte/mundo/` (`build_all.py`, nós e materiais
  no README de lá). `mundo/modelos.tsx` carrega; cada peça mostra a forma simples do código até o
  modelo chegar, e os colisores continuam no código.

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
  ponta a ponta, escada, escorregador, corredor da chegada livre).

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

## Salvamento e tempo

- `SalvamentoV1` (contrato) com versão; gravação por revisão (CAS). Revisão velha recebe 409
  `SALVAMENTO_DESATUALIZADO` e o jogo adota o que está guardado.
- Tempo livre do Kids: cada segundo ativo fica em IndexedDB por perfil; lotes de até 10 s são
  enviados com UUID e dia de São Paulo. O serviço trata repetições de forma idempotente; uma
  falha pausa o jogo até confirmar a fila. O limite padrão é 30 min e os pais podem alterá-lo.
  A comunidade adulta não tem limite diário nem usa esta fila. O dia do evento usa o relógio do
  aparelho, e os limites dessa confiança precisam ser considerados antes da abertura em produção.

## Rodar

- `bun run dev`: playground em `http://127.0.0.1:4520` (parâmetros na URL: `posicao`, `publico`,
  `limite`, `liberado`, `novo`, `persistir`, `em=x,z[,y]`, `adiantar`). Serve `/avatar3d` e `/room3d`
  do `public/` do community-kids.
- `bun run build`: `dist/cliente/` com chunks com hash e `manifesto.json` validado pelo contrato.
- `bun test`, `bun run typecheck`, `bun run test:tempo-browser` (Chrome instalado).
- `tests/tempo-api.integration.test.ts` requer `ARQUIPELAGO_TEMPO_TEST_DATABASE_URL` apontando
  para banco Postgres local descartável cujo nome começa com `arquipelago_test`; aplicar as
  migrações do serviço antes do teste. Sem essa variável o teste é pulado.
