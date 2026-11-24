# Molda Cenários: de piloto do Arquipélago a ferramenta de cenários 3D da plataforma

## Contexto

O piloto "Molda — Cenários 3D" (commits `molda-cenarios`, 16/11) provou a ideia, mas ficou assim:

- **Só roda numa máquina com o ambiente local montado.** O motor 3D nunca foi publicado, as artes não subiram ao R2 (403), as migrations não rodaram e só o Admin monta a tela.
- **É do Arquipélago, não genérico.** O motor mora dentro do pacote do jogo, recusa qualquer base diferente de `faisca-v2` e traz a Íris, as pontes, o oceano e coordenadas fixas da Faísca.
- **O terreno não é terreno de verdade.** É uma lista de carimbos somada ao relevo que o jogo calcula em código. Não há pintura de chão, nem mar, rio ou represa.
- **A interface é de ferramenta técnica.** Painéis densos, caminhos editados em caixa de texto, coordenadas fixas, sem a cara do Kids nem a simplicidade do Molda.
- **O acervo é um catálogo único e global** (3.218 modelos licenciados), sem bibliotecas por conta e sem importação.
- **Os projetos não têm dono** e não se organizam por jogo.
- **Não existe exportação para jogo nenhum.** Sai só um JSON sem os modelos; o jogo publicado não lê cenário.
- **O agente só trabalha com uma aba do editor aberta.**

O resultado pretendido: uma ferramenta de cenários 3D completa, no ar em staging e produção, com a identidade do Kids, simples o bastante para uma criança e com o que uma ferramenta profissional de level design oferece; genérica para qualquer jogo; com bibliotecas de modelos por conta; com exportação para o Arquipélago, o Estúdio (blocos), Python com Raylib e JavaScript com three.js; e comandável por agentes de IA com a mesma estrutura da edição manual.

Nesta primeira etapa o acesso é só da equipe. A arquitetura já nasce pronta para abrir a todos os membros do Kids e do adulto.

---

## 1. O produto

### Onde fica
- Um modo novo do Molda: **Molda › Cenários**, em `/molda/cenarios`, nos dois apps (`community-kids` e `community`).
- Liberação por um interruptor de ambiente: `desligado → equipe → lista → aberto`. Entra em staging e produção no modo **equipe** (admin, superadmin e staff).
- A tela do Admin (`/molda/cenarios`) passa a ser um atalho para a ferramenta na plataforma.

### Como se organiza (o jeito das ferramentas profissionais)
```
Espaço (a conta, ou o espaço da Equipe Sistema Zero)
├── Bibliotecas            modelos, chãos e conjuntos, com nome próprio
│     ex.: "Aventura", "Cidade", "Meus moldes", "Pacote do castelo"
└── Jogos                  um projeto por jogo
      ├── bibliotecas ligadas ao jogo
      └── Cenários         um por nível, fase ou ilha
            └── versões    histórico com retrato, voltar a qualquer uma
```
- **Jogo** = projeto (como o Project da Unity e do Godot). **Cenário** = nível (como a Scene). Um jogo tem vários cenários e escolhe quais bibliotecas usa.
- **Espaço da Equipe**: bibliotecas e jogos compartilhados entre os admins. O acervo licenciado e o jogo do Arquipélago vivem aqui. Nunca aparece para outra conta.
- **Espaço da conta**: cada conta tem as suas bibliotecas e os seus jogos. No Kids, as bibliotecas são da conta da família e os jogos são do perfil da criança.

### Bibliotecas e importação
- Criar biblioteca com nome, capa e descrição; pastas e etiquetas dentro dela.
- **Importar** arrastando para a tela ou escolhendo:
  - modelo solto: `.glb`, `.gltf` (com `.bin` e texturas), `.obj` + `.mtl`, `.fbx`;
  - pasta inteira;
  - `.zip` de pacote (Kenney, Quaternius, KayKit e semelhantes), com vários modelos e subpastas. As subpastas viram pastas da biblioteca.
