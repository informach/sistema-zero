# Molda Cenários — continuidade integral do plano do Claude

> Execução: skill executing-plans. Autorização da usuária em 16/11: seguir o plano integralmente, com a interface do PDF, sem aprovações intermediárias. Revisão própria por lote e revisão completa ao final.

**Objetivo:** concluir os lotes 0–10 do plano aprovado, mantendo o módulo genérico, as regras de conta/licença, a identidade do Molda/Kids e a integração nos destinos previstos.

**Arquitetura:** núcleo puro v2 e comandos determinísticos; motor Three genérico; oficina React; persistência no Members; BFF no member-shell; perfis de jogo e exportadores separados. Não reconstruir os lotes já implementados.

**Tecnologias:** TypeScript, Zod, Three, React, Bun, Drizzle/Postgres, R2 UGC, Next; Raylib e Estúdio nos exportadores.

**Especificação normativa:** [plano original completo](../../plans/2026-11-16-cenarios-reforma/plano-claude.md), [interface aprovada](../../plans/2026-11-16-cenarios-reforma/interface-aprovada.pdf). O texto original utiliza jogo como projeto; a implementação e o PDF aprovados utilizam mundo para a mesma entidade.

## Restrições gerais

- Conferir `staging` local antes do trabalho; commits por caminhos; preservar alterações externas; push dos lotes verificados.
- Uma verificação pesada por vez. Nunca manter playground, Next e e2e pesados juntos; uma sessão de typecheck.
- Manter isolamento do jogo e do host. Núcleo sem React/Three/IO; dados autorais separados de câmera e ensaio.
- `three` na faixa `^0.184`; não escrever `boundsTree` diretamente; usar os padrões exportados pelo Molda.
- CSS prefixado em `@layer components`; `color-mix` em oklab. Copy Kids simples, sem travessão nem referências a IA.
- Toda funcionalidade da especificação precisa de implementação, evidência e estado explícito. Placeholders não contam como entrega.
- Acesso somente equipe no rollout inicial. Produção e abertura a membros obedecem ao aceite final previsto no plano.
- GLBs licenciados e credenciais fora do Git. Não compartilhar nem exportar biblioteca restrita para outra conta.
- Variável nova no Railway deve existir antes de ser incluída em `.railway/variables.ts`.

## Lotes e critérios de fechamento

- [x] **0 — Fundação:** revisar documento v2 mínimo, escala por eixo, referências de biblioteca/hash, migração, inversão de lotes, CI e watchPatterns. Corrigir o teste da imagem Members para a dependência nova; testar sem afrouxar isolamento.
- [ ] **1 — Equipe na plataforma:** conferir Members, gateway/BFF, migração 0151 em Postgres real, motor genérico, quatro telas conforme PDF, objetos básicos, GLB, acesso nos dois apps, fotos nos tamanhos/temas previstos e prova de operação no staging.
- [ ] **2 — Bibliotecas:** GLTF/OBJ/FBX/pastas/ZIP, conversão em worker e recursos incorporados; pastas/etiquetas/busca/cota; biblioteca Meus moldes; carga do acervo da equipe e conversão da Faísca.
- [ ] **3 — Objetos e ensaio:** encaixes/grade modular; escala por eixo; alinhar/distribuir/repetir/espelhar/trocar; espalhar determinístico; conjuntos reutilizáveis; blocos de rascunho; cor/textura; árvore/camadas/laço/cópia; histórico durável; ensaio com cápsula, três modos e modelo de biblioteca.
- [ ] **4 — Terreno:** alturas Uint16 em peças por hash, resolução/tamanho, até oito camadas de solo/pintura, buracos; pincéis e receitas determinísticas (elevar/abaixar/aplainar/suavizar/rampa/platô/nível/ruído/erosão/morro/cratera); PNG de alturas; conversão do perfil do Arquipélago.
- [ ] **5 — Água:** mar, encher lago por ponto, rio com leito e correnteza, represa, cachoeira; água/espuma/profundidade; nado e física correspondentes.
- [ ] **6 — Caminhos:** trilha/praça/estrada que molda terreno, cerca/muro/ponte ao longo da curva, inserção/remoção e alças na cena.
- [ ] **7 — Jogo/luz/céu:** início, marcadores, zonas, rotas, propriedades, colisões visíveis, câmeras/régua/referência de escala; sol, ambiente, luz pontual/foco, sombras, céu 360°, névoa/hora.
- [ ] **8 — Exportação:** compilador único, malhas limitadas e GLBs simples/licenças; ZIP three.js e exemplo jogável; GLB único; Python/Raylib externo e módulo oficial; asset scene3d e blocos do Estúdio nos quatro destinos; perfil/carregamento publicado no Arquipélago; orçamentos e junção por região.
- [ ] **9 — Agentes:** manter CLI/MCP existentes; comandos de intenção, consultas de altura/região/orçamento/validação, busca por dimensões, captura em palco aberto e headless, guia; demonstrar edição sem aba aberta e desfazer na oficina.
- [ ] **10 — Limpeza e abertura:** remover piloto/tabelas e rotas antigas com preservação dos dados de autoria importados; retirar CENARIOS_RUNTIME_URL; modos lista/aberto prontos, faixas por posto, biblioteca inicial livre e cota; ativação de membros somente quando a usuária mandar.

## Verificação e revisão por lote

### Continuação registrada

Lotes 1/2 em execução: [primeira revisão e evidências locais](../../plans/2026-11-16-cenarios-reforma/revisao-lotes1-2-parcial.md), [biblioteca viva Meus moldes](../../plans/2026-11-16-cenarios-reforma/revisao-lote2-moldes.md), [descrição e capa](../../plans/2026-11-16-cenarios-reforma/revisao-lote2-organizacao.md). Quatorze capturas de interface versionadas; Postgres e imagem Members exercitados; importação em worker, organização das bibliotecas, fonte viva do Molda e escolha de capa implementadas, com ensaios no Chrome. Recortes enviados na staging em `6e4b20491` e `7dc4af18b`. Os lotes continuam desmarcados até os critérios restantes: conta no staging, texturas/conjuntos, acervo/Faísca e arquivos complexos. Continuar sem aprovação intermediária.

Cada lote deve registrar: requisitos cobertos (com referência às seções da especificação), arquivos/contratos alterados, testes pertinentes, tipagem, prova no navegador, capturas, riscos/dependências externas e commit. Não converter um bloqueio de publicação em alegação de conclusão. Ao final, conferir a especificação linha por linha, testar os fluxos integrados e publicar as evidências e o guia na staging.

## Estado inicial auditado

Base `dbe99040e`, árvore limpa. Commits do Claude implementaram grande parte de 0/1 e parte do cliente de agentes. 125 testes direcionados passaram nesta sessão de conferência (core 42, motor 9, UI 24, Members 28, gateway 5, BFF 17). A imagem Members falhou no CI porque `qa/image-smoke.mjs` ainda espera a lista anterior de workspaces. Os watchPatterns não incluem os novos pacotes; migração e rollout remoto ainda precisam de prova. O PDF tem três páginas de capturas reais e foi inspecionado visualmente; manter sua composição de quatro telas, seis abas superiores, ferramentas à esquerda, palco central, painel recolhível à direita e gaveta inferior.
