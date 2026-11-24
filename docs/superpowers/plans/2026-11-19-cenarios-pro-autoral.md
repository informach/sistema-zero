# Lote 8.4 — Cenários no Pro autoral — Implementation Plan

> Execução principal com writing-plans/executing-plans, sem delegação nem aprovações intermediárias. Avançado implementado, testado, revisado e enviado em `2932075e4`. Staging local/remota sincronizada antes deste recorte. Fechar Pro e a conferência integrada antes de 8.5.

**Goal:** usar a cena completa importada do Molda em um projeto Pro criado diretamente, com exemplo tipado e os mesmos arquivos no coordenador local, compilação remota e exportação.

**Architecture:** `buildProAssetBundle` materializa três arquivos derivados, fora da árvore autoral, quando existem cenários: `studio-generated/molda-cenarios.mjs`, `molda-cenarios-runtime.mjs` e o contrato `molda-cenarios.d.mts`. Uma entrada Pro compilada pelo gerador existente usa exatamente o carregador, o transporte e o instalador canônicos, sem substituir o SDK global de outro jogo. A biblioteca, seus IDs, fontes e dependências continuam sendo os do projeto. O código autoral importa o módulo explicitamente, sem criação automática de cena, câmera, controlador ou loop.

**Tech Stack:** Three compartilhado pelas dependências npm do autor, SDK canônico ESM, coordenador Pro/manifesto/revisão/exportação existentes, Blockly apenas nas regressões anteriores, Bun/Vite/TypeScript e Chrome reais.

**Spec:** [plano normativo](../../plans/2026-11-16-cenarios-reforma/plano-claude.md), [motores, seção 7](2026-11-19-cenarios-lote8-motores.md), [transporte qualificado](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote8-studio-transporte.md).

## Contratos e restrições

- Nenhuma reescrita do `package.json`, lock, HTML, renderer, câmera ou loop autoral. As importações Three do SDK resolvem para o mesmo npm do projeto. A receita exige a dependência compatível, sem instalá-la silenciosamente.
- Não entregar GLB achatado, outro parser, outro inventário ou cópia manual do runtime. O gerador qualifica as duas entradas com os mesmos imports/licenças/limites; o SDK clássico permanece byte idêntico. A entrada Pro usa as projeções do manifesto existente, o leitor canônico do envelope, `carregarCena3DDoProjeto` e `criarInstaladorDeCenas3D`. Não duplicar GLBs/PNGs/Float32 dentro do módulo: buscar somente os arquivos referenciados, com tamanho limitado, digest e cancelamento.
- Bytes pagos e projetos completos ficam em `output/`; somente capturas, vídeos e métricas saneadas entram no Git.
- Sem base64 na árvore persistida do aluno. A projeção efêmera pertence ao mesmo coordenador de materiais e participa de hash, revisão, colisões de caminhos, remoção e exportação.
- Os três caminhos gerados são exatos. Ampliar a política compartilhada apenas para eles; outros módulos executáveis continuam recusados no canal de materiais. Não elevar tetos de arquivos, bytes ou prazos.
- Contrato `.d.mts` permite importar o módulo em TS sem supressão ou declaração `any`. Conferir com o compilador real, incluindo um projeto que verifica JS.
- Carregamento/troca/abort/descarte e consultas físicas continuam do SDK. A receita explicita atualização/quadro e descarte no loop do autor.
- Sem implantação antes do fechamento global. Não abrir para membros.

## 1. Projeção única e políticas

**Files:** novo `core/src/studio/pro-scene3d.ts`; alterações focadas em `pro-runtime-capabilities.ts`, `pro-revision.ts`; novos `studio/src/three/scene3dPro{,Bootstrap,Arquivos}.ts`; `studio/src/core/proAssets.ts`; testes próprios no core, `studio/src/core/__tests__/scene3dPro.test.ts` e `studio/src/three/__tests__/scene3dProArquivos.test.ts`.

**Interfaces:** constantes `STUDIO_PRO_SCENE3D_MODULE`, `STUDIO_PRO_SCENE3D_RUNTIME`, `STUDIO_PRO_SCENE3D_TYPES`; `isStudioProScene3DFile(path): boolean`. `arquivosDeCenas3DPro(assets: readonly ProjectAsset[], entries: readonly ProAssetManifestEntry[]): Promise<ReadonlyMap<string, Uint8Array>>` devolve os módulos e o contrato, sem receber conta ou criar arquivos no disco. `criarFonteDeCenasPro(arquivos, baseURL, vida)` limita e confere as leituras dos mesmos arquivos do manifesto; `carregar(id,sinal)` consulta apenas o envelope solicitado e seus recursos.

