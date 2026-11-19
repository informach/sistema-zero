# Aula 7: implantação e conferência de 19/11/2026

## Escopo

Presente autenticado, nome completo privado e apelido público, certificados, Mural e jogos compartilhados, voz, oferta de um perfil e revisão dos materiais da Aula 7. Sem inferir nomes antigos, alterar certificados emitidos ou introduzir aprovação por postagem. Manter as classes, componentes e estilos existentes da plataforma.

## Conteúdo pronto para produção dos vídeos

- Roteiro: `docs/aulas-interativas/pais/transformando-o-vilao-em-aliado/transformando-o-vilao-em-aliado-aula-7.roteiro.md`.
- Texto copiável: mesmo diretório, `transformando-o-vilao-em-aliado-aula-7.elevenlabs.txt`.
- Indicações de edição: `.edicao.json`, derivado do roteiro, com três clipes.
- Apostila: `apostila.pdf`, 18 páginas; revisão visual das páginas e das orientações da Aula 7.
- Validação editorial: 32 testes sem falha; 23 clipes e sete roteiros com zero erros; TXT/edição sincronizados com os roteiros.

O responsável confirmou que ainda vai gerar os três vídeos da Aula 7. A aula continua em rascunho. O curso completo possui 23 vídeos planejados nos manifestos; nenhuma mídia foi inventada para permitir publicação.

## Configuração real

| Item | Staging | Produção |
| --- | --- | --- |
| Curso para pais (rascunho) | `780b2167-c74a-4f87-8dc7-305455b0230c` | `3edc936c-5b72-4dd9-9c33-0b66e44d5a8b` |
| Aula 7 (rascunho) | `15b1dd95-c98c-40ab-b9ad-d078888af6a2` | `0947bc6e-ec79-4a8b-a390-e58764ab4cf6` |
| Campanha ativa do presente | `vilao-em-aliado-cade` | `vilao-em-aliado-cade` |
| Oferta | `cade-todo-mundo-7-dias` | `cade-todo-mundo-7-dias` |
| Limite explícito | 1 perfil | 1 perfil |
| Prazo | 7 dias desde a ativação | 7 dias desde a ativação |
| Voz | habilitada, com autorização individual | habilitada, com autorização individual |

O curso não existia em nenhum dos ambientes antes da operação. Foram criados os rascunhos das sete aulas, importados os sete manifestos e vinculadas a capa otimizada e a apostila no armazenamento privado. A campanha pública de entrada `vilao-em-aliado` não foi ativada antecipadamente para um curso sem vídeos publicados.

## Verificação e implantação

Os backends foram verificados em uma versão isolada por ambiente, baseada no código anteriormente publicado. Não foi enviado o HEAD atual de staging com alterações paralelas do Estúdio, Molda ou Pinta. As migrações canônicas foram preservadas integralmente: pular entradas anteriores deixaria a marca d'água do Drizzle incorreta. A cadeia foi aplicada primeiro em PostgreSQL isolado e depois pelo pre-deploy dos serviços.

As evidências privadas de operação ficam em `.cache/aula7-pendencias-20261119/`, sem incluir chaves de API nos relatórios. A chave do OpenRouter foi validada e substituída nos serviços que já a utilizavam em ambos os ambientes. Os testes de voz usaram fala sintética de adulto.

Verificações locais da versão isolada de staging: Auth 307 aprovados; Members 2.279; Referrals 214; Funnel 667; Gateway 328; Hub 187; Catalog 163; Payments 439. Casos que exigem infraestrutura opcional permaneceram explicitamente ignorados. PostgreSQL real: 20 testes de identidade e concorrência aprovados. Cadastro Kids: 19 testes aprovados. As suítes completas não substituem a conferência funcional abaixo.

A conferência pela interface identificou que `/api/commerce` faltava na política local do Kids. A política foi corrigida para permitir apenas sessões de responsável, preservando a prova de sessão e a mesma origem. A regressão produziu três falhas com o código anterior; os 19 testes de política, comércio e elegibilidade passaram com a correção.

### Conferência funcional

**Staging, usando uma conta sintética e conteúdo temporário de QA:**

- Família disponível quando a conta tinha apenas um curso para pais.
- Presente ativado pela interface na conta existente, sem nome/e-mail repetidos e sem cartão.
- Repetição do resgate devolveu `already_redeemed`, preservando o vencimento original de sete dias.
- Perfil criado pelo formulário com nome completo privado e apelido público distintos; identidade confirmada.
- Segundo perfil recusado com `409 PROFILE_LIMIT_REACHED` antes de conceder qualquer outro curso infantil de QA.
- Aparelho autorizado por código; sessão infantil entrou no Cadê Todo Mundo. A interface mostrou o apelido completo e preservou o estilo do Kids.
- Sessão infantil recusada no endpoint comercial com `403 KIDS_CONTEXT_FORBIDDEN`.
- Voz recusada sem autorização, áudio sintético transcrito após autorizar e nova recusa imediata depois de desligar a autorização.
- Certificado novo recusado sem identidade confirmada. Depois da confirmação e da conclusão de uma aula de preparação do teste, o PDF saiu com o nome completo, sem usar o apelido. Após nova alteração privada do nome, o download manteve o nome já emitido. Ambos os PDFs foram lidos e o primeiro também foi inspecionado visualmente.

**Produção:** os serviços, migrações e integração Members-Auth foram conferidos no ambiente real. A oferta manteve sete dias e um perfil. O mini checkout adulto foi inspecionado com uma conta sintética: reutilizou nome/e-mail, permaneceu `READY`, reutilizou o mesmo checkout e não criou cobrança. A voz principal e reserva foi testada com áudio sintético dentro do serviço Kids. A aula original continua em rascunho, portanto a conferência dela publicada deverá acompanhar a vinculação dos vídeos reais.

Foram arquivados os dois cursos temporários de staging e bloqueadas as duas contas sintéticas, uma por ambiente. Nenhum curso real foi arquivado e nenhuma cobrança foi efetuada. Os registros de QA e o certificado sintético foram preservados para auditoria.

### Serviços publicados

Auth, Members, Hub, Referrals, Catalog, Payments, Funnel, API Gateway, Kids, Community e Admin: as 22 implantações, considerando staging e produção, terminaram em `SUCCESS`. O Admin e os apps mantiveram os estilos existentes. A compilação do Admin precisou de 8 GB de heap na etapa de tipos; o limite dos builders Next foi alinhado com o build local aprovado. A Community de staging teve seu CSS derivado regenerado pelo gerador canônico, pois a versão anteriormente publicada continha um arquivo desatualizado. Não foi desativada nenhuma checagem de tipos, tema ou migração.

Provas privadas: `journey-staging.json`, `voice-bff-staging.json`, `certificate-staging.json`, `purchase-production.json`, `runtime-probe-staging.jsonl`, `runtime-probe-production.jsonl`, `qa-cleanup-staging.jsonl`, `qa-cleanup-production.jsonl` e `deployments-latest.json`, no diretório de evidências local. Esses arquivos não contêm chaves de API. Estados de sessão e credenciais sintéticas ficam apenas no cache ignorado; as contas foram bloqueadas ao final.

## Depois dos vídeos

Vincular cada gravação ao seu espaço planejado, conferir as capturas indicadas na edição e validar/publicar a aula pelo Admin. Não trocar o bloco de presente por um link externo e não tornar o presente uma exigência para obter o certificado do responsável.
