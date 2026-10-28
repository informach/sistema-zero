# A Ilha do Farol — mapa de implementação

Identidade: `jornada-faisca-base-3d`, Faísca, três aulas, sem certificado. [Autoria](../aulas-interativas/faisca/a-ilha-do-farol/README.md) e [decisões](../aulas-interativas/faisca/a-ilha-do-farol/proposta.md).

## Fontes

- `qa/ilha-do-farol-conteudo.ts`: fala integral, notas de tela e passos do caderno.
- `qa/ilha-do-farol-projeto.ts`: dez projetos progressivos (com `aparencia`, a troca dos modelos); só IR de Programação e Jogo 3D. `ILHA_ESCOLHAS_DO_VIDEO` é a combinação dos exemplos da personalização.
- `docs/design/ilha-do-farol-blender/`: os modelos no Blender (cenários, faróis animados, barcos, chaves e personagens animados).
- `qa/publicar-ilha-modelos.ts`: otimiza os GLBs do Blender, grava a biblioteca de modelos dos cursos (`packages/studio/src/core/course-models/`) e o `modelos.json` (sha, clipes, caixa).
- `qa/ilha-do-farol-assets.ts`: as referências dos modelos no projeto (GLB mínimo + `libId`), com os nomes da Chave do Farol 2D.
- `qa/gerar-ilha-do-farol.ts`: conserva referências compactas nos manifestos e embute as 24 malhas no arquivo final importável. O jogo usa os comandos básicos de Jogo 3D 0.32.0; atualizar o aplicativo antes dos manifestos.
- `qa/farois-basicos.test.ts`: garante blocos iniciantes em todas as etapas dos dois Faróis, inclusive ao converter JavaScript de volta a blocos, e malhas reais no arquivo portátil.
- `qa/ilha-do-farol-importacao.mjs`: importa no playground real, simula biblioteca incompatível e confere erro e nova tentativa para uma referência indisponível.
- `qa/gerar-ilha-artes.ts`: cena das experiências montada com os mesmos modelos e a bancada do Blender (nós `Chave`, `Aventureiro`, `Pedras`, `Bancada`), carregada sob demanda pelo player.
- `qa/ilha-do-farol-criterios.ts` e `ilha-do-farol-observacao.ts`: montagem e execução real.
- `qa/ilha-do-farol-quiz.ts`: perguntas, explicações e gabarito privado.
- `core/learning/scene/island-3d.ts`: estado, ações, evidências e falas compartilhadas do Zappy.
- `member-shell/components/scene-island-*`: controles reais e renderização 3D, sem renderização contínua em repouso.
- `studio-runtime/runtime/check-approach-3d.mjs`: planejamento pelo chão e entrada de teclado, sem mutação de estado do aluno.

## Regenerar

```powershell
# Só quando um modelo mudar (precisa do Blender, ver docs/design/ilha-do-farol-blender/README.md):
ILHA_OUT=./out /tmp/blender-venv/bin/python docs/design/ilha-do-farol-blender/build_all.py
ILHA_OUT=./out bun docs/aulas-interativas-tecnico/qa/publicar-ilha-modelos.ts
ILHA_OUT=./out bun docs/aulas-interativas-tecnico/qa/gerar-ilha-artes.ts
# Sempre:
bun docs/aulas-interativas-tecnico/qa/gerar-ilha-do-farol.ts
bun docs/aulas-interativas-tecnico/qa/ilha-preview/build.ts
bun docs/aulas-interativas-tecnico/recursos/ilha-farol/gerar-caderno.ts
node docs/aulas-interativas-tecnico/recursos/ilha-farol/renderizar-caderno.mjs
```

O PDF reutiliza o CSS, Nunito, Baloo 2, cartões e desenhos de encaixe do Cadê Todo Mundo; a galeria das escolhas usa as miniaturas de `docs/design/ilha-do-farol-blender/galeria/`. Chrome imprime o HTML; PyMuPDF ajuda na inspeção visual. O gerador recusa conteúdo cortado ou sobreposto ao rodapé. As dependências de otimização GLB são de autoria, não entram no runtime do aluno. Os modelos seguem o contrato do [README do Blender](../design/ilha-do-farol-blender/README.md): uma caixa por categoria, o farol com `acender`/`aceso` e o personagem com `parado`/`andando`.

## Verificar

