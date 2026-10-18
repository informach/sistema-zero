# Serviço de linguagem Python — autorização contextual

O serviço nativo de análise/Pyright já está isolado, mas o BFF atual autoriza somente uma sessão autenticada. Não ligar a análise aos hosts livres/aula/sala antes de revalidar seus direitos. Sessão de linguagem não concede execução nem estende a concessão de uma oficina.

## Fronteira de autoridade

Cada reserva, início e comando inclui um envelope compacto de contexto e sujeito Python. Usar os contratos existentes (livre, aula com baseline, autoria/rehearsal e sala com epoch/revisão esperada), sempre operação analyze. O BFF deriva conta/perfil/sessão da autenticação e chama o MembersClient correspondente; erro de acesso conserva status e não encaminha ao serviço de linguagem. Não aceitar decisão/capabilities/catálogo/URL do cliente como autorização.

Após essa autorização, o BFF calcula uma identidade estável da sessão de análise: ator/conta, contexto, id do projeto, linguagem/kind/runtime/template. Revisão de salvamento, entrypoint e fonte ficam fora dessa identidade, pois são editáveis (renomear um arquivo não pode romper a ligação). Revalidar entrypoint/requirements/extensões pelo sujeito atual em cada pedido; analyze permite recuperar buffers incompletos, sem instalar pacotes externos. Resposta autorizada precisa corresponder exatamente ao sujeito e ao contexto consultados.

O serviço de linguagem, protegido pelo token interno existente, recebe a identidade calculada pelo BFF na reserva e a conserva junto com owner/projectId/sessionId. Inicio/comandos só são aceitos com a mesma identidade. Isso impede anexar uma sessão de aula a outro projeto/contexto sem depender de Map do processo Next, cookies extras, tickets duráveis ou uma nova infraestrutura de persistência. O hash não é credencial pública; o browser não controla o header interno nem acessa o token do serviço. DELETE continua permitido para fechar a própria sessão após perda de direito; nunca permite consultar/sincronizar.

Usar a persistência DO/SQLite existente para o binding imutável, incluindo migração aditiva idempotente do schema. Lease antiga sem binding não inicia análise depois da ativação da nova fronteira; ainda pode fechar/expirar. Criar endpoint Members específico de autorização de análise, reutilizando os quatro serviços contextuais, com operação analyze obrigatória e limite próprio. Não consumir o orçamento de120 execuções/minuto a cada completion/sync, nem ampliar silenciosamente a quota de execução. Medir o custo/latência da revalidação em aula e ajustar somente com evidência; não colocar um cache de decisão no browser como substituto de autorização no servidor.

## Cliente e vida útil

O ambiente contextual oferece uma factory de provider de linguagem ligada a um getter do documento atual da store do editor. O cliente mantém seu contrato de comandos/snapshots; o transporte anexa contexto/sujeito atual sem transmitir arquivos na reserva. Na sala, capturar revisão e verificar epoch/dispositivo no turno da mesma fila usada pelo journal, evitando corrida com autosave; análise de observador usa o acesso somente de leitura já existente. Contexto/language/runtime/perfil alterado encerra a conexão antiga, cancela respostas e deixa buffers intactos.

Não reiniciar o Docker/Pyright por digitação ou salvamento. Cada comando ainda revalida Members; comandos de cancelamento/fechamento precisam manter disponibilidade mesmo quando o contexto perdeu acesso. Quando análise está indisponível, editar/executar continuam através das suas próprias fronteiras e a UI oferece reconexão explícita. Pro Python continua sem importar WebContainer/TypeScript. Nenhuma concessão de Pro livre surge por estar numa aula Pro.

### Confirmação de autorização sem bloquear o journal

A fila da sala precisa proteger a leitura de revisão e a decisão Members, mas não pode ficar presa durante o início do container (até40s) ou uma consulta Pyright (até15s). O transporte do BFF confirma a autorização atual ao iniciar uma resposta JSON em streaming, antes de aguardar o serviço nativo. O corpo versionado conserva status e resultado do serviço; negar acesso antes dessa confirmação continua usando o status HTTP normal. Não há ticket, decisão reutilizável nem nova concessão no navegador.

O provider agenda na fila somente a captura de contexto e o envio até receber essa confirmação. Libera a fila, depois lê o resultado limitado e valida seu envelope fora dela. Assim o autosave seguinte ocorre depois da verificação de revisão, enquanto o container pode continuar iniciando sem bloquear salvamentos. Todos os comandos seguintes repetem a mesma autorização. Cancelamento e DELETE ficam fora da fila, para encerrar trabalho mesmo após mudança de autoria. Testar ordem com gates reais de BFF/worker, confirmação anterior ao resultado, erros tardios, encerramento do stream, corpos limitados e negação sem acesso ao serviço. Medir o comportamento no servidor HTTP e navegador; uma Promise simulada sozinha não prova entrega antecipada dos headers.

## Entregas e provas

1. Contrato estrito do envelope e identidade calculada; testes de contexto/projeto/runtime/tampering/limites.
2. BFF real: auth/perfil, Membersfresh, negativas sem chamar serviço, binding de reserva/início/comandos, fechamento após perda, timeout/cancelamento, no-store.
3. Serviço nativo: binding imutável e negação antes de ler/sincronizar buffers; isolamento/quotas/fechamento já existentes preservados.
4. Factory contextual/transportes por host/getter da store; corridas A→B→A, fonte alterada e requirements em edição, eventos tardios e professor/observador.
5. Chrome/Edge com servidor Docker: completion/hover/refs/rename/diagnóstico/Ruff/REPL independente; revisão entre lote e prova de latência/custo. Fixtures que omitem a fronteira servem somente a testes locais, nunca ao host de produto.
