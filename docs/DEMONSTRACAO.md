# Roteiro de demonstração

Pré-requisitos: Neon novo e exclusivo, migrations aplicadas e seed autorizado. Use apenas pacientes fictícios. Conteúdos de saúde são demonstrativos, não protocolos validados.

1. Entre como atendente pela **Área da equipe**, usando as credenciais das variáveis seguras.
2. Abra **Treinamentos**, leia **Atendimento humanizado**, confirme a leitura e envie a avaliação. Observe que 2/3 não aprova; uma nova tentativa é permitida.
3. Cadastre um **Paciente fictício da apresentação**, sem CPF. Atualize a página para demonstrar recuperação do banco.
4. Crie um atendimento, selecione um exame e abra suas orientações e checklist.
5. Responda identificação **Não**, orientações **Sim** e dúvida a encaminhar **Não**. Salve o rascunho e tente concluir: a pendência impede.
6. Saia e entre como administradora. Abra o mesmo atendimento e resolva a pendência com justificativa. A resposta original permanece **Não**.
7. Conclua a conferência e observe o estado somente para leitura. Explique que isso não é autorização clínica automática.
8. Gere um acesso do paciente, prepare o protocolo com QR Code, inclua o acesso da aba e abra o diálogo **Imprimir / Salvar PDF**.
9. Copie o link em janela anônima. Confirme o acesso: a URL fica sem segredo e exibe somente orientações e identificação mínima, sem checklist interno.
10. Revogue o acesso na equipe e atualize a página do paciente: o acesso é rejeitado.
11. Encerre a sessão, reinicie a aplicação e faça login novamente. Consulte o paciente e o atendimento, demonstrando persistência no Neon.
12. Opcional: edite um exame, compare as novas orientações do catálogo com a versão histórica do atendimento e consulte a auditoria.

Sem conexão Neon, apresente somente a interface pública e os estados reais de indisponibilidade. Não apresente o fluxo autenticado como validado.
