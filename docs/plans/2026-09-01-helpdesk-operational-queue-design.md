# Helpdesk: fila operacional, SLA e copiloto de IA

**Data:** 2026-09-01  
**Status:** aprovado

## Objetivo

Transformar a caixa de entrada interna numa fila que diga claramente qual ticket
merece atenção agora, sem transformar o SLA em promessa feita ao cliente e sem
permitir que a IA envie mensagens sozinha.

## Decisões

- O SLA é uma **meta operacional de primeira resposta**, calculada em tempo
  corrido a partir da última mensagem recebida do cliente. Não aparece no portal
  como compromisso com o responsável.
- Metas iniciais: prioridade **alta: 4h**, **normal: 12h**, **baixa: 24h**.
  Ticket sem prioridade usa a meta normal até a equipe classificá-lo.
- Tickets `waiting`, `resolved` e `closed` não consomem SLA. Tickets `new` e
  `open` são priorizados pela situação do SLA e, em seguida, pela mensagem de
  cliente mais antiga.
- A regra é pura e centralizada no backend. A listagem e o painel recebem a
  situação calculada, impedindo divergência de relógio ou de regra entre telas.
- IA continua estritamente como copiloto: resumo, classificação e rascunho.
  Todo envio exige a ação explícita de uma pessoa da equipe.

## Contrato e fluxo

1. O domínio calcula `on_track`, `at_risk` e `breached`, com data-limite,
   minutos restantes e alvo aplicável. O risco começa quando resta 25% da meta.
2. `GET /helpdesk/tickets` aceita filtros operacionais para situação de SLA e
   atribuição, e devolve a situação em cada ticket. A ordenação da fila passa a
   colocar tickets estourados, depois em risco, antes dos demais.
3. `GET /helpdesk/tickets/stats` passa a incluir contagens de SLA e de tickets
   sem responsável. O painel mostra essas exceções antes das métricas históricas.
4. A caixa de entrada oferece atalhos para “precisa de atenção”, “sem
   responsável” e “todos”, além de badges de SLA, canal de origem e responsável.
5. O detalhe mostra a meta e seu relógio. A área de IA deixa explícito que é
   material para revisão humana; qualquer texto legado sobre auto-resposta é
   removido da experiência operacional.

## Erros e segurança

- Nenhum filtro é aceito sem validação na borda HTTP.
- Campos de SLA são derivados, não persistidos; mudanças de prioridade são
  refletidas imediatamente e continuam protegidas por concorrência otimista.
- Falha de IA não bloqueia o ticket. Falha no carregamento preserva os estados
  de erro existentes, sem substituir dados por contagens falsas.
- A fronteira de acesso permanece a mesma: apenas equipe staff+ chega ao console
  via gateway e BFF.

## Verificação

- Testes unitários da política de SLA, incluindo bordas de risco, atraso,
  prioridades, reabertura e estados pausados.
- Testes HTTP dos filtros e dos novos agregados com os repositórios em memória.
- Testes das funções puras do app que escolhem o badge e o atalho de fila.
- Typecheck, testes, lint e build do backend e do helpdesk-app.

## Evolução posterior

Depois de observar uma operação real em staging e produção, as metas podem virar
configuração administrativa com horário comercial, feriados, alertas e
escalonamento. Isso não entra nesta primeira versão para não criar um motor de
políticas sem dados de operação.
