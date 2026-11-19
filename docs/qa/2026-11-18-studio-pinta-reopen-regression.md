# Integração Pinta: versão 5 revertida ao reabrir

Status: bloqueante de homologação; não corrigido nesta sessão. Origem produtora
Pinta em desenvolvimento por outra frente, cujos fontes não foram modificados.

## Evidência

Run 44402766082, SHA 184b32782, job 135161348035, fluxo touch de
packages/studio/e2e/pinta-scenes.flow.ts. O trace.zip e o relatório estão no
artefato studio-browser-linux-chromium-1, preservado no GitHub. A cópia de
laboratório fica em .cache/mission/remote-44402766082-linux1 (ignorada).

O passo de edição e o download ANTES de sair passaram: formato 5, mapa schema 5,
célula apagada e deslocamento X de Sombras igual a 2.5. O trace mostra download
com fechamento do modal antes de Voltar/reload/reabrir. A falha veio no download
APÓS reabrir, linha 88: esperado formato 5, recebido formato 4. Portanto não é
uma prova de que o preenchimento/Tab falhou. A primeira hipótese foi rejeitada
pela ordem efetiva das ações e pelos asserts já aprovados.

A reprodução Windows local com três repetições touch (seis cenários contando
Phaser) passou em 27,8 s, sem alterar o teste. Isso não apaga a falha Linux nem
prova a causa interna da persistência produtora. Não foi acrescentada espera de
autosave, download com retry, relaxamento da versão ou remoção do teste.

## Qualificação independente

O gate Pinta/Phaser continua obrigatório na shard Linux 1, mas roda depois da
suíte principal do Estúdio e também quando ela falha (exceto cancelamento).
Uma falha do produtor não pode impedir a execução dos cursos e dos fluxos
principais. As duas etapas conservam falha real, logs e artefatos separados;
o job continua reprovado quando qualquer uma reprova.

## Sequência de correção e aceite

Investigar na frente produtora a transação de Voltar/reload, a autoridade local
e o conteúdo efetivamente confirmado antes da navegação. Preservar o snapshot
v5 completo; não migrar de volta para v4, apagar a edição ou esperar arbitrariamente.
Repetir o mesmo fluxo Linux desktop/toque sem esperar autosave, comprovar campos
e camadas no backup e no armazenamento reaberto, então repetir o contrato do
Estúdio. Não declarar integração completa enquanto o caso continuar vermelho.
