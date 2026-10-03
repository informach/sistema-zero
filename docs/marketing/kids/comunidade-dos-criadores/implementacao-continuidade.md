# Implementação da página de continuidade

**Objetivo:** publicar localmente a copy aprovada em `/kids/comunidade-dos-criadores/oferta/continuar`, aberta a qualquer visitante.

**Arquitetura:** usar a mesma rota dinâmica, componentes Astro, estilos e capturas reais das quatro páginas de perfis. Continuidade representa uma etapa de relacionamento; os quatro avatares permanecem os mesmos. Preço e contratação seguem a resolução compartilhada do catálogo.

**Tecnologias:** Astro SSR, TypeScript, Bun e CSS existente.

**Especificação:** [copy aprovada](copy/pagina-e-continuidade.md) e [provas visuais](continuidade-provas-visuais.md).

## Restrições

- Preservar a reformulação visual e as capturas feitas na outra sessão.
- Remover a lógica de `origem=desafio`, sem redirecionamento de compatibilidade.
- Manter as 50 respostas aprovadas, links úteis, diferenças entre os acessos e condições da Jornada.
- Usar somente prints reais disponíveis. Telas ainda pendentes não serão fabricadas nem tratadas como evidência existente.
- Não alterar cobrança, acesso, progresso, catálogo, contas ou publicações.

## Execução

- [x] Acrescentar `continuar` ao registro de páginas, separado dos quatro perfis; transpor a copy e suas respostas para dados tipados em `packages/funnel/src/funnels/comunidade-dos-criadores/oferta/`.
- [x] Adaptar os componentes compartilhados para a comparação de acessos, links de respostas, condições específicas e prints, conservando o visual existente.
- [x] Retirar origem do resolver e do corpo da oferta; registrar a nova rota no sitemap e atualizar os convites de assinatura no Kids e Members.
- [x] Ajustar os testes de rotas, conteúdo e destinos comerciais; verificar que o conteúdo aprovado não se perdeu na transposição.
- [x] Executar testes, checagem de tipos, formatação e build do funil; validar os destinos alterados no Members.
- [x] Conferir a página no navegador em desktop e celular, suas imagens, âncoras, dúvidas e botões; registrar resultados e limitações.

## Validação

Verificação local em 01/10/2026:

| Pacote | Testes | Tipos | Biome | Build |
| --- | --- | --- | --- | --- |
| Funil | 369 passaram, nenhum falhou | Sem erros, avisos ou hints | Limpo | Passou |
| Kids | 1.141 passaram, nenhum falhou | Limpo | Limpo | Passou |
| Members | 1.303 passaram, 49 pulados, nenhum falhou | Limpo | Limpo | Não aplicável à alteração de links |

Os testes pulados do Members exigem configuração específica de banco descartável. Os 17 testes dos serviços de continuidade e lembretes passaram, assim como os testes de entrada por perfis do Kids.

O teste editorial compara todos os parágrafos, títulos, células e links da página E com a copy aprovada. As 50 perguntas estão completas, sem duplicação, e todos os vínculos visuais apontam para capturas conhecidas ou pendências explícitas. Os quatro perfis continuam com suas 40 respostas e suas copies anteriores.

### Navegador

- Rota nova e quatro páginas anteriores: HTTP 200, sem erros de JavaScript observados.
- Caminho de página inexistente: HTTP 404.
- URL antiga com o parâmetro: abre a página padrão, sem faixa de origem e sem redirecionamento especial.
- Mesmos componentes, estilos, tipografia Baloo 2/Nunito, cores, capítulos, molduras, galerias e controles de ampliação.
- 52 URLs de imagens presentes no HTML responderam com HTTP 200. Incluindo versões ampliadas, 90 arquivos foram decodificados pelo navegador sem falhas.
- Larguras de 320, 390, 768 e 1.440 pixels: sem transbordamento horizontal, inclusive com as dúvidas abertas.
- Todas as âncoras encontram seu destino; nenhum ID duplicado. Link direto de reembolso abre a pergunta e oferece o e-mail correto.
- Prints da resposta de ajuda e do Pensa/Zappy conferidos; ampliação abre e fecha. Texto da resposta mantém links navegáveis, sem sintaxe Markdown aparente.
- Os dois botões de plano abrem o formulário, que orienta a manter o e-mail do responsável e aceita também quem ainda não tem conta.

Evidências locais, fora do versionamento: `tmp/continuidade-desktop.png`, `tmp/continuidade-resposta.png`, `tmp/continuidade-mobile.png`, `tmp/continuidade-mobile-prints.png` e `tmp/continuidade-mobile-ia.png`. Logs dos comandos: `tmp/*-continuidade.log`.

### Limites desta conferência

O catálogo local não forneceu os planos nesta execução; a página utilizou a contingência comercial já existente nas quatro ofertas. Os botões abriram o modal, mas não havia slugs de catálogo para validar a seleção mensal/anual até o checkout. Preços finais, escolha de oferta e cobrança real precisam ser conferidos com catálogo disponível. Nenhum pagamento foi enviado, e o contrato comercial não foi alterado.

Reutilizamos os prints reais da reformulação das quatro páginas. Os itens que o registro `PENDING_VISUALS` ainda identifica como pendentes, sobretudo telas do responsável, continuam sem imagem; nenhuma captura foi fabricada. A reutilização de uma tela de staging não comprova por si só o acesso de todo aluno ou um resultado de aprendizagem. O [mapa de provas](continuidade-provas-visuais.md) continua sendo a referência para essas evidências adicionais.

### Arquivos e destinos

Copy e respostas: `packages/funnel/src/funnels/comunidade-dos-criadores/oferta/continuidade.ts` e `continuidade-faq.ts`. O registro de páginas distingue `ComunidadePageId` de `ComunidadeProfile`, preservando os quatro avatares. Os componentes compartilhados ganharam comparação de acessos, links editoriais e substituições de oferta/FAQ por página; o visual anterior foi mantido.

A URL está no sitemap. `COMUNIDADE_OFERTA_URL` no Kids e os convites de conclusão/expiração no Members apontam para `/kids/comunidade-dos-criadores/oferta/continuar`. Links de aula, ativação de conta e recuperação de senha continuam com suas funções originais. Não houve publicação ou envio real de mensagens.
