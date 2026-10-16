# Review da proposta de aproveitamento do insta-p8

15/10/2026, São Paulo. Revisão solicitada pelo usuário para conferir coesão, lacunas e integração com o novo marketing e o Sistema Zero. Escopo: revisar a proposta, sem implementar o complemento, alterar os lotes vigentes ou ativar mensagens.

**Veredito:** a direção da primeira versão era adequada, mas sua integração ainda não estava suficientemente definida para orientar implementação. A [revisão 2](../../docs/plans/2026-10-15-insta-p8-aproveitamento-marketing.md) fecha as decisões de produto e as fronteiras técnicas identificadas, com dependências e critérios verificáveis. Compatibilidade arquitetural especificada não equivale a integração já comprovada em produção.

A [primeira versão](proposta-v1.txt) foi preservada. A [auditoria original](../architectural-analysis-insta-p8-marketing-2026-10-15.md) continua sendo evidência sobre o snapshot externo; os achados abaixo são sobre nossa proposta e sua relação com o código atual.

## Lacunas e correções

| Prioridade | Lacuna da primeira proposta | Correção na revisão 2 |
| --- | --- | --- |
| Alta | Dizia preservar L9, mas sugeria acrescentar ficha e componentes de DM a L4/L5/L7 sem delimitar escopo | Marcos C0–C4 próprios; entrega pública depois de L9; reuso não acrescenta critérios aos lotes existentes (§1/10) |
| Alta | Alternativa de ponte externa deixava indefinidos dono da operação, sincronização e desligamento | Escolha nativa; ponte deixa de ser caminho padrão/fallback. Incapacidade externa bloqueia a capacidade, não cria arquitetura paralela (§2) |
| Alta | Campanha, revisão, conversa e ativação apareciam misturadas | Separação de plano, revisão, ativação, conversa, jornada, supressão, entrada e intenção; estados independentes (§5) |
| Alta | Publicação marcada como concluída era tratada como base suficiente para vínculo | Conta explícita, posse do post, edição exata e estado aguardando vínculo; publicação manual não prova identidade externa (§5) |
| Alta | “Validar HMAC” omitia incompatibilidade do parser/BFF e do verificador existente | Rota dedicada, preservação dos bytes e parsing antes do genérico; teste fim a fim via gateway; não reutilizar protocolo de pagamentos como Meta (§6) |
| Alta | Pausa humana não definia corrida com envio e timeout externo | Controle transacional por conversa, posse de worker, marco de início de envio, resultado incerto e proibição de reenvio cego (§6) |
| Alta | Saídas editoriais eram listadas sem política para texto ambíguo, botão antigo e reentrada | Precedência, jornada única, triagem de texto livre, postback vinculado, retomada explícita e expiração sem lembrete (§4/5) |
| Alta | Texto livre podia exigir atendimento e, ao mesmo tempo, convidar por R01 a um fluxo bloqueado | R01 só após triagem liberar continuidade; toque durante espera é solicitação registrada; saída comercial depende de nova elegibilidade (§4) |
| Alta | Capacidade de publicar podia ser confundida com capacidade de conversar | Evidência por conta/modalidade/conexão, permissões, subscrições e revalidação; não substituir a modalidade OAuth existente (§6/9) |
| Alta | “Integrar ao funil” subestimava analytics já implementado e misturava unidades de conversão | Reuso de sessões/vínculos/pagamentos; leitura agregada nova por conteúdo; sessões convertidas separadas de compras únicas, com coortes explícitas (§7) |
| Alta | Acesso por projeto podia vazar mensagens privadas de uma conta compartilhada | Permissões de conta/canal separadas da edição; supressão entre campanhas da mesma conta; sem DMs no cache editorial (§6) |
| Média | Fila humana podia crescer como CRM paralelo ou pressupor Instagram pronto no helpdesk | Atendimento comercial mínimo no marketing; integração formal ao helpdesk fora do piloto e dependente de identidade/contrato próprios (§3) |
| Média | Não havia política para expurgo, reentrega após exclusão e backup | Retenção proposta explícita, supressão mínima, corte temporal e restauração com envio desabilitado (§8) |
| Média | Respostas no Instagram oficial/outra ferramenta não eram consideradas | Prova de observabilidade e pausa operacional antes de atendimento externo quando não observável; sem automações concorrentes (§6/9) |
| Média | Piloto tinha cenários, mas faltavam responsáveis, rollback e condição de abandono | Donos por área, matriz de aceite, interrupção, rollback e decisão por evidência, inclusive encerrar automação sem perder melhorias editoriais (§8/10/11) |

## Confronto com a implementação atual

As referências abaixo sustentam decisões da revisão; não são uma declaração de que o código consultado está defeituoso em seu escopo atual. O objetivo é não atribuir a serviços existentes garantias que o complemento ainda precisará construir.

