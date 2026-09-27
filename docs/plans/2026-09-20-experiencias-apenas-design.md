# Cenas interativas: somente experimentação

## Decisão

O bloco interativo oferece somente `experimentation` e `html`. Uma cena pronta é sempre uma experiência conduzida pela criança. A explicação de processos no tempo pertence ao vídeo da aula; perguntas isoladas pertencem ao quiz. O palpite e a pergunta final anexados a uma experiência continuam existindo.

Os 27 manifestos do redesenho didático contêm 55 atividades `experimentation` e nenhuma `demonstration`. O conteúdo antigo do staging será descartado e recadastrado pela dona do produto. Não criar ponte de compatibilidade com atividades antigas.

## Contratos

- Remover `demonstration` e `question` dos tipos de atividade, validadores, DTOs, autoria, avaliação, serviço de sessões e player.
- Remover o roteiro de demonstração dos 56 modelos de cena, o editor de passos e o modo “Agora é sua vez”. Não remover ações, motor, relógio, metas, previsão, pistas, pergunta final anexa ou quiz.
- O `script` do catálogo hoje é usado indiretamente para reservar espaço dos indicadores e frases da experiência. Substituir esse uso por amostras de apresentação independentes do roteiro pedagógico antes de remover o campo.
- Revisar o modelo de seção “Demonstrar uma ideia”: vídeo já tem a seção “Assistir”. A autoria não deve criar uma atividade que o contrato deixou de aceitar.
- A alteração é local na branch `staging`; sem push nem deploy nesta tarefa.

## Aceite

1. O Admin só oferece “Experiência” e “HTML personalizado” para um bloco interativo.
2. Os 55 blocos interativos dos 27 manifestos do redesenho seguem válidos.
3. Uma experiência mantém palpite, pistas, pergunta final opcional e conclusão por metas.
4. Não há executor, validador, DTO ou UI para demonstração ou pergunta curta.
5. A moldura da experiência reserva espaço sem ler roteiro de demonstração.
6. Typechecks, testes relevantes e check dos arquivos alterados passam; as alterações deste lote, incluindo a remoção anterior do card de materiais, ficam commitadas em `staging` local.
