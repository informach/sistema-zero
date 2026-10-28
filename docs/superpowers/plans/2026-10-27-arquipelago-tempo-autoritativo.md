# Tempo do Arquipélago com relógio do serviço

O limite familiar é contabilizado apenas enquanto a criança joga; menus, ferramentas abertas e
abas ocultas não consomem tempo. Adultos e sessões de suporte somente leitura continuam sem
contagem. O dia civil é sempre o de São Paulo.

O fluxo atual guarda lotes em IndexedDB e envia ao serviço a data e os segundos escolhidos pelo
navegador. Isso recupera respostas perdidas, mas uma data incorreta no dispositivo pode rejeitar
o lote ou registrá-lo em outro dia; o serviço também não pode confirmar o tempo decorrido.

## Contrato de implementação

- O serviço mantém uma sessão ativa por perfil, identificada por token aleatório e protegida por
  transação no banco. O início, os pulsos e a pausa usam o relógio do serviço, não o do aparelho.
- O jogo só avança enquanto a sessão estiver válida. Pulsos periódicos renovam uma concessão
  curta; falta de conexão ou perda da concessão pausa o jogo e oferece recuperação explícita.
  Conectar duas abas substitui a concessão anterior, sem somar o mesmo intervalo duas vezes.
- Ao pausar para abrir uma ferramenta, abrir o menu, ocultar a aba ou sair, o cliente solicita
  pausa. Se a solicitação ou sua resposta se perder, a reconciliação posterior contabiliza no
  máximo até o vencimento da última concessão, sem registrar duas vezes. Uma retomada só começa
  depois da resposta do serviço.
- Intervalos que cruzam a meia-noite são divididos entre os dois dias de São Paulo. A mudança do
  limite pelos pais é considerada no próximo pulso e no início da próxima sessão.
- Uma migração aditiva preserva `tempo_diario` e o histórico de eventos. O protocolo antigo e
  as abas já abertas exigem uma transição explícita durante a implantação; não apagar filas nem
  interpretar um lote antigo como uma nova sessão sem reconciliação.
- O serviço protege as transições por perfil e sessão; a origem continua autenticada pelo gateway.
  O cliente não escolhe data, valor cobrado ou identidade. Um navegador alterado não é uma fonte
  confiável para comprovar que exibiu a cena: a concessão limita e contabiliza a sessão online,
  mas não promete impedir toda manipulação do aparelho.

## Verificação antes de ativar

Provar com Postgres real: duas abas concorrentes, repetição de pulso e de pausa após resposta
perdida, interrupção e retomada, relógio do dispositivo adiantado ou atrasado, troca de dia,
mudança de limite, encerramento ao abrir ferramentas, suporte somente leitura e adulto sem limite.
Testar também o fluxo real em Kids após o deploy de staging e medir chamadas e impacto na cena.
Não habilitar a mudança em produção apenas pela passagem dos testes unitários.
