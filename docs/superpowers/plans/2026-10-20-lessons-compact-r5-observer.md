# Correção QA da supervisão local antes de Chrome

Escopo: somente ferramentas QA. Produto, memória aprovada, deadline de claim de10s, frescor2s, lock2s e prazos de cenário permanecem iguais. Nenhum plano operacional R5 será derivado antes de Root integrar/revisar as fontes e confirmar HEAD novo.

A tentativa real R4 iniciou o adapter Bun às02:18:47.745Z. Ele registrou falha preclaim às02:18:57Z; o supervisor só publicou handoff às02:19:05.829Z. Não houve import do cenário nem Chrome. O caminho caro era a própria supervisão: NewMonitor media raízes/base com consultas repetidas por PID/pai, repetia a árvore para cada raiz e depois GetObservation repetia o trabalho após iniciar o adapter. O monitor warmup tinha o mesmo custo por rodada, gerando intervalos observados próximos de5s.

O controle mínimo com18nós/3raízes reproduziu257consultas de inicialização e89por observação. São contagens do algoritmo com CIM inerte, não uma medição de latência Windows. O delta reduz para uma consulta Win32_Process na inicialização e duas por observação (processos + memória livre do SO). Uma mesma observação é compartilhada por validação, travessia BFS e medição; nunca é reutilizada entre rodadas. Só identidades na árvore própria são convertidas/persistidas. Retained SafeHandles e comparações de criação/executável/CLI continuam exigidos; erro/identidade divergente continua NEG.

Antes de native Start, o launcher prepara e retém o contexto existente Next/base e verifica a composição. Depois do Start, o watcher reutiliza esse contexto, exige observação positiva atual e verifica que o adapter ainda está vivo antes de publicar handoff/claim soblock. Preparar o contexto não autoriza executar cenário. O estado original SHA continua intacto até claim acknowledgement. Memória livre real é checada antes do lançamento e durante a execução; não há relaxamento de limiares nem garantia de hardcap.

Verificação neste lote:

1. Controle snapshot: RED257/89 → GREEN1/2, métricas invariantes, unknown e identidade alterada recusados.
2. Launcher real em pwsh novo: CIM inerte, retained handle apenas do próprio processo de teste e native Start substituído por sentinela. Exige os dois snapshots (init + observação) concluídos antes do Start; não inicia processo/app/Chrome nem persiste credencial.
3. Controles já existentes de memória/latch, sintaxe PS e diff check. Testes que iniciam aplicativos não pertencem a esta preparação.
4. Root revisa/integrará o commit QA; só então confirma HEAD e manda preparar cache R5 novo com fontes/pins atuais. Preservar R4 e sua falha, cleanup e recibos originais.
5. R5 reaproveita os dois fixes de integração R4: importar browser-watch antes de Next Start e guardar falhas de inicialização pósclaim com NEG/stop normal. Nenhum approval/binding/state será copiado.
6. Root concede a tentativa real serial, registra latência de amostra/handoff e executa Admin→Kids. Somente essa execução poderá qualificar frescor e desempenho neste computador; os controles atuais não provam que o editor/duas abas cabem no perfil.
