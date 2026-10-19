import { test, expect, type Page } from "@playwright/test";
const enabled =
  process.env.E2E_DATABASE_TESTS === "true" &&
  !!process.env.DEMO_ADMIN_PASSWORD &&
  !!process.env.DEMO_ATTENDANT_PASSWORD;
async function login(page: Page, role: "admin" | "attendant") {
  await page.goto("/entrar");
  await page
    .getByLabel("E-mail da equipe")
    .fill(
      process.env[
        role === "admin" ? "DEMO_ADMIN_EMAIL" : "DEMO_ATTENDANT_EMAIL"
      ]!,
    );
  await page
    .getByLabel("Senha", { exact: true })
    .fill(
      process.env[
        role === "admin" ? "DEMO_ADMIN_PASSWORD" : "DEMO_ATTENDANT_PASSWORD"
      ]!,
    );
  await page.getByRole("button", { name: "Entrar na plataforma" }).click();
  await expect(page).toHaveURL(/\/equipe$/);
}
test.describe("fluxo com persistência Neon — banco exclusivo de testes", () => {
  test.skip(
    !enabled,
    "Requer Neon migrado, seed explícito e E2E_DATABASE_TESTS=true com credenciais da demonstração.",
  );
  test("treinamento → paciente → pendência → resolução → protocolo → portal", async ({
    page,
    browser,
  }) => {
    await login(page, "attendant");
    await page.goto("/equipe/administracao");
    await expect(
      page.getByText("Acesso restrito à administração.", { exact: true }),
    ).toHaveText("Acesso restrito à administração.");
    await page.goto("/equipe/treinamentos");
    await page.getByRole("link", { name: "Acessar módulo" }).first().click();
    await page.getByRole("radio").nth(1).check();
    await page.getByRole("radio").nth(5).check();
    await page.getByRole("radio").nth(6).check();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Enviar avaliação" }).click();
    await expect(page.getByRole("status")).toContainText("Aprovada");
    await page.goto("/equipe/pacientes/novo");
    const name = `Paciente fictícia E2E ${Date.now()}`;
    await page.getByLabel("Nome completo", { exact: true }).fill(name);
    await page.getByLabel("Data de nascimento").fill("2000-05-15");
    await page.getByRole("button", { name: "Salvar paciente" }).click();
    await expect(page).toHaveURL(/\/equipe\/pacientes\/[^/]+$/);
    const patientUrl = page.url();
    await page.getByRole("link", { name: "Novo atendimento" }).click();
    await page.getByRole("checkbox").first().check();
    await page.getByRole("button", { name: "Iniciar conferência" }).click();
    await expect(page).toHaveURL(/\/equipe\/atendimentos\/[^/]+$/);
    const attendanceUrl = page.url();
    await page
      .getByLabel("A identificação do paciente foi conferida?")
      .selectOption("Não");
    await page
      .getByLabel("O paciente recebeu as orientações disponíveis?")
      .selectOption("Sim");
    await page
      .getByLabel("Há dúvida que precisa ser encaminhada?")
      .selectOption("Não");
    await page.getByRole("button", { name: "Salvar rascunho" }).click();
    await expect(
      page.getByText("Com pendência", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Concluir conferência" }).click();
    await expect(page.getByRole("status")).toContainText(
      "Resolva as pendências",
    );
    await page.getByRole("button", { name: "Sair", exact: true }).click();
    await login(page, "admin");
    await page.goto(attendanceUrl);
    await page
      .getByLabel("Justificativa obrigatória")
      .fill(
        "Conferência demonstrativa refeita com identificação validada pela equipe.",
      );
    await page
      .getByRole("button", { name: "Resolver pendência", exact: true })
      .click();
    await expect(page.getByText(/Resolvida em/)).toBeVisible();
    await page.getByRole("button", { name: "Concluir conferência" }).click();
    await expect(
      page.getByText("Conferência concluída", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Gerar novo acesso" }).click();
    await expect(
      page.getByText("Novo acesso gerado. O anterior foi revogado.", {
        exact: true,
      }),
    ).toBeVisible();
    const link = (
      await page
        .locator("p")
        .filter({ hasText: /^http.*\/portal\/acesso#/ })
        .innerText()
    ).trim();
    await page
      .getByRole("button", { name: "Preparar protocolo com QR Code" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Protocolo de atendimento" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Incluir acesso gerado nesta aba" })
      .click();
    await expect(
      page.getByRole("img", {
        name: "QR Code do acesso individual às orientações",
      }),
    ).toBeVisible();
    const patientContext = await browser.newContext();
    const portal = await patientContext.newPage();
    await portal.goto(link);
    await portal
      .getByRole("button", { name: "Acessar minhas orientações" })
      .click();
    await expect(portal).toHaveURL(/\/portal\/meu-atendimento$/);
    await expect(
      portal.getByRole("heading", { name: /Olá, Paciente/ }),
    ).toBeVisible();
    await expect(portal.getByText("Justificativa obrigatória")).toHaveCount(0);
    await expect(
      portal.getByText(/Conferência demonstrativa refeita/),
    ).toHaveCount(0);
    await page.goto(attendanceUrl);
    await page.getByRole("button", { name: "Revogar acesso" }).click();
    await expect(page.getByRole("status")).toContainText("revogado");
    await portal.reload();
    await expect(
      portal.getByRole("heading", { name: "Acesso indisponível" }),
    ).toBeVisible();
    await patientContext.close();
    await page.getByRole("button", { name: "Sair", exact: true }).click();
    await login(page, "attendant");
    await page.goto(patientUrl);
    await page.reload();
    await expect(page.getByRole("heading", { name })).toBeVisible();
  });
});
