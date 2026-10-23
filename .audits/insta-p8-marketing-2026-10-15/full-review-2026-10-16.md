# Full review posterior à integração — conversas Instagram

Revisão solicitada em 16/10/2026. Escopo: toda a entrega `73fcbfdff`, integrada originalmente por `7c820700b`, incluindo contratos, edição/copy, autorização, webhook, worker, persistência, recuperação, bancada web/desktop e atribuição do funil. Base desta rodada: staging `b37fc3f72`; branch isolada `fix/marketing-instagram-full-review`.

## Achados e correções

| ID | Prioridade | Falha confirmada | Correção e evidência |
| --- | --- | --- | --- |
| R1 | P1 | O despacho desconsiderava postbacks e ecos ainda pendentes. Uma oferta podia sair apesar de já existir botão de parar ou resposta externa aguardando processamento. | Todas as entradas pendentes da pessoa precedem o despacho. Dois cenários PostgreSQL reproduziram a falha e passaram após a correção; a reserva em execução continua tratada separadamente. |
| R2 | P1 | Uma segunda resposta humana cancelava a primeira ainda na fila. A espera de uma retentativa explícita de 429 também permitia ultrapassagem. | Respostas humanas consecutivas são preservadas; interrupções cancelam a automação, e saída de encerramento/tomada explícita mantém sua função de cancelamento. O despacho respeita a ordem persistida, inclusive durante backoff. Teste verifica duas pendências e a ordem após 429. |
| R3 | P1 | Um clique antigo recebido com atraso podia liberar DM2 após a retomada humana; uma palavra atrasada também podia reabrir uma conversa encerrada. | Marco temporal `automation_after`, persistido por migração aditiva, separa a solicitação explicitamente conferida dos eventos anteriores e registra encerramento humano. Testes recusam clique/palavra atrasados, aceitam nova solicitação e conservam R01 uma única vez. |
| R4 | P1 | Novos eventos de contato excluído/criança eram gravados com conteúdo até o processamento. Comentário sem campanha passava pelo descarte antecipado e escapava da minimização. | Ingestão e exclusão compartilham o lock da conta; eventos de contatos suprimidos são minimizados antes do ACK. Entradas de conversa conhecida já são vinculadas na ingestão, e o worker verifica supressão antes da elegibilidade do comentário. Locks de envelopes com várias contas seguem ordem estável. |
| R5 | P2 | Remover o payload de uma entrada pendente deixava uma linha impossível de processar, mantendo o contador de pendências indefinidamente. | Exclusão/minimização também encerram o estado da entrada. O worker terminaliza pendências antigas sem conteúdo. Testes verificam ausência de payload e contador pendente zero. |
| R6 | P1 | D01/D02 podiam usar o fallback comercial sem oferta conferida, ou ser despachadas depois de vencer a validade durante a espera. | Exigem plano associado e vigente no comando e no despacho; a bancada explica a indisponibilidade. Respostas de serviço permanecem disponíveis conforme suas próprias regras. Dois testes PostgreSQL cobrem ausência de plano e expiração após enfileirar. |
| R7 | P1 | Falha temporária na consulta de contas desmontava a inbox e perdia o `operationId` de uma resposta cuja confirmação HTTP se perdeu. | Falha transitória conserva o componente/comando e bloqueia novos envios pela visão indisponível. Resposta autoritativa de revogação remove a visão privada. Prova Edge simula 503, retry da mesma operação e posterior 403. |
| R8 | P2 | A manutenção de retenção/quarentena dependia de o adaptador Meta existir. Remover a configuração externa podia interromper a limpeza dos dados já armazenados. | Worker de manutenção sempre montado com dependências de banco; runtime externo é opcional. Retenção não usa token, chave de identidade ou chamada Meta. Teste exercita o worker sem runtime externo. |
| R9 | P2 | O período inicial usava o dia UTC, que difere do calendário de São Paulo à noite; o limite exclusivo também perdia o último milissegundo do dia selecionado. | Datas iniciais locais e limite superior na meia-noite local do dia seguinte, preservando transições de fuso. Prova Edge às 23h30 em São Paulo confere a data e o limite enviado à API. |

Todos os achados acima receberam correção. Os testes novos foram executados antes da alteração pertinente para demonstrar as falhas; logs de reprodução e verificação permanecem em `.cache/engagement-review-*`. A primeira execução do PostgreSQL revelou que o diretório temporário antigo havia perdido arquivos; foi criado outro cluster descartável com os binários oficiais já baixados, sem reparar nem tocar bancos compartilhados.

