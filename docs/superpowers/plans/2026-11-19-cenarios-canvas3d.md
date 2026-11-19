# Lote 8.4 — Canvas 3D — Implementation Plan

> Execução principal com writing-plans/executing-plans, sem delegação ou aprovação intermediária. Mundo 3D implementado/testado/revisado em `cef2ebd8a`, enviado à staging. Conferidos staging local/remota e caminhos deste recorte antes de iniciar. Mudanças concorrentes de comércio/admin não pertencem a este trabalho. Não iniciar Jogo 3D antes de fechar este recorte.

**Goal:** carregar e explorar o cenário importado no Canvas 3D, preservando o Three.js explícito, câmera, renderer, loop e o motor físico leve existentes.

**Architecture:** o SDK compartilhado continua sendo a única materialização dos assets. Um adaptador de ligação mantém a cena importada de cada `THREE.Scene`, instala a nova base depois do preparo completo e libera a anterior. O bloco é uma receita assíncrona, como o carregamento de modelos existente: o ramo de sucesso recebe o handle canônico. A pessoa continua a montar/renderizar seu programa com Three.js; não há um novo renderer, RAF, inventário ou controlador. A física leve recebe um provedor dos triângulos reais, sem copiar BVH ou criar outro motor físico.

**Tech Stack:** Three 0.184.0, SDK gerado com Bun 1.3.11, carregador/cápsula/BVH do motor canônico, Physics Lite, Blockly/IR/codecs e marcadores de integridade Canvas existentes.

**Spec:** [plano normativo](../../plans/2026-11-16-cenarios-reforma/plano-claude.md), [plano dos motores, seção 4](2026-11-19-cenarios-lote8-motores.md), [checkpoint Mundo 3D](../../plans/2026-11-16-cenarios-reforma/checkpoint-lote8-studio-mundo.md).

## Decisões e limites

- Manter a programação Three.js explícita. A alternativa de entregar um GLB achatado perde terreno físico/metadados; a de embutir o explorador portátil criaria outro renderer/controlador. Ambas são descartadas.
- Carregamento assíncrono com ramo de sucesso/erro, escopo local e ID estável. Usar o seletor `scene3d` já qualificado, sem caixa para digitar ID. Mensagens, cores e faixa seguem Canvas 3D existente.
- O adaptador substitui somente sua base importada anterior. Objetos e luzes criados explicitamente pelo programa continuam sendo propriedade desse programa. Não inferir propriedade pelo nome nem apagar toda a `Scene`. Orientar o uso de uma única base; um terreno manual independente não é removido silenciosamente por adivinhação.
- Conservar geometria, posição/origem, alturas, recortes, águas, animações, caminhos, licenças e dados compilados. Não substituir colisões por uma caixa global ou preencher buracos com zero.
- A atualização de água/animações/setores acontece no loop do programa, pelo handle canônico. Não acrescentar um loop automático concorrente.
- Entrada/saída da cena, cancelamento e pagehide liberam somente recursos próprios. Preparar antes de trocar; erro conserva a base vigente. Uma conclusão atrasada não pode recriar recursos após o descarte.
- A ligação física é opcional, sobre `createSZPhysicsLite`: conservar gravidade, corpos, eventos, controles e colisores autorais. Apenas quando um cenário está ligado, seu piso e seus triângulos passam a participar das consultas e do passo físico. O caminho sem cenário permanece igual.
- SDK/adaptador compartilham Three com o renderer; manter CSP, importmap e canais de assets. Sem dependência de editor/React no SDK. Conservar limites originais de build e materiais.

## 1. Ligação do runtime ao Three explícito

**Files:** criar `studio/src/three/scene3dCanvas.ts` e `three/__tests__/scene3dCanvas.test.ts`; ampliar `scene3dBootstrap.ts`; regenerar `scene3dRuntime.generated.ts` pelo gerador existente.

**Interface:** `criarInstaladorDeCenas3D(carregar)` recebe a função canônica `(id, sinal, opcoes?) => Promise<CenaNoThree>`. Produz instalação por `THREE.Scene` e descarte da sessão. O SDK expõe a instalação sobre a mesma materialização, e o resultado conserva a interface do handle canônico com descarte associado à ligação. O adaptador não cria renderer nem controlador.

- [ ] Teste vermelho com geometria real: troca conserva objetos autorais, copia ambiente, remove/libera a base anterior; falha conserva a base vigente.
- [ ] Testar concorrência A/B, abort antes/durante, encerramento durante preparo, descarte idempotente e isolamento de duas cenas. Uma instalação descartada não pode restaurar o ambiente por cima de outra.
- [ ] Implementar ligação com captura antes dos awaits, dono explícito dos recursos e escuta de encerramento instalada antes do código do programa. Não guardar handles circulares em `userData`, pois o Three serializa esse objeto.
- [ ] Rodar testes, conferir geração/imports/licenças e revisar antes de ligar os blocos.

