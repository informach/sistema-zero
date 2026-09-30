# Comunidade dos Criadores: implementação da argumentação

**Objetivo:** aplicar a proposta aprovada à oferta, pré-checkout, checkout e obrigado.

**Arquitetura:** manter o body Astro da oferta e as condições existentes nas etapas compartilhadas. Conteúdo de entrega e primeiros passos continua no módulo do funil. Preservar preços dinâmicos, seleção de plano, pagamentos e estados de confirmação.

**Stack:** Astro, TypeScript e React nas ilhas existentes.

**Proposta:** [argumentação aprovada](../../plans/2026-09-29-comunidade-criadores-argumentacao-proposta.md).

## Restrições confirmadas pelo usuário

- Copy natural, sem travessões no texto público.
- Os três depoimentos são reais; Rafael também testou a plataforma. Preservar as falas.
- Criança desenvolvendo ideias pela criação de jogos como argumento principal.
- Telas e IA como apoio; sem promessas gerais de inteligência ou comportamento.

## Execução

- [x] Reescrever abertura e argumento da oferta; mostrar exemplo de decisão, apoio inicial, rotina e IA. Manter demonstrações reais e depoimentos.
- [x] Ajustar valor, expectativas, perguntas frequentes e fechamento ao mesmo raciocínio.
- [x] Atualizar `content.ts` e `index.ts` para metadados, entregas e primeiros passos.
- [x] Revisar condições da Comunidade em `PreCheckoutModal.tsx`, `checkout.astro` e `obrigado.astro`, sem alterar a argumentação dos outros produtos.
- [x] Atualizar guardas editoriais existentes para a nova proposta, preservando invariantes comerciais.
- [x] Rodar `bun test`, `bun run typecheck`, `bun run check` e `bun run build` no pacote funnel. Conferir renderização e links das etapas quando o ambiente local estiver disponível.

## Verificação realizada

- 317 testes passaram; nenhum falhou.
- Astro check: 176 arquivos, zero erros, avisos ou hints.
- Biome: 180 arquivos, sem erros.
- Build SSR concluído; `git diff --check` sem erros.
- Navegador: oferta em desktop e celular; modal, checkout mensal/anual e obrigado pendente em celular. Sem overflow horizontal nos trechos verificados e sem âncoras internas quebradas na oferta. Texto comercial da oferta sem travessões; razão social no rodapé preservada.
- O ambiente não tinha configuração dos serviços. A revisão visual usou catálogo local simulado e interceptação das APIs de sessão. Não houve pagamento real; a confirmação aprovada não foi exercitada no navegador.
- Corrigida incoerência visual preexistente: quando há alternador de planos na Comunidade, o cartão estático do checkout não repete o preço mensal enquanto o anual está selecionado. Preços permanecem no seletor dinâmico. Equivalência mensal do anual passa a exibir centavos.
- Única mudança comum aos demais checkouts: retirada do travessão no aviso de bloqueio do cartão, mantendo a instrução de desativar o bloqueador.

## Documentação

Registrar nos documentos de proposta e pesquisa a confirmação da autenticidade dos depoimentos, fornecida em 30/09/2026.