```powershell
npm ci --ignore-scripts --no-audit --no-fund --prefix packages/studio-runtime/runtime
bun docs/aulas-interativas-tecnico/qa/validar-manifestos.ts
python docs/aulas-interativas-tecnico/validar-roteiros.py
bun docs/aulas-interativas-tecnico/qa/gerar-falas-elevenlabs.ts --check
bun test docs/aulas-interativas-tecnico/qa
# Com o playground do Estúdio iniciado (bun run --filter @sistemazero/studio dev):
node docs/aulas-interativas-tecnico/qa/ilha-do-farol-importacao.mjs
bun test packages/core/src/learning/scene packages/core/src/learning/project-execution-checkpoints.test.ts
bun test packages/studio-runtime/tests/check-approach-3d.test.mjs packages/studio-runtime/tests/check-javascript-modules.test.mjs
bun docs/aulas-interativas-tecnico/qa/ilha-do-farol-browser.ts
bun docs/aulas-interativas-tecnico/qa/ilha-do-farol-browser.ts personalizado
bun docs/aulas-interativas-tecnico/qa/ilha-do-farol-browser.ts outra-posicao
bun docs/aulas-interativas-tecnico/qa/ilha-do-farol-browser.ts sem-memoria
bun docs/aulas-interativas-tecnico/qa/ilha-do-farol-browser.ts chave-alta
bun docs/aulas-interativas-tecnico/qa/ilha-do-farol-browser.ts sem-movimento
bun docs/aulas-interativas-tecnico/qa/ilha-do-farol-browser.ts barco-lento
bun docs/aulas-interativas-tecnico/qa/ilha-do-farol-browser.ts posicao-correta
bun docs/aulas-interativas-tecnico/qa/ilha-do-farol-browser.ts posicao-inalterada
bun docs/aulas-interativas-tecnico/qa/ilha-preview/build.ts
node docs/aulas-interativas-tecnico/qa/ilha-preview/verify.mjs
```

Os testes de navegador usam Chrome local; `SZ_CHECK_CHROMIUM` pode indicar outro executável. No Windows, o driver roda em Node. O executor usa os módulos oficiais de Three da versão fixada no próprio runtime, servidos localmente sem rede. A prévia HTML usa os componentes reais da aula e registra screenshots em `.cache/ilha-do-farol/`.

Validar também a imagem Linux, porque a latência do WebGL por software difere do Chrome local:

```powershell
bun run --cwd packages/studio-runtime gen:validation-profile
bun run --cwd packages/studio-runtime check:validation-profile
docker build --load --platform linux/amd64 --provenance=false -t sistemazero-studio-runtime:verify packages/studio-runtime
bun docs/aulas-interativas-tecnico/qa/ilha-do-farol-browser.ts correto --docker
bun docs/aulas-interativas-tecnico/qa/ilha-do-farol-browser.ts outra-posicao --docker
bun docs/aulas-interativas-tecnico/qa/ilha-do-farol-browser.ts sem-memoria --docker
bun docs/aulas-interativas-tecnico/qa/ilha-do-farol-browser.ts chave-alta --docker
bun docs/aulas-interativas-tecnico/qa/ilha-do-farol-browser.ts sem-movimento --docker
bun docs/aulas-interativas-tecnico/qa/ilha-do-farol-browser.ts barco-lento --docker
bun docs/aulas-interativas-tecnico/qa/ilha-do-farol-browser.ts posicao-correta --docker
bun docs/aulas-interativas-tecnico/qa/ilha-do-farol-browser.ts posicao-inalterada --docker
```

`SZ_CHECK_DOCKER_IMAGE` permite indicar outra tag local. O contêiner roda sem rede. As verificações de navegação 3D usam uma cena por vez, metade da densidade de pixels e as mesmas dimensões CSS; isso reduz o trabalho de rasterização sem mudar câmera, colisão ou velocidade. A navegação lê coordenadas do mesmo quadro, envia pulsos de teclado e conserva margem nas bordas. Não altera variáveis do aluno nem aumenta os prazos de teste. Regenerar o perfil após mudanças no executor também atualiza os contratos compartilhados com Python.

Os geradores não importam conteúdo no Admin, não publicam aulas, não geram áudio e não fazem deploy. A autoria detalhada fica ligada à identidade curricular já reservada; o outline histórico do seed conserva seu hash para não invalidar um curso existente.
