# Auditoria do insta-p8 para aproveitamento no marketing

15/10/2026, horário de São Paulo. Origem: `C:/Users/tocha/Downloads/insta-p8-main/insta-p8-main`. Objetivo: distinguir recursos aproveitáveis, limitações do snapshot e compatibilidade com a reestruturação do Sistema Zero. [Proposta de produto e integração](../docs/plans/2026-10-15-insta-p8-aproveitamento-marketing.md).

## Escopo, método e limites

Inventário integral de 154 arquivos, com tamanho e SHA-256. Análise sintática e grafo de imports dos 110 arquivos JS/TS, totalizando 12.575 linhas físicas. Leitura aprofundada das 13 rotas, webhook, clientes Instagram/IA, sessão, schema/migração, telas e formulários de negócio, além do plano e das fontes editoriais relevantes do Sistema Zero. Primitivos visuais foram inventariados e analisados estruturalmente; não foi feita validação visual/interativa de cada componente.

Foram executadas sete sondagens comportamentais contra o código real transpilado, com banco/API substituídos por doubles locais, e os dois scripts de verificação fornecidos pelo projeto. Todas as dependências de rede dessas execuções foram isoladas. Nenhum token real, chamada Meta, Supabase, deploy ou publicação foi utilizado. Não instalei dependências do snapshot nem executei build, typecheck completo ou aplicativo no navegador.

Não há `.git` no diretório fornecido. A análise se refere a esse snapshot, não a uma versão remota ou commit presumido. Configurações locais potencialmente sensíveis entram somente no inventário de caminhos/tamanhos/hashes; não foram usadas como credenciais.

- [Inventário](insta-p8-marketing-2026-10-15/inventory.json).
- [Evidências reproduzíveis](insta-p8-marketing-2026-10-15/evidence.json).
- [Programa de inspeção e sondagens](insta-p8-marketing-2026-10-15/inspect.cjs).

Reprodução, na raiz do Sistema Zero: `node .audits/insta-p8-marketing-2026-10-15/inspect.cjs`. O script depende do compilador TypeScript 5.9.3 já instalado no monorepo. Ele lê o snapshot e grava somente os artefatos de auditoria.

## Veredito

Boa referência de produto para automação curta de Instagram, com recursos concretos além do README. Base inadequada para adoção direta em produção sem reconstruir identidade, autorização, processamento durável, estado de conversa e atribuição. O Sistema Zero já possui arquitetura mais consistente para autenticação, tokens, publicação e colaboração planejada.

Não proponho corrigir ou limpar o repositório de terceiros. O valor da auditoria é orientar o que reproduzir e o que evitar na implementação própria.

## Arquitetura encontrada

Fluxo central: interface React → rotas Next → Supabase com service role → API Instagram. Webhook executa resolução de conta, consultas, matching, verificação de seguidores, respostas públicas/privadas, IA e gravações dentro da requisição HTTP.

Há 12 tabelas declaradas no schema. `automations.response_content` concentra opções heterogêneas em JSON. `users` mistura identidade Instagram, token, configuração de IA e conhecimento comercial. Não há identidade de projeto/editorial, edição aprovada, campanha vinculada ao funil ou operador responsável pela conversa.

Pontos positivos observados:

- Validação HMAC do corpo bruto, comparação em tempo constante e challenge do webhook.
- Helpers de envio com timeout e retorno estruturado; sem depender de UI para detectar erro HTTP.
- Matching por mídia e fonte, suporte a botões e separação de resposta pública/privada.
- Contador atômico persistente para uma condição de desbloqueio, reconhecendo o problema de memória local em serverless.
- Espera explícita por gravações de inbox antes de encerrar o webhook e dois scripts que verificam comportamentos selecionados.
- Regra duplicada nasce pausada na API; formulário detalhado apresenta resumo e prévia.

Esses pontos não compensam os problemas de autorização e entrega abaixo. São ideias e requisitos reaproveitáveis, não evidência de prontidão operacional.

## Achados prioritários

Os caminhos desta seção são relativos à origem; as linhas foram conferidas no snapshot. “Reproduzido” significa execução local com doubles, não exploração de uma instalação externa.

