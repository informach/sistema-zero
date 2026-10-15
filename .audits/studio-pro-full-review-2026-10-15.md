# Studio completo e Pro — revisão final integrada

## Conclusão de código e alcance

Os lotes 0–9 e os adendos Canvas e Zappy Pro A01–A06 estão implementados e passaram por revisões locais sucessivas. O Studio normal preserva blocos e CDN; o Pro usa arquivos, npm e serviço de linguagem próprio. O trabalho inclui integrações Pinta/Molda/Pensa, conta opcional OpenRouter do responsável, jogos 2D/3D, construção por revisão e publicação permanente. Este relatório distingue implementação revisada de aceite externo do produto: o rollout dos novos kits permanece condicionado às flags e à homologação descrita abaixo.

Referências: [proposta](studio-pro-proposta-v2-2026-10-15.md), [matriz GameDev](studio-gamedev-aproveitamento-v2-2026-10-15.md), [execução por lote](../docs/superpowers/plans/2026-10-15-studio-pro-implementacao.md), [lote 8](studio-pro-lote8-review-2026-10-15.md), [lote 9](studio-pro-lote9-review-2026-10-15.md), [Canvas](studio-pro-canvas-implementacao-2026-10-15.md), [Zappy Pro](studio-zappy-pro-adendo-implementacao-2026-10-15.md).

## Matriz de revisão R01–R14

| Critério | Implementação e prova local | Limite do aceite |
|---|---|---|
| R01 — Zappy por modo | Contexto, prompt, busca, histórico, referências, sugestões e contingência distinguem normal/Ponte de Pro. Caso `install` e pedidos adversariais têm regressões. | Respostas pagas de modelo externo não foram avaliadas nesta execução. |
| R02 — terminal/documento | Reconciliação de três vias, fila por instância, conflitos preservados, arquivos novos/rename/delete/package/lock, flush antes de save/export/handoff. Browser com instalação npm e reabertura real; persistência e concorrência com IndexedDB. | Saída antes de o filesystem emitir evento não equivale a escrita confirmada. |
| R03 — tipos/Monaco | Worker TS 5.9.3 por projeto, fontes fechadas, tsconfig e declarações instaladas, exports/subpaths, invalidação, hover/definição/completar. Three/GLTFLoader/Phaser/mitt válidos; TS2322 permanece; remover mitt restaura TS2307. | Pacote sem declarações não ganha tipos inventados. Amostra de 1.276 ms após reinstalar mitt não é p95. |
| R04 — build confiável | Configuração Vite/PostCSS controlada, dependências imutáveis, ambiente sem `.env` do aluno, comandos fixos, usuário sem privilégios, rede desligada e recursos limitados. Docker real. | Integração Cloudflare/SDK depende de homologação externa. |
| R05 — conversão | Cópia original persistida, escopo/CAS, scripts globais e ordem preservados, migração npm e recusa acionável para casos ambíguos. Builds e Chromium reais. | Formas incompatíveis exigem migração explícita; nunca promovidas com perda silenciosa. |
| R06 — materiais | Bytes únicos em assets, projeção com hash/caminho, manifesto e créditos; montagem, conflito, export, remoto e publicação; PNG/SVG/JSON/glTF/GLB/áudio reais. | Sem redistribuição dos pacotes externos sem licença. |
| R07 — consumo | Ledger/reservas por família, limites, tentativas, liquidação e reconciliação; OAuth PKCE adulto e segredo cifrado; fonte explícita, sem fallback. PostgreSQL real e transporte controlado. | Provedor pago/BYOK e painel em sessão adulta real não homologados. |
| R08 — validação | Tipos semânticos, build, execução/playtest e captura separados; perfil/fingerprint; objetivos por entrada para kits, readiness e inspeção somente leitura. | Build/playtest não atestam qualquer objetivo inventado nem a qualidade pedagógica da resposta. |
| R09 — abertura direta | Reconciliação de nuvem/Pensa antes de abrir, remount por perfil/projeto, retry de leitura/chunk e respostas tardias isoladas. | Transferência autenticada entre aparelhos depende de prova externa. |
| R10 — host/player | Adapters Pinta/Molda compartilhados, materiais e clips, missão/biblioteca Pensa, save bridge, player Pro permanente e publicação com rollback. | Integração autenticada completa com os três hosts segue pendente. |
| R11 — contexto | Arquivo ativo/diagnósticos/pergunta, índice e leitura limitada, escopo completo/projeto/arquivo/seleção, curadoria pertinente e procedência. | Referência do kit não prova o estado atual de código modificado. |
| R12 — carga | Catálogo leve, factories e motores seletivos, módulos de contrato específicos; guarda de produção aprovado nos tetos existentes. | Bundle não substitui LCP/CLS/INP no host. |
| R13 — gráficos/lifecycle | Regras puras, pools, descarte, pausa sem loop contínuo, contexto WebGL, qualidade, áudio e controles; 20 ciclos, amostras de 60 s e soak real de 30 min. | Medição isolada com SwiftShader não certifica GPU móvel ou metas do editor ativo. |
| R14 — local/remoto | Catálogo remoto e lock/integridades conferidos, preflight sem inferência, envelopes completos, capacidades versionadas e flags M1/M2/M3. ZIP fora do repo com npm ci/ls/tsc/Vite/browser. | npm local pode ir além do catálogo remoto e recebe incompatibilidade explícita. |

