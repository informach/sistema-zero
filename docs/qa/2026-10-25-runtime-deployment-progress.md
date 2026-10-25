# Publicação do runtime e qualificação hospedada — 25/10

Este checkpoint não declara implantação completa das aplicações nem liberação da política financeira.

## Distribuição Python armazenada nas duas configurações

A distribuição `d0443c77ba985acf015b5591b63a7fe5d71ed16fa2bbc7674cf6f032a09c41d2` e a release `python-browser/2026-10-25-project-objectives-1`, manifesto `9e5441dc67a8d0a435c2ea1e9dfaf66eb7d9b8fa5a0d78c64c2e97da101d3e1e`, foram publicadas pelos stores reais, com binding R2 nativo.

| Destino | Plano | Resultado |
|---|---|---|
| Staging | `0d234ae93c4a61d015cbe2b965d2783e86a547665051204f18a687d8ab232627` | 67 arquivos, marcador e catálogo; 69 readbacks por tamanho e SHA-256 nativos; corpos encerrados; 75.750 ms |
| Produção | `ffb2555482f8b4130e220a160da7f8c0172a86f8a3d70cd5e0544a52dc548e7e` | Os mesmos arquivos/manifesto; 69 readbacks; corpos encerrados; 63.970 ms |

Os catálogos armazenados são `790f5d34c3f5f4f40b643a9ace94ef627b35963860d49f40819c1b805f262d2d` em staging e `606eeec3a67f9d8422d7bc8bc758655c7a82884c38a51f7945d97f843bee2d41` em produção. Armazenamento não muda o ponteiro ativo ou as políticas do Members.

Cada operador temporário teve origem, versão, fonte compilada, binding e pedido HMAC conferidos. Pedido não autenticado retornou 401 antes do upload. Ao final, revogação da credencial e remoção do Worker retornaram 200; leitura posterior confirmou 404. Nenhuma credencial foi colocada nos artefatos públicos ou no Git. Os tempos são de uma operação por destino, incluindo rede; não são p95 ou medição de heap.

Recibos em `.cache/python-missions-20261024/`:

- `promotion-staging-operational-r2/attempt-5/operator-receipt.json`;
- `promotion-production-operational-r2/attempt-1/operator-receipt.json`.

Os negativos de autenticação expirada, presença da versão com a credencial e interpretação do multipart foram preservados. O operador passou a renovar a sessão pela CLI, aguardar a versão publicada sob prazo finito e verificar os bytes do único módulo, inclusive quando o campo multipart é texto. As tentativas anteriores ao upload não ativaram catálogo e todos os Workers temporários criados foram removidos.

## Imagem: eliminação de uma camada duplicada

O primeiro envio da imagem encerrou com timeout do registro ao confirmar uma camada. A análise `docker history` identificou uma camada de 578 MB produzida pelo `chmod -R` final sobre dependências já instaladas. O ajuste de permissões dessas dependências foi movido para a própria instalação; o ajuste final alcança somente os scripts e JSONs da raiz. Nenhuma biblioteca foi retirada.

Na comparação real de `/opt/sz-runtime`, as 6.305 entradas preservaram conteúdo, tamanho, dono, grupo, modo e destinos de links. A única diferença foi o conteúdo intencional de `validation-profile.json`. A primeira candidata, que retirava bits de execução dos scripts no contexto Windows, foi recusada na comparação e substituída pela versão que preserva os modos originais.

O Docker reportou 2.459.436.699 bytes na tag de referência e 1.706.666.021 na candidata final. São tamanhos reportados para as imagens comparadas, não bytes transferidos nem estimativa de latência; a camada final caiu de 578 MB para 479 kB. O image smoke executou com UID 1000, compilou o programa e confirmou que as dependências continuam protegidas. A leitura de hashes foi feita como root somente na inspeção passiva, sem rede e com filesystem somente leitura; a execução de programas continua não privilegiada.

Provas: `image-trusted-tree-{baseline-r2,compact-r2}.json`, `image-compact-equivalence-r2.json`, `image-compact-smoke-r2.log`. SHA-256 dos manifestos de inspeção: `8903e4e830de6c2f1550bedf9ccba3af217d1876274983e7fd69265efc972046` e `41b3ddc996671778ab4f288ddd57df59d061a5f2aef4be6e2dae9119b5252a14`.

Imagem final: `sha256:2516e1a98f05a81b59f7f3ec9a2955d4cb8f943e3ee7a3dda293709a370bf4ff`; perfil `9acdf105cf421cc9fe97e06dee9831ab5e620abfb225c1374d9a4a66b3b86cf3`. A mudança é apenas de organização das permissões em camadas. Ordem, RNG e cálculos do programa não mudaram. Reversão: reverter o commit do Dockerfile junto com seu perfil gerado.

## Serviço de execução de staging

A primeira CLI ativou a versão do Worker antes de falhar no push Docker. Isso foi detectado na leitura das implantações e revertido explicitamente para `6fc805dd-dba2-43b2-9dff-15dc802a0bf6`. Depois, a imagem menor foi enviada antes da nova ativação. A segunda implantação terminou com o app `a038c8f3-1b1c-40ca-8935-bfcc799202ef` usando o digest final acima.

Worker ativo confirmado: `67b7ab5c-bb46-4353-8eca-05d08944c421`. O ponteiro do catálogo Python foi mantido no valor anterior `3c69eea36bfb14db88679a7e32bc7b61c69e05095d2794f1aabf4ab54985b230`. O serviço de produção e os ponteiros/políticas das aplicações não foram alterados nesta etapa.

Prova hospedada pelo adaptador real do Members, API do Worker, RPC e sandbox:

| Caso | Resultado | Duração total |
|---|---|---|
| Cubo gerado pelos blocos, rotação Y | Aprovado, captura WebGL real | 9.121 ms |
| Three Pro, exportação e movimento coerente | Movimento e função do renderer aprovados | 10.290 ms |
| Three Pro, direção errada | Movimento recusado; renderer aprovado | 7.927 ms |

Recibo: `hosted-three/9ff968a1-5051-4a87-9ead-d23d2723944b/receipt.json`, com JPEGs privados de QA. Os três pedidos completos não comprovam p95, cold/warm controlado ou a interface de uma aula.

## Pendências

- Concluir CI da revisão final e os deploys das aplicações em staging/produção.
- Ativar os descritores e políticas revisados na ordem compatível; qualificar Python pelo caminho hospedado.
- Conferir Admin/aluno, conclusão, ensaio e permissões na interface real.
- Completar medição de desempenho e a integração Raylib da outra frente.
- Fazer o lote separado dos 19 exemplos Jogo 3D com HTML/CSS; os três cursos dependentes não estão liberados por este checkpoint.
- Concluir a ativação/validação financeira separada. A política automática continua sem ser declarada ativa.

O CI `40149674954` passou pelos programas reais e serviços, mas encontrou dois dados de exportação comprimida que combinavam uma distribuição com `project-missions-v1` e uma release sem esse recurso. A fixture foi alinhada ao manifesto real; a validação de divergência permaneceu estrita. Dois testes/40 asserções passaram (`compressed-export-features-green-r1.log`); a suíte completa do Estúdio continua sendo conferida.
