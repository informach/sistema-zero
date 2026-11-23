# Mundos de 2 km no Molda Cenários e no Estúdio

Plano aprovado pela Helena em 23/11/2026. O estado dos lotes fica no fim do arquivo.

## Contexto

O jogo E (exemplo de regiões 3D) saiu com 384 m em vez de 1 km porque 1 km passa dos tetos do
Estúdio. A Helena decidiu (23/11) que as crianças vão construir mundos grandes no Molda (ilhas
inteiras para cursos). Requisitos dela:
- **2 km × 2 km (2048 m)**, **30 quadros/s num notebook/Chromebook simples** (GPU integrada,
  4–8 GB); no Python, meta 30 e mínimo aceito 25;
- nos três motores 3D JS (Jogo 3D, Mundo 3D, Jogo 3D Avançado) **e** no Python Raylib 3D;
- **nenhum teto sobe**;
- longe da criança aparece só o relevo (chão, morros, água) com neblina — sem silhuetas distantes;
- medida em GPU de verdade: página no staging, só para a equipe (login de admin), que ela abre no
  notebook simples dela; resultados gravados com o nome da GPU e o SHA;
- executado pela sessão `tocha-c7` (Claude Code).

**Diagnóstico corrigido.** A documentação culpa o chão pintado a 8 px/m; está errado (o jogo E já
pinta a 2 px/m, `pixelsPorMetroDoSolo`, `molda-cenarios-motor/src/compilar/solo.ts:22-28`). O que
enche os tetos é a **geometria do terreno**: 1 vértice por metro
(`baseInicialDeTerreno`, `molda-cenarios/src/oficina/operacoes-de-terreno.ts:32-51`), guardada duas
vezes — lotes desenhados e a colisão `colisoes/chao-*.glb` — ~82 B por célula. A 2 km o formato de
hoje daria ~340 MB (1 m) ou ~85 MB (2 m) contra o teto de 24 MiB de arquivos.

## A solução

Formato compilado novo **v2 "campo"**, pedido pelo anfitrião com a opção `relevo:'campo'`, só para
terreno `grade` nativo sem `recortes`:
- **Vai no pacote:** `terreno/alturas.bin` + `alturas.png` (como hoje), `terreno/pesos-{a,b}.png`
  (RGBA8, filtro 0, codificador próprio — nunca o canvas, que pré-multiplica o alfa) e
  `terreno.camadas` (cor, textura, `repeticaoMetros`, cor média da textura).
- **Sai do pacote:** os lotes de terreno e a colisão `chao-*`.
- **Desenho:** quadtree por pedaços no carregador de cena compartilhado (nó de 64×64 células com
  saias, ~8,7 mil triângulos), vizinhos com no máximo um nível de diferença, divisão por distância,
  reusando o `MaterialDoSolo` do editor (`molda-cenarios-motor/src/material-solo.ts`, mistura 8
  camadas por peso de vértice com texturas repetidas em metros), texturas com mipmaps.
- **Colisão:** campo de alturas dentro do `MundoDoTeste` (`molda-cenarios-motor/src/teste/colisoes.ts`),
  com os mesmos triângulos de `malhaDeGradeNaPeca` (`molda-cenarios-core/src/v2/terreno.ts:313`).
- **Espaçamento automático** (`passoDoTerreno`): 1 m até 1024 m, 2 m até 2048 m; maior que 2048 m
  é recusado por enquanto. Se o editor não passar na medida do Lote 4, 2 km usa 4 m.
- **Compatibilidade:** cenas já publicadas (v1) continuam abrindo (união v1|v2 no esquema). A
  publicação do Arquipélago e as exportações glb/raylib continuam no formato antigo.

**Orçamento a 2048 m com 2 m** (todos dentro dos tetos de hoje):