| Gravidade | Achado e evidência | Impacto na decisão |
| --- | --- | --- |
| Crítica | `lib/supabase-server.ts:11` usa `SUPABASE_SERVICE_ROLE_KEY`. Rotas como `app/api/automations/route.ts:6`, `:29`, `:77`, `:117` aceitam IDs do cliente sem autenticar/autorizar o ator | Não reutilizar essas rotas. A service role não torna `userId` confiável e as políticas RLS não substituem autorização nessa camada |
| Crítica | `app/api/inbox/messages/route.ts:6` consulta por `conversationId`; `inbox/send/route.ts:7` escolhe o dono/token pelo corpo | Risco de leitura ou envio em escopo alheio se a instalação expuser os handlers como estão. Não houve acesso a dados reais |
| Alta | Cookie JSON sem assinatura e sem `HttpOnly` em `instagram/callback/route.ts:121`; sessão visual em localStorage; sem `state` no authorize/callback consultados | A conexão Instagram está confundida com autenticação do operador. Reusar auth/gateway do Sistema Zero |
| Alta | `groq/auto-reply/route.ts:27` permite alterar URL/base/modelo pelo `userId`; `lib/ai-reply.ts` envia chave para essa URL | Combinação abre risco de destino arbitrário e exposição de chave; não transportar esse padrão. Constatação estática, sem teste contra endpoint externo |
| Alta | Tokens/chave de IA em texto no schema (`schema.sql:30`, `:36`); URL completa com token em `instagram/media/route.ts:29`; políticas públicas de upload/exclusão em `schema.sql:235`, `:245` | Reusar secret-box, logs saneados e armazenamento autorizado; não copiar schema/policies |
| Alta | Um mesmo evento DM reprocessado gera dois envios; `messages.id` duplicado não impede o efeito externo | **Reproduzido.** Precisamos de deduplicação de evento, transição transacional e outbox |
| Alta | `webhook/route.ts:276` abandona a entrada quando não existem automações ativas, antes de inbox/IA/ice breakers | **Reproduzido para inbox/IA.** Atendimento deve funcionar independentemente de campanhas |
| Alta | Ramo story (`:418`) e ramo DM (`:503`) podem responder ao mesmo evento | **Reproduzido:** um evento gera duas respostas quando as duas regras casam |
| Alta | Erro do banco termina em HTTP 200 `{ok:true}` no catch (`:890`), sem fila durável | **Reproduzido.** O provedor pode entender que o evento foi aceito apesar da perda do trabalho |
| Alta | Resposta pública antecede confirmação da DM (`:403`); retornos de envio em comentários não viram estado operacional persistido | **Reproduzido:** confirmação pública mesmo com falha privada simulada. O atendimento não sabe o que precisa recuperar |
| Alta | Não há estado persistido de janela elegível, pausa humana, pedido de parar ou revisão aprovada da resposta | Falta central para as saídas H01/A01/S01/C01 de nosso fluxo; handlers isolados não implementam um percurso confiável |
| Média | `keywordMatches`, `webhook/route.ts:77`, usa `\b` e regex sem normalização Unicode | **Reproduzido:** FERIAS não casa FÉRIAS; OLÁ não casa OLÁ. JEITO/jeito funciona. Relevante para MC07 e linguagem portuguesa |
| Média | Envio + gravação de mensagens é repetido em vários ramos; chamadas de comentários/stories não entram no mesmo histórico de saída das DMs | Métricas e histórico ficam incompletos; erro corrigido em um ramo pode persistir nos demais |
| Média | `lib/unlock-tracking.ts` retorna 1 quando o RPC falha; o webhook limpa o contador ao exceder o teto (`:726`) | Limite pode reiniciar e permitir novos ciclos. A função SQL incrementa atomicamente, mas não implementa o TTL descrito nos comentários; depende da limpeza externa |
| Média | Migração em cold start usa `exec_sql` (`lib/supabase-migrate.ts:56`), cuja criação não foi encontrada no snapshot; marca `_migrated` depois de abortar por erro | Inicialização não comprova schema completo; preferir migração versionada fora do webhook |
| Média | `ice-breakers/route.ts` apaga/reinsere antes de sincronizar; em falha remota retorna `success:true` com warning | Estado salvo e estado remoto podem divergir; a UI mostra sucesso sem reconciliação suficiente |
| Média | AI fallback usa contexto livre/histórico e orienta “never reveal you are AI” (`lib/ai-reply.ts:33`) | Incompatível com identificação de automação e fonte/aprovação de oferta do Sistema Zero |

