# Studio Pro — revisão do lote 9

## Resultado implementado

O Pro tem contratos explícitos de criação, construção e publicação, preflight antes do custo de IA, artefatos permanentes e player isolado, histórico com restauração, desativação e limpeza. A implementação mantém o terminal npm local e explica incompatibilidades com o catálogo remoto. O catálogo atual tem 14 modelos, dos quais nove são kits de jogos.

As liberações M1/M2/M3 são independentes e mantêm apenas os cinco starters por padrão. A implementação local não habilita os novos kits em produção. O encerramento desta revisão de código não atesta os critérios externos de homologação listados ao final.

## Contratos antes da execução

- Envelope UTF-8 completo de 2 MB, incluindo fontes, binários, manifesto e overhead. Provas Canvas nos valores exatos 1.999.999, 2.000.000 e 2.000.001 bytes, usando o parser e verificação reais. Nenhum teto aumentado.
- Preflight privado usa parser, lock e hashes do build, sem container nem inferência; BFF o executa antes de criar/reservar construção. Caminhos e limites são compartilhados pelo core.
- M1 governa criação; M2, criação e avanço de construção; M3, publicação. Revogação preserva consulta, cancelamento e revisão existente. O cliente revalida o escopo depois de operações assíncronas.
- A validação carrega identidade de toolchain/harness/lock. Fingerprint gerado e conferido em CI/deploy impede aceitar relatório de imagem antiga. TypeScript semântico, Vite, execução e playtest são resultados distintos.

## Publicação e player

- O BFF deriva ownership, autenticação e chave idempotente. Compila e verifica a fonte exata; promove somente arquivos conferidos por hash, incluindo PNG da captura. Fonte pública exclui notas privadas da assistência e vínculos com biblioteca pessoal.
- R2 recebe arquivos e manifesto antes do ponteiro. Escrita condicional por ETag controla revisões, histórico de até 20 versões, restauração, desativação e reativação. Falha definida limpa a cópia incompleta; resposta CAS ambígua preserva possíveis arquivos confirmados.
- Publicação permanente não usa a expiração do preview. Cada GET/HEAD, inclusive 304, confere revisão ativa, desativação e autorização do Mural. Deduplicação só de consultas simultâneas, sem TTL que mantenha autorização revogada. Falha de autorização fecha acesso.
- Player Pro recebe arquivos prontos em iframe de origem opaca, sem npm/compilador no dispositivo do visitante. Handshake real, limite de espera, estado de erro, controles, áudio e documento responsivo. Progresso IndexedDB usa namespace por publicação, separado do editor e estável entre versões.
- Share aguarda flush e captura imutável; chave de retry acompanha o mesmo conteúdo. Histórico tem operações explícitas e não sobrescreve a cópia em edição. A UI informa quando publicar uma versão também reativará o link.

## Retenção e operação

Webhook assinado persiste intenção de limpeza antes do ACK. Falha de persistência retorna 503; tarefas aceitas são retomadas pelo cron. Tombstone no mesmo objeto CAS impede ressurreição por operações antigas. Limpeza imediata e varredura usam lotes limitados, cursor e carência de 48 h; revisões do histórico são preservadas. Lifecycle de dois dias vale somente para previews.

Há duas limitações operacionais explícitas: entrega do webhook que esgota retries antes de ser aceita exige replay; primeira promoção confirmada seguida de falha/resposta ambígua na criação do post pode conservar uma publicação privada referenciada. O segundo caso permite retry idempotente, mas não tem reconciliação automática entre Hub e runtime. A operação deve consultar os dois estados e limpar apenas após confirmar abandono. Os callbacks, tokens e runtime precisam ser mantidos enquanto houver links ou tarefas pendentes. Procedimento em `packages/studio-runtime/README.md`.

## Achados corrigidos no full review

1. Importações do barrel completo do core levavam curadoria e bridges à listagem inicial, excedendo 350 KB. Consumidores passaram a importar contratos específicos; limites foram separados em módulo sem dependências. Exportação ZIP/diálogo carregam ao serem usados. Guarda de bundle passou sem alterar tetos de bytes, gzip ou quantidade de chunks.
2. Descrição de publicação não podia ignorar a fonte de créditos familiar. Transporte passou a usar reserva/ledger e chave da execução, com uma tentativa limitada, redação de dados pessoais e sem fallback financeiro silencioso. Pro usa arquivos reais selecionados, não IR clássica dormente.
3. Player não podia tratar 404 como pronto, reutilizar namespace do editor, depender de captura clássica nem ignorar mute do host. Handshake, persistência por publicação e contrato de áudio/controles corrigem essas causas.
4. Testes amplos expuseram expectativas antigas de chaves v2 e contaminação de mocks globais do Bun. Expectativas passaram a refletir o armazenamento v3; o teste de outbox cria e restaura seu adapter. O fixture browser compila em subprocesso limpo, sem compartilhar o cache de resolução dos mocks. Não foram relaxadas validações do produto.
5. O CI instalava somente Chromium no job unitário, e as novas provas de persistência também usam WebKit. O workflow agora prepara ambos e fornece um PostgreSQL descartável `studio_pro_review` às provas de ledger/builder. Também executa os smokes da imagem sem rede. O limite do job passou a 45 minutos para incluir as novas verificações reais; limites de produto/testes foram preservados.
6. Bibliotecas TypeScript vendorizadas têm geração determinística e comando de conferência em CI, incluindo licença e 99 bibliotecas da versão 5.9.3. O JSON gerado é excluído apenas da formatação genérica; erros semânticos continuam ativos.

## Evidências

As contagens não são aditivas; rodadas se sobrepõem. A consolidação final está em `studio-pro-full-review-2026-10-15.md` e `studio-pro-final-evidence-2026-10-15.json`.

- BFF de publicação/preflight/descrição/IA: 126 testes, 642 asserções, dez arquivos, aprovados.
- Runtime: 64 testes, 435 asserções, 12 arquivos, aprovados; incluem fontes dos 14 modelos, instalação independente, tipos, build, empacotamento, armazenamento e publicação.
- PostgreSQL real dedicado: 20 testes, 96 asserções de conta, ledger e builder; aprovado. Não foi usada base de produção.
- Player React/Chromium: promoção, exclusão do preview temporário, duas versões e restauração, progresso estável, mute/Enter, moderação/404 e viewport 360 px; aprovado.
- Persistência browser: 12 recargas imediatas por motor, Chromium com CPU limitada a 6× e WebKit, mais duas abas concorrentes; aprovado. O teste usa IndexedDB real e transporte controlado.
- Soak Canvas Survival: 1.800.698,5 ms reais, 60 reinícios, 30 amostras, 33 nós DOM e um canvas estáveis, até 64 inimigos, nenhuma exceção de página. Escopo: iframe compilado e entradas sintéticas, não host autenticado.
- Imagem final, suíte ampla, typechecks e medição final de áudio/performance: resultados exatos na consolidação citada acima.

## Homologação externa ainda necessária

Cloudflare Sandbox/DO/R2 real (Wrangler Containers não oferece esse ensaio integrado no Windows utilizado), conta OpenRouter/BYOK real, fluxo autenticado Pinta/Molda/Pensa entre perfis/aparelhos e metas de desempenho no host/hardware de referência. O laboratório Three usou SwiftShader. Não há prova de p95 de digitação/INP no host, GPU física nem garantia semântica de respostas de modelo pago. Não houve deploy, push, migração de produção ou consumo pago para produzir as evidências locais.
