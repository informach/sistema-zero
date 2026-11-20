# Atualização autenticada da própria Vila — 20/11/2026

Chrome instalado nesta máquina, conta autorizada de staging, projeto e mapas de
QA próprios. A edição de código foi feita pelo teclado no Monaco, e o primeiro
quadrado do Chão da Vila foi apagado pela borracha da interface. Só o documento
nativo da Vila mudou; os cinco recursos restantes conservaram seus hashes.

Depois que a biblioteca pessoal terminou a atualização, o evento de foco
emulado acionou o observador normal do Estúdio. A cena mudou de cd10e631… para
8d5ce1d8…, com revisão nova; os arquivos, IR e blocos conservaram integralmente
o hash conjunto 05eb9dee… e a variável qaVila20261120. O projeto continuou com
dois mapas, 18 camadas na Vila e dois tilesets. Uma página nova reabriu os mesmos
dados. Rodar novamente manteve a colisão: o personagem parou na pedra em x 48.

## Intervalo ainda em investigação

A primeira tentativa enviou foco antes de a ponte do Pinta terminar e o projeto
não atualizou durante 20 segundos. A leitura seguinte encontrou a biblioteca
nova e o projeto antigo. Somente o segundo foco depois dessa confirmação produziu
a prova acima. Isso é evidência de uma janela de sincronização, não homologação
de atualização automática em qualquer ordem. O caso precisa de reprodução local
e correção antes de concluir a integração. As páginas headless permanecem visíveis;
os eventos de foco foram explicitamente emulados, sem chamada a stores da aplicação.

Não há publicação, gravador de nuvem 6, runtime Python 132 ativo, aparelho físico
adicional nem participante infantil nesta prova. A aba legada testemunha da issue
026 foi preservada, com sua rede ainda bloqueada para o ensaio posterior de nuvem.
