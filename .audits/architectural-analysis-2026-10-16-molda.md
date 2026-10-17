# Revisão completa das alterações do Molda

Data: 16/10/2026. Branch: `staging`. Escopo: alterações desta conversa, incluindo painel de componentes, faca, espelhamento, duplicação, fechamento de buracos e cortes em volta. Ao encerrar a revisão, as alterações ainda estavam locais, sem commit, push ou deploy.

Foram revisados 56 arquivos de código, estilos e testes: 36 de implementação e 20 de testes. Três imagens de referência do corte de volume foram atualizadas após inspeção visual. O inventário completo está no final deste relatório.

## Achados por prioridade

### P1 — Formatação anterior atingiu 29 arquivos fora do Molda — pendente de isolamento

O comando anterior de seleção de arquivos usou pathspecs independentes do Git. Com isso, `biome check --write` recebeu também arquivos de outros trabalhos que estavam modificados no workspace. A lista registrada está em [format-scope.json](molda-review-2026-10-16/format-scope.json).

Não há cópia dos conteúdos imediatamente anteriores à formatação. Como esses arquivos já tinham alterações e continuaram sendo editados por outras frentes, comparar com HEAD não permite separar com segurança a formatação das mudanças de terceiros. Não reverti arquivos para HEAD. Os testes deste relatório não certificam os outros pacotes.

Este é um incidente confirmado de escopo, com impacto funcional não demonstrado. Não é uma autorização para descartar as alterações existentes. Todos os comandos de escrita desta revisão foram limitados a arquivos explicitamente identificados.

### P2 — Duplicação permitia faces coincidentes e deslocamentos sem efeito — corrigido

Em uma grade, copiar uma face por uma célula sobre a face vizinha era aceito. Em coordenadas grandes, um deslocamento não zero menor que a precisão de Double também criava uma cópia na mesma posição. Deslocamentos muito grandes podiam eliminar a área da face por arredondamento.

A validação agora compara as posições efetivas, verifica conflito com faces existentes e valida a triangulação antes de alocar os novos IDs. A prévia neutra continua disponível; sua confirmação permanece bloqueada.

Arquivos: [operador](../packages/molda/src/scene/meshComponentOperations.ts), [regressão geométrica](../packages/molda/src/scene/meshComponentOperations.test.ts), [fluxo de navegador](../packages/molda/e2e/component-operations.spec.ts). Confiança alta: reprodução falhou antes da correção e passou depois.

### P2 — Fechar buraco dependia da primeira linha escolhida — corrigido

Um contorno válido que combinava linhas de construção com bordas de faces podia ser rejeitado quando a primeira linha não tinha face vizinha. O operador usava somente essa linha para decidir a orientação.

Agora qualquer borda com face vizinha orienta o contorno; todas as outras bordas continuam sendo verificadas. A cobertura inclui todas as rotações da ordem de seleção e um contorno misto selecionado no canvas real.

Arquivos: [operador](../packages/molda/src/scene/meshComponentOperations.ts), [regressões](../packages/molda/src/scene/meshComponentOperations.test.ts), [E2E](../packages/molda/e2e/component-operations.spec.ts). Confiança alta.

### P2 — Páginas contextuais permaneciam disponíveis após revogar acesso — corrigido

As entradas do painel respeitavam as famílias de ferramentas, mas páginas já abertas de ajustes avançados, seleção, verificação e UV podiam continuar montadas. Isso permitia alcançar ações após a retirada do acesso.

As páginas agora verificam a permissão durante a renderização e voltam ao painel inicial quando ela é retirada. Os callbacks avançados e de UV verificam o ciclo de acesso vigente. Prévias avançadas são canceladas; ações antigas não voltam a funcionar quando o acesso é concedido novamente.

Arquivos: [painel](../packages/molda/src/components/editor/scene/SceneComponentTools.tsx), [ações](../packages/molda/src/components/editor/scene/useSceneComponents.ts), [regressão de revogação](../packages/molda/src/components/editor/scene/SceneWorkshop.accessRevocation.test.tsx). Confiança alta.

### P3 — Faltava a mensagem de recuperação da peça vazia — corrigido

Apagar todas as faces preservava o objeto, mas não mostrava a orientação prevista na especificação. O painel agora informa “Esta peça ficou sem faces. Desfaça para recuperar.” O E2E confirma que a peça permanece editável e que um único Desfazer recupera a geometria.

Arquivos: [painel](../packages/molda/src/components/editor/scene/SceneComponentTools.tsx), [estado](../packages/molda/src/components/editor/scene/useSceneComponents.ts), [E2E](../packages/molda/e2e/component-operations.spec.ts). Confiança alta.

## Problemas da verificação corrigidos

