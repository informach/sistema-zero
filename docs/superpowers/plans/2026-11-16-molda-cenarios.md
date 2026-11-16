# Molda — Cenários 3D: execução

Plano aprovado na conversa de 16/11/2026. Execução inline com executing-plans, revisão própria por lote e full review final, sem aprovações intermediárias.

## Requisitos

Módulo com identidade do Molda, acesso administrativo na plataforma, projetos compartilhados pela equipe, documento versionado como fonte única, catálogo privado, objetos/grupos/apoios, terreno, caminhos, água, execução real com Cute Characters e controle por CLI/MCP. Não modificar a campanha, dados das contas ou interfaces Kids/adulta. Preservar alteração externa no roteiro dos pais. Base: staging 46b0ed92f.

## Lotes

- [x] 1. Núcleo puro: documento, catálogo, comandos atômicos, revisão, validação e importação fiel da Faísca.
- [ ] 2. Projetos e revisões compartilhados no serviço, autorização e catálogo remoto.
- [ ] 3. Editor visual com seleção, transformações, grupos, apoio e identidade Molda.
- [ ] 4. Terreno, caminhos, água, margens e vínculos funcionais.
- [ ] 5. Runtime real: editar/testar/retornar e aplicar revisão ao ensaio.
- [ ] 6. CLI/MCP, sessões de viewport e sincronização manual/programática.
- [ ] 7. Recompor Faísca pela ferramenta, comparar referências, full review, evidências e push.

Cada lote exige testes pertinentes, tipagem, revisão do diff e commit na staging. Não anunciar entrega completa antes de todos os lotes. GLBs/texturas privados permanecem fora do Git. Não introduzir dependência do host no código do jogo: runtime compilado separadamente, contrato compartilhado.

## Contratos

`molda-cenarios-core`: schemas e operações puras, sem React/Three/IO. `molda-cenarios`: UI, comandos/histórico de sessão e portas do host/runtime. Serviço Arquipélago: projetos, revisões e autoria em schema próprio. Host Admin: /molda/cenarios, identidade Molda e autenticação existente. Documento em metros/Y para cima; referências de arte qualificadas e fixadas por conteúdo. Estado de câmera/seleção/teste separado da autoria.

## Aceite

Abrir a Faísca completa; editar objetos, grupos, relevo, caminhos e água; salvar e reabrir em outro cliente; testar com avatar real e voltar preservando o documento; alterar por agente e observar no editor; conflitos nunca sobrescrevem silenciosamente. Demonstração final usa os comandos do editor para compor uma cópia da Faísca conforme as três imagens. Testes e evidências devem distinguir implementação, validação técnica e aceite artístico humano.
