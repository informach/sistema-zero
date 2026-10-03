# Funil do Desafio do Primeiro Jogo — implementação

> **For agentic workers:** Use `executing-plans` para executar e verificar as etapas abaixo.

**Goal:** implementar a proposta aprovada do Farol integrada à raiz, ao Como Funciona, à Comunidade e às métricas existentes.

**Architecture:** manter registry, contrato/cotação, API de leads e checkout compartilhados. Motor condicional e conteúdo próprios do Desafio; três ofertas com composição compartilhada e argumentos/ordem distintos. Reutilizar os estilos e componentes visuais das ofertas Kids.

**Tech Stack:** Astro 6, React 19, TypeScript, Zod 4, Bun.

**Spec:** `docs/marketing/kids/desafio-primeiro-jogo/proposta-funil-2026-10-03.md`, `quiz-e-resultados.md`, `copy-proposta.md`, `provas-e-validacao.md`.

## Restrições

- R$ 67 é o preço de referência; preço exibido/checkout vêm da mesma cotação. Pagamento único, 30 dias desde aprovação, Mural completo durante o prazo e visitante depois; garantia contratual de sete dias.
- 9 a 14 anos, computador com internet/mouse/teclado, aulas gravadas e ajuda por mensagens. Não prometer desenho, outras ferramentas livres, Roblox/Minecraft ou atendimento ao vivo.
- Não inferir vontade da criança pelo desejo do adulto, forçar desempates nem traduzir perfis antigos em motivos novos.
- Preservar trabalho concorrente de métricas/home. Usar IDs estáveis, snapshots do quiz e atribuição sanitizada; não criar coleta ou banco paralelos.
- Sem disparar mensagens, publicar campanhas, alterar ambiente remoto ou substituir capturas de outro curso por falsas provas do Farol.

## 1. Quiz e decisões

Arquivos: `src/funnels/desafio-primeiro-jogo/quiz/{questions,engine,result}.ts`, `quiz/definition.ts`, `index.ts`; testes unitários e integração próprios.

- [x] Oito questões principais, desempate declarado e recusa condicional; idade/equipamento cedo; versão `desafio-farol-v2`.
- [x] Preservar motivo, interesses, restrições e próximo passo separadamente; limpar ramos inativos ao editar.
- [x] Integrar `FunnelQuiz.activeSteps/applyAnswer/isComplete`, validação, revisão/sessão, snapshots analíticos e perfil nullable.
- [x] Conferir os 27 cenários documentados e falhas de sessão/versão/reinício no servidor.

## 2. Ofertas, resultados e provas

Arquivos: conteúdo e oferta do Desafio, `DesafioOfertaBody.astro`, `DesafioResultado.astro`, `DesafioQuiz.tsx`, estilos incrementais e assets reais do Farol.

- [x] Três composições: primeiro jogo (padrão), tempo de tela e iniciação tecnológica; desenvolvimento, FAQ e condições completos.
- [x] Farol produzido do projeto local real; legendas de telas compartilhadas dizem quando exemplificam outro curso.
- [x] Resultado pessoal com convite copiável, orientação concreta e restrições antes do encaminhamento; revisão/reinício e estados de erro.
- [x] Usar componentes/estilos, rodapé e ampliação de imagens das páginas atuais; navegação por teclado e celular.

## 3. Jornada e ecossistema

Arquivos: rotas compartilhadas de quiz/resultado/oferta, `OfertaPage.astro`, `registry.ts`, `astro.config.mjs`, metadados/conteúdo de confirmação.

- [x] Rotas das variantes, links para `/como-funciona/`, raiz, Comunidade e acesso existente; cupom/UTMs preservados e cache adequado.
- [x] Capa/SEO/checkout/obrigado coerentes com Farol, prazo e pagamento confirmado; não alterar a mecânica de pagamento.
- [x] Retirar nave, asteroides, Mapa dos Pais e tipologia antiga das superfícies ativas do Desafio, preservando histórico.
- [x] Revalidar o estado dos arquivos compartilhados antes de cada edição para preservar trabalho concorrente.

## 4. Verificação e registro

- [x] `bun test`, `bun run typecheck`, `bun run check`, `bun run build` no pacote funil.
- [x] Navegador: três ofertas, quiz normal/condicional, incompatibilidade, retorno/reinício, links/atribuição, consentimento e estado de erro, celular/desktop.
- [x] Registrar evidências, capturas que ainda precisam de staging e limites da validação local em `docs/marketing/kids/desafio-primeiro-jogo/implementacao.md`.

Status final: implementação local e conferência concluídas. Funil: 457 testes, typecheck e build aprovados; Biome sem erros, com quatro avisos preexistentes. Mensageria: 137 testes e tipos aprovados. Navegação validada em desenvolvimento e no build com catálogo isolado. Conferências de publicação/compra em staging registradas em `docs/marketing/kids/desafio-primeiro-jogo/implementacao.md`. Nenhum deploy ou disparo executado.
