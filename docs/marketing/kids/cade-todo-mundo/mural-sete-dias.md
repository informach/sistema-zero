# Mural durante os sete dias do presente

Decisão aprovada em 03/10/2026. Substitui a restrição de visitante desde o cadastro para novos convites, incluindo campanhas e embaixadores.

## Entrega

Durante os sete dias contados do cadastro aceito, a criança pode publicar o jogo do Cadê Todo Mundo?, comentar e reagir no Mural. A publicação continua obedecendo aos requisitos da atividade; o presente não libera outros cursos nem ferramentas de criação livre. Ao vencer o acesso, permanece a visita para ver e jogar. O link público de um jogo já publicado não vence com a matrícula e funciona enquanto a publicação estiver disponível.

## Implementação

Usar concessões explícitas de acesso, preservando as regras do Mural para quem é apenas visitante. O Members recebe `mode: 'mural_trial'`, confere a matrícula do curso da mesma origem e concede o Mural com o mesmo vencimento, limitado a sete dias, além da visita sem prazo, num lote atômico. Referrals registra a política `trial` no campo de política existente e usa uma entrega independente da antiga concessão de visitante. A confirmação exige HTTP 200 com os dois direitos concedidos ou uma entrega já confirmada; respostas incompletas não concluem o resgate. Não há alteração de schema.

Uma tentativa retomada conserva o prazo original. Concessões de assinaturas ou de outras origens permanecem independentes. Resgates históricos conservam sua política; a atualização de convites antigos ainda válidos deve reutilizar a matrícula existente, sem reiniciar o prazo nem reativar matrículas revogadas ou vencidas.

## Plano e verificação

- [x] Members: contrato HTTP, concessão atômica, idempotência, prazo obrigatório igual ao curso, recusa de curso ausente/vencido/revogado e preservação de acesso independente.
- [x] Referrals: política nova com checkpoint e identificador de entrega próprios; embaixador, campanha, falha parcial e retomada sem extensão.
- [x] Conferir o fluxo de publicação pelo curso, as interações antes/depois do prazo e o player público de publicação existente. A matrícula e a entrega da atividade governam a publicação; não exige Estúdio livre. Conferência de código e testes HTTP, sem login real na aula 2.
- [x] Atualizar páginas, WhatsApp, formulário e e-mails, preservando os modelos históricos. A confirmação mantém o vencimento original e informa a modalidade efetivamente concedida, inclusive em retomadas de resgates antigos.
- [x] Documentar atualização de convites já resgatados e ordem de implantação.
- [x] Executar testes, verificação de tipos e lint dos pacotes alterados; build do funil e revisão do diff.

## Ordem de implantação

Publicar Members com o novo contrato e cadastrar os modelos de e-mail novos antes de publicar Referrals e Funil. Uma versão antiga de Members deve recusar o novo modo, impedindo confirmação de um presente incompleto. Nenhuma implantação remota é feita por esta alteração de código.

Para convites antigos já concluídos e ainda dentro dos sete dias, em `packages/referrals`, executar `bun run gifts:upgrade-mural` para simular e `bun run gifts:upgrade-mural --apply` para aplicar no ambiente configurado. O script usa a concessão autenticada do Members; não escreve diretamente nas matrículas. Seleciona apenas a política `visitor`, resgates concluídos e prazo restante; Members recusa matrícula revogada ou vencida. O identificador estável permite repetir após falha de rede ou de gravação. A execução não envia mensagens e não reabre o prazo.

A rotina também foi executada em teste com PostgreSQL local e um gateway HTTP de teste: simulação sem chamadas, recusa de confirmação incompleta, aplicação com prazo original, preservação do e-mail já enviado e repetição sem nova concessão. Nenhuma atualização foi aplicada a contas existentes em staging ou produção.

## Evidências locais

- Members: 1.313 testes aprovados, 49 pulados pela configuração das suítes. A suíte específica de concessões passou com 17 casos, incluindo limite de sete dias, recusa de revogação/vencimento, lote atômico, prazo original e preservação de direito independente.
- Referrals: 145 testes aprovados, incluindo persistência PostgreSQL local, execução da atualização de convites antigos, confirmação completa do Mural e retomada.
- Hub: 66 testes dos fluxos de leitura, interação e publicação aprovados; o cenário de retorno ao visitante mantém o jogo público jogável.
- Funil: 416 testes aprovados; verificação Astro e build aprovados. Mensageria: 137 testes aprovados e verificação de tipos aprovada. Core: 937 testes aprovados.
- Biome aprovado, mantendo quatro avisos preexistentes de especificidade em `comunidade-quiz.css`.
- Não houve cadastro integrado em staging nem inspeção visual com uma conta real do presente. A captura do Mural foi reutilizada, conforme orientação anterior.

Achados corrigidos e ajuste adicional da navegação das aulas: [revisão de 03/10](revisao-mural-sete-dias.md).
