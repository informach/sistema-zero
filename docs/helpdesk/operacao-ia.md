# Operação do Helpdesk com conhecimento e IA

Implementação da [proposta revisada](../plans/2026-10-15-helpdesk-ia-kb-proposta-revisada.md), com autorização para atualizar todos os consumidores juntos. O atendimento automático começa **desligado**. Merge local não ativa piloto, não conecta Gmail e não configura provedor.

## Publicar conhecimento

1. Staff cria um artigo Markdown com público, produto, origem e responsável. Não transcrever dados pessoais de tickets nas lacunas.
2. Cada gravação cria revisão imutável. O worker gera trechos e índice textual em português. Falha/interrupção tem lease e três tentativas; a equipe pode solicitar nova indexação.
3. Admin confere conteúdo, público, produto e validade futura antes de publicar uma revisão pronta. Editar rascunho não altera o conteúdo publicado. Retirada/arquivo impede novas respostas e consulta pública das fontes antigas.
4. Usar **Testar** para conferir resposta, cobertura, trechos e uso. O teste não envia mensagem. Revisar conflitos em vez de escolher arbitrariamente uma versão.

`staff_only` nunca entra na resposta automática. Os portais usam `customer_adult`/`customer_parent`, além de `customer_all`, com produto compatível. Artigos privados de cursos não são indexados. Importação de arquivos/crawler/vetores não faz parte deste incremento.

## Copiloto e atendimento

O editor da equipe começa vazio. Inserir rascunho é uma ação explícita, registrada contra a execução; regenerar não apaga texto escrito. O envio guarda o ID do rascunho e se foi editado. Histórico da IA mostra as últimas 20 execuções do ticket, incluindo sombra, fontes e uso.

`triage=human` continua significando atendimento, enquanto `handlingMode` distingue equipe e assistente. Respostas automáticas aparecem com autoria de IA, fontes e ações **Falar com a equipe**, **Não ajudou** e **Resolveu meu problema**. Confirmação é explícita; uma nova mensagem após resolução reabre para a equipe.

O bot só publica em ticket nativo do portal sem thread Gmail. Não cria aviso por e-mail. Resposta humana do portal continua gravando mensagem e outbox na mesma transação; e-mail usa intenção persistida e reconciliação por Message-ID. Estado incerto nunca autoriza reenvio automático.

## Ativação controlada

Admin define temas permitidos, porcentagem estável de contas, orçamento diário em USD, reserva por tentativa e limite diário por conta. A reserva deve cobrir o custo medido para o modelo e os tamanhos máximos de contexto/saída; é uma estimativa conservadora, não uma garantia de faturamento do provedor. Custos desconhecidos não liberam orçamento. O painel separa custo confirmado e reservado, usando dia UTC.

- **Desligado:** nenhum envio automático. Pode-se preparar parâmetros para avaliação.
- **Sombra:** gera e registra, sem responder ao cliente e sem retirar o caso da equipe.
- **Piloto:** exige relatório administrativo de avaliação realizada há até 30 dias (reimportar não renova o prazo), mesmo modelo/prompt/índice e hash dos parâmetros operacionais. Exige ≥100 decisões, todas revisadas, ≥95% corretas, recall top-6 ≥90%, zero erro crítico, provas determinísticas aprovadas e p95 ≤30 s. Alterar temas, coorte, orçamento ou limites exige nova avaliação.

Não ampliar a coorte sem revisar as primeiras respostas e medir a capacidade humana de receber transferências. O corpus sintético entregue não constitui aprovação editorial nem resultado medido de LLM. Tickets reais só entram em avaliação depois de autorização, minimização e prazo de retenção definidos.

Limites fixos: três respostas automáticas e um esclarecimento por ciclo; prazo de 60 s por geração; lease de 30 s e até duas tentativas de transporte. Assunto financeiro/jurídico, pedido humano, ausência/conflito de fonte, alteração de política, falha, prazo ou limite transfere para a equipe. A automação não dispõe de ferramentas para alterar contas, senhas, pagamentos ou progresso.

## Concorrência e recuperação

Inbound, mensagem, comando idempotente e agendamento persistem juntos. Repetir a mesma chave e conteúdo devolve o resultado; conteúdo diferente com a mesma chave é conflito. Retenção da chave: 90 dias. O cliente conserva a chave durante tentativas do mesmo comando.

Publicação bloqueia política → ticket → job → artigos ordenados e verifica geração, epoch, lease, deadline e revisão pública atual. Intervenção humana, nota, atribuição e patch operacional invalidam o epoch na mesma transação. Apenas leitura não assume o ticket. Rede/provedor ficam fora da transação.

Polling usa até 50 mensagens por página, cursor de sequência persistida, dedupe por ID, pausa em aba oculta, cancelamento e backoff. A sequência avança também quando entrega muda de estado; data de uma mensagem importada não define a ordem incremental. O backend filtra notas e envios incertos do portal.

No handoff, SLA humano usa o início da automação. Novas mensagens enquanto a equipe ainda não respondeu não reiniciam o relógio. Uma resposta humana/novo ciclo retoma a regra normal. Cursor de fila foi versionado junto com a alteração da ordenação.

## Diagnóstico e desligamento

Configurações mostra fila ativa/vencida, leases vencidos, maior espera, índices pendentes/falhos, fontes vencidas e avisos em retry. Métricas separam teste, classificação, copiloto, sombra e piloto; incluem custo conhecido/desconhecido, p50/p95 da inferência, tempo total do piloto, handoffs e primeira resposta humana, uso do rascunho e correção de lacunas.

Resolução confirmada é evento do cliente. Durável exige sete dias completos sem reabertura no mesmo ticket. Não correlacionar automaticamente tickets diferentes nem considerar silêncio como sucesso. Amostras sem observações não estabelecem linha de base; conferir as contagens junto com as latências.

**Desligar automação** impede novos commits imediatamente após a política persistir. Watchdog encaminha jobs antigos sem depender de disponibilidade do LLM. Acompanhar `automation.jobs_expired`, `automation.expiration_failed` e `automation.worker_failed` no mecanismo de logs/Sentry já existente. A saúde do atendimento humano não depende do provedor.

## Retenção e implantação

Execuções, feedback, resumos, classificações e rascunhos derivados: `AI_RUN_RETENTION_DAYS=30`, máximo 90. Jobs terminais e reservas associadas seguem essa janela; jobs ativos permanecem para recuperação. Comandos idempotentes, eventos de resolução, políticas históricas e avaliações antigas não utilizadas: 90 dias. Outbox entregue mantém a retenção existente. Conversas, fontes editoriais e suas revisões continuam sob a política principal de dados do Helpdesk; não são cópias descartáveis de inferência. Evidências públicas guardam IDs e rótulos, sem duplicar texto dos trechos.

Executar migrations geradas pelo Drizzle e implantar backend, gateway, contratos, console, Community e Kids de forma coordenada. A ausência de usuários permite atualizar o contrato diretamente; não há suporte para combinação de clientes antigos. Sem chave/modelo, atendimento humano continua disponível e não se ativa automação.

Testes com PostgreSQL exigem `HELPDESK_TEST_DATABASE_URL` apontando para banco descartável cujo nome contenha `helpdesk_test`. Nunca usar banco de produção: as suites truncam tabelas. Ver [procedimento da avaliação](../../packages/helpdesk/evaluation/README.md) e [registro dos lotes](../superpowers/plans/2026-10-15-helpdesk-ia-kb-implementacao.md).
