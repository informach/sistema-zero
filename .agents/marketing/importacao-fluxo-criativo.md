# Avaliação e integração do Fluxo Criativo

Data: 01/10/2026. Origem: `C:/Users/tocha/Documents/fluxo-criativo/.claude`. Destino: `.claude` e `.agents` do Sistema Zero. A pasta mencionada como `.cloud` corresponde a `.claude` nos dois projetos.

## Escopo da avaliação

Inventário estrutural de 18 agentes, 54 skills, 113 arquivos de comandos/referências (80 comandos na raiz), 14 hooks e 3 regras. Foram examinados propósitos e dependências dos pontos de entrada, com leitura aprofundada das metodologias de pesquisa, concepção, copy, revisão, anúncios e métricas, dos hooks candidatos e dos contratos locais. Templates, fontes, assets binários e scripts de integrações excluídas não foram portados nem executados.

O [inventário por arquivo](inventario-origem.csv) contém decisão, destino, justificativa e SHA-256 da entrada consultada. Não representa uma auditoria de segurança de todo script/asset da origem. As configurações foram avaliadas separadamente; não copiamos `settings.local.json`, permissões, credenciais, status de agentes ou configurações de execução.

## O que foi aproveitado

| Origem | Adaptação no Sistema Zero |
| --- | --- |
| pesquisa-mercado, dados-nicho, pesquisa Instagram, revisor-pesquisa | Pesquisa por nove eixos, público comprador/usuário, matriz de concorrentes, evidências datadas e implicações para copy |
| biblioteca-anuncios | Registro de peças e destinos, análise de padrões e hipóteses de novos criativos |
| concepcao-produto, geradores de consumidor/benefícios/urgências, estrategistas de produto/low/middle ticket | Resultado, mecanismo, consequências, objeções, proposta de oferta e plano de validação em uma skill de estratégia |
| paginas, copy-pagina, feedback-pagina, low ticket/quiz | Funções da página e revisão da jornada integradas a Astro, `FunnelDef`, conteúdo atual e checkout existente |
| revisora, manual-copy, checklist-light-copy | Revisão de argumento e evidência, apontando para as doze regras já existentes no backend |
| anuncios, mandala-de-anuncios, texto/vídeo, VVV, criativos-estaticos, elementos-literarios | Repertório de ângulos, texto/arte/fala separados, direção de cenas e hipóteses de teste |
| conteudo, carrossel, variacao-post, copy-social | Peças e calendário com handoff para ideias, conteúdos, checklist e publicações do app |
| trafego-insights/analise/otimizar/escalar, lt-otimizar | Definições de métricas, qualidade de dados, diagnóstico de gargalo e experimentos proporcionais à operação |
| toolkit e executor de plano | Registro de entregas e experimentos, sem importar um segundo sistema de planejamento |
| copy-review e no-emdash-guard | Um hook consultivo com o linter canônico, limitado aos caminhos pertinentes |

Instalação: **9 skills nas duas pastas, 6 agentes, 17 comandos, 1 regra com escopo por caminho e 1 hook**. As skills genéricas de copywriting, design, vídeo, pesquisa de conteúdo e QA já instaladas permanecem disponíveis.

## Correções metodológicas necessárias

1. **Dados observados versus inferência.** Anúncio ativo por muito tempo ou repetido não prova escala, lucro ou eficiência. Views e engajamento não provam venda.
2. **Volume não substitui evidência.** Mínimos rígidos de dez concorrentes, dez vídeos, cinquenta benefícios e setenta urgências viraram recortes proporcionais. Dados não encontrados permanecem ausentes.
3. **Métricas com definição correta.** Retenção em 25% do vídeo não equivale a três segundos. Não importar CPA fixo de 50% do ticket, limiares universais ou degraus automáticos de orçamento. Preservar atribuição, coorte e margem reais.
4. **Condições comerciais verdadeiras.** Não criar valor avulso de bônus, depoimento com número inventado, garantia ou promessa de suporte para preencher a metodologia. Preço e contrato pertencem ao catálogo/funil.
5. **Comunicação kids.** A argumentação é dirigida ao responsável e demonstra a experiência da criança. Foram excluídas imposições de explorar vergonha, criar inimigo, culpar pais ou prometer resultados educacionais gerais.
6. **Contexto antes de entrevista.** Aproveitar decisões e arquivos existentes; sem menus fixos, perguntas repetidas, confirmação antes de cada salvamento ou pausas entre blocos já solicitados.
7. **Arquitetura existente.** Páginas HTML avulsas, CRM em JSON, scripts de publicação e dashboards externos não substituem os pacotes já implementados.
8. **Revisão mecânica limitada.** O hook original verificava trechos e tinha regras próprias. O novo lê a peça completa, usa a implementação local e não aplica regex de copy a código ou pesquisa. Correções subjetivas continuam exigindo revisão editorial.