## 2. Blocos e receitas do núcleo

**Files:** `blockly/blocks/canvas3d.ts`, `three/canvas3dContract.ts`, `blockly/buildIR.ts`, `blockly/workspaceState.ts`, `ir/schema.ts`, `ir/programmingReferences.ts`, `generators/js.ts` e seletores/analisadores de escopo descobertos nos testes. Separar interfaces/codecs de cena em arquivos focados em `three/` se isso evitar aumentar as fachadas já extensas.

**Blocos mínimos:** `sz_t3d_load_scene` (asset, cena Three, renderer, handle local no ramo de sucesso e ramo de erro); atualização do handle no loop (delta/câmera/foco); ligação do handle ao mundo Physics Lite existente. São companheiros necessários ao uso da cena completa, não uma nova categoria/fachada de jogos.

- [ ] Testes vermelhos de Blockly → IR → código → IR → Blockly, com ID preservado e nomes de recursos ligados aos papéis corretos.
- [ ] Conservar marcadores/checksum de receitas semânticas. Editar o código expandido não pode ressuscitar silenciosamente a receita antiga.
- [ ] Registrar criação/uso/escopo dos recursos no contrato central: handle só existe no ramo de sucesso; renderer/cena/mundo precisam existir antes. Atualização só em contexto contínuo; carregamento não pode ocorrer por quadro.
- [ ] Gerar a chamada ao SDK com cancelamento e tratamento de erro no lifecycle existente. Atualizar o handle pelo loop do programa. Sem passar envelope JSON ao GLTFLoader.
- [ ] Conferir auditoria da paleta, parser, seletores, lifecycle, referências e source maps. Nenhum programa antigo muda por não usar esses blocos.

## 3. Física real no Physics Lite

**Files:** `three/physicsLiteRuntime.ts`, testes do kernel e teste novo de integração usando cena compilada real. A ponte de tipos/vetores pertence ao adaptador/receita do Canvas, mantendo o kernel portátil sem imports de Three.

**Interface:** ligação explícita de um provedor de cena ao mundo físico existente, com consulta de chão opcional, resolução de corpo e raycast delegados ao handle canônico. O provedor é emprestado: o kernel não descarta GLBs/texturas/BVH que pertencem à ligação visual. Remover/limpar/descarregar não pode deixar referência física a uma cena descartada.

- [ ] Testar chão fora da origem, recorte com queda por gravidade, apoio sobre ponte, parede fina, teto, salto e consulta do colisor mais próximo. Usar os triângulos do motor, não apenas testes de callbacks simulados.
- [ ] Conservar o caminho sem cena e os colisores/corpos/eventos existentes. O resultado físico precisa respeitar o pivô e as dimensões dos corpos do kernel.
- [ ] Subdividir deslocamentos quando necessário para não atravessar superfícies finas. Não resolver um recorte atribuindo piso zero nem teleportar um corpo para um fundo sentinela.
- [ ] Revisar atualização/substituição/descarte do provedor. Uma cena anterior liberada não pode continuar sendo consultada pelo kernel.

## 4. Qualificação e fechamento do motor

**Files:** harness existente `playground/cenarios-integration`, relatório/evidências em `docs/plans/2026-11-16-cenarios-reforma`, atualização das checklists de 8.4.

- [ ] Montar o projeto Canvas pelos blocos/IR reais, reabrir pelo validador e executar com SDK e renderer reais, conservando a câmera/loop do programa. Exercitar a cena completa da galeria e um recorte sintético.
- [ ] Comparar alturas/máscara com a referência nativa; verificar atualizações/águas/clipes, colisão, cancelamento e três ciclos de recursos. Exportar e executar os mesmos arquivos. Não confundir uma prova de SDK isolado com o Canvas completo.
- [ ] Rodar regressões pertinentes de núcleo/seletores/geração/parser/Physics Lite e motores anteriores, tipagem, gerador em `--check`, Biome e build com orçamento original. Corrigir a causa de falhas, sem elevar limites para fechar tarefa.
- [ ] Capturas/vídeo e recibo sanitizado; registrar o que é de ensaio, o que foi comprovado e o que depende de aparelho físico/aceite artístico. Nenhum GLB pago ou projeto privado no Git.
- [ ] Review do recorte, conferir checklist linha a linha, commit/push em staging antes do Jogo 3D. Implantação/conta real e aceite global continuam no final, após 8.5/8.6, 9–10 e composição da Faísca.
