# Entrada histórica revisada de assinaturas — 24/10/2026

## Comportamento

O inventário administrativo inclui renovações recusadas anteriores à ativação da
política. A leitura não envia mensagens nem cria acompanhamento. O administrador
pode revisar uma cobrança por vez, escolhendo Kids ou Adulto quando a compra não
tem público comprovado. A classificação comprovada não pode ser sobrescrita.

A ação exige versão atual, política ativa e consulta nova à operadora. A origem
deve ser a cobrança mais recente identificável, ainda recusada, de assinatura
ativa que já teve pagamento. Origem sem data, operação pendente, ciclo posterior,
valor divergente ou resposta vencida impedem a abertura.

O caso começa agora; o prazo de regularização somente começa quando o primeiro
aviso é aceito. A data histórica não vira prazo retroativo. Caso, revisão permanente
e recibo de admissão são atômicos. Replays não repetem a consulta nem criam outro
caso. A auditoria registra administrador, request, público, versão e datas da
observação/origem. Ela não depende da retenção de eventos da outbox.

Nas próximas recusas do mesmo contrato, a admissão pode reutilizar esse público
revisado, conferindo assinatura, consumidor e identificação da operadora. Isso não
fabrica metadata de compra nem exige classificar a assinatura todo mês.

## Evidência local

- Migration aditiva 0022 gerada pelo Drizzle e aplicada somente no PostgreSQL QA.
- Payments completo: **563 testes, 1.748 asserções, zero falhas e zero skips**,
  45 arquivos, 18,65 s, com banco real dedicado.
- Os 19 cenários de revisão histórica incluem replay, dois administradores,
  estado/versão/público/política alterados durante a consulta, prova vencida após
  locks e após escritas, lease anterior invalidado, retenção da outbox e próxima
  recusa Kids/Adulto após liquidação real do ciclo anterior no banco.
- Tipagem completa Payments: exit 0, heap 768 MiB.
- Admin: quatro testes externos, 13 asserções, incluindo os wrappers que executam
  os cenários DOM/BFF. Essas contagens não somam novamente os testes internos.
- Biome: 21 arquivos, sem alterações; `git diff --check` sem erros.

Logs locais preservados em `.cache/release-lesson-layout-20261023/` no worktree
principal: `financial-history-full-r2.log`, `financial-history-types-final-r1.log`
e `financial-history-admin-final-r1.log`. A primeira tentativa completa apontou
para um nome inexistente de banco e falhou explicitamente; não foi resultado do
produto. O banco correto foi conferido na instância QA antes da execução final.

## Limites e próximo lote

Não houve ação sobre a cliente real, envio, débito ou cancelamento na operadora.
Nenhum fluxo autenticado de navegador/sandbox foi homologado por estes testes.
O lote financeiro continua sem implantação/ativação.

Continua aberto o encerramento auditado de acompanhamento antigo quando outro
ciclo já foi pago, preservando a recusa original, e a reavaliação de admissões
anteriormente ignoradas por acompanhamento ativo. Não interpretar a revisão
histórica como correção desse caso.

O CI da base 6639b899a teve as demais validações aprovadas, mas o job Windows
atingiu seu limite durante o download FFmpeg do Playwright (2% até cancelamento),
antes dos testes nativos. Não é CI completo aprovado nem prova de falha financeira.
