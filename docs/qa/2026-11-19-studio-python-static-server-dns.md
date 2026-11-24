# Servidor estático da exportação Python: inicialização e DNS

## Sinal e reprodução

O run GitHub Actions `44471396610`, revisão `5c960236b`, falhou no Windows por timeout de prontidão do servidor estático (8 s). A revisão anterior `cef539eb4` havia passado nos 12 jobs. O log antigo não continha stderr/stdout do filho, portanto não prova qual operação consumiu o prazo naquela ocorrência.

A investigação do código da biblioteca padrão confirmou que HTTPServer.server_bind consulta socket.getfqdn mesmo quando recebe o endereço numérico 127.0.0.1. Um teste com DNS indisponível reproduziu falha de inicialização do servidor exportado. Esse teste controla somente a função pública de DNS no processo de prova; o serve.py distribuído é executado integralmente e não recebe hooks de teste.

## Mudanças

O servidor usa uma subclasse pública de ThreadingHTTPServer, ligando o socket pelo TCPServer.server_bind e preenchendo nome/porta com o endereço numérico já conhecido. Não precisa de resolução DNS. A API de exportação e as regras de Host, raiz, caminhos, MIME, CSP e sandbox permanecem exercitadas por HTTP real.

A prova cancela o timer de prontidão assim que recebe a URL. Antes ele continuava ativo durante todas as requisições. Falhas agora incluem as caudas limitadas de stdout/stderr do filho. Os prazos de 8 s para prontidão, 2 s por requisição e 12/15 s da prova externa não foram ampliados.

## Evidência inicial

A prova sem DNS falhou antes da correção e passou depois. Os dois modos passaram em 2 testes / 4 asserções; os asserts de HTTP/confinamento são executados no filho. A prova também exige 404 para seu próprio helper de DNS, mesmo quando o arquivo existe. Nenhum programa do aluno é executado no servidor.

Logs ignorados: `.cache/mission/python-static-server-*`. Suíte de exportação, typecheck e nova CI precisam ser concluídos antes de considerar o sinal Windows qualificado. A remoção da dependência DNS não é apresentada como causa comprovada do timeout histórico sem seus diagnósticos.


Suíte local de exportação completa: 119 testes / 601 asserções / 20 arquivos, 2,12 s, zero falhas (`python-static-server-export-suite.txt`).


Gates finais desta revisão: typecheck completo incremental com saída 0; lint dos cinco arquivos alterados com saída 0; bundle inicial 367.761 bytes brutos / 119.635 gzip, 1 teste / 35 asserções, limites originais. Logs `python-static-server-typecheck.txt`, `python-static-server-reviewed-lint.txt` e `recovery-owner-export-bundle.*`. A CI do novo HEAD ainda precisa qualificar os ambientes remotos.
