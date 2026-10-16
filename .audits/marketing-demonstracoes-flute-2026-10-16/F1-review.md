# F1 — Contratos e fontes

Base: staging local `b37fc3f72`. Review realizado antes de iniciar F2.

## Implementado

Três receitas versionadas em contrato puro, anexadas opcionalmente ao clipe de imagem. Fontes possuem identidade própria, asset/hash e evidência/revisão. Regiões inválidas, contagem incorreta, motor desconhecido e composição incompatível são recusados. Assets secundários entram no mesmo grafo e identidade de render.

Resultados de IA e gravações diretas validam a associação imagem–fato. Referências entram no grafo editorial, contexto congelado e snapshot de aprovação. Aprovar exige a revisão factual correspondente; a revalidação de entrega existente verifica novamente se a evidência foi alterada/inativada.

## Achados tratados

- Schemas estritos de clientes antigos não leem o campo novo: protocolo passou de 2 para 3; servidor anuncia a versão mínima pelo mecanismo existente. O teste de protocolo incompatível usa versão futura 999.
- Validar só a resposta da IA deixaria gravação direta sem a regra: a validação foi integrada também à persistência de revisões.
- A fonte secundária não poderia ficar fora de download/hash/retenção: `videoAssetIds` e `references` agora a incluem.
- Evidência ligada diretamente à cena poderia ficar fora da edição aprovada: o candidato de aprovação inclui as evidências das demonstrações, além das fontes da pauta/direção.

## Verificação

- Teste inicial falhou pela ausência do export de schema, antes da implementação.
- 14 testes / 78 asserções passaram: contratos, domínio das demonstrações e regressão de propostas/render de vídeo.
- TypeScript de `marketing-contracts` e `marketing`: código de saída 0.
- Biome nos 15 arquivos alterados/criados: passou após formatação/imports. `git diff --check`: limpo.

Banco real, renderer e transporte nativo serão exercitados nos lotes dependentes. Não há migração de tabela: o campo é aditivo no documento versionado já persistido. Não houve execução de IA, publicação ou alteração de dados compartilhados.
