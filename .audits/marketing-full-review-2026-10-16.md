# Marketing — revisão integrada para staging local

## Resultado e escopo

A implementação disponível foi revisada como um sistema: contratos e autoridade do servidor; sessões web/desktop; execução com assinaturas; persistência e recuperação; produção Remotion; aprovação/entregas; acervo; métricas e próximo ciclo. As correções desta rodada fecham problemas reais encontrados nos percursos integrados. **Integração local não equivale à primeira liberação cotidiana:** os critérios de aceitação operacional abaixo continuam abertos. Não marcar todos os lotes concluídos por compilar, executar testes ou fazer merge.

Trabalho isolado em `sistema-zero-marketing`, branch `feat/marketing-desktop-operational-review`. Base do review: implementação consolidada já integrada a staging, acrescida de `65e622f75` (instalação/atualização), `99b09af45` (aprendizado/retenção), integração `7ca4a7663` e a correção de upload/gravação desta rodada. Alterações paralelas do Studio/Auth são preservadas. Nenhum push, deploy ou publicação social é parte desta entrega. Docker foi dispensado; testes transacionais usaram PostgreSQL 16 nativo em bancos exclusivos de revisão.

## Matriz dos lotes

| Lote | Implementação e evidência revisadas | Critério ainda aberto |
| --- | --- | --- |
| L0 | Texto real nos dois clientes oficiais, criação/edição real de imagem Codex, Remotion incorporado e transcrição local de prova. [L0/L1](marketing-l0-l1-review-2026-10-15.md) | Primeiro login de conta desconectada pela UI e falha nativa específica de imagem. As contas existentes não foram desconectadas. |
| L1 | Contratos, revisões imutáveis, escopos por projeto, autoria no servidor, CAS, recibos/eventos transacionais e migrações aditivas. Regressão PostgreSQL atual sem skips. | Aplicação no ambiente de produção acompanha a implantação; não foi executada. |
| L2 | Shell isolado, sessão vinculada, navegação online, bandeja/encerramento, instaladores oficiais pela UI, validação integral e atualização verificada. [Instalação](marketing-l2-install-update-review-2026-10-16.md) | Certificado/feed reais do Sistema Zero, instalador assinado e atualização entre versões; piloto de instalação em duas máquinas. |
| L3 | IndexedDB/SQLite, identidade por conta/origem, lease/checkpoints, retorno sem nova inferência, R2 real, retomada multipart expirada e upload/download de 2 GB por hash. Limpeza de mídias/chunks/execuções confirmadas pela UI com restauração. [Transferências](marketing-l3-recovery-review-2026-10-16.md), [retenção](marketing-l3-execution-retention-review-2026-10-16.md) | Clique de recuperação após encerramento forçado do provedor no pacote final. Provas do adaptador real e reinício SQLite estão registradas, não substituídas por essa pendência. |
| L4 | Direção/fontes/decisões, calendário de vinte semanas, referências, pesquisa com assinatura, contexto limitado e invalidação de resumo. [L4](marketing-l4-review-2026-10-15.md) | Revisão humana cotidiana no piloto. |
| L5 | Ajustar/alternativas/adaptar, aplicação validada, comparação, Desfazer, comentários, escopo e conflitos entre autores/componentes. Codex/Claude reais; P01 ajustado e desfeito pela UI. [L5](marketing-l5-review-2026-10-15.md) | Matriz completa dessas interações no piloto físico; não há perda/sobrescrita silenciosa aceita como exceção. |
| L6A | Imagens regionais, camadas editáveis, receitas, captura isolada do Studio, originais/hash, áreas protegidas, fontes e preflight. Demonstrações externas de staging preservadas. [L6A](marketing-l6a-review-2026-10-15.md), [demonstrações](marketing-demonstracoes-flute-2026-10-16/second-full-review.md) | Nova captura da demonstração 3D atual do P07 e qualidade editorial final das amostras. P29 permanece rascunho; não inventar seguidores nem autoria infantil. |
| L6B/C | Remotion compartilhado Player/render, codecs/rotação/VFR controlados, cortes/áudio/legendas, efeitos/adaptação, código isolado e cache de trechos. Gravação real do P21 percorreu web → desktop/Codex → R2 → web. [Gravação](marketing-l6-recorded-video-review-2026-10-16.md), [composição](marketing-l6-composition-review-2026-10-16.md), [cache](marketing-l6-render-cache-review-2026-10-16.md) | Celular com fala de alguns minutos, continuidade em outro computador e matriz UI de SRT/alternativas/conflitos/Desfazer. Áudio sintético e VFR controlado têm provas próprias; não são filmagem de usuário. |
| L7 | Edição exata aprovada, validação antes do envio, recuperação de entrega incerta, exportação íntegra pelo núcleo nativo/download web, disponibilidade de métricas e análise estruturada → hipótese/critério → pauta. [L7 integrado](marketing-l7-export-integration-review-2026-10-16.md) | Caixa nativa de destino exercitada por operador e restauração operacional remota com agenda/retenção de backup. Sem postagem real de teste. |
| L8 | Carga elegível/reconciliada em revisão: 4.167 origens CDC preservadas, conferência de 4.209 disposições sem diferenças; 109 peças/grupos, 779 componentes, 80 pautas/20 semanas, 227 artes em 37 posts. Sete conjuntos adicionais, incluindo 560 arquivos Fluxo e extrações Office. [L8](marketing-l8-review-2026-10-15.md) | Carga de produção no momento da implantação. Dez pendências editoriais conhecidas conservadas: P29, três fixados e seis destaques. |
| L9 | Três identidades/sessões no mesmo computador, medições de sincronização/UI, sessão web corrigida, retomada grande, acervo e ciclo de aprendizado demonstrados. [L9](marketing-l9-sync-performance-2026-10-16.md) | Piloto de duas pessoas em dois computadores, matriz completa de navegação/handoff e carga visual pesada com medição. Não liberado para uso cotidiano. |
| L10 | Resultados por objetivo, observações com cobertura, feeds/monitores, alertas e processo produtivo; telas web/Electron comprovadas. [L10](marketing-l10-review-2026-10-16.md) | Liberação subordinada a L9. Coletor pago não foi ativado. |
| L11 | Expansões explicitamente condicionais da proposta. | Tracking, multicâmera, voz/avatar e vídeo generativo dependem de necessidade medida; não integram a primeira liberação. |

