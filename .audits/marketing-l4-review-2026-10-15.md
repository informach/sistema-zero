# L4 — Direção, fontes e planejamento

Estado: fatia funcional implementada e revista em ambiente local descartável. Não representa liberação de produção ou conclusão dos lotes seguintes.

## Entregas verificadas

- Bancada React compartilhada pelo Next/BFF e Electron: projetos, peças/componentes, direção vigente/proposta/histórica, fontes, calendário por semana e posição, resumos/decisões e listas de perfis/temas.
- Contexto delimitado pela peça e seus ancestrais, seleção, direção vigente e referências explícitas. Não carrega todo o acervo. Resumos e decisões congelam revisões de origem; fontes alteradas retiram o registro do contexto automático sem apagar sua história.
- Pesquisa nativa pelo Codex com JSON validado e URLs observadas nos eventos da ferramenta. Fatos, interpretações, hipóteses e citações permanecem separados. Propostas de direção entram como rascunho; a pesquisa precisa ser guardada explicitamente no projeto.
- Importação CSV/JSON de referências com limites, validação de URL e identidade determinística. A criação de uma variação conserva o vínculo com a referência.
- Pedidos duráveis na interface, fila IndexedDB na web e SQLite no desktop; falha transitória não transforma rascunho em confirmação. Retentativa de transporte tem recuo e não repete inferência.
- Passagem web → Electron resolve projeto, peça, formato e componente. O teste integrado abriu o primeiro componente de P01 e conferiu os 191 itens no cache.

## Evidência

- Pesquisa real com assinatura ChatGPT Pro: duas ações web, uma fonte oficial, 49.415 tokens de entrada e 700 de saída reportados pelo cliente. Artefato local `.cache/proof/research.json`; nenhum uso de API paga como fallback.
- Amostra real: vinte semanas, sessenta pautas e vinte sequências de stories; copies literais P01/P07/P34; direção, pesquisa e arquivos de origem com SHA-256. Repetição manteve cursor 192 → 192 e 191 itens. Nenhuma publicação agendada e nenhum asset binário importado nesta amostra.
- 15 testes PostgreSQL (workspace/execução), incluindo duas revisões de resumo e invalidação ao alterar sua fonte.
- 10 testes da bancada (27 assertions), 2 do parser de acervo, 19 Bun do desktop e 8 Node/SQLite passaram. Typecheck de bancada, web, backend e desktop passou durante a revisão.
- Electron real confirmou sessão restaurada, oito leituras concorrentes, rejeição de identidade divergente, isolamento do webview, cookie HttpOnly e abertura do acervo. Captura inspecionada; briefing longo foi recolhido para priorizar a copy.
- A revisão encontrou dependência workspace TypeScript externalizada indevidamente no processo Electron. O build passou a incorporar pacotes internos e externalizar somente dependências de runtime. A inicialização real passou após a correção.

## Limites mantidos explícitos

- A amostra está somente no banco descartável `marketing_review`; migração integral, reconciliação de imagens/vídeos e ativação do acervo são L8.
- A pesquisa pode ser interrompida ao observar excesso de consultas; o cliente nativo controla a chamada individual e não oferece reserva transacional de orçamento web. Não anunciamos um limite financeiro rígido.
- O teste de interface automatizado do próprio app e a inspeção da captura não substituem o piloto de duas pessoas/máquinas. O ambiente CUA não disponibilizou navegador.
- Aplicação validada de ajustes, alternativas, adaptação, conflitos e Desfazer entram em L5. Vídeo completo permanece em L6.
- Persistem os critérios externos registrados em L0–L3 (R2 real, distribuição assinada, login novo e duas máquinas) e a correção estrutural da sessão web antes da liberação.

Sem push, deploy, publicação social, commit ou merge nesta revisão intermediária.
