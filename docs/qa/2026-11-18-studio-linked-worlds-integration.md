# Integração dos mapas ligados e revisão dos contratos

Merge local `f0a357d8c0ad8dad1b3aecd871e668645d036bc5`, na branch da PR #273.
Pais: missão `0ac36108dbc90513fb1defc22c225448fad3d334` e snapshot remoto
`5da218d5cba188b100288a86fffd2451b609b32e`. Não houve merge em staging/main.

O snapshot inclui os commits de bundle atômico de mapas Pinta, atualização de
destinos vinculados, cenas Three compiladas/portáteis e leitura ZIP por faixas.
As referências remotas são compartilhadas entre worktrees; os pais acima fixam
o código efetivamente integrado, independentemente de novas atualizações remotas.
Nenhuma implementação de Pinta ou Molda foi editada nesta revisão.

## Verificação no worktree próprio

`sistema-zero-estudio-integracao` recebeu instalação congelada própria: 2.879
pacotes Bun e 37 dependências do executor, sem compartilhar os módulos do
laboratório v4. Os testes de inventário anteriores foram realizados antes do
merge; os resultados abaixo foram repetidos com as dependências próprias.

- Contratos de mapas/bundles, mundo vinculado, runtime 2D, catálogo e inventários:
  **491 testes, 10.631 asserções, zero falhas**.
- Matriz dos cursos protegidos: **43 testes, 192 asserções, zero falhas**.
- Fluxos reais Estúdio/Pinta: **seis testes aprovados**, 1,3 min com build.
- Typecheck completo aprovado.
- Perfil de validação do executor conferido pelo gerador canônico, sem alteração.
- Bundle inicial: **368.536 bytes, 119.732 gzip, dois arquivos**; 31 asserções
  aprovadas, com os tetos originais.

Os fluxos de navegador verificam: porta configurada posteriormente acrescenta
seu destino sem modificar o programa; criação e atualização de jogo estruturado;
alteração de peças atualiza mapas sem reabri-los; Vila e destino são importados
juntos; mapa nativo 6 mantém animação sem os arquivos originais; falha síncrona
no segundo put não deixa metade do bundle na biblioteca nem no projeto.

O host desse ensaio agora usa Node 24, como o host E2E principal, mantendo
build, isolamento, cabeçalhos e prazo existentes. O teste real de navegador
qualificou a inicialização e os seis fluxos nesse arranjo Windows local.

## Limites desta entrega

Os contratos/importações 2D acima foram exercitados no Estúdio. Integrar o código
do produtor Three e sua exportação portátil não demonstra, por si só, consumo
completo desses mundos pelo editor, streaming 3D ou homologação do Arquipélago.
Esses critérios permanecem separados. Não houve uso de assets privados novos,
publicação de dados de alunos, alteração de banco ou deploy.

O laboratório profundo permanece em branch própria, fora da PR, com migração
v3→v4 ainda pendente. A missão global permanece aberta.
