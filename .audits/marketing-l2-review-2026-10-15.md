# Revisão L2 — identidade e distribuição desktop

## Correções estruturais

- O pareamento exige aprovação explícita no navegador, código descartável, PKCE, conta ativa da equipe e prazo de dez minutos. O resgate é transacional; concorrência emite uma única credencial.
- A revisão encontrou disputa de refresh entre navegação e tarefas em segundo plano. A sessão desktop agora usa uma credencial opaca revogável, guardada apenas como hash no Auth e como cookie HttpOnly no Electron. O BFF obtém JWTs restritos a marketing sem uma cadeia de refresh concorrente. As regras de rotação/reuso do login existente foram preservadas.
- A família canônica mantém prazo absoluto de 30 dias. Revogação do computador, logout global e inativação da conta impedem novos acessos; gateway e Auth revalidam o dispositivo mesmo quando o JWT ainda não expirou.
- O Electron exige safeStorage e o fuse de criptografia de cookies. O fuse vem desligado por padrão; habilitado tanto no runtime de desenvolvimento quanto antes da assinatura da distribuição. Node options, inspeção externa e RunAsNode foram desligados.
- A interface online usa WebContentsView sem preload, Node ou ponte nativa. A sessão é compartilhada com o transporte nativo; código remoto não ganha execução local.
- Transporte limita bytes durante leitura, valida origem e vincula cada pedido ao servidor/usuário esperado. Configuração inválida é preservada para diagnóstico; cancelamento de pareamento está disponível.
- Passagem web → desktop aceita apenas referência opaca e servidor HTTPS conhecido. Backend valida usuário, projeto, revisão e validade; abrir link não executa IA. Consumo visual da referência será ligado à bancada em L4/L5.
- Shell tem bandeja, retomada, pausa de novos trabalhos e encerramento. Empacotamento usa ASAR, integridade e assinatura obrigatória no comando de distribuição.

## Evidências

- PostgreSQL real: quatro cenários de sessão passaram, incluindo oito emissões simultâneas, prazo absoluto, código consumido uma vez, prova incorreta, revogação e logout global.
- Auth: 254 testes passaram; 44 testes antigos de outro banco de integração foram pulados por indisponibilidade daquele banco, não declarados validados. Gateway: 241 testes passaram. Marketing: 246 testes passaram. Desktop: 16 testes passaram. Typechecks passaram nas áreas alteradas.
- Prova Electron → Next/BFF → gateway → Auth/Marketing criou projeto, consultou oito snapshots em paralelo e abriu a interface web autenticada. Segundo processo restaurou a mesma identidade e dispositivo após reinício.
- Inspeção da base de cookies: credencial desktop com `length(value)=0`, `length(encrypted_value)=106`, HttpOnly e persistente. Nenhum valor de credencial foi registrado no relatório.
- Pacote Windows `release/win-unpacked` abriu e passou no smoke: ponte somente na janela local, Node ausente no renderer, composição Remotion no frame 30 e largura 720. A inspeção Authenticode confirmou **NotSigned** nessa compilação de revisão, criada explicitamente com assinatura dispensada. Não é uma distribuição pronta para usuários.
- Migração Auth consolidada e regenerada em `0021_dusty_lilith.sql`: índice nasce com a tabela, sem criação bloqueante sobre tabela ativa. Os arquivos preliminares nunca foram publicados; somente o banco descartável da revisão foi recriado. `check:migrations` passou.

## Pendências de integração e liberação

- L3 precisa conectar cache/outbox, execução e transferências ao shell; bancada ainda é a prova local.
- L4/L5 conectarão o destino de handoff à peça e seleção, com contexto congelado e conflitos visíveis.
- Atualização verificável, assinatura de distribuição, instalação em duas máquinas e primeiro login dos provedores em conta desconectada ainda precisam de validação. Não houve compra de certificado, publicação remota ou implantação.
- O fluxo web legado ainda usa refresh rotativo. Sua revisão identificou concorrência na gravação de cookies entre requests; a correção integrada continua pendente e impede tratar o review completo como encerrado.

L2 foi revisado nesta etapa, mas não está marcado como integralmente concluído. O trabalho segue nos lotes dependentes e nos pontos abertos, sem pausa para aprovação.

## Atualização integrada em 16/10

Cache/outbox, transferências, bancada compartilhada e seleção do handoff receberam implementação nos lotes seguintes. A corrida da sessão web foi corrigida em L9 com sessão opaca própria; a rotação e detecção de reuso existentes no Auth foram preservadas. Prova real de oito acessos paralelos, logout/revogação e três identidades está em `.audits/marketing-l9-sync-performance-2026-10-16.md`. A pendência de refresh acima é histórica, não um defeito ainda aberto.

A prova de instalação/atualização assinadas, primeiro login em cliente desconectado e piloto físico em duas máquinas continuam pendentes. Demonstrações atuais não substituem esses critérios.

Instalação dos clientes pela interface, recuperação de instalação, configuração de distribuição e atualização com verificação obrigatória de assinatura foram implementadas e revistas em [instalação e atualização L2](marketing-l2-install-update-review-2026-10-16.md). A prova real instalou os dois clientes e reabriu o Electron; os critérios externos acima permanecem explicitamente abertos.