Outras inconsistências: prioridade usa `.find()` sem ordem explícita entre regras equivalentes; “reply_all” global é configurável no formulário, mas o matcher de comentários contempla reply-all específico e keywords globais; payload de postback é gerado no POST e convertido para minúsculas no PUT, enquanto o matcher faz comparação exata; mídia + texto tenta dois envios na função unificada, sem distinguir restrições da primeira resposta privada. Não foram exercitadas contra a API real.

## Diferença entre interface anunciada e comportamento presente

- **Inbox “ao vivo”:** `ConversationList.tsx:18` carrega ao montar/trocar usuário; `ChatWindow.tsx:26` ao selecionar conversa. Não encontrei polling, streaming ou subscription. A busca de conversas não tem filtragem ligada ao input. “Online via Instagram” é texto fixo, não presença observada.
- **Insights:** `app/dashboard/analytics/page.tsx` contém placeholders. O painel principal tem consultas reais, mas “Audience reached” conta conversas e “Messages sent” junta envios humanos/bot registrados. Não há clickstream, lead, venda ou coorte.
- **Criação de campanhas:** a página principal usa `QuickAutomationForm` para criar regra ativa sem mídia específica. `CreateRuleForm` aparece na edição. `AutomationList` contém duplicação/agrupamento, mas não é importado pela página corrente. Não confundir a existência do componente com UX disponível.
- **Sequências/agendamento:** `webhook_events`, `dm_queue`, `content_pool`, `scheduler_config`, `reels_posts` e `follow_up_steps` aparecem no schema/migração, mas não encontrei consumidores operacionais de processamento/envio no código. Não há um agendador funcional demonstrado por essas tabelas.
- **Stories:** existem ramos para menção, reação e resposta. A identificação de mídia mistura URL de menção, ID de mensagem e ID de story; cobertura real de eventos precisa ser validada por tipo. Não basta dizer “stories suportados”.
- **Configuração de IA:** o caminho real usa Groq/OpenAI/URL personalizada diretamente em `lib/ai-reply.ts`; a descrição de proxy `/api/groq/chat` no README não corresponde a rota encontrada.

## Código não alcançado, duplicações e tipos

O grafo estático marcou **54 arquivos / 6.700 linhas** sem caminho de imports a partir das páginas, layouts, rotas, scripts e configs reconhecidos: 51 são primitivas em `components/ui`, dois são hooks e um é `AutomationList`. São candidatos a não uso no aplicativo atual, não uma recomendação de remover APIs ou componentes públicos sem revisar convenções/dynamic imports.

Confirmações adicionais por busca textual: `AutomationList` só aparece em sua própria definição; `sendMessageReaction` é exportado em `lib/instagram-api.ts:135` sem chamada encontrada. O ganho para nós é não copiar esse catálogo de UI, pois já existe `@sistemazero/ui`.

Duplicações verificadas por hash: `hooks/use-mobile.ts` e `components/ui/use-mobile.tsx`; `hooks/use-toast.ts` e `components/ui/use-toast.ts`. Também há envio manual duplicado em `/api/inbox/send` e `/api/instagram/send-message`, com diferenças de gravação/ID e atualização de conversa. Os vários ramos do webhook repetem gravação de mensagem e verificação de seguidores.

Arquivos de maior concentração: `CreateRuleForm.tsx` tem 1.001 linhas físicas; webhook tem 893. Este último combina protocolo, conta, regras, efeitos externos, IA e persistência. O inventário sintático encontrou 42 ocorrências de tipo `any`, 44 assertions e um `@ts-nocheck` no arquivo mais crítico. `next.config.mjs` habilita `ignoreBuildErrors`. Zero erros de parsing não significa typecheck ou build válido.

O repositório também inclui três lockfiles, dependência Supabase marcada como `latest` e comando `lint` sem ESLint declarado no manifesto. Não foi feita auditoria de vulnerabilidades de dependências; não há base aqui para afirmar segurança de versões ou reprodutibilidade de instalação.

## Resultado das verificações locais