## Kits e inteligência artificial

Há cinco bases web e nove kits editáveis: puzzle Canvas, arena Canvas Survival com pack próprio, arcade e plataforma Phaser, exploração e ação Three, arena em grade Canvas, tático Phaser e tático Three. A seleção cria uma cópia dos fontes/configuração/materiais no projeto. A curadoria da pasta GameDev alimenta receitas e contexto limitado do Zappy; não executa skills ou ferramentas arbitrárias no computador do aluno.

A IA trabalha em candidata separada. Plano, ferramentas limitadas, custos confirmados/incertos, diagnóstico/build/playtest/captura, preview, diff, aplicar e desfazer compartilham o mesmo estado durável. Edição concorrente não é sobrescrita. Recibos de aplicação, inversas e rascunhos são persistidos; exclusão cancela jobs por outbox de IDs. A07 (executor independente com aba fechada, múltiplos jobs e merge avançado) foi reservado como etapa posterior no adendo, não está anunciado como entregue.

## Achados relevantes corrigidos

As revisões por lote corrigiram isolamento de modo, falso positivo de segurança, perda de terminal/lock, configurações executáveis não confiáveis, tipos falsamente ausentes, conversão de scripts globais, recursos gráficos retidos, concorrência em flush/CAS/leases, custo ambíguo, descarte do DiffEditor e persistência da aplicação ao fechar a página. A revisão final corrigiu a regressão de bundle na raiz do grafo de imports e a contaminação de testes por mocks. Detalhes e reproduções permanecem nos relatórios de cada lote; não há supressão global de diagnósticos, troca de Audio/fetch do produto ou ampliação de limites para fazer os testes passarem.

## Verificação final

Resultados consolidados e ambiente estão em [evidência final](studio-pro-final-evidence-2026-10-15.json). As contagens de baterias sobrepostas não devem ser somadas como casos exclusivos. Todos os comandos foram executados localmente; testes com serviços substituídos estão identificados. As verificações finais de integração Git são registradas no plano após o commit/merge.

Resultados finais antes da integração: **9.041 testes Studio/137.628 asserções**, zero falhas; Members **1.412 passaram/338 skips**, PostgreSQL dedicado **20 passaram**, BFF **126 passaram** e runtime **64 passaram**. Typecheck final de Studio, Admin, member-shell, runtime (produção e testes) e Kids: exit 0. Biome: 434 arquivos, zero erros/avisos, 13 informações de estilo; `git diff --cached --check`: aprovado. Congelamento do lock em checkout isolado: aprovado; a única mudança própria no lock raiz é a fixação de TypeScript 5.9.3.

Imagem Docker final `sha256:acf2ed3c56b67a0957bf2adc1d93d232a8a281462c70cbddeb95f62b42748b07`: smoke de proteção/binários e seis kits com playtest/captura aprovados, uid 1000, sem rede, 1 CPU/1 GB. Guardas de bundle originais passaram. Provas finais de áudio e performance Canvas/Three: três passaram; soak de 30 minutos aprovado. A descrição dos ambientes e as limitações continuam nas evidências.

## Pendências operacionais e de homologação

1. Provisionar/configurar runtime isolado, R2 privado, callbacks, cron, secrets e migrações Members 0116–0124 no ambiente de destino, seguindo os READMEs. Nenhuma dessas alterações foi aplicada à produção.
2. Executar a jornada autenticada por motor e fonte de IA: criar, instalar, editar, pedir assistência, validar, salvar, reabrir em outro perfil/aparelho, exportar e publicar. Pinta/Molda/Pensa e OpenRouter reais fazem parte dessa prova.
3. Medir host com editor e jogo simultâneos, frio/quente, digitação, INP/CLS, preview/indexação, GPU e aparelhos físicos comuns/reduzidos. Não substituir metas da proposta por limiares de laboratório mais permissivos.
4. Liberar kits gradualmente pelas flags independentes M1/M2/M3 após as provas. Monitorar falhas, custo incerto, fila de limpeza, recursos e duração; rollback preserva configuração necessária aos links já publicados.
5. Operar os casos de retenção entre serviços: webhook não entregue exige replay; primeira publicação com resultado ambíguo no Hub pode exigir reconciliação manual. Acesso público continua fechado sem autorização. Referências permanentes não recebem lifecycle por idade.

A revisão local não encontrou impedimento adicional para o commit e a integração local autorizados. Isso não significa ausência absoluta de defeitos nem aceite integral de produção. O repositório compartilhado também contém trabalhos Molda, marketing e TUI: a integração desta frente seleciona somente Studio e suas dependências/contratos próprios, preservando alterações concorrentes.