As caixas históricas do plano não devem ser interpretadas como porcentagem de código restante. Esta matriz e as atualizações datadas dos reviews distinguem implementação, prova automatizada, operação real e liberação.

## Achados tratados no fechamento

- Análise de métricas produzia texto solto: passou a aplicar revisão tipada com hipótese e critério, preservando evidência/objetivo/origem. Casos de concorrência, Desfazer e formato incompatível foram testados. Protocolo e mínimo desktop **4**; documentos antigos continuam legíveis, sem valores retroativos inventados.
- Temporários de execuções concluídas não participavam da limpeza: agora exigem recibo local e resultado remoto exatos, são excluídos sob exclusão mútua com a produção e preservam pendências/originais/histórico. Reabertura e download com hash foram comprovados.
- Clientes oficiais precisavam de instalação pela UI e atualização do app precisava de verificação efetiva: downloads oficiais fixados/hash, recibo atômico, assinatura Authenticode com rejeição na ausência do verificador e conferência antes de instalar. A falta de certificado real bloqueia distribuição, não é mascarada por pacote de revisão sem assinatura.
- Upload web não passava no CORS existente. Contrato de `content-md5` e origens exatas ganhou verificação/aplicação administrativa reproduzível. Aplicado somente no bucket de testes, preservando regras anteriores. Biblioteca acompanha a confirmação sem intervenção manual.
- Provas antigas não consumiam o envelope IPC atual: decoder compartilhado conserva erros estruturados. A importação ausente de `demonstrationSources` foi resolvida e também chegou pelo staging; o merge preservou uma única correção.

