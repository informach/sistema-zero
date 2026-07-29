# Auditoria arquitetural: Mundo 3D, rodada 3

Data: 23 de julho de 2026

## Escopo

Revisão integral da extensão `world-3d`: manifest, documentação, contexto da IA, blocos, toolbox, schema de IR, geração e leitura Ponte, runtime Three.js, integração com o catálogo do Estúdio, exemplos e contratos de execução.

## Resultado

Nenhum achado novo nesta rodada.

## Análise estrutural

- Os 137 blocos possuem contrato de encaixe, representação no IR, geração JavaScript, restauração para Blockly e leitura Ponte. Todos os helpers emitidos existem no runtime.
- O gerador e o coletor de identificadores cobrem exatamente o mesmo conjunto de comandos Mundo 3D. Assim, os recursos usados por um projeto continuam sendo identificados corretamente.
- A extensão está registrada no catálogo oficial, lifecycle, schema, compilador, leitor Ponte, área de transferência, seletor de assets e contratos da galeria. As exportações públicas possuem consumidores reais.
- Os 12 exemplos ficam registrados no manifest e nos contratos de qualidade. Eles usam exclusivamente IR de blocos Mundo 3D, sem `rawJS` nem `memberCall`.
- A documentação do aluno cobre as categorias reais da toolbox e o contexto da IA cobre a API exposta pelo runtime. Os limites de tamanho do manifest também são verificados.
- O runtime é grande, mas essa concentração é intencional: ele é injetado como um único módulo no iframe e a extensão contém guardas contra quebra de template literals. A cobertura atual separa os contratos de blocos, robustez, ciclo de recursos e percurso de jogo, portanto não há evidência de que uma divisão reduza risco agora.
- Não foram encontradas APIs dinâmicas ou de rede incompatíveis com o preview isolado, como `eval`, `new Function`, `document.write`, `fetch`, `XMLHttpRequest` ou `WebSocket`.

## Cobertura funcional e de recursos

- O runtime libera geometrias, materiais, texturas HDR, árvores GLB e contexto WebGL no encerramento.
- Os testes cobrem reconstrução de personagem e barco, explosões, modo desempenho, teclado repetido, controles por toque, terreno e física usando a mesma malha renderizada.
- Os percursos cobrem carro, personagem, barco, NPCs, moedas, missões, cidade, trânsito, fazenda, ilha, lua, corrida, boliche e eventos interativos.

## Evidências de validação

| Verificação | Resultado |
| --- | --- |
| `bun test src/official-extensions/world-3d` | 260 testes aprovados, 0 falhas, 1.809 expectativas |
| `E2E_PORT=5199 bun run e2e -- e2e/examples-gallery.spec.ts --grep "world-3d:"` | 13 cenários aprovados no Chromium |
| `bun run typecheck` | aprovado |
| `bun run check` | 803 arquivos verificados, sem correções necessárias |

## Integridade da revisão

Nenhum arquivo de produção ou teste da extensão foi alterado nesta rodada. Este relatório é o único artefato criado. As alterações pré-existentes do diretório de trabalho foram preservadas.