## O que ficou de fora

- Hooks GSD de workflow, contexto, atualização, commits e statusline: não acrescentam capacidade de marketing e interfeririam no fluxo geral.
- `agent-status-writer`, Live Office, memória de agentes e `painel-validar`: dependem do painel externo; o writer também admite envio para API do workshop.
- `setup-node`: não instalar runtime automaticamente em SessionStart.
- Regras de tempo estimado: calibração de outro ambiente não sustenta previsão aqui.
- Configuradores de Apify, HeyGen, Replicate, Z-API, Telegram e tokens Meta: credenciais, permissões e integrações não são portáveis; pesquisa e criação local funcionam sem essas dependências.
- Publicação Lovable/Vercel, ActiveCampaign, pré-checkout/CRM e dashboards por rede: usar infraestrutura e fluxos nativos do Sistema Zero.
- Remoção/zeragem/troca de produto ativo: não existe razão para trazer essas operações destrutivas do workspace de workshop.
- Agente high ticket/C10X, gerador de GPT, mini-SaaS, onboarding e tutorial do workshop: não são capacidades necessárias à operação pedida. Concepção de produto continua disponível sem impor esses formatos.
- Gestor pedagógico e criação de aulas do workshop: a direção local de `aula-roteiro` e os documentos pedagógicos do Sistema Zero prevalecem.
- Clonagem de seções por print, templates visuais e fontes do workshop: design e assets precisam respeitar o sistema visual local e o contexto de uso.

## Conexões com trabalho já existente

As skills apontam para o registry e os módulos dos três funis encontrados, para os componentes próprios de oferta, para a fonte de Light Copy e para o app de marketing. A revisão da Comunidade de 30/09/2026 foi incorporada como contexto: argumentar com experiência e escolhas observáveis, respeitar materiais preparados e não prometer revisão de toda atividade ou prazo de resposta.

A pesquisa de 30/09 contém fontes ainda marcadas para conferência. Ela pode orientar novas buscas, mas suas alegações não foram automaticamente declaradas verificadas nesta integração.

## Compatibilidade e verificação

A configuração do hook usa executável + argumentos, evitando dependência de aspas de shell no Windows; essa forma e o retorno `PostToolUse.additionalContext` foram conferidos na [referência oficial de hooks](https://code.claude.com/docs/en/hooks). O carregamento de skills nos agentes segue a [documentação oficial de subagentes](https://code.claude.com/docs/en/sub-agents). Ambiente encontrado: Claude Code 2.1.285, Bun 1.3.11, Node 24.15.0, Python 3.12.10.

Validação local: metadados e nomes das skills, referências Markdown, espelhos idênticos, roteamento de agentes/comandos, inventário e registro do hook; testes da CLI e do hook com o linter real. Isso não é um teste ponta a ponta de uma nova sessão do Claude/Codex nem uma avaliação de performance comercial.

O escopo é tooling do repositório. Nenhum serviço, landing page, catálogo, conta de anúncios ou publicação foi alterado por esta integração. `.agents/` e `.claude/` podem ser versionados para acompanhar o projeto em outros computadores; configurações pessoais, worktrees, estado de sessão e arquivos gerados continuam ignorados. O Biome exclui essas bibliotecas de templates e exemplos do lint da aplicação; as ferramentas de marketing usam validação e testes próprios. Não houve deploy desta entrega.
