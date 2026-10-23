# Correções da revisão das oficinas ao vivo

Rodada de correções de 14/10/2026, baseada no [relatório original](architectural-analysis-2026-10-14-live.md). Os oito defeitos receberam correções e regressões automatizadas. A continuidade entre encontros, o painel docente e os dois pontos de escala também foram implementados. A conferência visual e o ensaio em infraestrutura real continuam pendentes.

## Defeitos corrigidos

| Achado | Comportamento atual | Evidência principal |
| --- | --- | --- |
| 1. Recusar ajuda descartava edição | Recusa de pedido pendente preserva epoch, dispositivo e projeto. Transferência efetiva conserva snapshots locais antes de aplicar revisão remota. | `members/tests/unit/live-workspace.test.ts`; `community-kids/tests/live-workspace-review.test.tsx` |
| 2. Autosave indicava sucesso antes da confirmação | Adapter aguarda confirmação remota; journal IndexedDB guarda snapshots imediatamente, inclusive no flush de saída. Recarga permite recuperar, comparar ou baixar; revisão posterior nunca é sobrescrita automaticamente. | `studio/src/persistence/service.test.ts`; `member-shell/tests/live-workspace-drafts.test.ts`; teste de interface acima |
| 3. Parada com falha não era repetida | Reconciliador inclui intenção `stopped` até confirmação `review`. Falhas de reconciliação são registradas e novas tentativas preservam a identidade do job. | `members/tests/db/live-review-regressions.test.ts`: falha inicial, volta do gravador, callback autenticado e estado final de revisão |
| 4. Pedido sem resposta bloqueava a gravação | Professora solicitante cancela pelo requestId; pedidos pendentes expiram em 60 segundos. Ajuda ativa continua exigindo pausa comprovada. | Unitários de workspace e regressão com PostgreSQL/provider real |
| 5. Prazo não encerrava ocorrência | Sweep transacional encerra ocorrência, retira permissões de fala e aciona reconciliação. Consulta de sala também corrige prazo vencido. | Unitário de deadline, regressão de ciclo de vida e testes de gravação |
| 6. Replay antigo não podia ser retirado | Histórico endereçado por occurrenceId, autorizado na mesma aula; revisão e retirada usam a versão do item exato. | Regressão de reposição e retirada histórica |
| 7. Agenda exibia data original | Catálogos Kids/responsáveis/Admin exibem o horário da ocorrência atual. A janela comercial original permanece independente. | Contrato de catálogo, teste de reposição e bindings dos três hosts |
| 8. Chat pausado bloqueava professora | Pausa bloqueia envio infantil; professora envia avisos enquanto a sala está operacional e conectada. Limite de texto coincide com o servidor. | `member-shell/tests/live-classroom-state.test.ts` e composição de `LiveClassroom` |

Também foi corrigido o guard HTTP que impedia uma professora com papel `staff` de publicar uma gravação da sua turma. Alterar configuração continua restrito a administradores; professora não atribuída continua sem acesso. Há regressão HTTP específica.

A retirada de replay impede novas autorizações. URLs assinadas anteriormente continuam sujeitas ao TTL já emitido, limitado a cinco minutos e ao prazo restante da aula.

## Lacunas funcionais e escala

