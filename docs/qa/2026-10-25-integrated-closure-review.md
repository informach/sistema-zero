# Revisão integrada de fechamento — 25/10/2026

## Pensa: ajuda no primeiro quadro do projeto

O CI de `d19c84302` falhou no teste responsivo que abre a ajuda: o DOM final mantinha Plano selecionado. Um teste causal local clica no botão assim que ele entra no DOM, antes dos efeitos passivos da montagem. O clique foi confirmado, mas o formulário não apareceu (RED preservado em `pensa-early-help-red-r2.log`). O efeito de troca de projeto voltava a selecionar Plano depois da interação.

A aba passa a ser resolvida com a identidade do projeto antes do commit dos controles, preservando a abertura inicial por `?ajuda=` somente uma vez. Não há timer ou aumento de timeout. O teste também volta à lista e reabre o mesmo projeto: começa no Plano. O pacote Pensa passou em **45 testes / 138 asserções**, e sua tipagem completa passou (exit 0). A invocação canônica é `bun test src`; uma execução anterior sem `src` coletou indevidamente dois arquivos Playwright e foi preservada como falha de seleção, não como regressão funcional.

## Contratos dos exemplos 3D

A suíte ampla encontrou seis expectativas anteriores à conversão: hash do catálogo básico, canto central do HUD e quatro orçamentos do runtime. A atualização foi restrita a esses contratos; os quatro outros catálogos mantêm seus hashes. A seleção dos três arquivos passou em **177 testes / 1.804 asserções**.

Medição do texto de bootstrap em caracteres/bytes gzip: Jogo 3D completo **224.876 / 62.782**, sem Plataforma **190.794 / 53.051**, Mundo 3D **344.930 / 102.843**, Avançado **209.159 / 61.537**. O custo adicional do básico é cerca de 1,5 KB gzip pelos controles/cenas nativos, HUD e descarte; os tetos continuam próximos da medida e têm justificativa no teste. A tipagem completa do Studio passou após a composição `4d5c1558a`; isso não encerra a suíte completa, o CI nem a publicação.

## Carregamento inicial

A repetição ampla encontrou **350.770 bytes** de JavaScript inicial para um teto de 350.000. A análise do build identificou a janela de criação no grafo estático da lista, mesmo fechada. O componente agora é importado e montado quando aberto; os contratos e guardas de criação permanecem os mesmos. Abrir/cancelar/reabrir reinicializa o formulário como antes, conferido em DOM real de componente (17 casos / 110 asserções no processo isolado).

A medição posterior passou: **343.177 bytes crus / 112.096 gzip / dois arquivos iniciais**, com a janela fora do grafo inicial. Nenhum teto foi aumentado. O teste completo de orçamento também aprovou rota e os três modos, 27 asserções, em 15,56 s. Duas medições anteriores atingiram o prazo local de 20 s durante a geração; uma delas preservou o relatório de tamanho. Não foram classificadas como aprovação nem usadas para aumentar o prazo. A tipagem completa após a integração `d9a1cac98` passou, antes desta separação de componente; o CI final continua obrigatório.

## Baseline financeiro somente de leitura

Consulta realizada dentro do serviço Payments correto, conferindo projeto/ambiente/serviço e usando transação read-only:

| Ambiente | Assinaturas | Política instalada | Identidade de ciclos instalada | Política ativa |
| --- | ---: | --- | --- | --- |
| Staging | 0 | sim | sim | não |
| Produção | 2 | não | não | não se aplica |

Em produção, um contador diverge dos recibos locais; a consulta não reescreveu contadores nem concluiu o histórico do provedor. Migrações canônicas, revisão de ciclos e seed da política são gates do deploy. O predeploy de Payments executa `db:migrate`. Avisos, cancelamentos e cobranças não foram acionados por essa consulta. As duas tentativas anteriores sem resposta JSON foram recusadas; a tentativa válida usa o transporte SSH de origem confiável, sem imprimir URL de banco ou credenciais.

Evidências no namespace `.cache/python-missions-20261024/`. Nenhuma dessas provas, isoladamente, afirma implantação ou ativação financeira concluída.