- Dois fluxos antigos de navegador ainda procuravam UV e divisão no painel removido. Foram atualizados para a navegação contextual, mantendo as verificações de geometria, histórico, viewport e curvas.
- O teste de simetria recarregava a página logo após clicar em sair, antes de esperar a gravação e a volta à galeria. Agora espera o cartão do projeto antes do reload. O vínculo salvo e a edição do lado gerado são verificados após reabrir.
- As três referências visuais do antigo corte de volume ainda mostravam “Cortar”. Foram inspecionadas e atualizadas para “Separar peça”. As outras 12 composições e os valores dos tokens permaneceram iguais. A escrita dos tokens preserva a quebra de linha final.
- O teste de memória apresentou falhas intermitentes também no HEAD anterior às mudanças: duas falhas em três execuções. A galeria exibia seu título antes de terminar de carregar a lista. A medição agora espera o cartão do projeto; passou em cinco execuções consecutivas. Os limites de 12 MiB e 100 nós não foram alterados. Nessas execuções, a contagem passou de 188 para 187 nós e os contextos WebGL foram liberados a cada saída.

## Arquitetura e integridade

- Operadores geométricos não dependem de React nem das permissões da interface. A edição passa por `editSceneMesh`, que preserva travas, cópia de geometria compartilhada e orçamentos.
- Prévias das novas operações são documentos derivados. Confirmar publica uma transação; cancelar não publica geometria nem cria histórico. Duplicação também protege a miniatura contra salvamento da prévia.
- A simetria persiste plano e pares fonte/resultado. O parser valida referências, posições, materiais e UVs. Edições topológicas regeneram a contraparte; Parar conserva a forma atual e pode ser desfeito.
- A faca subdivide superfícies na mesma peça. O corte de volumes permanece acessível em Seleção e organização → Separar peça. O pedido posterior do usuário prevalece sobre a distinção inicialmente proposta pela spec.
- Foram conferidos cancelamento, revisão obsoleta, troca de editor, blur, perda de contexto, seleção, UVs por canto, limites e undo. Há testes com StrictMode, trabalhadores reais no navegador e geometria compartilhada.
- O grafo estático de imports relativos de execução não encontrou ciclos envolvendo os arquivos alterados. Nenhum novo export sem consumidor de produção foi identificado pelo levantamento. `addSceneBox` e `moveScenePivot` são APIs anteriores com testes próprios; não foram classificados como código morto.
- Há sobreposição entre o operador antigo de um corte em volta e o novo operador de múltiplos cortes. Eles têm contratos diferentes em transições incompatíveis; o antigo continua testado. O callback legado `cutRing` permanece sem consumidor na interface atual. É um ponto de manutenção, sem falha funcional comprovada.
- `SceneComponentTools` e `useSceneComponents` continuam concentrando navegação e coordenação. Uma futura extração por página pode facilitar manutenção. Não fiz uma refatoração ampla durante esta revisão.

## Cobertura e limites

Foram executadas as três suítes do pacote: **3.243 testes, zero falhas**. Tipos, lint de todo o pacote e build passaram. O lint verificou 1.395 arquivos sem aplicar correções.

A execução final de navegador e seus comandos exatos estão em [verification-report.md](molda-review-2026-10-16/qa/verification-report.md). Inclui faca e extrusão, duplicação com manipulador, conflitos, contornos mistos, peça vazia, múltiplos cortes, simetria persistente, UV, pintura, animação, exportação, responsividade e liberação de contextos.

Limitações explícitas:

- Firefox e WebKit não estão instalados neste ambiente; a validação de navegador foi realizada em Chromium.
- Fechar buraco aceita um contorno simples e plano; corte em volta exige uma faixa compatível de quadriláteros, com 1–16 cortes. A faca recusa trajetos cruzados e faces incompatíveis, com mensagens de correção.
- A simetria exige fonte de um único lado do plano. Edições incompatíveis fora da fonte pedem para parar o espelho. Malhas vinculadas a esqueletos mantêm a restrição anterior de desvincular antes de mudar a topologia.
- Leitores anteriores sem suporte ao campo opcional de simetria recusam esse documento; não descartam o vínculo silenciosamente. Documentos antigos sem esse campo continuam aceitos.
- A exportação GLB de geometria simétrica tem cobertura específica. Os outros exportadores usam a geometria materializada e têm cobertura tradicional, sem um caso dedicado a cada nova operação em cada formato.
- Não foi feito benchmark de fluidez dessas operações em malhas grandes. O teste de memória verifica o ciclo de abertura e fechamento, não estabelece desempenho de modelagem.
- A revisão não certifica alterações concorrentes de outros pacotes, incluindo os 29 arquivos externos formatados anteriormente.

## Inventário dos arquivos revisados

O inventário abaixo inclui implementação, CSS, contratos, testes geométricos, integração e E2E. Referências visuais: `implemented/{default,pink,dark}/03-modelar-cortar.png`.

