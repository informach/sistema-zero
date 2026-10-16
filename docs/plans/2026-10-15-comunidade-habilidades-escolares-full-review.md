# Full review da oferta de habilidades escolares

Revisão de 15/10/2026, após a implementação e antes do commit e merge local em `staging`. Escopo: proposta, copy, conteúdo tipado, FAQ, composição Astro, integração com quiz/rotas/sitemap, contratação compartilhada, testes e documentação.

## Achados corrigidos

| Prioridade | Achado e evidência | Correção |
| --- | --- | --- |
| Alta | No pré-checkout compartilhado, Tab saía do modal aberto e alcançava a página atrás. Reproduzido no navegador com `Keyboard focus left the modal`. O listener existente só tratava Escape. | O modal limita Tab e Shift+Tab aos controles habilitados e visíveis, recupera foco externo e remove os listeners ao fechar. O retorno aponta para o CTA que abriu o formulário, inclusive quando o navegador não o foca no clique. |
| Baixa | O destaque do fechamento da página F estava no primeiro parágrafo, mas o componente só aplica os destaques à prosa seguinte. O teste de HTML reproduziu `Closing emphasis must render: 0 !== 1`. | O destaque passou para “aulas guiadas, ferramentas e um caminho de ajuda”, no parágrafo que recebe o tratamento visual. O hero e a copy aprovada foram mantidos. |
| Média | Os testes unitários conferiam a configuração do tour, mas não demonstravam a ordem real no HTML. O primeiro QA conferia os slugs nos botões, sem seguir o envio até o destino de checkout. | Novo teste de navegador reproduzível cobre o HTML das seis variantes, preços distintos dos fallbacks, âncoras, imagens, FAQ, zoom, responsividade, foco e encaminhamento dos dois planos com UTMs. |
| Baixa | O relatório tinha três links para capturas em `tmp/`, ausentes num checkout limpo; a proposta ainda descrevia ajustes já executados como pendentes. | Removidos os links transitórios, documentado o comando que recria as capturas e atualizado o estado da implementação. |

Os dois defeitos funcionais foram reproduzidos antes das correções; o teste completo passou depois delas. Na automação, o preenchimento aguarda o foco inicial do modal, evitando disputar com o efeito de abertura. As APIs de contato e o destino do checkout são simulados; os testes não criam leads reais nem pagamentos.

## Revisão editorial e de integração

Hero aprovado preservado. Dor e explicação aparecem na seção imediatamente seguinte. A crítica se refere ao ensino concentrado em repetir sem compreender, com exemplo concreto, sem rotular a criança. As seis relações com a escola continuam sustentadas por ações observáveis; a página não promete notas, recuperação por série ou intervenção individual.

Ciências usa a alternativa aprovada do jardim. A comparação de cinco e dez passos permanece expressamente imaginada. Capturas demonstram recursos e atividades, sem se apresentar como evidência de melhora escolar. Condições de acesso, Jornada, apoio assíncrono, dois perfis, renovação e garantia continuam coerentes com a fonte compartilhada.

A variante tem URL e metadados próprios, está no sitemap e é reconhecida pelo contexto analítico de oferta. Continua separada dos quatro perfis do quiz. Textos são renderizados como conteúdo Astro, sem HTML arbitrário. As demais páginas preservam a posição do tour e usam o mesmo contrato comercial.

## Validação

Em `packages/funnel`:

```powershell
bun test
bun run typecheck
bun run check
bun run build
node --import tsx tests/browser/comunidade-oferta.ts
```

- 470 testes aprovados; um teste de integração PostgreSQL ignorado pela configuração existente.
- Tipagem sem erros ou warnings; dois hints preexistentes em arquivos não alterados.
- Biome aprovado; quatro avisos preexistentes em `comunidade-quiz.css`, fora do diff.
- Build SSR e sitemap gerados.
- Navegador: seis rotas, cinco larguras entre 320 e 1440 px, 55 fontes de imagem e os dois planos; nenhum erro JavaScript. Sem overflow horizontal, IDs duplicados ou âncoras internas quebradas.
- Revisão mecânica Light Copy e conferência dos links locais da documentação complementam a inspeção editorial.

Limites: catálogo efêmero em loopback, sem banco real, mensagens ou cobrança. Esta revisão não mede conversão nem resultados escolares. O merge solicitado é local, sem publicação remota.
