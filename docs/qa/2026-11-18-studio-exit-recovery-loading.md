# Recuperação de saída fora da carga inicial

## Reprodução

O run 44402766082, SHA 184b32782, aprovou contratos Linux, runtime hospedado,
auditoria e as shards Chromium 2/3 e 3/3, Firefox, WebKit e Chromium Windows.
Contratos Windows reprovaram no gzip inicial: 120.603 bytes para teto de
120.000. A reprodução local confirmou exatamente 120.603, sem mudar limites.
O teste de gravação/encerramento dos navegadores já havia passado nessa CI.

## Contrato arquitetural

A captura de saída permanece síncrona e disponível no coordenador já existente.
Validação, comparação, promoção e limpeza das cópias síncronas ficam no módulo
projectSynchronousExitRecovery.ts. O leitor só importa esse módulo quando há
cópia no escopo; uma gravação confirmada só o importa quando precisa limpar uma
cópia existente. Não muda o protocolo, CAS, partições, identidade, ordenação de
conflitos ou significado de ACK. Funções comuns continuam no mesmo coordenador,
sem outro armazenamento ou outra fila. A dependência de volta ao coordenador
é alcançada depois de sua inicialização pelo import dinâmico.

Aumentar o teto ou remover diagnósticos não foi considerado solução. Adiar a
captura de saída para um import assíncrono perderia sua garantia no evento de
fechamento e foi descartado. A nova guarda do bundle verifica que o módulo de
promoção não entra no grafo inicial, além dos mesmos tetos de bytes e arquivos.

## Verificação local

- Gzip inicial: 120.603 → 119.713 bytes (-890); cru final 368.465, dois arquivos.
- Mesmo teste de bundle: aprovado, 31 asserções, 14,86 s de build/inspeção.
  A duração do build não é latência da interface. A folga gzip continua pequena.
- Estado/persistência: 376 testes, 2075 asserções, zero falhas, 39,29 s.
  Inclui Chromium/WebKit reais, recargas, conflitos, quota e acesso negado.
- Coordenador e recuperação síncrona: 25 testes, 147 asserções, zero falhas.
- Typecheck final: aprovado após repor o import de ExitJournalError que a
  extração inicial havia retirado indevidamente. Essa primeira tentativa não
  foi commitada como aprovada.

A aprovação remota do novo SHA continua obrigatória. Esses dados não encerram
a missão nem resolvem isolamento DOM, virtualização ou capacidades profissionais.
