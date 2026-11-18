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
- [x] Indexar o texto dos PDFs dos dois cursos (48 páginas), com leitura dirigida e
  cinco páginas visuais completas; registrar hashes sem alterar os originais.
- [x] Executar matriz e projetos protegidos neste Windows; 43 + 15 testes aprovados.
- [x] Executar os 399 gestos no navegador, comparar as fontes e registrar 13 capturas
  de depois, preservando as capturas anteriores; inspeção visual representativa.
- [x] Aprovar 49 objetivos de estrutura e 17 de execução pelo executor real do servidor.
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

- [x] B1: materializar buffers e salvar antes de Rodar/Rodar de novo; falha mantém
  código e impede nova execução; Parar cancela a intenção sem cancelar a gravação.
- [x] Testar edição/troca de projeto/desmontagem enquanto salva, clique duplo,
  erro de cota, observador, geração de escritor e confirmação assíncrona do host.
- [ ] Homologar troca real de perfil no app conectado durante um salvamento.
- [x] Medir atraso/clique nos três engines de laboratório e discriminar o headless
  shell do Chromium completo; artefatos e ambiente versionados.
- [ ] Completar medição de processo, tempo de Parar e salvamento em todos os engines
  durante programa hostil; o reinício nativo ainda reprova no Chromium 148.
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
Vídeos e aparelhos físicos não foram acessados nesta sessão. Os PDFs estão inventariados
em `evidencias/pdf-inventario.json`, com o alcance real da inspeção. Ausência de acesso
nunca deve virar marcação de teste aprovado. A matriz estática não substitui navegador,
e navegador emulado não substitui dispositivo físico de 8 GB ou GPU integrada.

## Critérios de conclusão por etapa

Acrescentado em 18/11/2026 (a lista de tarefas acima não dizia quando uma etapa termina).
Uma etapa só passa a "concluída" com TODOS os critérios dela atendidos e com a evidência
versionada. Vale para todas: as cinco aulas protegidas passam (399 gestos, 66 objetivos, projetos
finais iguais), a matriz de compatibilidade não é regravada e nenhum teto de payload sobe.

| Etapa | Está concluída quando |
|---|---|
| 0. Linha de base | Verificar, Enviar e Concluir conferidos numa aula de cada curso na página real de homologação. Tabela de capacidades dos dez runtimes com a fonte de cada linha. Linha de base medida e versionada para 80, 500, 2 mil, 5 mil e 10 mil blocos, para um projeto Pro modular e para um jogo de cada motor (abrir, editar, rodar, memória depois de 10 ciclos de Rodar e Parar). Metas p50 e p95 escritas com a máquina e a fixture de cada número. |
| 1. Isolamento | Os cinco programas hostis passam no Chromium, no Firefox e no WebKit, em Linux e em Windows: o editor responde em menos de 500 ms, o Parar para em menos de 5 s e o conserto roda em menos de 15 s. Nenhum Rodar perde edição: recarregar logo depois de rodar traz o último código. Troca de perfil com gravação em voo conferida no app. B2 e B4 com decisão registrada (feito, ou não feito com a medição que justifica). |
| 2. Clássico em escala | Com 5 mil blocos: abrir em menos de 8 s, mover uma área sem tarefa de mais de 500 ms, editar um campo sem tarefa de mais de 200 ms. Com 10 mil: abre, edita e gera o mesmo código do caminho sem montagem sob demanda. Mostrar o bloco, desfazer e refazer funcionam em bloco que estava fora da página. Abaixo do limiar nada muda (as aulas não entram no caminho novo). |
| 3. Pro em escala | Projeto modular de 60 arquivos: digitar com p95 abaixo de 50 ms, abrir painel abaixo de 150 ms, primeira resposta da busca abaixo de 200 ms, medidos e versionados. Nenhum resultado de análise de versão antiga aparece. A fila de arquivos passa os testes de ordem, conflito e troca de projeto. A escolha de execução (leve, completa, hospedada) é pela capacidade real e está documentada. |
| 4. Motores e streaming | Fixture 2D extensa e fixture 3D genérica com quadro medido antes e depois. Cada gargalo corrigido tem o perfil que o apontou. Regiões carregam, ativam e descartam sem crescer a memória em 10 ciclos. Os jogos dos cursos rodam iguais. |
| 5. Depuração | Matriz por executor publicada, e a interface só mostra o que o executor tem. Onde há suporte: pausar, continuar, passo, ver valores e pilha, com arquivo, linha e bloco. Encerrar no meio de uma pausa não deixa o executor preso. |
| 6. Profiling | Coleta desligada por padrão, com o custo dela medido (menos de 5% do quadro). Cada número marcado como medido, estimado ou indisponível. Painel na identidade atual. |
| 7. Testes do aluno | O aluno escreve, roda e vê o resultado de um teste no Clássico e no Pro, com tempo e memória limitados e sem escrita escondida no projeto. Casos de chave, porta, vida, placar e fim de jogo, mais falha de compilação e de tempo. |
| 8. Pinta e Molda | Adaptadores do lado do Estúdio com fixtures dos contratos entregues. Importar, rodar e exportar um cenário 2D e um 3D reais. Propriedade desconhecida é preservada. Nenhuma cena estruturada vira imagem achatada. |
| 9. Persistência | Queda simulada em cada borda de escrita não perde nem duplica projeto. Duas abas e dois perfis não se sobrescrevem. Cliente antigo lendo projeto novo não destrói dados. Clássico para Pro guarda a cópia original. |
| 10. Fluxo profissional e homologação | Exportação reproduzível conferida fora do Estúdio. Cenários A a H da missão homologados com registro do que foi local, emulado ou não verificado. Manuais do Clássico e do Pro escritos. PR sem merge nem deploy. |
