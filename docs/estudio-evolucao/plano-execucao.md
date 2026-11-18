# Evolução integral do Estúdio — plano de execução

Referência: `origin/estudio-evolucao`, `d9ebd3fefe174530c7daf08340f72ceb78ac8258`.
Worktree: `sistema-zero-estudio-evolucao`, branch `estudio-evolucao-conclusao`.
Especificação: missão de 21 seções fornecida pelo usuário em 17/11/2026.
Este documento acompanha trabalho em andamento; não é declaração de conclusão.

## Contrato global

Preservar a identidade visual e os componentes atuais, inclusive no Pro. A permissão
da missão para redesenhar não revoga a restrição visual expressa anteriormente.
Preservar integralmente Cadê e Farol: a matriz versionada não pode ser regravada
para acomodar regressões. Não alterar Pinta, Molda ou Molda Cenários nesta frente.
Não mesclar staging/main, implantar, usar produção ou publicar materiais de alunos.
Commits por entrega verificada; preparar PR com status real e dependências externas.

## Desenho técnico

Evoluir serviços e contratos existentes, em etapas sequenciais. Reescrever a IDE ou
criar filas, armazenamento e motores paralelos elevaria o risco de incompatibilidade.
Aumentar cotas sem medir não resolve os gargalos já identificados. A abordagem
escolhida mantém Blockly, IR, Monaco, persistência e executores; muda suas bordas de
coordenação e os caminhos comprovadamente caros. Isolamento por origem exige medir
os navegadores: origem diferente não é garantia universal de processo diferente.

Cada etapa exige reprodução do problema, contrato, implementação, testes de unidade
e integração pertinentes, navegador, compatibilidade pedagógica, revisão de segurança
e recursos, medição, documentação e commit. Uma etapa com evidência incompleta fica
parcial, mesmo com testes unitários verdes. Não iniciar a seguinte como se a anterior
estivesse homologada. Dependências externas devem ser discriminadas.

## Sequência e cobertura da missão

### 0. Baseline e proteção pedagógica — em andamento

- [x] Localizar branch, preservar árvore compartilhada e fixar referência.
- [x] Conferir matriz e testes A1–A5 existentes sem regravar referências.
- [ ] Executar matriz e projetos protegidos neste Windows; guardar saída e ambiente.
- [ ] Executar gestos no navegador e conferir capturas antes/depois.
- [ ] Completar A4 na página real de homologação: verificar, enviar e concluir.
- [ ] Inventariar capacidades reais dos dez runtimes, executores, IDE e armazenamento.
- [ ] Medir baseline local: blocos 80/500/2.000/5.000/10.000, Pro modular, runtimes,
  abertura fria/quente, linguagem, jogo, Zappy, memória e descarte.
- [ ] Fixar fixtures, metas p50/p95/máximo e condições: digitação 50 ms, painéis
  150 ms, primeira resposta da busca 200 ms; FPS apenas por fixture/hardware.

Arquivos: matriz em `docs/aulas-interativas-tecnico/qa/`, testes em
`packages/studio/src/blockly/__tests__/protectedCourses.test.ts`,
`packages/studio/e2e/protected-lessons.spec.ts`, scripts `profile-js-classic.ts`,
`measure-preview-isolation.mjs`, experimento `studio-pro-webcontainer-memory`.

### 1. Isolamento e integridade antes de executar — em andamento

- [ ] B1: materializar buffers e salvar antes de Rodar/Rodar de novo; falha mantém
  código e impede nova execução; Parar cancela a intenção sem cancelar a gravação.
- [ ] Testar edição/troca de projeto/perfil/desmontagem enquanto salva, clique duplo,
  erro de cota, observador e host que persiste por callback.
- [ ] Medir Chromium/Firefox/WebKit com scripts existentes; registrar processo,
  atraso do editor, tempo de Parar e salvamento durante programa hostil.
- [ ] B2: reutilizar `StudioPlayerOriginAdapter` e contratos do runtime quando a
  medição exigir outra origem; validar CSP, sandbox, remetente, expiração e release.
- [ ] B4: estudar Worker/OffscreenCanvas no Jogo 2D, com matriz DOM/áudio/input;
  integrar caminho compatível e fallback declarado, sem alterar cursos.
- [ ] Conferir laço/recursão/trabalho nativo/memória/flood, reinícios e recursos.

Arquivos: `components/preview/PreviewIframe.tsx`, `runTripwire.ts`,
`playerOriginAdapter.ts`, `persistence/service.ts`, `state/pendingEditorEdits.ts`,
`state/projectOperations.ts`; testes de prévia e `preview-hostile-programs.spec.ts`.

### 2. Clássico em escala — parcial na referência

- [x] Perfis C0/C1/C5 e redução de trabalho repetido já implementados no remoto.
- [ ] Reproduzir números localmente; não comparar Windows com Linux histórico.
- [ ] Adaptar montagem sob demanda do Python ao JS fora das aulas e acima de limiar
  medido; manter modelo inteiro, ids, conexões, seleção e histórico.
- [ ] Navegar/pesquisar/revelar blocos não montados; arrastar/desfazer/reabrir.
- [ ] Evitar análise semântica em movimentos visuais; medir tabela de símbolos em
  camadas e diagnósticos incrementais, sempre comparando com análise completa.
