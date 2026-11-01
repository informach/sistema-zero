# Registro durável da publicação

Base local em desenvolvimento, ainda sem rotas nem worker ligado à aplicação.

`course_publication_jobs` guarda a captura privada, os hashes da prévia, a aprovação e a posse temporária. `course_publication_tasks` registra a preparação de cada recurso e seu resultado. A migration 0146 cria somente essas tabelas, suas restrições e índices. Foi aplicada apenas no Postgres descartável dos testes.

O contrato público do Admin contém identidade do trabalho, resumo dos cursos, contagens e andamento. Exclui a captura autoral, o resultado interno e o token do worker. A contagem não expõe o passo técnico de preparar o plano de mídia. Datas são reconstituídas somente nas linhas persistidas; strings de data dentro dos projetos continuam sendo strings.

Verificações reais no Postgres local:

- Repetir a mesma criação não duplica o trabalho; uma chave não aceita outra captura.
- Duas conexões concorrentes resultam em uma única posse do trabalho.
- A posse expirada não pode ser renovada pelo processo antigo. A próxima execução recebe outro token.
- Cancelar retira a posse e impede a gravação tardia do processo anterior.
- A publicação recusa recursos pendentes ou diferentes da lista esperada pelo plano de mídia.
- A conclusão do trabalho e a troca do curso usam a mesma transação.

Os testes da base durável passaram com duas conexões reais. A execução conjunta do sincronizador e suas regras passou com 26 testes e 118 asserções; verificações posteriores cobriram a inicialização em lote e a leitura leve do controle de posse. A trava lê somente a identidade do trabalho, sem carregar a captura inteira para cada recurso. Os recursos são inicializados em lote para evitar milhares de viagens ao banco.

Typecheck Members e Core e Biome verificados durante a revisão. Os registros negativos de tipagem e de contagem de passos foram preservados no cache local antes das correções.

Faltam o agendador, a preparação de mídia e conhecimento por serviço, as rotas autenticadas, a retomada pela interface, o fluxo entre ambientes e a validação integrada. Esta base não comprova uma publicação pelo Admin nem uma implantação.
