# Remediação do full review de 24/08/2026

## Contexto

O review encontrou sete defeitos relacionados a isolamento SSR, concorrência assíncrona, transições de plataforma, invariantes de domínio, escopo de audiência e propagação de erros no BFF. A correção será coesa e preservará os contratos públicos existentes, exceto onde o contrato atual permite um estado inválido.

## Desenho

### Plataforma no Admin

O snapshot inicial virá do layout servidor e será entregue a um `PlatformProvider` cliente. O Provider usará esse valor como `getServerSnapshot`, mantendo o estado de cada renderização SSR isolado por requisição. O store imperativo continuará existindo apenas no navegador para integrar consumidores não React, cookies e assinaturas.

As listagens de cursos, recados e crianças usarão a mesma autoridade `latest-wins`: apenas a requisição mais recente poderá publicar dados, erros ou encerrar o estado de carregamento. Em cursos, a paginação será associada à plataforma ativa; uma troca de plataforma produzirá `offset = 0` já durante a renderização, sem um ciclo intermediário com página inválida.

Na página de membro, a seleção guardará a plataforma em que foi feita. Deep links serão aplicados na inicialização e escolhas manuais serão preservadas enquanto a plataforma não mudar. Ao mudar entre Kids e Adults, uma seleção da plataforma anterior deixa de ser elegível imediatamente e o perfil padrão da nova plataforma é usado.

### Members

Clonar um curso para a mesma audiência será rejeitado no serviço de domínio com erro explícito e resposta HTTP `409`. A validação ficará abaixo da rota para proteger todos os chamadores.

A contagem de entregas pendentes receberá a audiência como parte obrigatória do contrato do repositório. A implementação Drizzle fará `JOIN` com cursos e filtrará a audiência na própria agregação; o repositório em memória reproduzirá a mesma semântica.

### BFF do Admin

O endpoint agregado de uso de ferramentas interromperá a composição quando o Auth não retornar perfis com sucesso e encaminhará a falha normalizada. Assim, uma indisponibilidade ou erro de autorização não será disfarçado como resposta parcial `200`.

## Verificação

Cada defeito receberá primeiro um teste de regressão que falha com o comportamento atual. Depois das correções, serão executados testes focados, suítes completas dos pacotes afetados, typecheck, Biome, build do Admin e verificação final do diff.