- **Mesmo projeto em vários encontros:** `continueProjectFrom` referencia um encontro anterior do roteiro congelado. O workspace mantém a identidade da aula de origem; o contexto autorizado da operação identifica a aula atual. Não há cópia de projeto, nem reabertura de conteúdo expirado. Teste em PostgreSQL comprova projeto/revisão preservados, primeira aula expirada, ajuda na segunda ocorrência e um único item na biblioteca.
- **Painel docente:** componente próprio com etapa, salvamento, presença, pedidos ordenados e ação contextual. Menus individuais preservam fala, mute, travas, mão e retirada com confirmação. O teste renderiza oito participantes e exerce acompanhamento e moderação. Telemetria tem carimbo do servidor e perde validade após 15 segundos; é uma indicação operacional, não prova de aprendizagem.
- **Cursor:** botões e blocos são referenciados por identidade, com posição relativa ao alvo. A criança resolve o alvo na própria tela e revisão; alvos ausentes, ocultos, recortados ou de outra revisão não recebem um cursor falso. Não há espelhamento forçado da rolagem ou do arquivo que a criança está olhando. O teste cobre redimensionamento e alvo fora da tela. A indicação semântica de botões da aula continua disponível.
- **Catálogo:** filtros de visibilidade e cursor são aplicados no PostgreSQL antes de carregar agregados. Página padrão de 20 turmas, máximo de 50, com ação de carregar mais nos catálogos. Testes cobrem filtro antes da paginação e ausência de repetição. O catálogo de programas continua separado das páginas de turmas.
- **Concorrência:** removido advisory lock global. Aceites disputam lock da professora; operações de workspace mantêm a ordem conta → turma → workspace. PostgreSQL comprova salvamento em turma independente e exclusão de dois aceites simultâneos da mesma professora.

Não foi necessária nova migração nesta rodada. A implementação inicial ainda depende das migrações `0102`–`0106` pelo fluxo normal de implantação.

## Verificação desta rodada

| Escopo selecionado | Resultado |
| --- | --- |
| Members: domínio, HTTP, materiais, publicação, mídia, aprendizagem e PostgreSQL das oficinas | 74 testes aprovados |
| member-shell: cliente, acesso, BFF, materiais, mídia, painel e journal | 29 aprovados |
| Studio: persistência, observação, editor, preview e capa isolada | 62 aprovados |
| Kids: oficinas e regressões de aulas gravadas, rascunhos e oito participantes | 41 aprovados |
| Gravador: contrato, Chromium/FFmpeg e efeitos | 6 aprovados |
| Supervisor | 5 aprovados |
| Hub: acesso e Mural | 57 aprovados |
| Core: políticas de acesso e supervisão | 3 aprovados |
| **Total selecionado, sem somar repetições** | **277 aprovados** |

Builds finais de produção: **Admin aprovado (58 páginas)** e **Kids aprovado (72 páginas)**, incluindo compilação e checagem TypeScript dos hosts. TypeScript também passou em Members, Studio, member-shell, gravador e supervisor. `biome check` passou nos 43 arquivos de produção selecionados, sem erros ou avisos; `git diff --check` passou. Os builds finais estão nos logs `admin-build-corrections.log` e `kids-build-corrections.log`.

Logs das execuções agrupadas estão em [live-review-2026-10-14](live-review-2026-10-14/), com sufixo `corrections.log`. As reproduções do defeito anterior foram preservadas como `.historical.txt`; as expectativas corrigidas agora pertencem às suítes dos pacotes. Os testes de preservação e encerramento foram exercitados com falha antes da correção e sucesso depois.

Os testes de interface usam DOM de teste e fronteira simulada do Studio quando o foco é a coordenação do host. O Studio também tem testes próprios com serviço e store reais. Isso não comprova fechamento abrupto do navegador nem aparência final. A suíte de preview em happy-dom emite `NotSupportedError` por scripts `data:` desabilitados nesse ambiente; terminou com zero falhas. A captura automatizada usa Chromium/FFmpeg reais com armazenamento de teste.

## Pendências externas

O Browser da sessão respondeu `No browser is available`; a descoberta retornou lista vazia. A conferência renderizada das paletas, teclado, foco, diferentes larguras e equipamentos continua pendente. Os componentes reutilizam os tokens e componentes visuais existentes, sem alegar validação visual concluída.

Antes de abrir uma turma real, permanece o ensaio Linux/Railway/Cloudflare/R2 com oito aparelhos, perda de rede/supervisão, gravação seletiva e medição de consumo. Não houve deploy, alteração de produção nem contratação. `LIVE_MEDIA_READY=false` continua fechado. A limitação já documentada de recuperação operacional após reinício do gravador permanece; a falha transitória do comando de parada foi corrigida separadamente.