| Verificação | Resultado |
| --- | --- |
| Sem regras ativas | Zero mensagens gravadas e zero chamadas ao fallback IA |
| Reentrega do mesmo evento | Dois envios em duas execuções, mesmo simulando duplicidade do ID da mensagem |
| Story e DM com palavra coincidente | Dois envios para um evento |
| Falha privada após confirmação pública | Ordem observada: resposta pública → tentativa privada com falha |
| Falha no banco | HTTP 200 com `ok:true` |
| Português | FERIAS/FÉRIAS e OLÁ/OLÁ falham; JEITO/jeito casa |
| GET de automações sem sessão | Handler retorna 200 e acessa dados do double a partir do `userId` fornecido |
| Script original `check-dm-ordering.cjs` | Passou em ambiente isolado, usando o compilador local |
| Script original `check-reply-api.cjs` | Passou em ambiente isolado, com fetch substituído |

Os sete primeiros casos são defeitos/limitações observados, não “testes de aceitação aprovados”. Os dois scripts originais comprovam apenas seus cenários: ordem entre resposta e busca de perfil, espera por gravações, retornos de sucesso/erro e timeout. Não cobrem autorização, reentrega, concorrência de automações, estado comercial ou política de mensagens.

## Base do Sistema Zero conferida

| Fonte | Conclusão relevante |
| --- | --- |
| `packages/marketing/src/interfaces/http/auth.ts` e guias marketing/marketing-app | Identidade vem de gateway autenticado; manter essa fronteira |
| `domain/social-account/social-account.ts` | Tokens selados e scopes explícitos já existem |
| `infrastructure/gateways/meta/meta-oauth-provider.ts` | Facebook Login/Page token; escopos atuais focados em publicação/insights |
| `domain/publication/publication-record.ts` | Conteúdo, conta, ID externo e checkpoints de publicação já são identidades úteis |
| `infrastructure/workers/publisher-worker.ts` | Padrões de lease, estado e retentativa podem orientar o novo worker; não sobrecarregar o publicador com DMs |
| `packages/funnel/src/lib/lead-attribution.ts` e `server/leads.ts` | UTM sanitizada e atribuição ao lead já existem; isso não comprova ligação automática DM/compra |
| `packages/messaging/src/domain/shared/channel.ts` | Canais atuais são email e WhatsApp |
| `packages/helpdesk-contracts/src/index.ts` e domínio de ticket | Fontes atuais email/portal; ticket pressupõe e-mail. Instagram precisa de contrato apropriado |
| Plano L0–L11 e evidências L0 | Reforma já define produção/colaboração; conversas seriam capacidade adicional, não substituição |
| README Instagram, MC01–MC14 e fluxo curto | Conversão solicitada é categoria separada; abertura transparente e duas DMs |
| `postagens/06-manychat.md` e tabela de links | Seis entradas antigas estão substituídas/suspensas; preservar só como histórico |

O `WebhookInboxRepository` de messaging também oferece referência de dedupe, mas seu contrato marca eventos processados depois do efeito. Não copiá-lo literalmente como fila durável: o novo módulo deve distinguir recebimento confirmado, processamento e envio externo, incluindo falhas entre essas etapas.

## Fontes externas e limites de confirmação

Consulta realizada em 15/10/2026. Fontes primárias:

- A coleção oficial distingue tipos de login, credenciais e permissões: [Meta, Instagram Login](https://www.postman.com/meta/instagram/folder/1z5vxzu/instagram-api-with-instagram-login) e [Facebook Login](https://www.postman.com/meta/instagram/folder/u4g5a2a/instagram-api-with-facebook-login).
- Requisitos de conversas e acesso: [Meta, Conversations API](https://www.postman.com/meta/messenger-platform-api/folder/22794852-255610cd-47f5-4f4d-b3fa-71aec360be9a).
- A distinção entre primeira resposta privada, interação elegível e abertura da janela aparece na [documentação do ManyChat](https://help.manychat.com/hc/en-us/articles/14281316989724-Instagram-Post-and-Reel-Comments-trigger). É evidência do comportamento documentado dessa integração, não prova de permissões na nossa conta.

Os endpoints de documentação direta da Meta retornaram 429/indisponibilidade. Não foram validados app review, status do app, quotas ou subscrições reais. A licença MIT foi lida no `LICENSE` local; não foi feito parecer jurídico ou revisão de direitos de imagens/conteúdo de terceiros.

## Consequência prática

A proposta concentra reaproveitamento em ficha de campanha, regra específica por publicação, primeira DM, continuidade por escolha, prévia e aprendizado a partir das conversas. Preserva autenticação, banco, gateway, UI, publicadores e reforma desktop existentes. As falhas reproduzidas viram cenários obrigatórios para a futura capacidade nativa.
