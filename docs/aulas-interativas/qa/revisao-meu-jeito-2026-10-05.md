# Revisão de O Jogo do Meu Jeito · 05/10/2026

Aplicação local das diretrizes já usadas em Nave Contra Asteroides e Corre, Dino!. O curso permanece com oito aulas e três módulos. Os 24 documentos foram reescritos a partir de uma fonte editorial única: `meu-jeito.conteudo.json`, reproduzida por `gerar-meu-jeito.ts`.

## Resultado

- 54 seções, 50 clipes com fala completa, 14 experiências existentes e quatro quizzes isolados, nas aulas 3, 5, 7 e 8.
- Abertura jogável com o programa final e artes ilustrativas; caderno opcional na seção 2 da primeira aula.
- Origem da cópia corrigida para a última aula de Nave Contra Asteroides. Retirados o projeto vazio de teste e a instalação artificial da extensão.
- Aparência/regras e pixel/vetor antecipados para antes da primeira aplicação. Experiências sem palpite, pistas ou pergunta final automática; comandos obrigatórios explícitos e demonstração restrita aos controles, deixando as descobertas para o aluno.
- Criação, preparação da folha e animação separadas; nomes, dimensões, ordem das formas e encaixes conferidos nas ferramentas atuais. Publicação opcional, com a confirmação do Estúdio completo, Publicado!, e Abrir o jogo.
- Caderno de 28 páginas com os passos reais, folhas de animação, exemplos de artes e 15 representações de blocos com rótulos, valores e cores das definições do Estúdio.

O [mapa do curso](../modulos-o-jogo-do-meu-jeito.md) explica a sequência e a implantação. O [PDF](../../../output/pdf/meu-jeito-caderno.pdf) e suas [fontes](../recursos/meu-jeito/README.md) estão disponíveis localmente.

## Continuidade e correções técnicas

Os oito slugs e `entrega-galeria-v6` foram mantidos. Aulas 2 a 5 entregam pela galeria do Pinta; 1 e 6 a 8, pela do Estúdio. A aula 5 exige duas artes; as demais, um trabalho. Os programas de `meu-jeito-projetos-qa.ts` e os testes independentes do Estúdio não foram alterados. A cópia guarda controles, tiros, pontos, vidas, término e reinício do jogo original.

O validador antigo exigia `platformAction` em aplicações externas. Esse campo só representa ações internas de avatar, quarto e tema e é incompatível com `externalTool` no contrato do core. A revisão exige uma entrega de galeria obrigatória, da mesma ferramenta e na seção atual ou posterior. Os testes recusam entrega ausente, opcional, anterior ou de outra ferramenta. A qualidade do desenho continua sendo autoconferida e revisada pelo professor, sem aprovação automática por assistir.

Os testes globais que exigiam quantidades mínimas de previsões foram ajustados para verificar todas as perguntas presentes, sem obrigar a reintrodução de palpites. A distribuição de alternativas inclui agora os quizzes autorais. A leitura de cenas e manifestos continua protegida contra varreduras vazias; os testes das perguntas padrão do catálogo permanecem.

## Evidência local

| Verificação | Resultado |
| --- | --- |
| Referência do Estúdio, antes e depois | 4 testes; 35 verificações; compilação e execução das aulas 6, 7 e 8 |
| QA editorial e `core/tests/learning.test.ts` | 211 testes aprovados, incluindo 26 específicos de Meu Jeito |
| Motor das cenas, `core/src/learning/scene` | 765 testes aprovados |
| Importação HTTP de Meu Jeito no members | 9 testes, 116 verificações; criação da galeria e reimportação idempotente das oito aulas |
| Manifestos | 37 válidos; nenhuma dependência de cena nova; nenhum aviso de convenção |
| Roteiros | 37 arquivos e 200 clipes conferidos; 50 clipes de Meu Jeito |
| Como Fazer | 42 tutoriais em cinco coleções válidos; sugestão não bloqueante de mídia no tutorial de envio pela galeria |
| Biome, arquivos TypeScript desta revisão | Sem erros ou avisos |
| Tipagem da autoria de Meu Jeito | Geradores, etapas, testes, regra pedagógica e caderno aprovados com configuração dedicada |
| PDF | 28 páginas; fontes, imagens, cores e limites aprovados; nenhum erro de execução na captura do jogo; inspeção visual das páginas e dos diagramas |

Logs e inspeções desta execução ficam em `tmp/meu-jeito-retomada/` e `tmp/pdfs/meu-jeito/`, diretórios temporários não versionados. Os validadores, testes, fontes e geradores são versionados. A regeneração é conferida pelos testes contra os manifestos gravados.

A checagem ampla `bun run typecheck` de `packages/core` encontrou dois erros em `src/learning/scene/lighthouse-walk.test.ts`: os objetos esperados não incluem o campo obrigatório `run`. Esse arquivo não foi alterado nesta revisão. A tipagem específica da autoria de Meu Jeito passou; não se declara que a tipagem global do monorepo está limpa.

## Reprodução

```powershell
bun docs/aulas-interativas/qa/gerar-meu-jeito.ts
bun docs/aulas-interativas/qa/validar-manifestos.ts
python -X utf8 docs/aulas-interativas/validar-roteiros.py
bun test docs/aulas-interativas/qa packages/core/tests/learning.test.ts
bun docs/como-fazer/validar.ts
python -X utf8 docs/aulas-interativas/recursos/meu-jeito/gerar-materiais.py
```

De `packages/studio`: `bun run tsc --noEmit --project ../../docs/aulas-interativas/qa/tsconfig-meu-jeito.json` e `bun test src/blockly/__tests__/meuJeitoEditorial.test.ts`.

De `packages/core`: `bun test src/learning/scene`. De `packages/members`: `bun test tests/integration/meu-jeito-import.test.ts`.

## Produção pendente

Nenhuma aula ou arquivo foi importado no admin real. Gravar e revisar os 50 clipes, hospedar e vincular o PDF, reconciliar seções e históricos, conferir videoBeforeActivity e a política de tentativas dos quizzes. O teste HTTP usa ambiente de teste; não comprova a oferta ou a configuração em produção.

Fazer o percurso completo com conta de aluno, incluindo troca de abas, salvamento, envio, reabertura e publicação opcional. Ensaiar com crianças para validar compreensão e ritmo. Testes automatizados e inspeção do PDF não substituem essas etapas.