## Verificação do código integrado

| Área | Resultado registrado |
| --- | --- |
| Marketing completo, PostgreSQL nativo | **436 testes / 2.435 assertions**, zero falhas; `tests-marketing-final-review` |
| Desktop Bun | **94 / 1.932**, zero falhas; `tests-desktop-final-review` |
| Persistência/supervisor Node/SQLite | **19**, zero falhas/skips; `tests-desktop-final-review-local` |
| Auth, incluindo DB | **302 / 1.073**, zero falhas; `tests-auth-integrated` |
| Gateway | **248 / 790**, zero falhas; `tests-gateway-integrated` |
| Web | **84 / 287**, zero falhas; `tests-web-integrated` |
| Importação/produção/workbench/contratos | **34 / 181**, zero falhas; `tests-marketing-shared-full` |
| Guardas de migração Auth | `check:migrations` passou, repetido no fechamento |

Os logs acima ficam na `.cache` da raiz; provas específicas de Electron ficam também na `.cache` do pacote desktop. Não somar suítes sobrepostas como testes únicos. Auth/gateway e partes não alteradas conservaram a mesma árvore validada; não se atribui a elas uma nova execução por ter sido feito merge. Tipos backend, desktop e web, Biome e builds têm registros próprios. O build Electron mantém aviso de tamanho do chunk de captura Studio; não foi suprimido nem tratado como falha de compilação.

Fechamento desta rodada: `types-video-storage.exit=0` (backend, incluindo scripts CORS); `packages/marketing-desktop/.cache/types-recorded-video-complete.exit=0` (desktop e dependências compartilhadas); `build-web-final-review.exit=0` (Next produção); `packages/marketing-desktop/.cache/build-recorded-video-reopen.exit=0` (Electron, captura e Remotion). Biome passou nos sete arquivos de código/configuração novos ou alterados da rodada; `git diff --check` não encontrou erro. A prova de reabertura da gravação terminou com código 0. Os logs de falhas anteriores foram mantidos, e a síntese não os conta como sucesso.

Após conferir o estado de erro da biblioteca, os tipos da bancada e do desktop foram repetidos (`types-workbench-final-review`, `types-recorded-video-final-review`, código 0). Builds finais `build-web-final-state` e `build-integrity-ui` passaram. A prova UI com byte divergente passou (`proof-integrity-ui.exit=0`): servidor recusou hash diferente, erro ficou visível e vínculo não foi oferecido. Confirmação de transferência não é validação de codec; esse limite foi conferido sem alterar o contrato de armazenamento.

## Operação e passagem para liberação

O servidor permanece a autoridade compartilhada; as assinaturas individuais ficam nos clientes oficiais no computador. Não há fallback automático para API paga. Edição por IA não exige timeline manual; seleção/contraste/aprovação continuam decisões de produto. O acervo carregado é do ambiente de revisão, não uma alegação de dados já implantados.

Na implantação: conferir backups/manifestos e recuperação remota; aplicar as migrações Auth/Marketing antes dos serviços novos; alinhar web e desktop ao protocolo 4; verificar CORS do bucket do ambiente; configurar certificado e feed HTTPS do instalador; executar primeiro login e piloto físico antes de ativar o uso cotidiano. Navegadores com a sessão antiga fazem novo login; a regra de reuso de refresh não foi relaxada. Rollback conserva tabelas/revisões/arquivos e pausa novos trabalhos; não faz downgrade destrutivo nem repete publicação incerta.

Os testes não autorizam fechar os critérios operacionais abertos. O merge solicitado é local e preserva os arquivos não rastreados do outro trabalho no checkout staging.
