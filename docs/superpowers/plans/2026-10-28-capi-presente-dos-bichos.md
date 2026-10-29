# Presente da Capi pelos quatro bichos

Implementar o pedido autorizado de 28/10/2026 no staging local, sem push.
Base: plano da Capi e bichos e regras §6.15. A frente de desafios e a arte do Bosque ficam intactas.

## Decisões

- Salvamento V5 acrescenta `presenteDosBichosEntregue: boolean` na raiz. V1 a V4 permanecem
  imutáveis; `migrarDaV4` inicia a marca em falso, inclusive se os quatro bichos já foram achados.
- Presente: uma `salada`, item existente. Combina com os gostos da Capi e serve de alimento para
  a pessoa ou o bicho adotado. Não paga moedas nem exige arte nova.
- Regra pura em `bichos.ts`: exige os quatro identificadores distintos conhecidos, entrega
  inventário e marca no mesmo snapshot. Com 999 saladas, adia sem marcar e informa na conversa.
- `comecarConversa` acrescenta as falas ao final, depois das falas normais e da página do diário.
  Reabrir no mesmo dia ou em outro, recarregar e migrar não repetem uma entrega já guardada.
- O grupo econômico da conciliação já engloba os campos novos; conferir que inventário e marca
  não sejam unidos independentemente. Conflitos continuam explícitos, sem somar recompensas.
- Playground: parâmetro `bichos=achados` prepara os quatro sem reiniciar uma marca já entregue.
  Usar `novo=1` numa prova nova; persistência e reabertura permanecem exercitáveis.

## Lotes de execução e revisão

1. Contrato: V5, migração e inicial. Testar versões antigas com schemas antigos, formato atual,
   flag estrita, continuidade de progresso, envelope HTTP e teto de 64 KB.
2. Regra/conversa: testar 0 a 3 achados, duplicados, quatro, inventário cheio, primeira conversa,
   conversa repetida no mesmo dia, página do diário simultânea, reload e conflito econômico.
3. API: testar PUT/GET com V5 e migração V4 no serviço real sobre Postgres local descartável,
   incluindo revisão concorrente. Não escrever em banco hospedado.
4. Playground e documentação: atualizar regras, visão geral e CLAUDE dos três pacotes;
   conferir o fluxo no navegador e rodar testes/tipagem/build apropriados.
5. Full review do diff e dos caminhos proibidos. Commit com o motivo da escolha da salada,
   integrar apenas este lote ao staging local e informar SHA. Não fazer push.

O acompanhamento externo é atualizado pela pessoa responsável, conforme esclarecimento nesta
sessão. Entregar ao final um resumo verificável, sem alegar deploy ou atualização remota da página.
