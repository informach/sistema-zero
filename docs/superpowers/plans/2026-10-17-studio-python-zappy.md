# Zappy no Estúdio JavaScript/Python — execução do escopo aprovado

Executar como continuação da proposta de 16/10, sem nova aprovação de produto. Não publicar nem fazer push. Cada sublote exige verificação e revisão independente. Esta lista não representa funcionalidades já entregues.

## Persistência da linguagem nas conversas

Migration gerada `0132_zappy_programming_language`: coluna aditiva nas mensagens, padrão `javascript`, não nula, CHECK JavaScript/Python. Perguntas antigas e clientes antigos continuam JavaScript; nenhuma conversa/fonte/resposta é removida. Respostas novas derivam a linguagem da pergunta persistida. Reuso da mesma chave idempotente com outra linguagem é conflito409. A memória enviada ao tutor filtra linguagem e pedagogia; respostas históricas de outro ambiente conservam leitura, sem ações de aplicação ou sugestões incompatíveis.

Aplicar a migration antes do Members que consulta a coluna. O DDL exige lock breve de tabela e o CHECK valida os registros; a prova local não estima a duração numa tabela de produção. Rollback de aplicação preserva a coluna/valores, sem apagar mensagens; clientes anteriores continuam com o default JavaScript. Não há push/deploy autorizado nesta execução.

Prova local: Postgres16 descartável com histórico real até0131, linhas JavaScript sintéticas anteriores à alteração, upgrade pelo migrador Drizzle e segunda aplicação sem mudança. Fonte/texto anteriores preservados, defaults nos dois papéis, gravação/replay/memória Python, isolamento por perfil, conflito entre linguagens e CHECK inválido exercitados. Usar `ZAPPY_QA_DATABASE_URL` somente com nome local descartável `studio_test_zappy_<número>`; o teste não usa `DATABASE_URL`.

## Contrato e captura do contexto

- Aceitar `EditableStudioProject` no montador do tutor, mantendo JavaScript legado explicitamente identificado como JavaScript. Transportar linguagem, identidade completa do runtime, versão de Python, entrypoint e versões das extensões; metadados do cliente nunca concedem capacidade.
- Separar o resumo da IR JavaScript do resumo Python. Não passar AST Python pelo normalizador SZIR. No Clássico, preservar a topologia dos blocos, valores/estrutura semanticamente reconhecidos, seleção e avisos. Ponte conserva a pedagogia de blocos. Pro conserva recortes de código e referências por hash/versão/coordenadas.
- Conservar orçamento de contexto, redação de segredos antes dos recortes e rejeição de referências obsoletas. Aceitar diagnósticos Pyright com código textual e origem `pyright`; não converter esses códigos em números nem descartar o sinal na borda HTTP.
- Compartilhar o catálogo Python real (`describePythonCatalog`/`selectPythonPalette`) com o tutor, incluindo dono, caminho visível, nível, API e dependências. O catálogo de ajuda não instala extensões nem libera APIs não aprovadas. Detectar módulos locais que sombreiam `turtle`, `math` ou `random`.

## Autoridade e explicação/investigação

- Validar o contexto HTTP por linguagem. Pedidos antigos sem linguagem continuam no contrato JavaScript; metadados Python incompletos são recusados, sem fallback silencioso para JavaScript.
- Resolver capacidades/curadoria no servidor para livre, aula, authoring e sala, com as mesmas identidades/baseline/epoch/revisão dos hosts. Pro contextual não depende de Pro livre. Acesso ao tutor/IA, acesso à edição e execução são permissões distintas.
- Reusar as políticas contextuais existentes para autorizar análise Python fresca. Não transformar uma decisão de análise em execução ou autorização de construção. Intersectar sugestões com runtime aprovado, extensões instaladas e curadoria efetiva; dados de paleta enviados pelo cliente são pistas, não autoridade.
- Despachar prompt, catálogo, busca e respostas determinísticas por linguagem. Python não recebe receitas JavaScript, DOM, npm, WebContainer ou APIs inexistentes do Turtle. Sugerir instalação somente de extensão disponível naquele host, com ação explícita e nova verificação.
- Conservar segurança infantil, resposta limitada ao contexto, créditos, reserva idempotente da pergunta, histórico por conta/projeto, feedback e recuperação. Histórico antigo não redefine a linguagem atual nem reaplica trechos incompatíveis. Pensa permanece JavaScript nesta etapa.

## Construção, candidato e aplicação

- Reusar revisão Pro v2/configuração discriminada, coordenador de jobs, leases, ledger e limites existentes. Preservar leitura de jobs/revisões JavaScript anteriores; não criar um coordenador Python paralelo.
- Auditar todas as bordas de `StudioProRevision`, assistência e ferramentas de construção. Python mantém runtime, entrypoint, requirements/lock e extensões no hash da revisão. Patch não pode mudar linguagem nem aprovar runtime/pacote por conta própria.
- Validar candidato Python com CPython correspondente ao perfil, incluindo compilação (não só parse), import roots, diagnósticos e limites. Não usar Babel/TypeScript para validar Python. Não executar código do aluno no processo do BFF ou no coordenador.
- Preview e prova de execução usam o executor isolado correto e a revisão exata. Uma screenshot não se torna URL de jogo; prova indisponível não é aprovada. Dependências não suportadas falham com diagnóstico útil, preservando o candidato e a fonte anterior.
- Conservar diff revisável, escopo por arquivo/seleção, antes/depois/hash, confirmação de aplicação, undo/redo, reabertura de jobs, descarte, cancelamento e proteção contra troca de conta/projeto/epoch durante operações. Revalidar direitos ao aplicar, sem reaproveitar concessão de leitura.

## Integração e provas

- Ligar o contexto aos hosts efetivamente autorizados e às três intenções do Zappy. Voz/narração/histórico/créditos continuam pela infraestrutura existente; nunca enviar binários privados para o prompt.
- Provar JavaScript e Python, Clássico e Pro, Turtle instalado/ausente, módulo sombreado, curadoria parcial, runtime retirado, erro Pyright textual, fonte com segredos e recorte obsoleto. Exercitar negações antes de reservar/chamar modelo e após troca de contexto.
- Provar candidato que faz parse mas não compila, alteração fora do escopo, pacote não aprovado, resposta tardia, idempotência/recuperação e aplicação com undo. Testes de política/BFF devem atravessar a borda HTTP, não apenas montar prompts diretamente.
- Executar os testes pertinentes, typechecks dos consumidores, regressão JavaScript e browser real das intenções. Medir latência separadamente do boot do runtime e das chamadas ao modelo. Encerrar a revisão independente antes de avançar de sublote.
