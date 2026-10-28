# Medição do Arquipélago no Admin

Implementar o item geral-06 sem importar nem modificar o jogo, sem gravar em ambientes remotos.

## Definições e fontes

- Período inclusivo de até 90 dias civis em America/Sao_Paulo. Dias futuros são recusados.
- Volta: coorte pelo primeiro dia de tempo positivo registrado, dentro do período. Dia seguinte = primeiro dia + 1; dia 7 = primeiro dia + 6. Só dias encerrados são observados. Datas ainda não observáveis aparecem como aguardando, nunca como zero.
- O tempo atual é do Kids. Adultos não possuem histórico equivalente. Não inferir sessões de visitas ao salvamento, nem apresentar ausência de instrumentação como zero.
- Aparências: fotografia atual dos projetos azuis ganhos no período, por origem. Pinta/Molda, criação guardada e galeria são origens, não prova de compra nem de autoria. O histórico de compras não existe no salvamento.
- Aprovações: conclusões de desafios do Estúdio no período. Não chamar todos os desafios de minijogos, pois o cadastro não distingue essa finalidade.
- Cursos: a outra sessão está implementando a volta ao curso para o cartão dos pais em staging local. Reutilizar a fonte comprovada quando chegar. Não ler tabelas do Members diretamente nem criar um segundo cálculo divergente. Conclusões antes/depois exigem histórico com tempos e janela comparável.

## Privacidade

Só agregados atravessam a rota. Nenhum identificador individual, salvamento ou texto livre.
Grupos menores que cinco têm valor nulo e estado poucos-dados. A tabela de volta suprime a linha inteira quando retornos ou não retornos positivos têm menos de cinco pessoas, evitando reconstrução por subtração. Não publicar totais que revelem as partes suprimidas.

## Execução

1. Contrato estrito, filtro e testes de datas/privacidade.
2. Regra pura e consultas agregadas no serviço; rota `/arquipelago/equipe/medicao`, com as mesmas barreiras das outras rotas de equipe; caminho explícito no gateway e BFF.
3. Aba Medição no Admin, filtros, estados de carga/erro/sem fonte e tabela responsiva.
4. Testes de banco e HTTP em Postgres local descartável `arquipelago_test_medicao`, testes dos pacotes e tipagem. Nunca usar variáveis de banco remotas.
5. Conferência local no navegador em computador e celular, capturas, revisão do diff, commit em staging e push.

## Cuidados de integração

Não alterar arquivos da outra sessão. Conferir mudanças novas antes de integrar a fonte de cursos e antes do commit. Não editar `.env`, workflows ou o pacote do jogo.
