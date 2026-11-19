# Lote 8.4 — Cena e importação no Estúdio — Implementation Plan

> Execução principal com writing-plans/executing-plans, sem delegação ou aprovação intermediária. Staging conferida limpa em `b2d77d8d3`; pacote/auxiliar Raylib fechado, 8.4 aberto. Seguir as tarefas em ordem, com teste/revisão/commit por recorte; não iniciar publicação ou lote 9.

**Goal:** trazer uma revisão compilada do Molda Cenários para um projeto existente do Estúdio de forma atômica e executá-la nos quatro motores de blocos e no Python/Raylib.

**Architecture:** um asset `scene3d` contém JSON estrito/pequeno com a cena compilada e referências a IDs de assets comuns. GLBs continuam `model3d`; PNGs continuam imagens. Campos Float32 e máscaras tornam-se dependências internas `scene3d-data`, de papéis fechados `alturas`/`buracos`, no MESMO armazenamento, orçamento e ciclo de arquivos dos assets. Isso evita embutir megabytes de base64 no JSON ou reduzir a precisão do chão. O compilador não é reimplementado; a materialização reconstitui seu pacote e usa seu carregador compartilhado.

**Tech Stack:** Zod/núcleo de cenários, assets/store/ponte/export do Estúdio, Three 0.184.0 instalado, runtime Python/Raylib oficial, Members/BFF já existentes.

**Spec:** [plano normativo](../../plans/2026-11-16-cenarios-reforma/plano-claude.md), [8.4](2026-11-18-cenarios-lote8-exportacao.md), [recorte Raylib](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote8-raylib.md).

## Restrições

- Mesma autoria/revisão/digest, modelos, relevo, recortes, água, caminhos, transformações, propriedades e licenças. Não produzir um GLB único e chamá-lo de scene3d.
- Não criar outro inventário/banco/gerenciador de assets. Os dois tipos entram no pipeline atual. Dados internos não são um upload genérico de binários executáveis: somente Float32 de alturas e máscara 0/1, conferidos contra a cena.
- Limites existentes: 48 malhas, 5 MiB por modelo e 24 MiB por projeto; também conservar os tetos de caracteres/quantidade do store. Medir bytes reais, partes reais de GLB e instâncias compiladas; não usar contagem de cartões como malhas.
- Referências por ID, não por nome. Renomear mantém vínculos; remover dependência referenciada informa o cenário e não o corrompe. Reimportação idêntica conserva IDs/nomes e não duplica bytes. Revisão nova não reescreve silenciosamente uma revisão já usada por blocos/código.
- Autorização e licenças vêm do preparo real. Capturar perfil/lifetime antes de awaits; fechar/trocar projeto ou perfil cancela. Uma falha não deixa meia cena ou fontes Python pela metade.
- Todo conteúdo de preview/export é inerte, local e conferido. Sem URLs assinadas, fetch arbitrário ou interpolação de nomes em código. Não relaxar CSP ou limites para acomodar a cena.
- Python: permitir o fluxo Molda somente nos ambientes compatíveis. Conservar módulos autorais; fontes geradas têm nomes portáteis/livres e não substituem main.py. A disponibilidade do auxiliar oficial precisa acompanhar a distribuição selecionada; ativação remota no encerramento global.

## 1. Contrato, assets e preservação

**Files:** `molda-cenarios-core/src/compilar/studio.ts`, entrada pública restrita `/studio`; `studio/src/core/scene3d/{assets,validacao,referencias}.ts`; `projectAssets.ts`, `assetBinary.ts`, refinadores de projeto pertinentes, `proAssets.ts`, `pythonAssets.ts`; testes de contrato/asset/reabertura. A entrada foi isolada em 19/11 porque reexportar pelo índice do compilador levava a inicialização do schema do Estúdio ao runtime Three independente. O teste reproduzível voltou ao hash canônico sem regenerar o artefato ou elevar orçamento.

**Contrato portátil:**

```ts
interface CenaParaStudio {
  formato: 'studio-cena3d'
  versao: 1
  cena: CenaCompilada
  recursos: { caminho: string; asset: string }[]
}
type PapelDoDado3D = 'alturas' | 'buracos'
// O contexto de dados/dimensões e os digests continuam em cena.arquivos/terreno.
```