| Evidência local | Constatação | Consequência |
| --- | --- | --- |
| [Plano L0–L11](../../docs/superpowers/plans/2026-10-15-marketing-desktop-colaborativo-lotes.md) e [proposta normativa](../../docs/plans/2026-10-15-marketing-app-fluxo-editorial-proposta.md) | Contratos/revisões/sync ainda planejados; L9 é primeira liberação editorial completa | Depender da entrega, não supor interfaces prontas nem alterar o caminho crítico |
| [Fluxo editorial](../../docs/marketing/kids/comunidade-dos-criadores/instagram/campanhas/manychat-desafio/fluxo-curto.md) | Duas DMs, H01/A01/S01/C01/R01/D01/D02 e recuperação explícita | Percurso fixo e saídas cobertas, sem follow gate/remarketing por silêncio |
| [Parser HTTP](../../packages/marketing/src/interfaces/http/server.ts) | `onParse` global consome texto e interpreta JSON | Webhook precisa de entrada própria preservando corpo original |
| [BFF](../../packages/marketing-app/src/app/api/marketing/[...path]/route.ts) e [gateway](../../packages/api-gateway/gateway.config.ts) | Allowlist/JSON no BFF; staff nas rotas de marketing e exceções públicas explícitas | Separar webhook público das operações autenticadas; ampliar contratos/allowlist no complemento |
| [Verificador](../../packages/api-gateway/src/application/transform/transformers/verify-webhook.transformer.ts) | Protocolo existente usa outra assinatura | Não tratar o componente como verificador Meta pronto |
| [Publicação](../../packages/marketing/src/application/publications/publication.service.ts) e [vínculo externo](../../packages/marketing/src/application/publications/link-external.service.ts) | Marcação manual e fallback de conta em resolução externa | Exigir vínculo confirmado para conversas; não reutilizar inferência de conta |
| [Conta](../../packages/marketing/src/application/accounts/account.service.ts), [domínio](../../packages/marketing/src/domain/social-account/social-account.ts), [OAuth](../../packages/marketing/src/infrastructure/gateways/meta/meta-oauth-provider.ts) | Tokens selados/status existentes; seleção por rede e escopos voltados a publicação | Reusar infraestrutura e acrescentar capacidade comprovada de conversas |
| [Messaging](../../packages/messaging/src/domain/shared/channel.ts) e [helpdesk](../../packages/helpdesk-contracts/src/index.ts) | Canais/contratos atuais não oferecem Instagram como integração pronta | Não simular email nem presumir handoff implementado |
| [Analytics repository](../../packages/funnel/src/analytics/repository.ts), [handlers](../../packages/funnel/src/analytics/handlers.ts), [reports](../../packages/funnel/src/analytics/reports.ts) | Sessões, preferências, vínculos e coortes já existem; vínculo lead/sessão não implica venda exclusiva por sessão | Reusar coleta; extensão de leitura por peça e deduplicação comercial no domínio do funil |
| [Atribuição do lead](../../packages/funnel/src/db/repo.ts), [schema](../../packages/funnel/src/db/schema.ts), [webhook de pagamento](../../packages/funnel/src/server/webhook.ts) | Primeira atribuição preservada; histórico de cobrança e pagamento confirmado; renovações separadas | Não sobrescrever origem, duplicar compras ou contar renovação como nova aquisição |

## Limites e pendências legítimas

- **Dependência interna:** contratos finais de L1/L3/L4/L5/L7/L8 e liberação L9. C1/C2 adaptam a implementação à base efetivamente entregue; não fingem que os pacotes propostos já existem.
- **Dependência externa:** C0 precisa provar operações, acesso ao público, janela, assinatura, ecos e limites reais na conta/modalidade escolhida. Se não provar, não há piloto nativo liberado.
- **Decisão operacional:** responsáveis, peça piloto e ratificação da política de dados são critérios de liberação futura. A proposta já define o que precisam decidir e como verificar; não foram inventados nomes ou autorizações.
- **Medição:** não há identificação individual garantida entre Instagram e site nem causalidade demonstrada. Atribuição e cobertura permanecem explícitas.

Reconsulta web: a documentação oficial do [ManyChat](https://help.manychat.com/hc/en-us/articles/14281316989724-Instagram-Post-and-Reel-Comments-trigger) permaneceu acessível. A navegação direta na coleção Meta retornou parcialmente apenas a interface Postman; developers.facebook.com retornou 429. Resultados indexados da [coleção Meta](https://www.postman.com/meta/workspace/instagram/documentation/23987686-9386f468-7714-490f-9bfc-9442db5c8f00) e da [Conversations API](https://www.postman.com/meta/messenger-platform-api/folder/22794852-255610cd-47f5-4f4d-b3fa-71aec360be9a) foram consultados. Não se transformou essa pesquisa em comprovação da conta do Sistema Zero.

## Verificação desta revisão

O registro reproduzível fica em [review-validation.json](review-validation.json), gerado por [validate-review.cjs](validate-review.cjs). Ele confere links locais/UTF-8, registra hashes das fontes confrontadas, compara as fontes do contexto inicial e verifica a preservação do snapshot externo. Não substitui o review semântico nem representa testes do módulo proposto.

Não houve instalação, build, alteração de código de produto, mudança de plano normativo, teste contra banco/Meta, publicação ou envio de mensagens. As sondagens comportamentais da auditoria original não foram apresentadas como execução nova nesta revisão.