- [x] Escrever teste vermelho usando `criarTransporteDeEnsaio()` e `buildProAssetBundle(assets)`: os módulos devem existir sem `legacyRuntime`; o manifesto mantém os mesmos assets e bytes; nada é gravado na árvore.
- [x] Testar ausência dos módulos sem cenário, colisão com arquivos/pastas do autor e preservação dos caminhos/limites antigos.
- [x] Testar política e revisão: os nomes exatos são aceitos; variantes, travessia, nomes reservados, caminhos executáveis arbitrários e colisões continuam recusados.
- [x] Implementar a projeção no materializador existente. A geração usa o SDK atual e os canais canônicos, com cache pela coleção imutável de assets. Não criar segundo sincronizador.
- [x] Rodar testes de materialização, revisão, contrato remoto e sincronização, incluindo remoção dos arquivos gerados após retirar o último cenário.

## 2. Receita de uso e contrato TypeScript

**Files:** `studio/src/core/proExamples.ts`, novo `studio/src/three/scene3dProTypes.ts`, testes `core/proExamples.test.ts` e `core/__tests__/scene3dPro.test.ts`. Usar o painel `ProAssetPaths` existente.

**Interfaces:** módulo exporta `carregar`, `instalar`, `instalado`, `inicio` e `encerrar`, com parâmetros/retornos do SDK em contrato portátil que importa apenas tipos de `three`. `proAssetExample` devolve helper `carregarCenario` para o asset `scene3d`; calcula import relativo ao arquivo selecionado. Metadados extensos ficam conservadoramente como `unknown`; teste estrutural confere o handle canônico contra a superfície tipada exposta.

- [x] Testar exemplo JS e TS, ID estável escapado, import relativo em pastas diferentes e ausência de receita em HTML ou projeto sem Three.
- [x] Implementar função explícita `carregarCenario(cena, sinal)` usando `instalar(id, cena, sinal)`. Explicação mostra `atualizar(dt)`, `quadro(camera, foco)` e `descartar()`, sem adivinhar nomes/controle do jogo.
- [x] Compilar um consumidor TS real com `strict`, `allowJs` e `checkJs`: importar o módulo e usar cena, altura, física, chegada e descarte. Nenhum `@ts-ignore`, `@ts-nocheck` ou alteração do tsconfig autoral.
- [x] Conferir a declaração contra o handle canônico em teste de tipos/uso real e rodar a regressão dos exemplos/painel.

## 3. Execução, exportação e fechamento integrado

**Files:** produtor/driver próprios em `playground/cenarios-integration`; checkpoint/evidências e checklists de 8.4. Reaproveitar a cena técnica e a prova Raylib existentes.

- [x] Criar projeto Pro diretamente, sem conversão do clássico, e materializar pelo coordenador real. Reabrir o projeto canônico; comprovar `package.json` e fontes autorais preservados.
- [x] Executar via Vite real e também construir/abrir o site exportado, compartilhando a mesma instância do Three. Sem CDN ou parser de teste substituindo o SDK.
- [x] Três ciclos, 441 alturas/máscara contra Raylib, ambiente/água/clipes, colisão/recorte, erro/abort, cancelamento e descarte GL. Programa conserva seu loop/câmera/renderer. Guardar capturas/vídeo e recibo sem bytes privados.
- [x] Conferir contrato remoto/revisão e export de fontes com os mesmos caminhos/hashes e limites originais, sem exigir implantação nesta etapa. O pacote completo excede a cota remota preexistente de 2 MB, inclusive sem os módulos derivados; registrar a recusa correta, não alegar compilação remota executada. O cenário menor deve passar pelo contrato e ambos pelo Vite/build local real.
- [x] Rodar regressões pertinentes, build/orçamento original, tipagem, geradores/check, Biome/diff e review. Conferir linha a linha a seção 8.4 e a prova Python/Raylib já executada pelo produto.
- [x] Registrar implementado/corrigido/provisório/limitações, atualizar checklists, commit/push em staging. Somente depois iniciar 8.5.

## Revisão do plano

O recorte cobre a lacuna explícita do Pro autoral, sem repetir a conversão qualificada. A política aceita somente os três arquivos derivados conhecidos e conserva as restrições restantes. A prova executou Vite/build e Chrome reais, além da verificação semântica de JS/TS. A conferência integrada foi registrada no [checkpoint](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote8-studio-pro.md), com os limites remotos e de hospedagem. 8.5/8.6, lotes 9–10, Faísca final, full review/CI e implantação/validação de staging permanecem pendentes.