`CenaParaStudioSchema` exige relação completa 1:1 de caminhos com o inventário compilado, sem duplicar paths, apontar fora da lista ou exceder 1 MiB de JSON. Um mesmo asset pode atender caminhos de conteúdo idêntico compatível. O ID é opaco e preservado, com teto de 64 caracteres. `scene3d` usa MIME fechado `application/vnd.sistemazero.cena3d+json`; `scene3d-data` usa octet-stream e metadado `dado3d.papel`. O validador de projeto confere referências, tipo/MIME, tamanho, digest e forma dos dados, recusando a leitura inteira em caso de corrupção.

- [x] Testes vermelhos: dependência ausente/duplicada/tipo errado, digest ou dimensões errados, NaN/Infinity, caminho hostil, binário que não é Float32/máscara, JSON excessivo; nomes/IDs preservados e versão desconhecida recusada.
- [x] Implementar contrato/validadores limitados, tipos e entrada nos assets atuais. Reabertura Classic/Pro/Python e arquivo editável conservam os mesmos dados; Pro/Python materializam os mesmos bytes. Export de site/execução Classic fica na tarefa 3, junto da ponte/runtime; não descartar silenciosamente recursos durante sanitização.
- [x] Relacionar dependências por ID e proteger remoção/alteração que invalidaria outra cena. Conservar nome/ID em rename. Verificar conversão/paths Pro e Python, sem liberar .bin/.json indiscriminadamente para imagens ou sons.
- [x] Suítes/tipagem/revisão e [checkpoint do contrato](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote8-studio-contrato.md) antes da importação visual. 604 testes núcleo/motor; 92 assets/documentos/arquivos Pro; 86 casos isolados de sincronização; build/orçamento da interface aprovado. 8.4 permanece aberto.

## 2. Preparação e commit atômico de importação

**Files:** `studio/src/core/scene3d/{importar,python}.ts`, `state/projectStore.ts` e ações de workspace pertinentes; `studio/src/studio/molda-library.ts`, `components/assets/{addCreationToProject,MoldaImportDialog,AssetsPanel,ProAssetPaths}.tsx/ts`; `member-shell/src/components/creator/use-studio-creation-libraries.ts`; entrada pública restrita para cenários na oficina, sem ciclo de dependências.

`prepararImportacaoDeCena3D` recebe pacote compilado conferido, identificação da fonte e captura do projeto. Produz plano serializável com assets/referências e fontes Python opcionais. O commit revalida o projeto ativo e os recursos concorrentes, aplica uma única atualização do store e preserva fontes/IDs anteriores. Deduplicar por conteúdo, tipo e papel, não por nome. O namespace físico Python dos recursos é comum aos cenários, com nomes por digest, evitando multiplicar os mesmos arquivos em cada revisão.

Decisões do preparo (19/11, após `33e90f06f`): capturar o projeto e os bytes antes dos awaits; calcular uma base por hash do conteúdo para o commit, além de capturar perfil/projeto/objeto ativo no chamador. ID de recurso deriva de tipo/MIME/hash e papel quando binário. ID da cena deriva do envelope final, permitindo revisão nova sem reescrever a anterior. Reimportação idêntica conserva os nomes personalizados. Contar as partes reais dos nós/GLBs, usando o inspetor já existente do motor (entrada pública restrita), e excluir a dupla contagem dos modelos que são dependências de cena; modelos comuns fora delas continuam contando. Inspecionar os bytes completos de modelos do curso para orçamento, conservando seus stubs e sem usá-los como substitutos de GLBs reais na cena. Nenhum novo parser GLB.

Python: recursos novos em `cenarios/modelos`, `cenarios/imagens`, `cenarios/dados`, por hash; recursos existentes conservam seus caminhos. Os caminhos lógicos compilados do envelope permanecem intactos; o módulo chama `Cenario(raizDoProjeto, envelope.cena, arquivos=mapaFisico)` para reaproveitar um GLB já em `models/` sem duplicá-lo ou usar `..`. O módulo gerado fica ao lado do entrypoint, com nome livre/portátil; `main.py` e módulos autorais não são substituídos. A adaptação de skins para Raylib reaproveita a conversão já feita no exportador, por uma fronteira pública sem Studio→Oficina (que criaria ciclo). Conferir novamente o pacote transformado. Os tetos de caracteres/quantidade do store continuam independentes do orçamento de 24 MiB e podem recusar antes dele; não aumentá-los para fazer um ensaio caber.