- Tudo é convertido no navegador para GLB único e autocontido, medido (tamanho, triângulos), fotografado (miniatura) e enviado direto ao armazenamento da conta. Nome, pasta e etiquetas saem do arquivo e podem ser editados.
- **Trazer do Molda**: as criações do Molda da conta aparecem como a biblioteca "Meus moldes", sempre atualizada.
- **Chãos**: texturas de terreno entram por biblioteca (importadas ou vindas da Textura do Molda).
- **Conjuntos**: grupos de objetos salvos na biblioteca para reutilizar (uma casa com cerca e jardim, por exemplo). Mudar o conjunto atualiza todas as cópias.
- Cada biblioteca tem um campo de licença: **livre**, **uso próprio** ou **restrita**. Biblioteca restrita não pode ser compartilhada com outra conta, e a exportação avisa quando leva modelos dela.
- Cota de armazenamento por conta, com a barra de uso à vista.

### O acervo atual
- Os 3.218 modelos entram como bibliotecas do Espaço da Equipe, uma por coleção de origem, marcadas como **restritas**. O envio usa o mesmo caminho de importação de qualquer conta, o que dispensa a permissão do R2 privado que falhou.

---

## 2. A interface

Segue a direção de arte do Molda (palco como uma superfície só, ladrilhos grandes com nome, painéis flutuantes, "Mais opções" recolhido) e os tokens do Kids (`theme-kids.css`, `tool-chrome.css`, cores do perfil, modo claro e escuro).

### Telas
1. **Meus jogos**: cartões com retrato do último cenário, botão "Criar jogo", aba "Bibliotecas".
2. **O jogo**: os cenários em cartões (criar, duplicar, renomear, apagar), as bibliotecas ligadas e "Exportar".
3. **Bibliotecas**: grade de miniaturas, busca, pastas, etiquetas, área de soltar arquivos com o andamento da importação.
4. **A oficina de cenário** (o editor):

```
┌────────────────────────────────────────────────────────────────────┐
│ ☰ ‹ Voltar   Ilha do Farol ▾   ✓ Guardado      ↶ ↷     ▶ Testar   │
│        Terreno │ Água │ Objetos │ Caminhos │ Jogo │ Luz e céu      │
├──────┬─────────────────────────────────────────────────┬───────────┤
│ fer- │                                                 │ painel do │
│ ra-  │                    PALCO 3D                     │ que está  │
│ men- │                                                 │ escolhido │
│ tas  │   bússola · vistas · régua · camadas            │ (recolhe) │
├──────┴─────────────────────────────────────────────────┴───────────┤
│ gaveta da biblioteca: [Aventura] [Cidade] [Meus moldes]  🔍        │
│ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢ ▢   (arrastar para o palco ou tocar para pôr)   │
└────────────────────────────────────────────────────────────────────┘
```
- **Seis abas**, cada uma com poucas ferramentas grandes à esquerda. O painel da direita mostra só o essencial e guarda o resto em "Mais opções".
- **Gaveta da biblioteca** embaixo, como caixa de brinquedos: miniaturas grandes, busca, etiquetas, recentes e favoritos.
- **Testar** é o botão principal: entra no cenário com um personagem e volta à edição no mesmo lugar.
- **Três faixas de ferramentas** (básico, intermediário, profissional), no mesmo mecanismo de faixas do Molda. A equipe vê tudo; na abertura aos membros, as faixas seguem o posto da carreira.
- Funciona com mouse, teclado e toque. Layout conferido em 1440, 1366×768, 1024 e celular (no celular: ver, testar e ajustes simples).
- Árvore de objetos (com pastas, cadeado e olho), camadas e histórico de versões ficam num painel que abre por um botão, fora do caminho da criança.

### Ferramentas por aba