| Teto | Uso |
|---|---|
| 24 MiB de arquivos por projeto | terreno ~5,8 MB + objetos ~4 MB (~1.200) + água ≤0,5 MB + JSON ≤1 MiB → **~11–12 MB** |
| 128 MiB por janela | alturas 8 MiB + pesos 4 MiB + texturas ~3 MiB + água ≤4 MiB + objetos ≤40 MiB → **≤60 MiB** |
| 256 MiB do pacote | **≤130 MiB** |
| 48 malhas por janela | 32 objetos + **16 reservadas ao terreno** (constante nova ao lado de `janela`, sem subir o 48) |
| 5 MiB por modelo / 65 mil vértices por parte | lotes ≤1 MB; nós de 4.485 vértices |
| 1 MiB de JSON da cena (`MAX_BYTES_DA_CENA_PARA_STUDIO`) | ~2.000 objetos depois do Lote 5 |
| GPU integrada a 30 fps | ≤90 desenhos, ≤300 mil triângulos (terreno ≤139 mil), ≤45 MiB de texturas |

## Como vou trabalhar

- **Na pasta principal, na `staging` local** (sem worktree: decisão dela de 16/11, só `staging` e
  `main`, e o worktree ocupa GB no disco). Commits só com os caminhos do lote (`git commit -F msg --
  <caminhos>`), conferindo `git diff --cached --name-only`; outras sessões trabalham na mesma
  árvore (Áreas do Python, Pinta).
- Cada lote entra na `staging` pelas regras do projeto: conferir os commits das outras sessões na
  frente do `origin`, `biome` sem pipe, typecheck só no CI, geradores com `--check`.
- **Uma coisa pesada por vez** na máquina; nada de vigias em segundo plano — consulto o CI na hora.
- **Coordenação:** antes do Lote 6, olhar o `git log` de `cenario.py` (a frente do Pinta teve um
  "Lote R2: Python dos cenários") e combinar com a sessão do Pinta uma **única** versão nova do motor
  Python, já que a próxima versão do Pinta parte da `2026-11-22-areas-1`.
- Regras de `packages/studio/CLAUDE.md`: carga de regiões só no carregador de cena, nunca nos
  motores (os motores têm <120 caracteres de folga); `scene3dRuntime.generated.ts` (535 mil de
  1 milhão) regerado com Bun 1.3.11; tetos só descem.
- Cada teste nasce vermelho e cada um tem uma sabotagem que prova que ele pega o defeito.

## Lotes

**Lote 0 — Medir primeiro e corrigir os documentos** (sem código de produto)
- Página de medida a partir de `studio/playground/cenarios-integration/preparar-jogo-e.ts`
  (`__szMedida`): rota de 90 s pelo mundo; grava GPU (`WEBGL_debug_renderer_info`), SHA, fps
  p50/p95, desenhos e triângulos (`renderer.info`), memória de texturas estimada, regiões, heap.
- `studio/playwright.gpu.config.ts` (local, com janela, Chrome de verdade, recusa
  `isEmulatedGpu`) e `e2e/grande-gpu.spec.ts`: perfil nativo e perfil CPU 4× + 1366×768.
- `engine-regions.spec.ts`: gravar a GPU e o SHA de verdade no lugar da frase fixa.
- Corrigir `evidencias/jogo-e-regioes-2026-11-22/README.md:67-83`,
  `homologacao-a-h.md:189-193` e a nota do `studio/CLAUDE.md`.
- Reuso: `devtools-cost.spec.ts` (`provenance`, `isEmulatedGpu`), `e2e/helpers/cpuThrottle.ts`,
  `e2e-runtime/performanceAcceptance.ts` (`p95`).
- Medida de base: jogo E de 384 m na RTX 3050.

**Lote 1 — Funções puras**
- Novos: `molda-cenarios-motor/src/teste/campo.ts` (consultas no campo de alturas: cápsula, raio
  por caminhada na grade, triângulos na caixa, apoio), `molda-cenarios-core/src/compilar/relevo.ts`
  (`selecionarNosDoRelevo`, `passoDoTerreno`), `molda-cenarios-core/src/v2/png-de-pesos.ts`.