Refinamento Python após `38c33c519`: usar uma porta opcional de resolução física no próprio `Cenario`, equivalente ao mapa de arquivos que o runtime Three já recebe. O módulo gerado traduz caminho lógico do manifesto → caminho físico do asset por ID, capturado no preparo. Isso preserva os caminhos/papéis originais, inclusive quando GLB visual e de colisão compartilham bytes, sem duplicar aliases no filesystem ou reescrever a cena. O mapa deve cobrir exatamente o inventário e só permitir arquivos locais dentro da raiz; o cache estático usa o caminho físico, enquanto atores mantêm instâncias independentes por nó. Chamadas antigas sem mapa mantêm seu comportamento. Exigir provas CPython e browser do auxiliar canônico, regeneração das fontes e recurso de distribuição antes da oferta no produto.

19/11: [preparo puro JavaScript testado e revisado](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote8-studio-preparo.md), dez casos reais; ação do store, caminhos/fontes Python, adapter e interface continuam pendentes. Os checks abaixo não fecham com o preparo sozinho. A divergência Canvas2D registrada pela sessão Pinta em `dd4f0959c` precisa ser conferida na qualificação integrada antes de fechar 8.4; tipagem integral local e redução DOM/Worker/Bun passaram, sem supressão.

19/11: [ação atômica JavaScript implementada, testada e revisada](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote8-studio-commit.md), oito casos novos e regressão pertinente. O preparo usa a entrada CPU `/conteudo`; a opção de junção é executada na fonte Molda antes de entregar o pacote, evitando levar o compilador/GLTFExporter ao carregamento do modo Blocos. O teste de orçamento voltou a passar sem ampliar limites. A galeria/adapter ainda não chamam a ação; Python continua pendente, portanto os checks de produto abaixo permanecem abertos.

- [x] Testar primeiro 48/49 malhas reais, 5 MiB/modelo, 24 MiB/projeto existente, projeto alterado durante preparo, nomes colididos, repetição, dois cenários compartilhando recurso e falha/cancelamento: projeto original intacto.
- [x] Preparar referências/digests e a opção de junção compartilhada. Se o orçamento não couber, retornar excesso nominal e alternativa real; nunca omitir dependências ou mudar autoria.
- [x] Ampliar o adapter existente com cenas/revisões e resultado de bundle. O host usa CenariosHost/preparo autorizado e perfil capturado; não confiar em papel passado pelo cliente. Manter as criações antigas e sua origem.
- [x] Aplicar pelo store existente, com preservação de fontes Python e módulos autorais. Usar a fonte oficial `Cenario` para consumir a cena compilada; não criar outro runtime Python. [Recorte do preparo/store Python](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote8-studio-python-importacao.md); adapter/interface continuam pendentes.
- [x] Ensaiar Trazer do Molda real, conta/ensaio autorizado, Classic/Pro e Python; reabrir/exportar offline e rever limites, cancelamento, recursos e UI nos temas/layouts existentes. Commit/checkpoint.

### Continuação 2.2 — Galeria e operação autorizada

Depois de `deb6a3e36`, a frente exclusiva é a integração visual desta tarefa. Não iniciar os motores antes de fechar este fluxo.