| Aba | Básico | Intermediário e profissional |
|---|---|---|
| **Terreno** | Elevar, Abaixar, Aplainar, Suavizar; Pintar chão (grama, terra, areia, pedra, neve); começar de um modelo pronto (plano, ilha, colinas, vale) | Rampa, Platô, Nivelar na altura, Ruído e erosão, carimbos de forma (morro, cratera), buraco (caverna), tamanho e resolução do terreno, importar e exportar mapa de alturas (PNG), até 8 camadas de chão com pintura automática por altura e inclinação |
| **Água** | Mar (nível do mundo), Lago ("Encher de água": toca numa baixada e ela enche até a altura escolhida) | Rio (curva com largura e correnteza, cava o leito), Represa (barragem e nível), Cachoeira, cor e transparência por profundidade, ondas, espuma na margem, área de nado |
| **Objetos** | Pôr, Mover, Girar, Tamanho, Copiar, Apagar; encaixe no chão; pincel de espalhar (árvores, pedras, flores) | Tamanho por eixo, grade modular (montar com peças de kit em grade, giros de 90°, andares), encaixe em grade, ângulo e superfície, alinhar e distribuir, repetir em fila ou círculo, espelhar, trocar modelo, sortear giro e tamanho, conjuntos, blocos de rascunho (caixa, rampa, escada, cilindro), cor e textura por objeto |
| **Caminhos** | Trilha e praça desenhadas com pontos no chão | Estrada que molda o terreno, cerca e muro ao longo da curva, ponte, inserir e remover pontos na cena, curvas suaves |
| **Jogo** | Ponto de início do personagem, marcadores com nome | Zonas (caixa, esfera, polígono), rotas de pontos, propriedades personalizadas em qualquer objeto, colisão por objeto (nenhuma, caixa, cápsula, malha), ver colisões, câmeras |
| **Luz e céu** | Hora do dia, céu (cor ou céu 360° do Molda), névoa | Sol (direção, cor, força), luz ambiente, luzes pontuais e focos, sombra |

Para todas as abas: desfazer e refazer que sobrevivem a recarregar a página, seleção múltipla e por laço, copiar e colar, Delete, vistas de cima, frente e lado, régua, boneco de referência de escala, marcadores de câmera, e o painel de orçamento (triângulos, desenhos, tamanho) com o alerta de cada destino de exportação.

**Fora do escopo, por decisão:** editor de shaders. Os materiais vêm dos modelos e das texturas. A ferramenta traz prontos e ajustáveis os materiais de água, terreno, céu e vento na vegetação, que é o que as ferramentas profissionais oferecem sem programar. Iluminação pré-calculada (lightmaps) e malha de navegação também ficam fora.

### Testar
- Personagem genérico com três modos: andar em terceira pessoa, primeira pessoa e voo livre. Gravidade, subida de degrau e colisão com terreno, objetos e água (nada onde é fundo).
- O personagem pode ser um modelo da biblioteca.
- O jogo pode trazer um **perfil de jogo**. O Arquipélago traz o seu (avatar, Íris, placas), que roda o teste com as regras do jogo.

---

## 3. Arquitetura

### Pacotes
| Pacote | Papel | Situação |
|---|---|---|
| `packages/molda-cenarios-core` | Documento, comandos, validação, pincéis de terreno, cena compilada. Zod puro, sem React, three ou IO | existe; ganha o documento v2 |
| `packages/molda-cenarios-motor` | Palco 3D genérico em three cru (mesmo estilo do palco do Molda), embutido no bundle com `lazy` | **novo** |
| `packages/molda-cenarios` | Interface (telas, abas, gaveta, painéis) | existe; interface refeita |
| `packages/molda-cenarios-agente` | CLI e MCP | existe; passa a falar com a API nova |
| `packages/members` (módulo `cenarios`) | Espaços, bibliotecas, modelos, jogos, cenários, revisões, cota | **novo módulo** |
| `packages/member-shell` (`routes/cenarios.ts`) | BFF dos dois apps | **novo** |
| `packages/arquipelago` | Perfil de jogo do Arquipélago e carregador da cena exportada | substitui `src/cenarios/*` |