- Reuso: `interpolarAlturasDaCelula` (`v2/interpolacao-de-alturas.ts`), `malhaDeGradeNaPeca`,
  `codificarPngDeAlturas`/`lerPngDeAlturas` (`v2/png-de-alturas.ts`).
- Testes: 2.000 consultas aleatórias campo × BVH das malhas `chao` (diferença ≤1e-5; sabotagem:
  inverter a diagonal da célula); quadtree sem buraco nem sobreposição e vizinhos com ≤1 nível
  (sabotagem: tirar o balanceamento); ida e volta do PNG de pesos com pixel de alfa 0 (sabotagem:
  codificar pelo canvas).

**Lote 2 — Leitores antes do escritor**
- `molda-cenarios-core/src/compilar/schema*.ts`: v2 em união com v1, papel novo `pesos`.
- `conteudo.ts` (pesos no orçamento da janela), `janelas.ts` e `runtime-three.ts`
  (`malhasDoConjunto`: reserva de 16 malhas para o terreno).
- Novo `molda-cenarios-motor/src/compilar/runtime-relevo.ts`: quadtree, saias, cache LRU, no
  máximo 2 nós construídos por quadro, chamado por `atualizar(delta)`.
- `MundoDoTeste` com o campo de alturas; `limiteInferior` inclui o mínimo do terreno.
- `ambiente.ts`: no v2, fim da neblina ≤0,95 × alcance da câmera (o Jogo 3D enxerga 1000 m).
- Reusar o único `conferido.terreno.alturas`, sem cópias novas.
- Regerar `scene3dRuntime`, `scene3dProRuntime` e `runtime-three.generated` (Bun 1.3.11).
- Testes: fixture congelada `testing/contracts/molda-scene3d-campo-v2.json` (as fixtures v1 e
  regions-v1 continuam passando); `apoio` bate com as alturas; teste de rachadura nas bordas dos nós
  (sabotagem: sem saias); orçamento recusa 2 km a 1 m e aceita a 2 m (sabotagem: não contar os
  pesos). Medida: bundle do carregador ~560 mil de 1 milhão; payload dos motores não muda.

**Lote 3 — Escritor**
- `compilar.ts`, `chao-caminhos.ts` (pular peças e colisão do terreno no v2; caminhos mantêm
  `polygonOffset`), `terreno.ts` (pesos e camadas).
- `agua.ts`: `pixelsPorMetroDaAgua` = maior de 8/4/2/1 px/m que mantém cada imagem ≤1 Mpx.
- `molda-cenarios/src/studio-library.ts` (`prepararCenarioParaStudio`), `use-studio-creation-libraries.ts`
  do member-shell, `MoldaScenesPanel.tsx` e `studio/src/core/scene3d/importar.ts`: projetos JS pedem
  `campo`; projetos Python só com o recurso novo `molda-scene-relevo-v1`
  (`core/src/studio/python-runtime-features.ts`).
- Testes: compilação sintética de 2 km sem colisão `terreno` nem nós de terreno e abaixo de 24 MiB
  (sabotagem: religar a colisão do chão); sobreposição de caminho. Risco: caminho tremendo sobre
  relevo grosso → nível mais fino a até 128 m de qualquer caminho.

**Lote 4 — Editor (Molda)**
- `operacoes-de-terreno.ts` (`baseInicialDeTerreno` usa `passoDoTerreno`), `telas/Terreno.tsx`
  (Medidas: estimativa de bytes e aviso quando não cabe no Estúdio), `intencoes.ts`.
- Testes: tabela de espaçamento por tamanho (sabotagem: erro de um em 1024 e 2048).
- Medida local com 256 peças e CPU 4×: girar a câmera ≥30 fps, pincel p95 ≤100 ms, aplicar
  modelo de terreno ≤3 s. Se falhar: **4b** — o editor usa a exibição do `runtime-relevo` e a escolha
  de ponto passa ao campo de alturas; ou 2 km cai para 4 m.

**Lote 5 — JSON da cena menor**
- Arredondar matrizes e volumes (1 mm, 6 casas) **antes** de `calcularPertencaDasRegioes`.
- Teste: objeto encostado na borda de região por ±1e-6 (sabotagem: arredondar depois).

