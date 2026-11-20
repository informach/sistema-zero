# Lote 8.5 — Leitura e preparação do consumidor nativo

19/11/2026 · staging · continuação de `8746ee479`.

**O consumidor ainda não está ativo no `/macro`; 8.5 permanece aberto.** Este recorte prepara a leitura, os metadados e o ciclo comum de instalação que serão usados pela integração nativa. Não altera geografia, campanha, inventário, controlador, velocidades ou interfaces Kids/adulta. Não houve implantação.

## Implementado e revisado

- Porta opcional `Plataforma.cenarios`, no mesmo formato de respostas do serviço existente. O host usa os endpoints de leitura publicados e a prova do perfil que montou o jogo. A ausência da capacidade conserva a composição em código; não acrescenta uma porta de autoria ou acesso a bibliotecas.
- `lerCenarioPublicado`: distingue ausência explícita de erro, confere a ilha e a versão, lê o manifesto por hash/tamanho/MIME, confere sua fonte e lê somente os recursos declarados. Aliases do mesmo hash compartilham bytes; divergência impede entregar o pacote inteiro. O transporte do blob não recebe cookies nem cabeçalhos da sessão.
- A leitura HTTP limitada foi separada do carregador Three e reutilizada pelo runtime portátil. A entrada `motor/leitura` não importa o renderer/editor. Recusa endereço com credenciais, orçamento inválido, cabeçalho/stream excedente e cancela o corpo mesmo se o transporte não escutar o sinal.
- `lerPerfilDeCenario`: recupera os metadados existentes de Íris, placas e papéis físicos; valida campos reservados e fundações completas; conserva propriedades desconhecidas e coordenadas globais; recupera marcos/chegada. Ainda precisa conectar esses dados aos componentes do jogo.
- Preparação de colisão próxima com os setores nativos de 80 m e raio 2. Usa o BVH compilado, conserva triângulos inteiros e deduplica consultas vizinhas por identidade de instância/triângulo. Mantém 20 mil visitas por consulta e um teto agregado de 100 mil triângulos. Produz arrays para Rapier; ainda não os registra no mundo do `/macro`.
- Instalador extraído do Estúdio para `motor/instalar`, conservando o ciclo de troca, cancelamento e descarte. O Estúdio mantém seu adaptador Physics Lite e suas APIs. O modo opcional `luzes-locais` conserva céu/fog/iluminação global do hospedeiro e instala as luminárias autorais. O padrão dos outros consumidores permanece completo.
- Runtime portátil regenerado pelo script, incluindo inventário de licenças. O lockfile acrescenta somente a dependência workspace do motor no jogo.

## Verificações locais

| Verificação | Resultado |
| --- | --- |
| Arquipélago completo, `bun test` | 2.160 aprovados, 1 pulado, 273.746 verificações |
| Motor completo | 262 testes, 5.260 verificações |
| Instalação e Physics Lite do Estúdio | 20 testes, 101 verificações |
| Porta da plataforma e host anterior | 24 testes, 180 verificações |
| Leitor/perfil do jogo, incluindo GLB real e aliases | 11 testes, 40 verificações |
| Colisão próxima e fronteiras de importação | 9 testes, 23 verificações |
| Tipagem completa do Arquipélago e do motor | Aprovada |
| Tipagem focada do BFF incluindo o host e a porta novos | Aprovada com TypeScript 5.9.3 e configuração herdada do pacote |

A primeira regressão integral do jogo detectou que a regra de fronteira ainda não previa o leitor compilado. A regra foi ampliada somente para três entradas exatas: `leitura`, `runtime` e `instalar`. O import do motor inteiro/editor permanece proibido. A suíte integral foi repetida e passou. A separação posterior do leitor em módulo próprio recebeu novamente os testes focados de HTTP/runtime/colisão e a tipagem do motor.

A nova prova de identidade dos triângulos falhou antes da implementação: o segundo setor repetia as duas instâncias. Depois da mudança passou, inclusive verificando que o filtro não contorna o orçamento de visitas. A prova de iluminação também falhou antes do modo local e passou após a implementação, exercitando local → completo → local e descarte sem alterar o fundo/fog do hospedeiro.

Os logs estão em `output/cenarios-reforma/lote8-raylib/publicacao-{arquipelago,motor,studio-instalacao,porta-bff}*.log`, fora do Git. São testes locais de dados, geometria e ciclo de recursos; não comprovam animação, câmera, conforto de movimento, qualidade artística ou desempenho em aparelhos físicos.

## Próxima parte do mesmo lote

Ativar o consumidor com o controlador/Rapier reais, resolver a cobertura do terreno convertido sem duplicar as sete ilhas, registrar água e papéis físicos, conectar Íris/placas aos componentes existentes e guardar posição por versão de ensaio. Preparar GPU com a cena de destino antes da troca. Produzir provas no `/macro` de travessia, nado, câmera, pausa, toque, retomada, reentrada e publicação 1→2.

As observações de cobertura, animação, matriz já assentada, troncos/fundações e grupos corpo/câmera estão detalhadas na [seção 4 do plano](../../superpowers/plans/2026-11-19-cenarios-lote8-publicacao.md). Não há fechamento de 8.5, aceite artístico ou implantação nesta etapa. 8.6, lotes 9–10, composição final, full review/CI e validação real em staging permanecem posteriores.
