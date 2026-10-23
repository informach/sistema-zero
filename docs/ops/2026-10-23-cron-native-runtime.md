# Reconciliação: transporte no runtime Cloudflare

A observação agendada de staging capturou `unconfirmed/transport` na versão
`21932ca4-9654-4d6f-9224-5f3abd1d9668`. A consulta histórica separada recebeu
HTTP 403; esse 403 pertence à API de observabilidade, não ao endpoint de reconciliação.

O defeito de produto é `redirect: 'error'`: workerd rejeita esse modo com
TypeError antes de enviar a requisição. A
[documentação Cloudflare](https://developers.cloudflare.com/workers/runtime-apis/request/)
e o [runtime oficial](https://github.com/cloudflare/workerd/blob/main/src/workerd/api/http.c%2B%2B)
confirmam o contrato. O scheduler passa a usar `manual`. Continua aceitando
somente 200, recusando 3xx e evitando encaminhar o bearer a outro destino.

Os 33 testes existentes passaram. O novo teste executa a fonte real no workerd
instalado: a fonte anterior falhou antes de qualquer saída de rede; a nova
recusou 302 com uma única chamada, sem seguir Location, e aceitou 200 com as
contagens canônicas. Todo tráfego desse teste termina no serviço sintético
local, sem DNS ou chamada a provedores.

A prova local usa workerd 1.20260804.1/Miniflare 5.20260804.0-alpha e a data de
compatibilidade desse engine, 2026-08-04. A configuração hospedada continua
2026-10-22. O teste local não substitui nova observação agendada depois da
implantação. `Miniflare.dispose()` encerra o runtime pertencente ao teste.

Os recibos negativos anteriores permanecem negativos. A captura que mostrou
`unconfirmed/transport` teve DELETE do tail confirmado, mas não recebeu o ACK
de fechamento do socket dentro do prazo; não concede qualificação global de
limpeza ou reconciliação.

Após o hotfix da fonte `532f409c5`, staging recebeu a versão
`90ac68b2-3590-4b7a-8dbe-eb91da7655a2`. A observação única, entre
04:30:33 e 04:31:29 UTC de 23/10, capturou uma execução agendada real
com `reconciled`, `confirmed: 0`, `pending: 0` e `expiredBuilderJobs: 0`.
O contexto remoto permaneceu igual antes e depois. O DELETE do tail foi
confirmado; após o prazo do fechamento gracioso, a API pública `terminate()`
do cliente pertencente ao teste produziu o evento close observado.

Esse resultado qualifica a reconciliação agendada dessa versão em staging.
Não qualifica a interface, a publicação dos jogos nem a implantação em produção.
Os negativos e o timeout gracioso continuam registrados nos recibos históricos.
