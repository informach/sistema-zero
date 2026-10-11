# Full review — acesso infantil por perfil e navegador

Data: 10/10/2026. Escopo: implementação local comparada ao commit `37b8b67bd`, incluindo arquivos novos, contratos e consumidores relacionados. Não é uma auditoria de todo o monorepo nem um teste de invasão em produção.

## Achados funcionais e correções

Todos os itens abaixo foram reproduzidos com testes antes da correção. Confiança alta.

| Prioridade | Problema e efeito | Correção | Evidência |
| --- | --- | --- | --- |
| Alta | O suporte recebia uma sessão de conta, mas perdeu a seleção de perfis ao substituir a grade antiga. Poderia abrir a área infantil com a identidade da conta, sem chegar ao perfil correto. | Conta de suporte vai à seleção exclusiva; o endpoint antigo aceita apenas suporte identificado no Kids. Não gera códigos ou autorizações permanentes. O menu distingue a saída do suporte da saída de uma criança. | `kids-study-bff.test.ts`, `study-entry.test.tsx`, `impersonation-layout.test.ts` e testes existentes de suporte somente leitura. |
| Média | Nova autorização de 90 dias podia ultrapassar a validade restante do cadastro do aparelho. A criança perderia o acesso antes da data indicada. Um aparelho expirado também recusava um código novo. | Autorização explícita atualiza a retenção do aparelho; o navegador conserva o segredo e renova a retenção do cookie. Recuperação de aparelho expirado encerra sessões e autorizações antigas antes de liberar somente o perfil do novo código. | Dois casos novos em PostgreSQL real em `auth/tests/db/study-access.test.ts`; preservação do cookie no BFF. |
| Média | Erro temporário de banco, Auth ou rede podia ser tratado como token inválido, com aviso de sessão encerrada. | Separa indisponibilidade de revogação nas bordas Auth, Gateway e BFF. Erro de serviço não apaga credenciais nem autoriza a requisição; a consulta de sessão responde 503 e permite nova tentativa. | `token-issuer.test.ts`, `kids-jwt.test.ts`, `kids-study-bff.test.ts`, `session-boundary.test.tsx`. |
| Média | Página restaurada pelo histórico não revalidava imediatamente a sessão; dependia de foco ou do próximo intervalo. | Confere ao montar, no retorno pelo histórico e ao voltar à aba visível. Mantém a proteção de cada salvamento no servidor. | Evento `pageshow` exercitado em `session-boundary.test.tsx`; proxy/BFF continuam recusando a prova de outra sessão. |
| Média | Se a lista de acessos carregasse e a preparação do navegador falhasse, o botão de autorizar permanecia desabilitado sem nova tentativa. | Recuperação repete as duas operações, limpa o erro e libera o formulário somente após sucesso. | Falha 503 seguida de recuperação em `study-entry.test.tsx`. |
| Baixa | Confirmação de autorização remota chamava o computador dos pais de “este aparelho”. | Texto passa a dizer “No aparelho autorizado”, sem afirmar que o navegador atual foi liberado. | Caso de autorização remota em `study-entry.test.tsx`. |
| Baixa | Os três tutoriais novos estavam fora da formatação exigida pelo Biome. | Normalização das quebras de linha e das listas de palavras-chave, sem alteração adicional do conteúdo. | Biome e validador dos tutoriais. |

## Revisão da arquitetura e dos contratos

- Auth mantém a fonte de verdade de códigos, aparelhos e autorizações. Transações e locks continuam serializando consumo de código e seleção por aparelho. O código não ganha novo prazo ao repetir um resgate.
- JWT, refresh e autorização canônica preservam perfil, aparelho, família de sessão e prazo absoluto. Não há fallback de perfil arquivado para conta adulta.
- Gateway separa operações de aluno e responsável. Rotas históricas de Mural e perfil público mantêm as permissões necessárias; os serviços ainda conferem posse e visibilidade.
- BFF centraliza cookies, CSRF, prova da sessão do documento e acesso a mídia. Os shims do Kids não contêm uma segunda implementação da autorização.
- A sessão de suporte continua uma capacidade distinta; a exceção exige `act` autenticado e não se aplica à família. O backend existente valida ator, perfil e família do refresh na seleção.
- As rotas de miniaturas exigem HMAC e consumidor permitido. O navegador recebe nomes e fotos da família reconhecida, sem os segredos do aparelho.
- Login adulto dos outros produtos, primeiro acesso por OTP, mensagens de compra/presente, tutorial adulto v3 e progresso do tutorial infantil v2 foram incluídos nas verificações.
- Nenhuma migration publicada foi alterada nesta revisão. A migration nova continua aditiva e foi exercitada somente em banco de teste local dedicado.

Observação de manutenção, sem falha funcional: `GuideTargetItem`, em `parent-guide.tsx`, tem consumidores somente nos testes da antiga grade. É um export de três linhas sem chamada em produção; pode ser removido numa limpeza dos testes. Não foi feita refatoração ampla por tamanho de arquivo, sem necessidade funcional.

## Verificação

Evidências locais em `.tmp/review-*.log`; os logs não são versionados. Resultado consolidado e instruções para publicação: [relatório de QA](../docs/qa/2026-10-10-acesso-infantil.md).

O banco utilizado foi exclusivamente `sistemazero_kids_access_test`. Os testes reproduzem concorrência, revogação, renovação, expiração, irmãos, outras contas, mídia, troca de abas, retorno e suporte. Testes de banco pulados em Members não contam como evidência de execução.

O build de produção do Kids e os typechecks passaram. A listagem do navegador integrado retornou vazia novamente: inspeção visual em computador/celular, teclado, zoom e o comportamento real de cache do histórico ainda precisam ser conferidos no navegador. O teste automatizado do evento não substitui essa conferência.

Sem commit, push, deploy, publicação de tutoriais/templates ou envio de mensagens neste review.