## Conferência das demais áreas

- Contratos editoriais, copy/Desfazer, protocolo 2 e revisão imutável continuam integrados à reforma existente. A alteração desta rodada acrescenta somente um campo interno no banco; nenhum novo protocolo de cliente foi necessário.
- Autorização continua separando projeto e conta. Gateway e serviço mantêm identidade autenticada, equipe ativa e permissões por canal. Retentativa reutiliza o recibo; a conferência de versão continua impedindo sobrescrita concorrente.
- HMAC usa bytes originais, a resposta de webhook depende da persistência e tokens não chegam à bancada. Não houve alteração do contrato externo Meta nesta rodada. Credenciais, janela e capacidade continuam revalidadas antes de despachar.
- Resultado incerto continua sem reenvio automático. Pausa não promete cancelar chamada externa já iniciada. Exclusão/identificação como criança continuam irreversíveis e não recuperam conteúdo em respostas tardias.
- Relatórios do marketing continuam consumindo agregados autenticados do funil. Primeiras origens de sessão/lead, mídia DM, pagamento deduplicado, valor ausente e cobertura explícita foram preservados. Nenhuma leitura direta de tabelas do funil foi acrescentada ao marketing.
- Migração `0021_engagement_resume_boundary.sql` gerada pelo Drizzle e aplicada no PostgreSQL de teste. É aditiva e permite `null` para conversas anteriores. Não houve `db:push`, downgrade nem alteração em dados operacionais reais.
- A prova visual usa componentes reais com transporte simulado. Ela não equivale a uma instalação assinada do Electron ou validação de uma conta Meta. Os testes nativos verificam o transporte/persistência local existente separadamente.

## Validação e integração

Durante o review, staging avançou para `a3ce614c0` com correções do Studio Pro. Esse avanço foi incorporado por fast-forward, sem conflitos. Os builds finais usam essa base, incluindo a captura/integração Studio do desktop.

| Verificação | Resultado final |
| --- | --- |
| Marketing, com PostgreSQL | 349 testes passaram; 1.595 assertions |
| Funil, com PostgreSQL | 473 testes passaram; 4.664 assertions |
| Gateway | 247 testes passaram; 781 assertions |
| Contratos de marketing | 6 testes passaram; 21 assertions |
| Workbench | 14 testes passaram; 51 assertions |
| Desktop | 37 testes passaram; 1.512 assertions |
| Marketing web | 84 testes passaram; 287 assertions |
| SQLite nativo/desktop | 10 testes passaram |
| Edge, desktop/celular | 13 verificações passaram; calendário São Paulo, falha 503, replay, revogação 403, privacidade e layout |
| Builds | Next web e desktop completo aprovados; builds separados, `RAYON_NUM_THREADS=2` |
| Typecheck | Marketing, workbench e desktop aprovados; o build Next também concluiu a verificação TypeScript |
| Formatação e migrações | Biome e `git diff --check` aprovados; snapshot 0021 confere somente a coluna planejada e encadeamento correto |

Total da bateria: **1.220 testes aprovados**, sem falhas ou testes pulados nos resultados finais. Os cenários PostgreSQL já estão incluídos nos totais, sem dupla contagem. Logs em `.cache/engagement-r2-*`; prova visual versionada em `ui-validation.json`, `ui-desktop.png` e `ui-mobile.png`.

Ocorrências de ambiente: o teste analítico preexistente pressupõe banco já migrado e falhou na primeira execução sobre o cluster vazio. Executar `db:migrate` do funil no banco exclusivo e repetir a suíte produziu o resultado acima. O teste de importação em massa do desktop excedeu seus cinco segundos sob carga concorrente; passou na suíte executada separadamente, sem alterar código ou timeout. O build desktop mantém o aviso de chunks grandes de captura, sem erro de build.

O PostgreSQL descartável desta rodada foi encerrado após a verificação. Nenhum serviço compartilhado foi reiniciado. A conferência final não identificou achado local pendente nesta rodada. Commit e merge locais ficam registrados no histórico das branches, sem referência circular ao hash do próprio documento. A entrega não inclui push ou deploy.

Continuam pendentes exclusivamente os gates externos da proposta: prova C0 em conta autorizada, piloto C3 e expansão C4. Envios reais permanecem desligados por padrão. Não houve publicação, reconexão OAuth ou mensagem a terceiros.
