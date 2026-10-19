# Verificação da implementação

A validação separa regras locais, navegação e persistência real.

## Resultado nesta instância

- `npm ci`: instalação reproduzida com o lockfile e geração automática do cliente Prisma.
- `npm run lint`: passou.
- `npm run typecheck`: passou, incluindo geração dos tipos de rotas.
- `npm test`: **56 testes aprovados**, em quatro arquivos (regras, serviços e consultas com Prisma mockado).
- `npm run build`: passou com as rotas do projeto.
- Playwright com Chromium: **8 casos públicos aprovados**, em desktop e mobile; **2 casos autenticados ignorados** por falta de Neon e credenciais.
- Schema Prisma validado e SQL inicial gerado por `prisma migrate diff --from-empty`; as URLs locais temporárias usadas na validação eram somente argumentos de análise de schema, sem conexão ou persistência simulada.
- Guardas do seed: execução sem opt-in e execução em produção foram recusadas antes de qualquer consulta.
- `npm run db:check`: bloqueado por ausência de `DATABASE_URL` e `DIRECT_URL`.

As migrations e o seed não foram aplicados em banco. Login real, impressão com dados de atendimento, sessão individual do paciente, idempotência do seed em Neon e recuperação após reinício permanecem pendentes de validação integrada.

## Regras e serviços (Vitest)

Testa busca privada por CPF, mascaramento e paginação, CPF e nascimento, obrigatoriedade, regras estruturadas de pendência, bloqueio de conclusão, resolução administrativa justificada, preservação da resposta original, revisão concorrente, isolamento por laboratório, contas desativadas, versões históricas, correção no servidor e tokens expirados/revogados. Os serviços usam Prisma mockado: esses resultados não substituem testes de banco.

O portal possui testes da projeção mínima e da seleção exclusiva pelo hash da sessão, sem aceitar atendimento escolhido pelo navegador.

## Navegação (Playwright)

Casos públicos em Chromium desktop e mobile: início e catálogo, redirecionamento de acesso restrito, portal sem credencial, headers de privacidade e remoção do segredo da URL. Também verifica ausência de rolagem horizontal nas telas visitadas.

O caso autenticado cobre treinamento, paciente, atendimento, bloqueio por pendência, resolução administrativa, conclusão, protocolo, acesso do paciente, revogação e recuperação de cadastro após nova sessão. Requer banco Neon exclusivo e configuração explícita; sem ela, é ignorado.

## Verificações dependentes do Neon

Ainda precisam ser executadas com as variáveis reais:

- `npm run db:check` e `npm run db:migrate`.
- Seed em banco novo e repetição para demonstrar idempotência, sem alterar conteúdos editados.
- Fluxo Playwright autenticado nas duas resoluções.
- Reinício da aplicação seguido de leitura dos registros, para confirmar persistência independente do processo.
- Isolamento com duas bases de dados operacionais/laboratórios reais de teste, além dos testes unitários existentes.

Nenhuma dessas verificações pode ser inferida de um build bem-sucedido. Não foi utilizado SQLite nem um PostgreSQL local como substituto do Neon.
