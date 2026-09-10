# Aulas com seções didáticas

Plano aprovado em 08/09/2026. Base: `d40f8fd93da1511ea52bf2a390dae995d0413f24`.
Implementação isolada em `feat/aulas-interativas`; o workspace original contém trabalho de Molda de outra frente.

> Atualização de 10/09/2026: a navegação livre deste plano foi substituída pelo [progresso real das seções](2026-09-10-progresso-secoes.md).

## Decisões de produto

- Kids e Adultos compartilham player e contratos; apresentação respeita cada comunidade.
- Uma seção por vez, índice livre, retomada e um único editor por projeto incorporado.
- Concluir exige atividades essenciais e entregas; assistir a vídeos inteiros não é requisito.
- Seções agrupam blocos por objetivo. Intenções: apresentação, demonstração, exploração, explicação, aplicação e fechamento.
- Modelos configuráveis de previsão, comparação, sequência/associação e experimentos 2D; HTML especial com protocolo de estado isolado.
- Experimentação não produz entregas obrigatórias nem altera o projeto principal.
- Carreira, acesso, desbloqueios, publicações e recompensas continuam regidos pelos contratos atuais; nenhuma feature flag.
- O Jogo do Meu Jeito ENSINA a criar fora da aula: preservar acesso às ferramentas externas, galerias e projetos livres. Não incorporar os editores completos nesse curso.
- Adaptar os 27 roteiros: Desafio (introdução + cinco dias), Corre Dino (13), O Jogo do Meu Jeito (8). Manter uma aula por roteiro.
- Roteiros revisados, manifestos e interações em `docs/aulas-interativas/`; preservar os originais fornecidos em Documents.
- Regravar quando necessário. Fornecer roteiro e lista de produção; não inventar vídeos, URLs ou minutagem. Mídia pendente bloqueia publicação, não prévia de autoria.
- Professor vê progresso/respostas/pistas/pedidos de ajuda. Pais veem temas e criações no painel e relatório existente, sem diagnóstico por erros.
- Remover integralmente prática de repetição: UI, APIs, serviços, exports, tabela e testes exclusivos. Preservar quizzes originais e histórico de migrations aplicadas.

## Etapas de execução

- [x] 1. Remoção da prática, contratos, modelo e persistência de seções/progresso.
- [x] 2. Autoria/importação, player compartilhado e continuidade do editor.
- [x] 3. Interações, protocolo HTML, retomada, conclusão e ajuda contextual.
- [x] 4. Os 27 roteiros, manifestos válidos e atividades funcionais.
- [x] 5. Acompanhamento do professor e dos pais.
- [x] 6. Revisão, migrations em banco descartável, testes, lint, tipos e builds.
- [x] 7. Commits exclusivos e entrega para staging, sem promoção para produção.

## Aceite

Preservar dados existentes, IDs, conclusões, quizzes, projetos, publicações e desbloqueios.
Não perder trabalho ao navegar, recarregar ou retornar de uma ferramenta externa.
Salvar posição por vídeo e respostas por revisão; conclusão idempotente validada no servidor.
Importar/reordenar/clonar sem referências quebradas. Impedir acesso cruzado entre perfis, contas e audiências.
HTML não acessa sessão; mensagens de outras janelas/instâncias são recusadas; avaliação obrigatória é verificada no servidor.
Migrar aulas antigas para uma seção inicial mantendo ordem e identidade dos blocos.
Conferir relatórios contra evidências registradas. Confirmar ausência de prática no código executável e schema final.
Percorrer os três cursos, incluindo a continuidade entre aulas. Validar todos os manifestos.

## Estado da implementação

- Contratos, autoria, importação e player integrados em Kids e Adult. Um bloco de projeto pode ser selecionado em várias seções; sua instância permanece montada. Novo bloco representa outra atividade.
- Vídeos usam o fluxo Vimeo/TUS existente no admin. Player compartilhado preserva o hash de vídeos não listados e salva posição por bloco. Nenhum upload ou cadastro externo foi realizado.
- Atividades essenciais são conferidas no servidor. HTML isolado conserva estado e exige checkpoint nativo quando essencial. Pistas não descontam pontos. Prévia de autoria permite experimentar e conferir sem registrar progresso de aluno.
- Prática antiga removida do código executável e do schema final. Migrations históricas aplicadas permanecem intactas. Migrations 0078–0080 testadas com dados anteriores ao upgrade.
- Relatórios do professor integrados aos recados. Painel dos pais e relatório semanal incluem temas explorados, inclusive a primeira interação antes de qualquer XP.
- Os 27 roteiros e manifestos estão em `docs/aulas-interativas`; 5 experiências HTML próprias e 118 trechos de demonstração indicados para produção. Arquivos originais conferidos por SHA-256 e preservados.
- Testes de banco cobrem preservação do histórico, CAS, importação/reimportação, clone, revisão, isolamento e purga. A suíte geral do Members passou com 979 testes, incluindo o banco descartável. Tipos, lint e builds são registrados no relatório de QA.
- O navegador integrado retornou lista vazia. A suíte Playwright existente foi executada pelo comando do repositório e passou nos 16 cenários públicos. Navegação autenticada nas aulas e upload/reprodução real no Vimeo permanecem para validação em staging.

## Direção visual da aula

Aluno de 9–16 anos, alternando entre observar, experimentar e construir. A interface deve parecer uma bancada de criação acessível: um objetivo legível por seção, pistas disponíveis sem punição e o próprio projeto sempre reconhecível. Vocabulário: aula, seção, descoberta, blocos, criação, professor, Pinta e Estúdio. Paleta existente: azul da marca para foco, céu suave e branco nas superfícies, navy no tema escuro; laranja, rosa e verde continuam no ecossistema. Não adicionar uma paleta paralela. Texto com fontes atuais; títulos Kids com a fonte display existente; base de espaçamento de 4px. Bordas discretas, contraste nos controles e cantos existentes. A assinatura é a bancada com um único projeto contínuo ao lado de cada seção relevante. Índice livre substitui etapas artificialmente bloqueadas; descoberta com feedback substitui ranking de erros; editor persistente substitui cópias do projeto por seção.


## Verificação e entrega

Evidências e limites estão em [qa/verification-report.md](../aulas-interativas/qa/verification-report.md). A implementação foi enviada para `staging` no commit `aab691c5`, com CI e deploy concluídos. O trabalho de Molda no checkout original continua separado.

Verificação final: suíte global em sequência com 14.333 testes aprovados, 979 no Members com banco real, 16 cenários Playwright e builds de Kids, Adult e admin aprovados. Navegação autenticada e produção dos vídeos seguem as limitações registradas no relatório de QA.

Depois dessa entrega, uma [revisão completa do lote](../../.audits/architectural-analysis-2026-09-08-aulas.md) reproduziu e corrigiu sete defeitos de integração. A revisão registra suas próprias evidências, distinguindo a implementação de código da produção/publicação das novas aulas.