**Por que motor novo:** o atual importa cerca de 20 módulos do jogo, recusa outra base, cria um corpo físico React por objeto (não aguenta os 20.000 objetos do limite) e só sabe escala uniforme. Nenhum pacote da plataforma pode importar o jogo, e é isso que obrigava o carregamento por URL externa. Com o motor dentro do bundle, some a dependência de `CENARIOS_RUNTIME_URL`.

**Reaproveitar no motor:**
- Do Molda (`packages/molda/src/viewport/`): `demandRenderLoop.ts`, `cameraFit.ts`, `viewportNavigation.ts`, `SceneSurfaceQuery.ts` (picking com MeshBVH), `SceneAxisHandles.ts`, `viewportThumbnail.ts`, `thumbEncoder.ts`, o padrão de fábricas injetáveis de `factory.ts`. Exigem subcaminhos novos nos `exports` do Molda.
- Do piloto (`packages/arquipelago/src/cenarios/`): `apoio.ts` (assentar e herdar apoio, sem as regex de nome de arquivo), `bacia.ts` (bacia do lago), `miniaturas.ts` (fila com cancelamento), `arte.ts` (carga com conferência de hash), a ideia de lote instanciado de `objetos.tsx` reescrita com faixas sujas.
- Teste jogável: cápsula com `three-mesh-bvh` (já usado no Molda). O Rapier continua só no perfil do Arquipélago.

### Dados (serviço `members`, schema `members`, migration `0151` em diante)
- `cenario_espacos` (tipo `conta` ou `equipe`, cota, uso), `cenario_bibliotecas` (nome, capa, licença), `cenario_modelos` (nome, pasta, etiquetas, hash, bytes, triângulos, dimensões, colisão, miniatura; busca no servidor sem acento e paginada), `cenario_blobs` (por hash, com contagem de referências), `cenario_jogos`, `cenario_jogo_bibliotecas`, `cenario_cenarios`, `cenario_revisoes`, `cenario_sessoes` e `cenario_pedidos` (palco aberto, para captura).
- **Dono**: o espaço é a conta (`resolveAccountId`); `criado_por` guarda o perfil. O espaço da equipe vale para `isPrivilegedActor`, nunca em sessão de suporte.
- **Binários** (GLB, miniatura, peças do terreno, pintura do chão): bucket UGC, chave `cenarios/<espaço>/blobs/<sha256>`, imutáveis, sem deduplicar entre contas. Envio direto do navegador por URL assinada com tamanho e tipo presos (`r2PresignPutUgc`), reserva em lotes de até 50, conferência no commit (existe, tamanho, GLB v2 autocontido). Leitura pelo padrão do `avatar-files.ts`: sessão, conferência de espaço, 302 assinado com janela estável.
- **Revisões**: cabeça do cenário + registro de lotes + fotografia periódica do documento, no lugar de um documento inteiro por revisão. O controle de concorrência e a idempotência são os de `servico-de-cenarios.ts` (portados). O desfazer passa a ler esse registro, então sobrevive a recarregar.
- **Cota** por espaço, separada do 1 GB das criações; o espaço da equipe tem teto próprio.
- **Exclusão de conta**: a cascata do Admin (`packages/admin/src/server/users.ts`) e a fila de limpeza ganham o prefixo `cenarios/` e as tabelas novas.
- **Acesso**: `CENARIOS_MODO` (`desligado | equipe | lista | aberto`) e `CENARIOS_LISTA`, no molde de `decidirAcesso` (`arquipelago-api/src/domain/acesso.ts`).
- **Gateway**: `packages/api-gateway/src/infrastructure/config/cenarios-routes.ts`, no molde das rotas `members-creations-*` (JWT, conta ativa, limite por principal). Caminho sem `admin` nem `internal`, para a política do Kids deixar passar.

