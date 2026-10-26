# Alteração preventiva de cartão — lote de interface

Implementada na Área dos Pais e em Compras da comunidade adulta, usando o mesmo
componente de domínio. A ação substitui o cartão dos próximos ciclos, sem débito
imediato e sem afirmar que quitou cobranças anteriores. Só aparece na assinatura
ativa sem pedido de cancelamento. Cancelamento pendente recebe texto próprio e
consulta atualizada, sem falso sucesso.

## Fronteiras e privacidade

- BFFs exigem conta própria adulta/responsável; perfil infantil e suporte recusados.
- Gateway mantém autenticação de conta ativa, limites de escrita e auditoria;
  nenhuma exigência de produto ativo impede o responsável de cuidar da cobrança.
- PAN, CVV e CPF do titular ficam no formulário/SDK Efí; BFF recebe token transitório,
  bandeira e quatro últimos dígitos. Não há armazenamento no navegador.
- Tokenização compartilhada com o checkout, carregada sob demanda; resposta limitada
  a token/máscara e erros sem conteúdo cru, cause ou logs sensíveis.
- Fechar o formulário invalida leituras e descarta tokenizações tardias. Após resposta
  perdida da escrita, somente consulta da intenção existente; não há retry automático.
- Consulta da intenção preserva resultados desconhecidos após o prazo e recusa ID de
  outro comprador. Intenção expirada pronta pode ser substituída sem repetir efeito.

## Evidência local

- Payments completo com PostgreSQL descartável real: 385 testes / 988 asserções,
  zero falhas/skip. Typecheck Payments e UI passaram.
- Formulário: quatro cenários de DOM isolado (execução via wrapper), incluindo
  fechamento com token em voo e perda de resposta; não é navegador real/Efí sandbox.
- SDK: sete casos isolados de resposta válida/inválida e não propagação de erro cru;
  não é prova do provedor real.
- Checkout existente: 58 testes / 193 asserções, zero falhas.
- Gateway/configuração e separação de sessão: 56 testes / 308 asserções.
- Portão dos pais: RED causal aceitou suporte com claim de responsável; correção
  recusa as duas modalidades. GREEN quatro testes / 13 asserções.
- Tipagem focada do formulário e sua fixture passou após separar seus contratos
  leves do arquivo geral do player. A primeira tentativa de 1 GiB esgotou memória;
  o resultado negativo foi preservado, sem tratá-lo como diagnóstico de código.

## Limites antes de liberar

Revisão adicional: a leitura autenticada agora informa a disponibilidade atual
da assinatura. Cancelamento ocorrido depois de abrir Compras não deixa pedir dados
de um cartão novo. A consulta de operação pendente permanece disponível mesmo se
a tokenização estiver desconfigurada. Provas adicionais: dois cenários DOM (seis
no total), um cenário PostgreSQL (nove na seleção de cartão), tipos focados e
Payments sem erros. Não amplia a evidência para navegador/Efí real.

Este lote não é a entrega completa de regularização. Ainda requer revisão integral,
CI dos BFFs/apps, navegador real, configuração pública da Efí nos ambientes e prova
em sandbox. A operação de pagar atraso, seu valor/período, casos D0/D3/D6/D7,
mensagens, fila administrativa e ativação coordenada continuam pendentes. Nenhuma
assinatura real foi alterada, cobrada ou cancelada para estes testes.

Depois da conclusão financeira haverá o primeiro full review. Os dois lotes finais
de aulas seguem os planos próprios e recebem outro full review antes de staging e
produção. Este ramo de implementação não deve ser confundido com o hotfix de CI.