- [ ] Estresse de 10.000 blocos e Pac-Man; round-trip blocos/IR/código/source maps.

### 3. Pro em escala — pendente

- [ ] Auditar Monaco e serviços por arquivo; medir digitação, referências, rename,
  busca, imports, mapa, formatação, diff e navegação de erros sem remover diagnósticos.
- [ ] Testar e corrigir versões, patches, resultados obsoletos e dependências.
- [ ] Auditar fila do filesystem: ordem, conflitos, buffers, alterações externas,
  mutações em voo, troca de projeto/perfil e recuperação.
- [ ] Selecionar execução leve/completa/hospedada por capacidade real; evitar boot
  Node em Canvas sem dependências; manter terminal e HMR quando aplicáveis.
- [ ] Reconciliar limites editor/build/artefatos sem ampliá-los por conveniência;
  medir cópias e fontes/binários e validar referências de conteúdo.
- [ ] Integrar ferramentas nos painéis existentes, responsivos e com mesmas receitas.

### 4. Motores e streaming — pendente

- [ ] Inventariar pools, índices, culling, física, batching, animação, áudio e descarte
  existentes antes de modificar; medir fixture 2D extensa e fixture 3D genérica.
- [ ] Corrigir gargalos comprovados dos motores existentes e limites silenciosos.
- [ ] Integrar regiões versionadas: prefetch, ativação, descarte, estado persistente,
  coordenadas estáveis, falhas e permanência segura, orçamento e exportação.
- [ ] Testar regressões dos cursos e recursos GPU após ciclos de reinício/streaming.

### 5. Depuração — pendente

- [ ] Matriz explícita por executor: breakpoint, pause/continue/step, valores, pilha,
  arquivo/linha/bloco e estado de eventos; não exibir capacidades inexistentes.
- [ ] Integrar protocolos suportados aos source maps e painéis atuais, com limites
  de inspeção e sem avaliar código arbitrário no host ou instrumentação textual frágil.
- [ ] Avaliar tracing Python no worker e instrumentação estruturada do Clássico.
- [ ] Testar pausas, encerramento, revisão obsoleta e limites de valores/objetos.

### 6. Profiling — pendente

- [ ] Coleta opt-in por runtime: quadro/update/render, entidades, visíveis, física,
  recursos, draw calls/triângulos/GPUs quando disponíveis; medir custo da coleta.
- [ ] Separar medição/estimativa/indisponível; recomendações derivadas dos dados.
- [ ] Painel na identidade atual, comparação de sessões e contexto revisionado Zappy.

### 7. Testes do aluno — pendente

- [ ] Reusar contratos de objetivos para testes comportamentais editáveis no Clássico,
  independentes da solução de curso; isolar execução, limitar tempo/memória.
- [ ] Integrar testes selecionados/unitários/integração no Pro conforme executor e
  dependências; relatórios com arquivo/linha e sem escrever silenciosamente no projeto.
- [ ] Testes de chave/porta/vida/placar/fim e falhas de compilação/timeout.

### 8. Consumo de Pinta/Molda — pendente

- [ ] Conferir contratos disponíveis nas branches responsáveis sem alterá-los.
- [ ] Adaptadores versionados do lado do Studio, fixtures de contrato, preservar
  propriedades desconhecidas e referências; nunca achatar cena estruturada em imagem.
- [ ] Integrar mapa/camadas/objetos/colisões/animações/regiões e modelos/terreno/água/
  caminhos/conjuntos/marcadores/luz/material somente conforme contrato entregue.
- [ ] Discriminar dependências externas e testar importação, execução e exportação reais.

### 9. Persistência e recuperação — pendente

- [ ] Auditar journal, revisão local, partições, migrações e conflitos multiaba/perfil.
- [ ] Testar queda em cada borda de escrita, cliente antigo, arquivos ausentes,
  referências/versionamento, materiais, limpeza e desfazer/refazer.
- [ ] Conversão Clássico→Pro preserva cópia original e rastreabilidade; código Pro
  arbitrário permanece preservado quando não há conversão segura para blocos.

### 10. Fluxo profissional e homologação — pendente

- [ ] Builds/exportações reproduzíveis com arquivos, recursos, locks/config/instruções;
  publicação versionada e recuperação conforme contratos existentes.
- [ ] Histórico e comparação compreensíveis; avaliar Git opcional sem confundi-lo com
  histórico interno ou torná-lo obrigatório.
- [ ] Zappy recebe revisão exata, diagnósticos/valores/métricas reais sob demanda;
  alterações exigem ação explícita e revisão.
- [ ] Homologar A–H da missão: cursos, Clássico grande, 2D extenso, 3D genérico,
  Pro modular, Python e falhas; sessões prolongadas, responsividade e recursos.
- [ ] Manuais Clássico/Pro, capacidades, profiling/depuração, exportação, segurança,
  recuperação, medições antes/depois e limitações de hardware/acesso.
- [ ] Revisar diff e executar verificações finais; commits e PR sem merge/deploy.

## Evidência e limites

Os resultados históricos no README são da sessão anterior, não validações desta.
Vídeos/PDF e aparelhos físicos não foram acessados nesta sessão. Ausência de acesso
nunca deve virar marcação de teste aprovado. A matriz estática não substitui navegador,
e navegador emulado não substitui dispositivo físico de 8 GB ou GPU integrada.
