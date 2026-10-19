# BioLogic

Informação, cuidado e qualidade laboratorial.

MVP acadêmico para a disciplina **Experiência Aplicada**: capacitação da equipe, registro guiado da fase pré-analítica e orientações individuais ao paciente. Os dados e conteúdos do seed são **demonstrativos e pendentes de revisão profissional**. Não oferece resultados, laudos, autorização clínica, faturamento ou agendamento.

## Stack

Next.js 16 (App Router), React 19, TypeScript, PostgreSQL **Neon**, Prisma 6.19.3 com `@prisma/adapter-neon` e engine JavaScript, Auth.js/NextAuth **4.24.15 estável**, Tailwind 4, componentes shadcn/ui adaptados com Radix, Lucide, React Hook Form, Zod, date-fns/date-fns-tz, Vitest e Playwright. Versões exatas no `package.json` e no lockfile. Node **24 LTS** recomendado (mínimo 22.18).

É um único projeto Next.js. Prisma, senhas, tokens e acesso ao banco ficam no servidor. Sem Docker obrigatório, SQLite ou banco simulado.

## Início rápido

```sh
npm ci
npm run env:init
# Edite .env no servidor, seguindo .env.example; nunca versione o arquivo.
npm run db:check
npm run db:migrate
# Escolha UMA das formas de primeiro acesso descritas abaixo.
npm run dev
```

`env:init` cria `.env` com segredo de sessão aleatório e conexões vazias; não sobrescreve arquivo existente nem exibe o segredo. Também é possível injetar as variáveis pelo provedor de hospedagem. A aplicação pública e seus estados de indisponibilidade podem ser executados sem Neon; cadastros, login e métricas exigem conexão real. Não há persistência alternativa.

### Conexão Neon

Crie um projeto/banco Neon exclusivo para esta demonstração. No painel Neon obtenha:

- `DATABASE_URL`: string PostgreSQL **com pooling**, hostname com `-pooler` e `sslmode=require`. Usada pelo cliente via adaptador Neon (WebSocket).
- `DIRECT_URL`: conexão **direta**, sem `-pooler`, com TLS. O `directUrl` do schema Prisma 6 é utilizado pelas migrations.
- `NEXTAUTH_SECRET`: segredo aleatório de pelo menos 32 bytes. Pode ser gerado por `env:init` ou `openssl rand -base64 32` em terminal privado.
- `NEXTAUTH_URL`: origem da aplicação; em hospedagem use HTTPS.

Use valores reais em variáveis do processo servidor, não placeholders de credenciais de proxy. Não envie URLs com senha em chat, issue ou commit. Nunca use prefixo `NEXT_PUBLIC_` para esses valores. Para ferramentas Prisma CLI, mantenha as variáveis no processo ou em `.env`; `.env.local` isoladamente não é carregado pela CLI Prisma 6.

A rede deve alcançar os endpoints específicos do Neon, `binaries.prisma.sh` (CLI Prisma), os registros npm e, para instalar navegadores, os destinos Playwright. Não remova TLS/checksums em caso de falha. `db:check` executa apenas `SELECT 1`, sem imprimir URLs.

`npm run db:migrate` aplica as migrations versionadas, sem reset ou seed automático. Em banco existente, **revise a migration e a estratégia de baseline antes de executar**. Não execute `migrate reset`, `db push --accept-data-loss` ou o seed demonstrativo em banco existente.

### Primeiro acesso com demonstração

Somente em **banco novo e exclusivo**, defina em `.env`:

```dotenv
ALLOW_DEMO_SEED="true"
DEMO_ADMIN_EMAIL="admin@biologic.example"
DEMO_ADMIN_PASSWORD="" # escolha senha exclusiva com pelo menos 12 caracteres
DEMO_ATTENDANT_EMAIL="atendente@biologic.example"
DEMO_ATTENDANT_PASSWORD="" # escolha outra senha exclusiva
```

```sh
npm run db:seed
```

O seed insere um laboratório, duas contas, três pacientes explicitamente fictícios sem CPF, oito exames, quatro módulos com três perguntas cada e atendimentos nos três estados. As senhas vêm exclusivamente das variáveis; nenhum segredo é exibido.

O seed é **transacional e idempotente**: uma segunda execução encontra o marcador `biologic-demo-v1` e não altera dados, inclusive senhas e conteúdos já editados. Sem esse marcador, qualquer laboratório/usuário/paciente/atendimento existente impede sua execução. É bloqueado com `NODE_ENV=production` e exige autorização explícita `ALLOW_DEMO_SEED=true`. Depois do seed, desative essa variável. O script não é chamado no build ou startup.

### Primeiro acesso sem dados demonstrativos

Como alternativa ao seed, em banco vazio configure `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`, `BOOTSTRAP_ADMIN_NAME` e `LABORATORY_NAME`, e execute:

```sh
npm run db:bootstrap
```

Cria somente laboratório, administrador e evento de auditoria. Não troca senha de conta existente nem insere demonstração. Em banco já inicializado, novas contas são criadas pela administração. Remova as variáveis de bootstrap depois de usar. Senhas exigem ao menos 12 caracteres e no máximo 72 bytes UTF-8 para bcrypt.

### Configuração opcional