### Documento v2 (`molda-cenario`, versão 2)
- **Base** em união: `plano`, `terreno` (alturas reais) ou `perfil` (o relevo de um jogo, só para abrir os cenários v1 até a conversão).
- **Terreno**: tamanho e resolução próprios; alturas em inteiros de 16 bits, divididas em peças binárias referenciadas por hash; até 8 camadas de chão com mapa de pintura; máscara de buracos. Os pincéis vivem no core, são determinísticos e servem igual à mão e ao agente. A peça nova sobe antes do comando que a referencia; o servidor confere hash e limites.
- **Objetos**: referência `biblioteca + modelo + hash`, escala por eixo, apoio, colisão (`nenhuma | caixa | cápsula | malha`), cor e textura, propriedades personalizadas.
- **Conjuntos**, **grade modular**, **pinturas de espalhar** (área, densidade, variação, semente), **curvas** (trilha, praça, estrada, cerca, muro, rio), **água** tipada (`mar | lago | rio | represa | cachoeira`), **marcadores, zonas, rotas e câmeras**, **luz, céu e névoa**, **camadas**.
- O que era do Arquipélago dentro do documento (`ator: 'iris'`, `sinal`, colisões `ponte` e `escada`, `marcos`) vira propriedade personalizada validada pelo perfil do jogo.
- **Migração v1 → v2** automática ao abrir. O relevo do Arquipélago é amostrado (`alturaComRelevo`) para alturas reais, de modo que o cenário da Faísca continua igual e passa a ser esculpível.

### Exportação
Uma etapa só, a **cena compilada**, alimenta todos os destinos. Ela resolve o que hoje só o motor sabe: altura final de cada objeto, malha do terreno, geometria de caminhos e lagos, colisões.

```
cenario.json        objetos com posição final, colisões, marcadores, zonas, rotas, luz, céu, água
modelos/*.glb       só os modelos usados, GLB simples (sem Draco, Meshopt ou KTX2)
terreno/            malha em pedaços de até 65 mil vértices + mapa de alturas PNG + pintura do chão
LEIA-ME e licenças
```

| Destino | O que sai |
|---|---|
| **three.js** (fora da plataforma) | zip com a cena compilada, `carregar-cenario.js` (módulo ES) e um `index.html` de exemplo andando pelo cenário |
| **Python com Raylib** (fora e no Estúdio) | zip com `models/`, o módulo de dados `cenario_<nome>.py` e o auxiliar `cenario.py` (carrega, desenha, altura do chão, colisões por caixa). O estático sai assado em lotes por região para não custar centenas de `draw_model`. No Estúdio entra por "Trazer do Molda"; `cenario.py` segue o caminho do `pinta.py` (`packages/studio/src/runtime/python/raylib/py/`, `src/python/officialModules.ts`, `src/export/raylibDesktop.ts`) |
| **Estúdio por blocos** | asset novo `scene3d` (JSON pequeno que referencia assets `model3d` comuns) e o bloco "Usar o cenário". Mundo 3D: o cenário vira o mundo, trocando a fonte de `heightAt` pelo mapa de alturas (`world-3d/runtime.ts`). Canvas 3D: `sz_t3d_load_scene`. Depois Jogo 3D e Jogo 3D Avançado. O exportador mostra o orçamento do Estúdio (48 malhas, 5 MB por modelo, 24 MB por projeto) antes de levar e oferece juntar peças |
| **Arquipélago** | "Publicar no Arquipélago": o jogo carrega a cena compilada da ilha pelo perfil dele e mantém a composição em código como reserva enquanto não houver cena publicada |
| **Arquivo 3D único** | um `.glb` da cena inteira, para Blender, Godot e Unity |

Bibliotecas restritas: quem não é da equipe não copia nem exporta esses modelos; para a equipe a exportação avisa quais modelos têm licença restrita.

