# Implementação e revisão dos quizzes adultos

Data: 06/11/2026. Escopo: proposta V2 do Desafio e da Comunidade adultos, integração com API, resultados e admin. Estado: implementação local; este relatório não comprova deploy.

## Comportamento entregue

- `/pro/desafio-primeiro-jogo/quiz`: `desafio-autonomia-v2`.
- `/pro/comunidade-dos-criadores/quiz`: `comunidade-autonomia-v2`.
- Dez perguntas SPIN por percurso, confirmação explícita, alternativas concretas, variantes para iniciantes e condições com seleção múltipla. “Nenhuma” é exclusiva.
- O produto aparece no resultado. O perfil registra a conquista declarada; as demais respostas contextualizam o texto e as condições de participação. Os 32 resultados de referência preservam a redação aprovada.
- Revisão direta de respostas: mantém escolhas independentes e solicita novamente apenas as perguntas cujo contexto mudou. Retomada, concorrência entre abas e reinício usam a sessão existente e validação no servidor.
- Resultados com destaques, exemplos, capturas reais, ampliação centralizada, CTA correspondente e um rodapé institucional.

## Admin e histórico

Respostas usa o snapshot para mostrar a pergunta exata de cada variante e todos os rótulos das condições selecionadas. Registros v1 permanecem intactos e legíveis, inclusive os que não tinham snapshot. Perfis separa os rótulos atuais dos anteriores; o filtro de versão vigente continua disponível. Performance agrupa variantes nas mesmas dez etapas. Métricas mantém a identidade de cada variante e a numeração correta.

Os nomes “Quiz e perfil” e “leads com perfil” substituem “diagnóstico” nessas áreas do admin, pois os quizzes registram interesses e conquistas declaradas, sem avaliação psicológica.

Não há migração de banco, alteração de preço, regra de cobrança ou criação de leads reais externos. As edições locais anteriores das ofertas adultas foram preservadas.

## Achados corrigidos durante a implementação

1. A numeração analítica adicionava uma posição a todo quiz com `quizPosition`. O deslocamento passou a valer somente quando existe uma entrada em posição 0; no adulto, perguntas e métricas usam 1–10. Há testes da gravação e dos snapshots.
2. O link “Rever as respostas” retirava UTMs, campanha e cupom da URL. Agora a revisão conserva esses parâmetros até o próximo resultado e a oferta.
3. Na revisão parcial, uma pergunta posterior podia ser aberta sem as anteriores obrigatórias. As ações indisponíveis ficam desabilitadas e a API também recusa esse salto.
4. Os testes antigos de integração tratavam o quiz v1 como vigente. Foram atualizados para o novo contrato; os testes puros dos motores e textos históricos foram mantidos.
5. A mudança de experiência e de conquista passou a invalidar apenas as variantes dependentes, evitando reaproveitar respostas de uma pergunta que mudou de sentido.

## Evidência automatizada

- `bun test`: 631 aprovados, 2 ignorados, 0 falhas, em 57 arquivos.
- `bun run typecheck`: 0 erros, 0 avisos; 3 sugestões preexistentes.
- Biome: 0 erros; 7 avisos e 16 informações preexistentes. O comando `bun run check` encontrou o shim local de `biome` indisponível; a mesma checagem foi executada diretamente com `node ../../node_modules/@biomejs/biome/bin/biome check .`.
- `bun run build`: concluído. Restam avisos de anotações do pacote Zod durante o bundling, sem falha de build.
- `git diff --check`: sem erros de whitespace.

Os dois testes ignorados exigem configuração explícita de bancos próprios para integração de analytics e relatório comercial. A checagem de navegador desta entrega usa PostgreSQL local isolado, app construído e identidade administrativa sintética.

## Evidência no navegador

Build final executado com PostgreSQL local isolado e Chrome, sem erros de JavaScript:

- Adultos: quatro percursos completos (iniciante e experiente em cada produto), duas revisões de experiência com reconfirmação somente das quatro perguntas afetadas, retomada após recarregar e quatro ampliações de imagem centralizadas.
- Os 32 resultados aprovados foram gravados pela API real e renderizados pelo servidor. Foram 128 conferências de largura (320, 390, 768 e 1440 px), além das verificações das perguntas e leitura com texto ampliado a 200%.
- Admin dos dois produtos: Respostas, Performance, Perfis e Métricas. Conferidos textos e ordem das dez perguntas, todas as condições múltiplas, rótulos históricos, filtro da versão atual, dez etapas sem duplicação e correspondência entre visualizações e gravações nas métricas.
- Regressão Kids: seis percursos, 58 resultados, 232 conferências de largura e as quatro abas do admin, sem erros. A entrada Kids em posição 0 e sua numeração analítica permaneceram coerentes.
- Inspeção visual das capturas: escolhas e botão legíveis no celular, tipografia e cores do tema adulto, rodapé proporcional e conteúdo do modal administrativo organizado.

## Documentação

O módulo compartilhado fica em `packages/funnel/src/funnels/adulto-autonomia`. As ilhas, o layout e os componentes de resultado usam a infraestrutura comum do funil. A copy pode ser regenerada com `bun scripts/espelho-quiz-adulto.ts`.

Referências: [posicionamento adulto](../marketing/pro/posicionamento.md), [copy do quiz do Desafio](../marketing/pro/quizzes/desafio.md), [copy do quiz da Comunidade](../marketing/pro/quizzes/comunidade.md). O manual local do pacote registra versões, dependências entre respostas, admin e invariantes.

Logs e capturas detalhados ficam locais em `.cache/adult-quizzes-implementation-20261106`, `.cache/adult-quizzes-browser` e `.cache/quizzes-vida-browser`. Os testes funcionais não constituem evidência de melhora de conversão.