**Lote 6 — Python (uma versão só do motor)**
- `studio/src/runtime/python/raylib/py/cenario.py`: leitor v2; pedaços de 128 m em duas versões
  (completa; passo de 16 m com saias); completa até 192 m, nada além da neblina; pula pedaços atrás
  da câmera; LRU de 24 pedaços; 1 construção por quadro; cor do vértice = Σ peso × cor × cor média
  da textura (pesos lidos com `zlib`).
- Regerar `cenarioSources.generated.ts`; casos `relevo-casos.json` de um gerador novo no molde de
  `gen-raylib-region-cases.ts`.
- Testes: `cenario_test.py` bate vértices e cores com o TS (sabotagem: diagonal invertida no
  Python); rota de 2 km em `e2e-runtime/python-raylib.spec.ts`.
- Versão: requalificação e `promote-python-runtime` uma vez, combinada com a frente do Pinta.

**Lote 7 — Mundo de prova (jogo E de 2 km)**
- `molda-cenarios/playground/oficina/qa-jogo-e.ts` (base 2048 m, 8×8 regiões de 256 m, ~1.200
  objetos, juntar por 256), espelho em `preparar-jogo-e.ts`, `scripts/gen-jogo-e-galeria.ts`,
  arquivo novo no R2 e hash em `bigExamples.test.ts`. Versão em Python também.

**Lote 8 — Página de medida no staging e aceite**
- Rota só para a equipe (`isPrivilegedRole`) nos apps do staging que roda a rota de medida no jogo E
  de 2 km (JS e Python) e grava o resultado (GPU, SHA, números) por uma rota POST do member-shell,
  só admin, no R2 de staging; se falhar, oferece baixar o JSON.
- **Números de aceite:**
  - notebook simples, JS: p50 ≥30 fps, p95 do quadro ≤45 ms, por entrada de região ≤3 quadros
    >100 ms e nenhum >200 ms, ≤100 desenhos, ≤400 mil triângulos, ≤96 MiB de texturas, heap
    ≤350 MB, objetos de GPU estáveis nas últimas 4 voltas;
  - notebook simples, Python: p50 ≥30 fps (mínimo aceito 25);
  - RTX 3050 + CPU 4× + 1366×768 (guarda contra regressão): p50 ≥60, p95 ≤20 ms.

**Ordem:** 0 → 1 → 2 (vai ao staging) → 3 → 4 e 5 → 6 → 7 → 8.

## Verificação

- Por lote: testes focados com o vermelho antes e a sabotagem; `biome` sem pipe; geradores com
  `--check`; CI (typecheck, testes, `studio-engines.yml` com as provas estruturais no SwiftShader).
- Local (uma coisa pesada por vez): `grande-gpu.spec.ts` na RTX 3050 nos dois perfis; medida do
  editor (Lote 4); requalificação do Python.
- Staging: a Helena abre a página de medida no notebook simples dela (JS e Python) e os números
  gravados são conferidos contra o aceite; conferência logada do jogo E de 2 km na galeria;
  cenas v1 antigas continuam abrindo; homologação integral verde no SHA final.
- Documentos: evidência em `docs/estudio-evolucao/evidencias/mundos-2km-*/`, QA em
  `docs/qa/`, seção nova no `packages/studio/CLAUDE.md`.

## Decisões técnicas tomadas sem perguntar (podem ser revistas)
- 16 das 48 malhas por janela reservadas ao terreno (o 48 não sobe).
- 2 m a 2 km; 4 m só se o editor não aguentar.
- Manter `alturas.bin` (4 MiB a 2 km) em vez de reconstruir as alturas do PNG.
- Arquipélago e exportações glb/raylib ficam no formato antigo nesta etapa.

## Estado dos lotes

- Lote 0: feito (23/11/2026). Medida local `e2e/grande-gpu.spec.ts`, base do jogo E de 384 m em
  `docs/estudio-evolucao/evidencias/mundos-2km-2026-11-23/`; documentos corrigidos.