- [x] Fixar o contexto das criações antigas sem mutar namespace global: `molda/state/persistence.ts` recebe namespace opcional no acesso à instância compartilhada; `molda/export/studioLibrary.ts` aceita namespace/sinal na listagem e usa o contexto capturado nas exportações. Testar leitura de A com B ativo, cancelamento e gerações antigas/novas.
- [x] Acrescentar uma capacidade opcional de cenários ao MESMO `StudioMoldaLibraryAdapter`, mantendo list/import das criações antigas. Resumos incluem jogo, espaço e revisão. Preparo retorna `PacoteCompilado`, sem gravar recursos na biblioteca pessoal. A entrada restrita `molda-cenarios/studio-library` lista pelo `CenariosHost` e compila a revisão autorizada com o compilador/junção existentes. Conferir digest, licenças, cancelamento e erro de revisão; conservar atores/hierarquias/propriedades.
- [x] No host `use-studio-creation-libraries.ts`, separar namespace local de ID da pessoa. Capturar ambos e o lifetime antes de awaits, com `sessionFetch` e `x-sz-viewer` existentes; cada operação combina seu AbortSignal com o lifetime. StrictMode e A→B→A não revivem operações. Criações antigas continuam usando seu armazenamento; cenários somente leem o host e entregam pacote.
- [x] Ampliar o diálogo existente com a escolha Criações/Cenários, busca por jogo/nome, revisão, origem/licenças, preparo e mensagem nominal de orçamento. A opção de junção é explícita e recompila na fonte; não oculta nem remove recursos para caber. Preparar/commitar somente no projeto/perfil capturados. Fechar/trocar aborta e não grava parcialmente. Oferecer o fluxo Python apenas ao Raylib 3D e à release compatível, preservando o restante da galeria e a identidade da interface.
- [x] Testar adapter/host/diálogo e regressão das criações antigas, fluxo real no harness com host HTTP autorizado, layouts/temas, arquivo Python gerado, reabertura/export e cancelamentos. Revisão, tipagem e orçamento frescos, documentação/commit/push antes da tarefa 3.

19/11: [galeria/host/interface qualificados](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote8-studio-galeria.md), com fluxo HTTP de ensaio em oito combinações de tela/tema, preservação/reabertura e execução Python nativa/browser. Os quatro motores permanecem pendentes; isso não fecha 8.4.

## 3. Carregador compartilhado e quatro motores

19/11: [resolução física pelo auxiliar Python/Raylib testada e revisada](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote8-studio-raylib-assets.md). Mapa local completo sem reescrever o manifesto, compartilhamento estático e atores independentes; CPython nativo/Estúdio e Pyodide com os assets reais. A capacidade explícita da distribuição protege execução/export web de releases anteriores. Não houve ativação remota; módulos gerados, store Python, adapter/interface e os quatro motores continuam pendentes.

**Files:** `studio/src/three/scene3d.ts` e bootstrap compartilhado; `preview/assetsBridge.ts`, `export/fileMap.ts`; contratos/blocos/codecs/IR de `official-extensions/world-3d`, `blockly/blocks/canvas3d.ts`, `official-extensions/game-3d`, `official-extensions/game-3d-advanced`.

`carregarCena3DDoProjeto` resolve o envelope/referências pelos assets e reconstitui `PacoteCompilado`, conferindo bytes reais antes de chamar o carregador comum. Retorna cena, alturas, colisões, atores, metadados e descarte. Não consulta Palco/editor. Cada motor liga esse resultado à sua câmera/controlador/loop existentes.

- [ ] Testar o carregador com a cena real do ensaio Raylib/Three: geometria, transformações, pintura, buracos/recortes, duas águas, três caminhos, atores/clipes, erro/cancelamento e três ciclos de recursos.
- [ ] Mundo 3D: bloco/seletor Usar o cenário, codec/IR e troca atômica da representação do mundo; heightAt usa alturas reais. Não sobrepor terreno antigo à cena.
- [ ] Canvas 3D: bloco/seletor e `sz_t3d_load_scene`; mesma cena/consulta e ciclo de recursos, sem um segundo carregador.
- [ ] Jogo 3D: mesmo bloco e integração no motor existente, conservando avatar, câmera e controles.
- [ ] Jogo 3D Avançado: mesmo bloco e integração no motor existente; preservar atores animáveis e física/colisões compatíveis.
- [ ] Reabrir/executar os quatro projetos, inclusive publicação local do projeto Mundo 3D em /jogar no harness, exports, CSP e regressão de recursos/controles. Implementar/testar/revisar cada motor antes do seguinte.

## 4. Fechamento de 8.4

- [ ] Conferir linha a linha: contrato/dados/modelos, importação atômica e orçamentos, quatro motores, Python/Raylib pelo produto, módulos autorais, persistência/reabertura/exports.
- [ ] Suítes/tipagem/build pertinentes, provas de navegador, capturas/vídeos e full review deste recorte. Registrar limitações reais sem afirmar desempenho físico ou aceite artístico. Commit/push.
- [ ] Só então iniciar 8.5. O lote 8 fecha após 8.5/8.6; 9–10, composição, full review global, CI e implantação/validação de staging continuam no final.