### Agentes de IA
- A API executa lotes de comandos direto no servidor, sem aba aberta (o `executarLote` já roda lá). Mão e agente usam a mesma lista de comandos.
- Comandos novos para tudo o que as abas fazem, e **comandos de intenção**: gerar terreno por receita, encher de água num ponto, traçar caminho entre dois pontos, espalhar numa área, montar conjunto, alinhar ao chão.
- **Consultas** para o agente enxergar sem imagem: altura do chão num ponto, o que existe numa região, medidas e etiquetas dos modelos, orçamento, validação.
- **Busca de modelos no servidor** por nome, pasta, etiqueta e tamanho.
- **Captura** de imagem pelo palco aberto; o CLI sabe abrir um palco sem janela quando precisa.
- CLI e MCP continuam funcionando desde o primeiro lote, apontando para a API nova.
- Um assistente dentro do editor fica para uma etapa seguinte; a API já o comporta.

---

## 4. Lotes

Cada lote termina em staging, com teste no navegador e fotos. Produção sai depois da conferência dela, pelo `deploy-production.yml`. Trabalho direto na `staging`, `git add` por caminho.

| Lote | Entrega | Arquivos principais |
|---|---|---|
| **0. Fundação** | Documento v2 mínimo (escala por eixo, base em união, modelo por biblioteca e hash) e migrador v1→v2. `molda-cenarios-core` entra nos `watchPatterns` e no mapa do `ci.yml`, que hoje o ignoram | `molda-cenarios-core/src/documento.ts`, `comandos.ts`, `validacao.ts`; `.railway/services/*.json`; `.github/workflows/ci.yml` |
| **1. No ar, só equipe** | Módulo `cenarios` no members, gateway, BFF, motor novo (carregar, pôr, mover, girar, tamanho, grade, chão plano, miniatura), interface nova (as 4 telas, aba Objetos básica, gaveta), importação de arquivos soltos, rota nos dois apps, `CENARIOS_MODO=equipe`. **A casca da interface é fotografada cedo (1440, 1024, celular, claro e escuro) para ela avaliar antes dos lotes de ferramenta** | `members/src/{domain,application}/cenarios/*`, `interfaces/http/routes/cenarios.routes.ts`, migration `0151`; `api-gateway/.../cenarios-routes.ts`; `member-shell/src/routes/cenarios.ts`; `molda-cenarios-motor/*`; `molda-cenarios/src/*` (dividir `CenariosApp.tsx`, trocar `portas.ts` e `host-http.ts`); `community-kids` e `community`: `app/(app)/molda/cenarios/page.tsx`, `app/api/cenarios/**`, `next.config.ts`, `globals.css`, `nav.ts`; `.railway/variables.ts` |
| **2. Bibliotecas completas** | Zip, pasta, OBJ e FBX; conversão e medida em worker; leitor de ZIP generalizado (`molda/src/export/backupFile.ts`); busca no servidor; pastas e etiquetas; "Meus moldes"; cota. Acervo da equipe enviado e cenário da Faísca migrado | `molda-cenarios/src/bibliotecas/*`, `molda/src/import/*` (subcaminhos), `scripts/molda-cenarios-acervo.ts` |
| **3. Objetos completos e Testar** | Encaixes, grade modular, espalhar, conjuntos, repetir, alinhar, blocos de rascunho, árvore, camadas, histórico de versões; teste jogável genérico | `molda-cenarios-motor/src/{objetos,teste}/*`, core |
| **4. Terreno** | Alturas reais em peças, pincéis, pintura de chão, modelos prontos, importar mapa de alturas, buracos | core (`terreno/*`), motor (`terreno/*`) |
| **5. Água** | Mar, lago (encher), rio, represa, cachoeira, material de água | motor (`agua/*`), core |
| **6. Caminhos** | Trilha, praça, estrada que molda o terreno, cerca, muro, ponte, edição de pontos na cena | motor (`curvas/*`), core |
| **7. Jogo, luz e céu** | Marcadores, zonas, rotas, propriedades, colisões visíveis, câmeras; sol, céu, névoa, luzes | motor, core, interface |
| **8. Exportação** | Cena compilada; three.js e arquivo único; Raylib; Estúdio (`scene3d` e blocos); Arquipélago (perfil e carregador) | core (`compilar/*`); `studio/src/core/projectAssets.ts`, `official-extensions/world-3d/*`, `blockly/blocks/canvas3d.ts`, `runtime/python/raylib/py/cenario.py`; `arquipelago/src/*` |
| **9. Agentes** | Comandos de intenção, consultas, busca, palco sem janela, guia de uso para agentes | `molda-cenarios-agente/src/{cli,cliente,mcp}.ts`, core |
| **10. Limpeza e abertura** | Remover o piloto (`arquipelago-api` `cenario_*`, rotas do Admin, `CENARIOS_RUNTIME_URL`, `arquipelago/src/cenarios/*`). Deixar prontos os modos `lista` e `aberto`, faixas por posto, cota pessoal e uma biblioteca inicial de modelos de licença livre. A virada para os membros só acontece quando ela mandar | members, apps, `member-shell/src/lib/*` |

