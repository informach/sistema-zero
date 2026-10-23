# Review do desenho pedagógico e do P0

Data: 18/10/2026. Escopo: leitura de fontes, desenho, inventário e diagnóstico causal em memória. Nenhuma alteração de produção, geração de curso, browser, banco ou deploy nesta frente.

## Entregas

- [Proposta pedagógica](proposal.md): mapa dos cinco cursos, com IDs das partes, instrumentos de evidência, alternativas válidas, contraexemplos, limites e lotes.
- [Inventário](inventory.json), produzido por [inventory.py](inventory.py): 37 aulas, 218 partes únicas, 364 checks `usesBlock`, zero gabaritos locais; 92 partes com workspace e 34 externas. Foram conferidos os hashes dos 37 manifestos e a existência dos 111 arquivos dos trios. Todos os IDs de partes aparecem no mapa.
- [Contrato P0](p0-authoring-contract.md): registro privado canônico por parte, snapshots imutáveis com exampleId próprio, diagnóstico agregado do inicial, DTOs, revisões, CAS, importação, migração e gates.
- [Diagnóstico causal](p0-causal-proof.ts) e [recibo](p0-causal-receipt.json): chamada do avaliador/guard reais, preservando hashes de seis fontes. Reproduz defeitos atuais; não é correção aprovada.

## Achados resolvidos no desenho

| Achado | Tratamento |
| --- | --- |
| Inicial que satisfaz um pré-requisito recusava publicação mesmo faltando objetivo novo | Diagnóstico agregado, aviso visível se todos os objetivos de projeto já estão satisfeitos; estados pendente/erro não viram falso pedagógico |
| Um gabarito final único não prova etapas transitórias opostas | Solução e checkpoint por parte; projetos compartilhados por referência quando forem realmente o mesmo snapshot |
| StudioProject.id não identifica um snapshot | exampleId independente; dois checkpoints do mesmo projeto não são fundidos |
| Campo privado no completion vazaria pelo spread | Registro fora do completion; mapeadores públicos por allowlist e testes de sentinela profunda |
| Projetos grandes na seção fariam reorder retransmitir conteúdo | Registro no bloco, comandos dirigidos a um exemplo, estrutura leve |
| Editar exemplo compartilhado poderia mudar outras partes sem intenção | Snapshots imutáveis; novo salvamento troca apenas a associação em edição |
| Preservar/importar tinha semântica ambígua para ausência e vazio | Registro ausente preserva no modo preservar; registro presente substitui integralmente o daquele bloco; vazio limpa com prévia |
| Preflight só do arquivo deixaria envelope exceder a rota | Medição do corpo completo de importação, com seus campos e IDs |
| Chamar exportador final para tamanho bloquearia rascunho incompleto | Projeção pura tolerante a WIP, separada da validação final |
| Teto de salvar/importar não é o teto de authoring-runtime | Gates separados por trajeto: 2.097.152 e 2.000.000 bytes onde verificado |
| Snapshot novo em cada autosave poderia reiniciar editor/runtime | Cópia de trabalho estável por instância da seção/papel; exampleId salvo não vira React key/project.id por tecla |
| Exemplo do conflito de borda era impreciso | Contradição dentro da mesma aula comprovada no raio X de Dino A10; borda de A1 para A2 é mudança entre aulas |

## Revisão independente

O agente `/root/review_live_observation` confrontou o P0 com persistência, mapeadores privados/públicos, hashes/CAS, importação por sectionKey, limites de payload e runtime/baseline Python. Propôs as correções de envelope, WIP e lifetime listadas acima; depois da releitura dos ajustes, não encontrou bloqueio concreto adicional ao P0 mínimo.

O responsável `/root` aceitou a direção do registro privado com exampleId independente e o aviso agregado para inicial já satisfatório. A implementação de fontes depende do encerramento do review e da janela/worktree combinados com a frente principal, sem nova pergunta rotineira ao usuário.

## Limites e gates pendentes

- Os dois defeitos foram reproduzidos, mas não corrigidos. A prova terminou com exit0 porque confirmou o defeito esperado; isso não é um PASS funcional.
- Contrato, DTOs, migração operacional, UI e importação novos ainda não foram implementados ou testados.
- Tamanhos reais dos novos exemplos dos pilotos, sentinelas públicas, concorrência/CAS, restore/undo e limites Unicode precisam das provas descritas no P0.
- O inventário é local; nenhum estado do Admin, staging ou produção foi inspecionado por esta frente.
- Não há qualificação de comportamento Python, 3D offline, compreensão infantil, correção artística automática ou teste de entrega externa inventado.

Próximo lote: P0 de contrato/resolvedor/DTOs e gates em worktree isolado, depois UI e pilotos Cadê/Farol. Revisar entre os lotes antes de alterar os cursos longos.
