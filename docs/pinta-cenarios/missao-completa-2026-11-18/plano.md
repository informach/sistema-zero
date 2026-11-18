# Conclusão funcional da missão do Pinta

Plano de execução aprovado pelo pedido de concluir a missão, mantendo sua ordem e identidade
visual. Parte de staging `4fe2aac0f`, na branch isolada `pinta-missao-completar-20261118`.
As alterações em andamento de Molda no worktree principal não fazem parte desta entrega.

## Arquitetura e critérios globais

- Evoluir documento, stores, ferramentas e componentes existentes; um único editor.
- Autoridade offline e CAS da issue 026 são obrigatórias em todo novo formato/migração.
- Recursos novos que um leitor anterior perderia exigem capacidade/formato novos e guards
  no documento, host, arquivos e backend. Formatos antigos conservam seus bytes e comportamento.
- Dados autorais são separados de geometria/render, interface, comportamento e exportação.
- Limites dependem de orçamento verificável de células, imagens, histórico, render e salvamento.
- Cada destino precisa consumir os mesmos dados completos; não entregar seletor sem suporte.
- Provas de navegador, motor nativo, ambiente autenticado e aparelho físico são distintas.
- Não declarar completo teste que requer conta/dispositivo/participante ainda indisponível.

## Execução, na ordem da missão

- [x] 0a. Reauditar staging e recuperar matriz R01–R33 e critérios originais.
- [ ] 0b. Acrescentar ensaio de implantação gradual/rollback de versões e executar o ciclo
  autenticado entre clientes de staging quando as contas de teste estiverem disponíveis.
- [x] 1a. Corrigir teto real do cache e medir mapas ruidosos; liberar autoria 256 × 256,
  32 camadas e 256 peças dentro de 2.097.152 células. Integrar criação, operações, limite de
  aulas, feedback e navegador, conservando migração e todas as ferramentas anteriores.
- [ ] 1b. Referências autorais a animações e versões de recursos: definir resolução e
  retenção reais; integrar edição, histórico, biblioteca e formato protegido.
- [ ] 2a. Fechamento completo de recursos visuais e lógicos no contrato compartilhado;
  render/animação/ordem/propriedades em Jogo2D, Avançado, Python e atualização sem apagar programa.
- [ ] 2b. Geometria física comum para formas, transformações livres e colisões de conjuntos;
  integrar os consumidores e seus testes, sem programação dentro do Pinta.
- [ ] 3. Ensaiar pintura inteligente com várias folhas: pincel, balde, linha, retângulo,
  transição, prévia, determinismo, vizinhos, undo/redo e cancelamento em navegador.
- [ ] 4a. Arrasto da biblioteca com prévia, drop válido e cancelamento; encaixe e bloqueio.
- [ ] 4b. Pincel de objetos/conjuntos: densidade, afastamento, semente, prévia e um histórico
  por gesto; manter diferença entre conjunto vinculado e cópia independente.
- [ ] 5. Completar ferramentas profissionais autorais e seus consumidores: caminhos, zonas,
  portas, marcadores, colisões, animações, propriedades, regiões, profundidade e parallax.
- [ ] 6. Auditoria funcional de teclado/foco/cancelamento e mouse/toque, componentes atuais;
  fluxo infantil e testes em desktop, toque e CPU reduzida nesta máquina, conforme a
  disponibilidade informada pelo usuário. Testes com participantes são evidência distinta.
- [ ] 7a. Evoluir contratos externos e fixtures para dados novos: Tiled JSON/TMX/TSX reais,
  pacotes Phaser/Pygame e Godot; preservar PNG/SVG/.pinta.json/ZIP e relatórios de conversão.
- [ ] 7b. Executar ferramentas nativas e Godot com render visual; repetir round-trip e jogos.
- [ ] 8a. Documento e persistência incremental por chunks, cache/culling estritamente orçados,
  navegação, mapas expansíveis e recuperação; medir heap, buffers e tempo, sem prometer hardware.
- [ ] 8b. Automapping em várias camadas: regras autorais, prévia, determinismo e histórico.
- [ ] 8c. Isométrico e hexagonal: contratos próprios, coordenadas/picking, desenho, objetos,
  colisão e adaptadores reais; não apenas opções de interface.
- [ ] 9. Executar os dez passos da Vila e Floresta como um ciclo: autoria livre de16+
  camadas, múltiplas folhas, arte animada, portas, conjuntos, reabertura, Estúdio/programa,
  atualização, externos, falhas/migração e conflitos. Regressão de PyDew Valley.
- [ ] 10. Revisar mudanças, executar gates e atualizar arquitetura, guias e matriz com provas.
  Commitar entregas verificadas; integração/push de staging seguem a autorização do usuário.

## Primeiro lote: autoria ampliada com memória limitada

Arquivos: `src/tiles/chunks.ts` e testes; `src/core/projectConfig.ts`, operações de mapas,
grupos e tilesets, componentes de camadas, limites de aulas e testes de conformidade.
Um canvas de chunk é emprestado apenas até a próxima consulta ao cache: o render o consome
imediatamente. A política pode reciclar canvases já desenhados, sem manter todos os blocos
de todas as camadas no mesmo frame. Um orçamento por frame não aumenta o teto de retenção.

Aceite: pixels e animação iguais, camadas numerosas renderizadas, cache retido dentro do
orçamento, pressão/working set explícitos, nenhum corte no save/reopen, budget de células
em todas as mutações, criação de 16 camadas pela UI e medidas de render/autosave com dados
ruidosos no Chromium. Exportações mantêm seus próprios tetos até o lote 2 validá-los.

## Registro de execução

- Auditoria inicial: o cache de 32 MiB usava `Math.max(budget, frameBudget)` e podia reter muito
  mais que o teto. A autoria ficava em 8/128/64 embora o leitor já aceitasse 32/256/256.
- Lote 1a implementado: autoria ampliada, cache com retenção fixa e reciclagem de canvases,
  orçamento próprio das aulas preservado com recusa transacional e aviso na interface.
  [Evidências e medições](qa/autoria-e-orcamento.md).
- Conta de staging fornecida e login validado, incluindo autorização temporária deste
  navegador e entrada infantil no Pinta. O usuário informou disponibilidade somente desta
  máquina e autorizou simulações; desktop, toque emulado e CPU 4× mais lenta foram exercitados.
- O pior caso medido exige otimização na etapa 8 e transporte maior/mais eficiente no lote 2;
  isso não está sendo confundido com fluidez em hardware de entrada nem com compatibilidade
  de todos os mapas máximos em todos os destinos.
