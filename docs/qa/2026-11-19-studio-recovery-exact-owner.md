# Dono exato das recuperações — laboratório

Base `6b704ab5e`, branch `estudio-deep-storage-boundary-20261118`. Uma chave cujo escritor contém dois-pontos pode coincidir com o prefixo de outro ID. O teste vermelho reproduziu replay fora do projeto pedido e fallback devolvendo outro documento.

O replay confere o projectId solicitado após validar o journal. O fallback exige a mesma igualdade. O intake v3→v4 faz a conferência antes de preparar/arquivar/migrar a base. O teste comprova que uma abertura com prefixo sobreposto não promove a base v4, não devolve o documento vizinho e não consome sua fonte. A leitura global conserva seu comportamento.

Verificação local: 34 testes / 158 asserções focados; suíte ampliada 518 testes / 2.750 asserções / 76 arquivos, 59,05 s; typecheck incremental completo e lint aprovados. O driver nativo e os cursos não tiveram seus formatos modificados. O padrão continua v3, e o laboratório continua separado da PR da missão. Logs ignorados `.cache/mission/recovery-owner-prefix-lab-*`.

Bundle: 366274 bytes brutos / 119533 gzip; 1 teste / 35 asserções, tetos originais.
