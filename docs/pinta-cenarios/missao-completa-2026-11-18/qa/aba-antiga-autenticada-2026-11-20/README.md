# Aba antiga autenticada e recuperação offline — 20/11/2026

Ensaio no Chrome real desta máquina, com a conta de staging autorizada e somente
um mapa próprio de QA. Uma aba do aplicativo legado c7e9c70a permaneceu aberta
desde antes da implantação do leitor 08f040a9. O aplicativo atual criou pela
interface um mapa nativo 7 com contornos precisos, duas camadas, um objeto girado,
coordenadas fracionárias, colisão e propriedade inteira. O hash canônico cobre
todo o documento, incluindo as células; não é apenas uma comparação de imagem.

A página de autoria nova foi fechada e a rede desligada. A borracha da aba antiga
apagou a primeira célula e sua transação IndexedDB foi observada até o commit:
o espelho voltou a uma camada, sem objeto nem schema novo. O observador de QA
delegou a chamada original sem alterar sua semântica e guardou apenas metadados.

Dois realms novos, ainda offline, abriram separadamente a persistência real.
Ambos recuperaram o documento 7 completo com SHA-256
00d8e2c2a16fd54be9843e721ae381b44d726ecbb3c6c6bfbf255bdabbe31a7e.
A edição antiga foi preservada em uma única cópia independente, com a célula
apagada e ID estável entre as reaberturas. Não havia documento completo em RAM
no controlador, backup de entrada ou acesso à nuvem para recuperar esses dados.

Depois, o aplicativo real de staging reabriu o original e a cópia. A exportação
editável pela interface foi relida pelo importador oficial: dois recursos,
zero avisos e o mesmo hash completo. O backup anexado foi produzido somente
depois da recuperação e contém exclusivamente o mapa de QA e sua folha.

## Limites e continuidade

O código de leitura foi previamente compilado das fontes reais e servido por
uma rota interceptada apenas no navegador de QA. Isso permite testar uma página
nova sem rede, mas não prova um cold start HTTP offline do aplicativo completo.
O teste utiliza IndexedDB real, uma máquina física e contextos de navegador;
não representa aparelhos adicionais, crianças, corte de energia ou quota física.

O segundo contexto autenticado teve armazenamento separado, sem cópia de IDB
ou localStorage; a sessão inicial foi transportada somente em memória. A prova
offline descrita acima ocorreu no primeiro contexto. A aba antiga permanece
com a rede suspensa para a futura prova controlada da recusa do gravador antigo
na nuvem. A distribuição Python 132, o gravador 6 e o ciclo completo de publicação
ainda não foram ativados nem homologados por este ensaio.

Esta prova complementa as regressões de quota, tombstone, causalidade, lote,
formato futuro e isolamento da issue 026; não substitui esses testes anteriores.
Os arquivos não contêm credenciais, cookies, perfil, traces ou capturas de login.