| Arquivo | Superfície |
|---|---|
| `packages/molda/e2e/component-operations.spec.ts` | Testes |
| `packages/molda/e2e/component-panel.spec.ts` | Testes |
| `packages/molda/e2e/fidelity.spec.ts` | Testes |
| `packages/molda/e2e/knife.spec.ts` | Testes |
| `packages/molda/e2e/scene-authoring.spec.ts` | Testes |
| `packages/molda/e2e/scene-workshop.spec.ts` | Testes |
| `packages/molda/e2e/workshop-journeys.spec.ts` | Testes |
| `packages/molda/src/components/editor/model/WorkspaceInspector.tsx` | Implementação |
| `packages/molda/src/components/editor/scene/SceneCanvas.tsx` | Implementação |
| `packages/molda/src/components/editor/scene/SceneComponentAdvanced.tsx` | Implementação |
| `packages/molda/src/components/editor/scene/SceneComponentCut.tsx` | Implementação |
| `packages/molda/src/components/editor/scene/SceneComponentMirror.tsx` | Implementação |
| `packages/molda/src/components/editor/scene/SceneComponentOperation.tsx` | Implementação |
| `packages/molda/src/components/editor/scene/SceneComponentOperations.test.tsx` | Testes |
| `packages/molda/src/components/editor/scene/SceneComponentPanel.tsx` | Implementação |
| `packages/molda/src/components/editor/scene/SceneComponentTools.tsx` | Implementação |
| `packages/molda/src/components/editor/scene/SceneCutPrecision.tsx` | Implementação |
| `packages/molda/src/components/editor/scene/SceneFacePreview.tsx` | Implementação |
| `packages/molda/src/components/editor/scene/SceneKnife.test.tsx` | Testes |
| `packages/molda/src/components/editor/scene/SceneKnifePanel.tsx` | Implementação |
| `packages/molda/src/components/editor/scene/SceneMeshCheck.tsx` | Implementação |
| `packages/molda/src/components/editor/scene/SceneModelColumn.tsx` | Implementação |
| `packages/molda/src/components/editor/scene/ScenePrecisionTools.test.tsx` | Testes |
| `packages/molda/src/components/editor/scene/SceneSolidCutBar.tsx` | Implementação |
| `packages/molda/src/components/editor/scene/SceneWorkshop.accessRevocation.test.tsx` | Testes |
| `packages/molda/src/components/editor/scene/SceneWorkshop.contract.test.tsx` | Testes |
| `packages/molda/src/components/editor/scene/SceneWorkshop.test.tsx` | Testes |
| `packages/molda/src/components/editor/scene/SceneWorkshop.toolAccess.test.tsx` | Testes |
| `packages/molda/src/components/editor/scene/SceneWorkshop.tsx` | Implementação |
| `packages/molda/src/components/editor/scene/SceneWorkshopBar.tsx` | Implementação |
| `packages/molda/src/components/editor/scene/SceneWorkspaceAreas.test.tsx` | Testes |
| `packages/molda/src/components/editor/scene/SceneWorkspacePanel.tsx` | Implementação |
| `packages/molda/src/components/editor/scene/useSceneComponents.ts` | Implementação |
| `packages/molda/src/components/editor/scene/useSceneKnife.ts` | Implementação |
| `packages/molda/src/components/editor/scene/useSceneMeshCheck.ts` | Implementação |
| `packages/molda/src/components/editor/scene/useSceneMeshOperation.ts` | Implementação |
| `packages/molda/src/components/editor/scene/useSceneWorkshop.ts` | Implementação |
| `packages/molda/src/core/copy.ts` | Implementação |
| `packages/molda/src/scene/commands.ts` | Implementação |
| `packages/molda/src/scene/document.ts` | Implementação |
| `packages/molda/src/scene/meshComponentOperations.test.ts` | Testes |
| `packages/molda/src/scene/meshComponentOperations.ts` | Implementação |
| `packages/molda/src/scene/meshKnife.test.ts` | Testes |
| `packages/molda/src/scene/meshKnife.ts` | Implementação |
| `packages/molda/src/scene/meshKnifeGraph.ts` | Implementação |
| `packages/molda/src/scene/meshRingCuts.test.ts` | Testes |
| `packages/molda/src/scene/meshRingCuts.ts` | Implementação |
| `packages/molda/src/scene/meshSymmetry.test.ts` | Testes |
| `packages/molda/src/scene/meshSymmetry.ts` | Implementação |
| `packages/molda/src/scene/readGeometry.ts` | Implementação |
| `packages/molda/src/styles/molda.css` | Implementação |
| `packages/molda/src/viewport/SceneViewport.ts` | Implementação |
| `packages/molda/src/viewport/sceneComponentPicking.ts` | Implementação |
| `packages/molda/src/viewport/sceneKnifePicking.test.ts` | Testes |
| `packages/molda/src/viewport/sceneKnifePicking.ts` | Implementação |
| `packages/molda/src/viewport/sceneViewportTypes.ts` | Implementação |
