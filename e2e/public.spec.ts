import { test, expect } from "@playwright/test";
test("página inicial, catálogo e navegação acessível", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Mais informação/ }),
  ).toBeVisible();
  await page.screenshot({
    path: `/tmp/biologic-home-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("link", { name: /Sou paciente/ }).click();
  await expect(
    page.getByRole("heading", { name: "Informação para cuidar de você." }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Buscar exame" })
    .fill("Exame inexistente para teste");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.getByRole("main")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("equipe exige sessão e login valida e-mail", async ({ page }) => {
  await page.goto("/equipe/administracao");
  await expect(page).toHaveURL(/\/entrar/);
  await expect(
    page.getByRole("heading", { name: "Acesse sua conta" }),
  ).toBeVisible();
  await expect(page.getByLabel("E-mail da equipe")).toBeVisible();
  await expect(page.getByLabel("Senha", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("portal sem credencial não expõe dados e não permite indexação", async ({
  page,
}) => {
  const response = await page.goto("/portal/meu-atendimento");
  await expect(
    page.getByRole("heading", { name: "Acesso indisponível" }),
  ).toBeVisible();
  expect(response?.headers()["x-robots-tag"]).toContain("noindex");
  expect(response?.headers()["cache-control"]).toContain("no-store");
  await expect(page.getByText("CPF", { exact: true })).toHaveCount(0);
});
test("página de acesso remove segredo da URL ao enviar", async ({ page }) => {
  await page.goto("/portal/acesso#token-invalido");
  await page
    .getByRole("button", { name: "Acessar minhas orientações" })
    .click();
  await expect(page).toHaveURL(/\/portal\/acesso$/);
  await expect(page.locator("p[role=alert]")).toBeVisible();
});