- `PATIENT_ACCESS_DAYS`: validade dos links, de 1 a 30 dias; padrão 7.
- `PUBLIC_CONTACT_EMAIL` / `PUBLIC_CONTACT_PHONE`: canais reais, opcionais. Sem configuração, a página informa sua indisponibilidade.
- O laboratório público do MVP é o de slug `biologic-academico`; o laboratório das operações internas é sempre o da sessão, nunca o enviado pelo formulário.

## Fluxos implementados

- **Público:** apresentação, FAQ, contato configurável, busca/categorias e orientações dos exames ativos.
- **Equipe:** autenticação por e-mail/senha, pacientes com validação de CPF, busca paginada por Server Action sem CPF na URL, alerta de possível duplicidade, atendimentos filtrados por paciente/data/status.
- **Conferência:** exames ativos, checklist configurável, rascunho incompleto, pendências por resposta estruturada, resolução administrativa justificada, conclusão e reabertura transacionais, controle de revisão concorrente e auditoria.
- **Histórico:** versões imutáveis de exames e treinamentos. Atendimento armazena cópia de orientações, perguntas, opções e regras; edições posteriores não o modificam.
- **Protocolo:** layout de impressão e PDF pelo navegador, identificador público separado do segredo, link/QR local opcional e horário de Brasília.
- **Paciente:** token aleatório de 256 bits, hash SHA-256 no banco, expiração/revogação, troca por cookie HttpOnly limitado ao portal, identificação mínima e orientações históricas. Funciona também com pendências abertas.
- **Capacitação:** quatro módulos iniciais, leitura confirmada, correção no servidor, novas tentativas e histórico por versão. 2/3 não atinge 70%: com três perguntas, a aprovação requer 3/3.
- **Administração:** equipe, ativação/desativação, exames, regras dos checklists, conteúdos e publicação dos treinamentos, progresso e auditoria. Cada edição de usuário invalida suas sessões anteriores.

Os textos administrativos são exibidos como texto com parágrafos, sem execução de HTML. Não há gabarito nos dados enviados ao formulário de avaliação antes da submissão. A interface administrativa contém o gabarito apenas para usuários autorizados a editar conteúdos.

### Acesso do paciente e impressão

No detalhe do atendimento, **Gerar novo acesso** revoga os acessos anteriores, inclusive sessões já abertas. Copie o link ou use **Preparar protocolo com QR Code** e depois **Incluir acesso gerado nesta aba**. O token original não pode ser recuperado do banco; se for perdido, gere outro e avise que o anterior foi revogado.

O segredo está no fragmento do link (`#...`), que não é enviado em requisições de página. Ao confirmar o acesso, ele é removido da barra e enviado por Server Action para criar a sessão restrita. O QR é gerado localmente, sem serviço externo. Para transferir o segredo à impressão, somente essa aba usa `sessionStorage` temporário; ele é removido quando incluído no protocolo. Esse armazenamento não persiste cadastros nem autentica a equipe. Não compartilhe a captura/arquivo do protocolo com terceiros.

## Testes e execução de produção

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

```sh
npx playwright install chromium
npm run test:e2e
# Em ambientes que já fornecem Chromium:
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e
```

O Playwright inicia o build de produção (`npm run build` deve ter sido executado antes). Executa desktop e mobile. Os testes públicos não exigem Neon.

O fluxo autenticado completo é **opt-in** e escreve pacientes fictícios no banco. Use somente um Neon **exclusivo de testes**, migrado e com seed, e injete as credenciais da demonstração também no processo de testes. Ative `E2E_DATABASE_TESTS=true`. Sem essas condições, os dois casos autenticados são explicitamente **ignorados**, não considerados aprovados. O Playwright não carrega `.env` automaticamente: exporte as variáveis em shell privado ou injete-as pelo executor, sem imprimi-las. Não há reset, seed ou exclusão automáticos.

Os testes unitários usam mocks de Prisma para verificar regras e autorização. **Não comprovam conectividade, migrations aplicadas ou persistência no Neon.** Veja [verificação](docs/VERIFICACAO.md) e [roteiro de demonstração](docs/DEMONSTRACAO.md).

## Organização

```text
src/app/           páginas, Server Actions e Route Handler do Auth.js
src/server/        autenticação, autorização, transações, Prisma e portal
src/lib/domain.ts  validações e regras puras
src/components/    interface e formulários
prisma/            schema, migrations, seed e conteúdo demonstrativo
scripts/           inicialização local, bootstrap e diagnóstico seguro
```

As operações críticas usam transações serializáveis, nova verificação da conta no banco e chaves de idempotência. Atendimentos concluídos ficam somente para leitura. Não existe exclusão física de pacientes. Os limites de tentativas são persistidos em PostgreSQL; para uma implantação pública, configure corretamente os cabeçalhos de IP no proxy confiável. Registros expirados da tabela `RateLimit` podem ser removidos por rotina de manutenção restrita. O sistema não declara certificação clínica ou conformidade legal.

## Fontes de integração

Documentação oficial consultada durante a implementação (acessada também pelo código-fonte oficial no GitHub):

- [Next.js: instalação e App Router](https://nextjs.org/docs/app/getting-started/installation)
- [Auth.js/NextAuth v4: Credentials e sessões JWT](https://next-auth.js.org/providers/credentials)
- [Prisma v6: Neon e pooling](https://www.prisma.io/docs/orm/v6/overview/databases/neon)
- [shadcn/ui: instalação manual](https://ui.shadcn.com/docs/installation/manual)

Não foi realizado deploy externo. A conexão com banco e os fluxos autenticados só podem ser considerados validados após configuração e execução contra o Neon real.
