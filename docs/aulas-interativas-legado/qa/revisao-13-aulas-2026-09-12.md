# Verificação da revisão das 13 aulas — 12/09/2026

Este documento registra a rodada anterior ao full review. A [revisão posterior](full-review-2026-09-12.md) encontrou e corrigiu problemas que estes testes não detectavam, principalmente a execução da colisão na aula 9, e passou a executar os projetos no motor Jogo 2D.

A revisão atual está no [guia do Corre Dino](../corre-dino-v6/README.md). Foram reescritos os 13 roteiros interativos e manifestos com base nos 13 roteiros originais fornecidos: 128 seções, 17 demonstrações planejadas em vídeo, 14 experimentos nativos e 88 clipes com âncoras textuais.

## Evidência desta rodada

| Verificação | Resultado | Alcance |
| --- | --- | --- |
| Fontes e montagem | 13 hashes e 88 pares de âncoras conferidos | Entrada/saída existem na parte indicada do roteiro; timecodes permanecem nulos |
| Manifestos | 13 válidos | Seções, blocos, critérios, referência única de Estúdio e sequência entrega → fechamento → quiz |
| Programas finais | 13 aprovados pelos critérios da entrega | Programas de referência escritos independentemente das regras do manifesto |
| Studio | 51 testes passaram | 13 programas carregados/salvos no Blockly, geração de JavaScript com sintaxe válida, seis erros de montagem rejeitados, catálogo e autoria |
| Core e formulário do professor | 41 testes passaram | Contagem, ordem, conexões, guardas, progressão, missões e edição de peças conectadas |
| API Members | 17 testes passaram | Esquemas HTTP, importação em memória, integridade de respostas, progresso e separação de demonstração/experimentação |
| TypeScript | Core, Studio, Members e Admin passaram | Checagem dos pacotes envolvidos |

Total das suítes selecionadas: **109 testes, nenhuma falha na rodada final**. O [relatório de autoria em JSON](revisao-13-aulas-verificacao.json) registra os números por aula e os hashes dos originais.

Os casos negativos incluem floresta depois do Dino, evento de tecla provisório ainda ativo, criação fora da condição de estado, número zero no placar em vez da variável, sorteios conectados às entradas erradas e igualdade no lugar de maior que na aceleração.

## Comandos

Na raiz, passando o diretório original como argumento:

```powershell
bun docs/aulas-interativas/qa/gerar-candidatos-v6.ts 'CAMINHO_DOS_ROTEIROS'
bun docs/aulas-interativas/qa/validar-revisao-completa.ts 'CAMINHO_DOS_ROTEIROS'
bun docs/aulas-interativas/qa/validar-revisao-aula-01.ts 'CAMINHO_DOS_ROTEIROS'
bun test packages/core/tests/project-structure.test.ts packages/core/tests/project-relationships.test.ts packages/core/tests/section-progression.test.ts packages/core/src/learning/exploration.test.ts packages/core/src/learning/experience.test.ts packages/admin/tests/project-pattern-editor.test.tsx packages/admin/tests/section-completion-editor.test.tsx
```

Dentro de `packages/studio`, para carregar o ambiente DOM configurado no `bunfig.toml` do pacote:

```powershell
bun test src/blockly/__tests__/correDinoEditorial.test.ts src/blockly/__tests__/projectCheckAuthoring.test.ts src/blockly/__tests__/blockCatalog.test.ts src/activity/structure.test.ts
```

Dentro de `packages/members`:

```powershell
bun test tests/integration/learning.test.ts tests/integration/project-pattern-schema.test.ts tests/integration/learning-import.test.ts
```

## Limites do resultado

Os testes HTTP usam repositórios em memória. Esta rodada não executou PostgreSQL, publicação ou um percurso autenticado de aluno. O teste do Blockly verifica a montagem preservada e a sintaxe gerada; não afirma que houve uma partida automatizada completa de cada aula.

Não foram fornecidos arquivos de vídeo: os recortes e complementos estão especificados, mas ainda precisam ser produzidos e vinculados. A conferência de contraste, áudio, leitor de tela real e experiência com crianças deve ocorrer sobre esses materiais e sobre a configuração real do Estúdio antes da publicação.

As evidências visuais do runtime da etapa anterior permanecem no [relatório do piloto](piloto-v6-2026-09-12.md); não são apresentadas como uma nova inspeção visual destas 128 seções.