**Cuidados já conhecidos**
- `three` na mesma faixa dos apps (`^0.184`); `three-mesh-bvh` tem duas cópias no monorepo, não escrever `boundsTree` direto.
- CSS com prefixo próprio em `@layer components`; `color-mix` sempre `in oklab`.
- Copy do Kids sem travessão e sem citar IA (os testes `copy-sem-*` varrem o member-shell).
- A CSP dos dois apps já permite WASM e workers nas rotas de ferramenta; a prévia do Estúdio não, por isso tudo o que vai para lá sai sem compressão.
- Bloco novo no Estúdio pede deploy de Members e Admin junto.
- Variável nova: criar no painel do Railway antes de entrar em `.railway/variables.ts`.
- CORS do bucket UGC para GLB, PNG e binário, nas origens dos dois apps.

---

## 5. Verificação

Uma coisa pesada por vez: nunca playground, Next e e2e juntos. O typecheck segue a regra da sessão única.

- **Core e agente** (lotes 0, 4, 9): `bun test` dentro de `packages/molda-cenarios-core` e `packages/molda-cenarios-agente`. Incluem ida e volta v1→v2, pincéis determinísticos e a cena compilada.
- **Members e gateway**: testes unitários do serviço com repositório falso; teste de configuração do gateway e da política do Kids para os caminhos novos; integração com Postgres no CI; teste de exclusão de conta cobrindo o prefixo `cenarios/`.
- **Motor**: testes com happy-dom e fábricas injetadas; playground Vite do pacote sozinho, com Playwright (cwd no pacote, porta própria) para pôr, mover, esculpir, encher de água e testar.
- **Hospedagem**: teste de conformidade do host no molde de `packages/molda/src/host-conformance.test.ts` (só lê arquivos).
- **Prova de cada lote em staging**, com conta da equipe: abrir `/molda/cenarios`, criar jogo e biblioteca, importar um zip de modelos, montar um cenário com terreno, água e objetos, testar com o personagem, recarregar e ver tudo guardado. Com conta comum, conferir que a rota recusa.
- **Exportação**: abrir o `index.html` do zip three.js; rodar o exemplo Raylib com `raylib==6.0.1.0` no computador e dentro do Estúdio; usar o bloco "Usar o cenário" num projeto do Mundo 3D e publicar no `/jogar`; abrir o `.glb` único num visualizador.
- **Agente**: pelo MCP, sem aba aberta, pedir "uma ilha com um lago, uma trilha até um farol e árvores em volta", conferir o resultado no editor e desfazer.
- **Fotos** de cada tela em 1440, 1024 e celular, claro e escuro, entregues a cada lote de interface.
