# Molda Cenários — revisão do núcleo e importação

Data: 16/11/2026. Trabalho em andamento; este registro não representa entrega do editor completo.

## Implementado

- Pacote puro `molda-cenarios-core`: formato versionado em metros, catálogo qualificado, instâncias, grupos, apoios, fundações, caminhos, água, relevo, marcos e iluminação.
- Comandos atômicos, revisão esperada, validação de identificadores/vínculos, polígonos, ciclos de hierarquia/apoio e bloqueios herdados. Sem IO, React ou Three no núcleo.
- Importador da Faísca atual: 93 modelos catalogados, 523 instâncias, sete percursos e uma área de água. Os lugares usam namespace `lugar:`, preservando os IDs dos objetos e a associação das placas.
- Exportação reproduzível para `output/molda-cenarios`, sem versionar binários privados. A composição visível atual ainda não foi substituída por um renderer novo.

## Evidências

- Suíte completa Arquipélago: **2.138 aprovados, um pulado, zero falhas**, 252 arquivos, 162,92 s. Skip de integração externa API/Postgres já existente.
- Núcleo e importação: 14 testes aprovados; verificam posições, orientações, escalas, apoio, nado/contorno e round-trip JSON, além dos erros de edição.
- Tipagem do Arquipélago e do núcleo aprovada; Biome dos arquivos alterados aprovado.
- A fronteira de imports do jogo permite especificamente o novo núcleo puro. Novo teste impede que ele importe React, Three, servidor ou módulos da plataforma.

## Revisão

Corrigidos durante a revisão: colisão entre IDs de marcos e objetos, origem individual das peças da Morada, proteção contra ciclos temporários de grupo durante um lote e inserção/reparentamento em grupos bloqueados. Mantida a versão de tipos do Bun já fixada no lockfile; uma atualização incidental durante instalação produzia identidades incompatíveis de Elysia entre pacotes. Não foram acrescentados casts para encobrir essa divergência.

Próximo lote em execução: persistência compartilhada e bordas HTTP administrativas. Editor visual, runtime editável, CLI/MCP e composição pelas imagens permanecem pendentes. Sem aceite artístico ou de usabilidade antecipado.
