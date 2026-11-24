# Correções do full review da Aula 7

**Objetivo:** resolver BUG-001 a BUG-005 da revisão em `.audits/aula7-full-review-2026-11-19`.
**Arquitetura:** identidade pública vem de Auth; UUID não classifica sessão. Leitura de oficinas projeta apelidos atuais após liberar travas SQL. Certificado mantém replay imutável. Entrega versionada preserva trabalho paralelo.
**Execução:** nesta sessão, sem subagentes. Skills: receiving-code-review, no-workarounds, systematic-debugging, verification-before-completion.

- [x] Reproduzir quatro falhas existentes; manter regressões nos harnesses canônicos.
- [x] BUG-002: Hub consulta todos autores Kids; perfis atuais prevalecem, só equipe confirmada recebe nome de conta, ausências/falhas ficam genéricas. Members usa diretório interno já existente do Auth. Testar legado, equipe, arquivamento e indisponibilidade.
- [x] BUG-003: passar indicador obrigatório de sessão de perfil da fronteira autenticada ao emissor. Testar legado não confirmado/confirmado, conta adulta e replay imutável.
- [x] BUG-004: projetar nomes de participantes/mensagens/mídia de oficinas após transações, em lote via Auth. Preservar nomes de professores/adultos e UUIDs redigidos. Novas entradas usam apelido inteiro; Arquipélago também. Testar mensagens históricas, alteração de apelido, falha de Auth e ausência de IO sob trava.
- [x] BUG-005: exibir mensal, anual e intervalo genérico em meses. Testar renderização real para 1/3/6/12 meses e compra avulsa.
- [x] Rodar suítes pertinentes, types, lint e builds dos consumidores; documentar evidências e limites.
- [x] BUG-001: preparar release isolado reproduzível, versionar somente escopo conferido, integrar main/staging sem força e conferir presença de todos arquivos. Publicar correções nos dois ambientes e verificar SHA/status/jornadas sem cobrança real.
- [x] Atualizar relatório, status dos achados e documentação operacional.

Fechamento em 20/11/2026: staging `c7e9c70a4` e produção `5440aa0dd`, com CI completa aprovada para cada fonte e onze processos de cada ambiente conferidos. Jornadas reais de presente, perfil, aparelho, voz e certificado aprovadas; compra de produção inspecionada sem cobrança. Main foi integrado em staging sem reescrever histórico; a CI posterior desse merge foi cancelada por novo trabalho de Molda Cenários, cujo pipeline segue em andamento. Os oito arquivos de runtime conferidos das correções permanecem idênticos nas fontes publicadas e na staging integrada. A Aula 7 original segue em rascunho e seus três vídeos ficam com o usuário.
