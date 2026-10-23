# Contratos puros

Core não importa Studio/React/runtime. Schemas na fronteira, sem Zod default para linguagem; catálogo pertence ao host, nunca ao aluno. Releases congeladas por inteiro e hash canônico conferido; disponibilidade operacional separada. Resolver síncrono recebe catálogo já verificado e grants contextuais, não autentica e não presume executor ausente.

Implementação L1.1 coloca capacidades/artefatos no `release.manifest`, cobertos integralmente pelo SHA; identidade externa e interna é conferida. `releaseStatus` obrigatório distingue retirada de novas criações de revogação; ambos preservam fontes. Não há catálogo Python de produção nem biblioteca futura anunciada nesta etapa. Dependências externas continuam não habilitadas.

Documentos e migração serão ativados nos consumidores de forma coordenada, sem mudar o formato corrente antes que armazenamento e validação consigam preservá-lo. Testes sem mocks dos contratos e codecs; baseline JS, typechecks e review por lote.