- Lote 1: feito (23/11/2026). `molda-cenarios-motor/src/teste/campo.ts`,
  `molda-cenarios-core/src/compilar/relevo.ts`, `molda-cenarios-core/src/v2/png-de-pesos.ts`.
- Lote 2: feito na staging local (23/11/2026). O terreno compilado ganhou o campo opcional `relevo`
  (`tipo: 'campo'`, `pesos`, `camadas`) e o papel de arquivo `pesos`; o carregador de cena desenha o
  relevo em pedaços (`molda-cenarios-motor/src/compilar/runtime-relevo.ts`) e a colisão lê o campo
  (`MundoDoTeste` com `campo`). Mudanças de decisão, com o motivo:
  - **sem reservar 16 das 48 malhas da janela**: o teto de 48 é das malhas COMPILADAS que uma janela
    carrega; os pedaços do relevo são gerados na hora e têm o teto próprio (`maximoDeNos`, 96, e
    no máximo 64 guardados além dos da tela, ~52 KB cada). Os desenhos na tela entram no aceite
    (≤ 100) e são medidos;
  - **a fixture congelada sai no lote 3**: as fixtures saem do produtor real, e o escritor do campo
    é o lote 3; no lote 2 os leitores são provados com um pacote montado pelo próprio
    `gravarDadosDoTerreno` + `codificarPngDePesos` (`tests/runtime-relevo-cena.test.ts`);
  - a saia de cada pedaço tem a profundidade da maior fresta MEDIDA nas bordas dele (contra um
    vizinho um nível mais grosso e um mais fino), não um número fixo: o teste mostrou fresta de
    9,7 m com a saia fixa de 8,5 m.
- Lote 3: feito na staging local (23/11/2026). O compilador grava o relevo em campo quando o
  anfitrião pede (`relevo: 'campo'`; o Estúdio pede nos projetos JavaScript; a publicação para o
  Arquipélago e as exportações não pedem e saem iguais). Um mundo de 2 km plano em campo ocupa
  4,2 MB (quase tudo `alturas.bin`) e compila em 2,1 s (`studio/src/testing/scene3dCampo.test.ts`).
  Fixture congelada `molda-scene3d-campo-v1.json`. Decisões, com o motivo:
  - **caminhos colados no chão sobem 3 cm** na compilação em campo, em vez de um decalque no jogo: o
    gravador de GLB não leva marca no material para o jogo saber quais eram decalques; e o relevo
    desce ao detalhe máximo a até 160 m da câmera onde há caminho (`detalhe` em
    `selecionarNosDoRelevo`), para um relevo mais grosso não cobri-los;
  - **a água desce a resolução** (8, 4, 2, 1 px/m) quando estoura o limite de pixels por parte, em
    qualquer cena (antes a compilação reprovava); em campo, também até caber em 1 Mpx por parte.
    O que já cabia sai igual;
  - **sem pintura no chão**, o campo leva três camadas (fundo, areia, grama) com o mesmo degradê
    pela altura que o palco desenha;
  - conserto achado pelo teste do detalhe: os filhos de um pedaço dividido para equilibrar a árvore
    não entravam na fila e nunca se refinavam (perto da câmera o relevo podia ficar mais grosso).
- Lote 4: feito na staging local (23/11/2026). `passoDoTerreno`: 1 m até 1 km, 2 m até 2 km, 4 m
  até 4 km e 8 m até 8 km (todo mundo novo com até 1024 × 1024 células; antes acima de 2 km o
  editor ainda aceitava, só que a 1 m). Achado: o Estúdio abre o relevo com até 1088 × 1088
  células, porque as alturas vão num arquivo de dados 3D de até 5 MiB
  (`relevoCabeNoEstudio`); a tela de medidas do terreno avisa e sugere o espaçamento. A medida
  de desempenho do editor com 256 peças passa para o lote 7, quando o mundo de prova de 2 km é
  montado na própria oficina.
