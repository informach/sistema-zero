# Menu de aulas da comunidade adulta

Pedido: aplicar o acabamento visual da comunidade adulta ao índice à direita da
página da aula, tomando o cuidado visual do Kids como referência.

## Diagnóstico inicial por código

O índice adulto está em
`packages/community/src/app/(app)/cursos/[slug]/aulas/[lessonId]/lesson-player-client.tsx`.
Ele ainda desenha cabeçalho, módulos e aulas com `Card`, `bg-muted`, tipografia pequena
e linhas genéricas; o Kids já tem título/progresso trabalhados, números/ícones em
marcadores, agrupamento visual por unidade e linhas arredondadas com mais espaço.

As duas implementações usam o mesmo mecanismo de gaveta/painel lateral e rolagem,
mas não a mesma apresentação. A hipótese a conferir no navegador é falta de
acabamento do índice adulto; não foi constatada ausência global da folha de estilos.

## Lote de implementação

1. Conferir o índice adulto no navegador e as receitas do tema em
   `packages/community/src/app/globals.css`, incluindo `--pen-linha`, `--border`,
   `--primary`, `--card`, `.sz-display`, `.sz-card` e `.sz-soft`.
2. Aplicar ao painel título legível, progresso identificado, divisórias e agrupamento
   de módulos coerentes com o desenho adulto. Usar os tokens existentes nos temas
   claro/escuro e nas paletas, sem copiar cores fixas do Kids.
3. Dar às aulas marcadores consistentes de número/conclusão/bloqueio, área clicável
   confortável, espaçamento e estado atual inequívoco. Preservar `aria-current`,
   bloqueio real, links, ordem, progresso e fluxo de avaliação do curso.
4. Conferir a rolagem discreta, altura útil do painel, títulos longos e a gaveta no
   celular. Verificar foco, teclado, botão de fechar, fundo modal e `inert` quando
   recolhido. O índice não pode cobrir os controles da aula indevidamente.
5. Fazer review visual e funcional, corrigir achados e promover o lote pelo fluxo
   normal staging → produção.

## Aceite

- Adulto com identidade visual coerente com suas outras páginas e sem cores infantis
  impostas; Kids continua usando sua apresentação atual.
- Aula atual, concluída, disponível e bloqueada distintas também sem depender apenas
  de cor, com contraste e foco legíveis.
- Painel aberto/recolhido no desktop e gaveta no celular, curso curto e longo,
  títulos extensos e progresso de 0/100% verificados em navegador real.
- Sem transbordamento horizontal; lista longa rola dentro da área útil do painel.
- Nenhuma alteração de objetivos, roteiros, falas, ordem de aulas ou liberação curricular.

Este lote ainda não foi implementado nem validado graficamente. É separado da
regularização financeira e do release congelado `ef292cb0f`, já aprovado em staging.
