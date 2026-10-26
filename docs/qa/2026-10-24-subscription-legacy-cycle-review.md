# Revisão técnica do contador histórico — 24/10/2026

O review encontrou uma assinatura ativa e ilimitada cujo contador local era seis,
com quatro recibos pagos. Consulta GET na Efí confirmou quatro ciclos e nenhum
reembolso. Não normalizar esse dado por inferência nem alterar os recibos.

Foi preparado um comando técnico de migração revisada, com modo de leitura padrão:

```sh
bun scripts/review-legacy-cycle-history.ts --environment production
bun scripts/review-legacy-cycle-history.ts --environment production --subscription UUID --apply
```

Executar de `packages/payments`, somente depois do deploy qualificado e retirada
das réplicas antigas. O filtro opcional permite revisar uma assinatura por vez.
O comando exige ambiente/projeto/serviço corretos e sandbox em local/staging,
conta real apenas em produção. Não recebe valor arbitrário para o contador.

Elegibilidade: assinatura EFI ACTIVE, ilimitada, sem pedido de cancelamento ou
revisão anterior. A fonte deve identificar o mesmo contrato e devolver histórico
integral, com datas válidas, IDs únicos e somente ciclos pagos/reembolsados. As
identidades devem coincidir exatamente com os recibos locais e com o componente
permanente de ciclos. Falta de dados vira REVIEW_REQUIRED, nunca correção parcial.

O apply só reduz um contador comprovadamente excedente, mantém valor positivo,
confere versão, intenção pendente e frescor dentro da transação. A migration
gerada 0026 adiciona coluna de auditoria nullable. Ela registra ator técnico,
request, contrato, versão anterior, antes/depois, identidades e instantes de
observação/revisão. Escritas normais do agregado não sobrescrevem essa auditoria.
Um evento próprio vai à outbox, sem payment.paid ou alteração de dinheiro.

O comando não chama débito, troca de cartão ou cancelamento. Não muda preço,
período, acesso, estado ou última cobrança. A análise é limitada a 25 candidatos,
com prazo total e retorno não exitoso se houver pendência/interrupção. Uma nova
execução não seleciona assinatura já revisada. Casos finitos ou ambíguos ficam
fora dessa migração técnica.

## Evidência local

- Payments completo: **598 testes, 1.882 asserções, zero falhas/skips**, 49 arquivos.
- Tipagem completa: exit 0, heap 768 MiB.
- Nove casos focados / 32 asserções: fonte divergente/incompleta, correção auditada,
  recibos intactos, preservação após save normal, versão, plano finito, operação
  pendente, recibo sem identidade e expiração antes/depois das escritas.
- Biome dos sete arquivos alterados sem erros.
- Migration 0026 aplicada somente em PostgreSQL QA; nenhum dado real foi escrito.

O primeiro fixture buscava seu UUID numa lista global de 25 candidatos do banco
QA compartilhado e nem sempre o encontrava. O filtro de assinatura tornou a
revisão individual operacional e a prova determinística; o negativo ficou
preservado em `financial-cycle-review-focus-r1.log`.

Logs finais: `financial-cycle-review-focus-r3.log`,
`financial-cycle-review-full-final-r1.log` e `financial-cycle-review-types-final-r2.log`.
Ainda faltam preview/apply técnico na imagem publicada e nova inspeção de produção;
não interpretar a implementação como correção já aplicada ao registro real.
