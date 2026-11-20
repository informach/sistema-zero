# Correções do full review da Aula 7

**Objetivo:** resolver BUG-001 a BUG-005 da revisão em `.audits/aula7-full-review-2026-11-19`.
**Arquitetura:** identidade pública vem de Auth; UUID não classifica sessão. Leitura de oficinas projeta apelidos atuais após liberar travas SQL. Certificado mantém replay imutável. Entrega versionada preserva trabalho paralelo.
**Execução:** nesta sessão, sem subagentes. Skills: receiving-code-review, no-workarounds, systematic-debugging, verification-before-completion.

- [x] Reproduzir quatro falhas existentes; manter regressões nos harnesses canônicos.
- [x] BUG-002: Hub consulta todos autores Kids; perfis atuais prevalecem, só equipe confirmada recebe nome de conta, ausências/falhas ficam genéricas. Members usa diretório interno já existente do Auth. Testar legado, equipe, arquivamento e indisponibilidade.
- [x] BUG-003: passar indicador obrigatório de sessão de perfil da fronteira autenticada ao emissor. Testar legado não confirmado/confirmado, conta adulta e replay imutável.
- [x] BUG-004: projetar nomes de participantes/mensagens/mídia de oficinas após transações, em lote via Auth. Preservar nomes de professores/adultos e UUIDs redigidos. Novas entradas usam apelido inteiro; Arquipélago também. Testar mensagens históricas, alteração de apelido, falha de Auth e ausência de IO sob trava.
- [x] BUG-005: exibir mensal, anual e intervalo genérico em meses. Testar renderização real para 1/3/6/12 meses e compra avulsa.
- [ ] Rodar suítes pertinentes, types, lint e builds dos consumidores; documentar evidências e limites.
- [ ] BUG-001: preparar release isolado reproduzível, versionar somente escopo conferido, integrar main/staging sem força e conferir presença de todos arquivos. Publicar correções nos dois ambientes e verificar SHA/status/jornadas sem cobrança real.
- [ ] Atualizar relatório, status dos achados e documentação operacional.
