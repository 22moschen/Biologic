"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { perform } from "@/app/actions";
import { patientSchema, type ExamContent, type Question } from "@/lib/domain";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
function Message({ value }: { value: string }) {
  return value ? (
    <p role="status" className="notice mb-5">
      {value}
    </p>
  ) : null;
}
export function PatientForm({
  initial,
  id,
}: {
  id?: string;
  initial?: z.input<typeof patientSchema>;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<
    z.input<typeof patientSchema>,
    unknown,
    z.output<typeof patientSchema>
  >({
    resolver: zodResolver(patientSchema),
    defaultValues: initial ?? {
      name: "",
      birthDate: "",
      cpf: "",
      phone: "",
      email: "",
    },
  });
  return (
    <form
      onSubmit={handleSubmit(async (data) => {
        const r = await perform("patient", { id, data });
        if (r.ok) router.push(`/equipe/pacientes/${r.data}`);
        else setMessage(r.error);
      })}
    >
      <Message value={message} />
      <div className="grid-form">
        {[
          { k: "name", label: "Nome completo", type: "text" },
          { k: "birthDate", label: "Data de nascimento", type: "date" },
          { k: "cpf", label: "CPF (opcional)", type: "text" },
          { k: "phone", label: "Telefone (opcional)", type: "tel" },
          { k: "email", label: "E-mail (opcional)", type: "email" },
        ].map((f) => (
          <div className="field" key={f.k}>
            <label htmlFor={f.k}>{f.label}</label>
            <Input
              id={f.k}
              type={f.type}
              {...register(f.k as keyof z.input<typeof patientSchema>)}
            />
            {errors[f.k as keyof typeof errors] && (
              <p className="text-xs text-red-700">
                {errors[f.k as keyof typeof errors]?.message}
              </p>
            )}
          </div>
        ))}
      </div>
      <Button disabled={isSubmitting}>
        {isSubmitting ? "Salvando…" : "Salvar paciente"}
      </Button>
    </form>
  );
}
export function AttendanceForm({
  patients,
  exams,
  patientId,
}: {
  patients: { id: string; name: string }[];
  exams: { id: string; name: string }[];
  patientId?: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const [key] = useState(() => crypto.randomUUID());
  return (
    <form
      action={(form) =>
        start(async () => {
          const r = await perform("attendance", {
            patientId: form.get("patientId"),
            examIds: form.getAll("examIds"),
            requestKey: key,
          });
          if (r.ok) router.push(`/equipe/atendimentos/${r.data}`);
          else setMessage(r.error);
        })
      }
    >
      <Message value={message} />
      <div className="field">
        <label htmlFor="patientId">Paciente</label>
        <select
          id="patientId"
          name="patientId"
          defaultValue={patientId ?? ""}
          required
        >
          <option value="" disabled>
            Selecione um paciente
          </option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <fieldset className="mb-6">
        <legend className="mb-3 font-semibold">Exames ativos</legend>
        <div className="grid gap-3 md:grid-cols-2">
          {exams.map((e) => (
            <label
              key={e.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-white p-4"
            >
              <input type="checkbox" name="examIds" value={e.id} />
              {e.name}
            </label>
          ))}
        </div>
        {!exams.length && (
          <p className="notice">
            Cadastre exames ativos antes de criar um atendimento.
          </p>
        )}
      </fieldset>
      <Button disabled={pending || !exams.length || !patients.length}>
        {pending ? "Criando…" : "Iniciar conferência"}
      </Button>
    </form>
  );
}
export function ChecklistForm({
  id,
  revision,
  groups,
  answers,
  readonly,
}: {
  id: string;
  revision: number;
  groups: { id: string; content: ExamContent }[];
  answers: Record<string, string>;
  readonly: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const submitter = (e.nativeEvent as SubmitEvent)
          .submitter as HTMLButtonElement;
        start(async () => {
          const values: Record<string, string> = {};
          groups.forEach((g) =>
            g.content.questions.forEach((q) => {
              const k = `${g.id}:${q.id}`;
              values[k] = String(form.get(k) ?? "");
            }),
          );
          const r = await perform("checklist", {
            id,
            revision,
            answers: values,
            complete: submitter?.value === "complete",
          });
          setMessage(r.ok ? "Conferência salva." : r.error);
          if (r.ok) router.refresh();
        });
      }}
    >
      <Message value={message} />
      {groups.map((g) => (
        <section
          key={g.id}
          className="mb-6 rounded-2xl border border-border bg-white p-6"
        >
          <h2 className="text-xl">{g.content.name}</h2>
          <p className="mt-3 text-xs muted">
            {g.content.state === "DEMONSTRATIVO"
              ? "Conteúdo demonstrativo · pendente de revisão"
              : "Conteúdo revisado"}
          </p>
          <details className="my-5 rounded-xl bg-muted p-4">
            <summary className="text-sm font-semibold">
              Consultar orientações deste atendimento
            </summary>
            <div className="mt-3 text-sm whitespace-pre-wrap">
              {g.content.preparation}
              <br />
              {g.content.collection}
              <br />
              {g.content.storage}
            </div>
          </details>
          {g.content.questions.map((q) => {
            const key = `${g.id}:${q.id}`;
            return (
              <div className="field" key={key}>
                <label htmlFor={key}>
                  {q.text}
                  {q.required ? " *" : " (opcional)"}
                </label>
                {q.help && <p className="mb-2 text-xs muted">{q.help}</p>}
                {q.type === "TEXT" ? (
                  <textarea
                    id={key}
                    name={key}
                    defaultValue={answers[key] ?? ""}
                    disabled={readonly}
                    maxLength={2000}
                  />
                ) : (
                  <select
                    id={key}
                    name={key}
                    defaultValue={answers[key] ?? ""}
                    disabled={readonly}
                  >
                    <option value="">Selecione uma resposta</option>
                    {(q.type === "YES_NO" ? ["Sim", "Não"] : q.options).map(
                      (v) => (
                        <option key={v}>{v}</option>
                      ),
                    )}
                  </select>
                )}
              </div>
            );
          })}
        </section>
      ))}
      {!readonly && (
        <div className="flex flex-wrap gap-3">
          <Button
            type="submit"
            value="draft"
            variant="outline"
            disabled={pending}
          >
            Salvar rascunho
          </Button>
          <Button type="submit" value="complete" disabled={pending}>
            {pending ? "Salvando…" : "Concluir conferência"}
          </Button>
        </div>
      )}
      <p className="mt-4 text-xs muted">
        A conclusão é referente ao registro no sistema e não representa
        autorização clínica automática.
      </p>
    </form>
  );
}
export function JustificationForm({
  operation,
  payload,
  label,
}: {
  operation: "resolve" | "reopen";
  payload: Record<string, string>;
  label: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      action={(f) =>
        start(async () => {
          const r = await perform(operation, {
            ...payload,
            justification: f.get("justification"),
          });
          setMessage(r.ok ? "Operação registrada." : r.error);
          if (r.ok) router.refresh();
        })
      }
      className="mt-4"
    >
      <Message value={message} />
      <label>
        Justificativa obrigatória
        <textarea
          name="justification"
          required
          minLength={5}
          maxLength={2000}
        />
      </label>
      <Button disabled={pending} variant="outline">
        {label}
      </Button>
    </form>
  );
}
export function AccessControls({
  id,
  publicId,
}: {
  id: string;
  publicId: string;
}) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  return (
    <section className="no-print mt-6 rounded-2xl border border-border bg-white p-6">
      <h2 className="text-lg">Acesso individual do paciente</h2>
      <p className="mt-3 text-sm muted">
        Gerar um novo acesso revoga o link e a sessão anteriores. O segredo é
        exibido apenas agora. Ao perdê-lo, gere outro.
      </p>
      <Message value={message} />
      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await perform("access", id);
              if (r.ok) {
                setToken(String(r.data));
                setMessage("Novo acesso gerado. O anterior foi revogado.");
              } else setMessage(r.error);
            })
          }
        >
          Gerar novo acesso
        </Button>
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await perform("revoke", id);
              setMessage(r.ok ? "Acesso revogado." : r.error);
              if (r.ok) setToken("");
            })
          }
        >
          Revogar acesso
        </Button>
      </div>
      {token && (
        <div className="mt-5 space-y-3">
          <p className="break-all rounded-lg bg-muted p-3 text-xs">{`${window.location.origin}/portal/acesso#${token}`}</p>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  `${window.location.origin}/portal/acesso#${token}`,
                );
                setMessage("Link copiado.");
              } catch {
                setMessage("Copie o link exibido acima.");
              }
            }}
          >
            Copiar link
          </Button>
          <Button
            className="ml-2"
            variant="outline"
            onClick={() => {
              sessionStorage.setItem(`protocol:${publicId}`, token);
              router.push(`/equipe/atendimentos/${id}/protocolo`);
            }}
          >
            Preparar protocolo com QR Code
          </Button>
          <p className="text-xs muted">
            O token temporário é guardado apenas nesta aba para impressão; não é
            usado como banco de dados.
          </p>
        </div>
      )}
    </section>
  );
}
export function UserForm({
  user,
}: {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    active: boolean;
  };
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      action={(f) =>
        start(async () => {
          const r = await perform("user", {
            id: user?.id,
            name: f.get("name"),
            email: f.get("email"),
            role: f.get("role"),
            password: f.get("password"),
            active: f.get("active") === "on",
          });
          setMessage(
            r.ok ? "Conta salva. Sessões anteriores invalidadas." : r.error,
          );
          if (r.ok) router.refresh();
        })
      }
    >
      <Message value={message} />
      <div className="grid-form">
        <div className="field">
          <label>
            Nome
            <Input
              name="name"
              defaultValue={user?.name}
              required
              minLength={3}
            />
          </label>
        </div>
        <div className="field">
          <label>
            E-mail
            <Input
              name="email"
              type="email"
              defaultValue={user?.email}
              required
            />
          </label>
        </div>
        <div className="field">
          <label>
            Papel
            <select name="role" defaultValue={user?.role ?? "ATENDENTE"}>
              <option>ATENDENTE</option>
              <option>ADMINISTRADOR</option>
            </select>
          </label>
        </div>
        <div className="field">
          <label>
            {user ? "Nova senha (opcional)" : "Senha (mínimo 12 caracteres)"}
            <Input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={72}
              required={!user}
            />
          </label>
        </div>
      </div>
      <label className="mb-4 flex items-center gap-2">
        <input
          type="checkbox"
          name="active"
          defaultChecked={user?.active ?? true}
        />
        Conta ativa
      </label>
      <Button disabled={pending}>Salvar conta</Button>
    </form>
  );
}
export function ExamEditor({
  initial,
}: {
  initial?: {
    id: string;
    code: string;
    category: string;
    active: boolean;
    content: ExamContent;
  };
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const [questions, setQuestions] = useState<Question[]>(
    initial?.content.questions ?? [],
  );
  const setQ = (i: number, patch: Partial<Question>) =>
    setQuestions((q) => q.map((v, n) => (n === i ? { ...v, ...patch } : v)));
  return (
    <form
      action={(f) =>
        start(async () => {
          const content = {
            name: f.get("name"),
            description: f.get("description"),
            preparation: f.get("preparation"),
            collection: f.get("collection"),
            storage: f.get("storage"),
            material: f.get("material"),
            notes: f.get("notes"),
            color: f.get("color"),
            state: f.get("state"),
            reviewer: f.get("reviewer"),
            reviewedAt: f.get("reviewedAt"),
            questions,
          };
          const r = await perform("exam", {
            id: initial?.id,
            code: f.get("code"),
            category: f.get("category"),
            active: f.get("active") === "on",
            content,
          });
          setMessage(r.ok ? "Nova versão do exame salva." : r.error);
          if (r.ok) router.push("/equipe/exames");
        })
      }
    >
      <Message value={message} />
      <div className="grid-form">
        {[
          { n: "name", l: "Nome" },
          { n: "code", l: "Código interno" },
          { n: "material", l: "Material / recipiente (texto)" },
          { n: "color", l: "Cor visual opcional (#RRGGBB)" },
        ].map((x) => (
          <label key={x.n} className="field">
            {x.l}
            <Input
              name={x.n}
              defaultValue={
                x.n === "code"
                  ? initial?.code
                  : String(initial?.content[x.n as keyof ExamContent] ?? "")
              }
              required={["name", "code"].includes(x.n)}
            />
          </label>
        ))}
        <label className="field">
          Categoria
          <select name="category" defaultValue={initial?.category ?? "SANGUE"}>
            {["SANGUE", "URINA", "FEZES", "OUTROS"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Estado do conteúdo
          <select
            name="state"
            defaultValue={initial?.content.state ?? "DEMONSTRATIVO"}
          >
            <option>DEMONSTRATIVO</option>
            <option>REVISADO</option>
          </select>
        </label>
        <label className="field">
          Revisor
          <Input name="reviewer" defaultValue={initial?.content.reviewer} />
        </label>
        <label className="field">
          Data de revisão
          <Input
            name="reviewedAt"
            type="date"
            defaultValue={initial?.content.reviewedAt}
          />
        </label>
      </div>
      {[
        { n: "description", l: "Descrição" },
        { n: "preparation", l: "Preparo" },
        { n: "collection", l: "Coleta" },
        { n: "storage", l: "Conservação e entrega" },
        { n: "notes", l: "Observações" },
      ].map((x) => (
        <label className="field" key={x.n}>
          {x.l}
          <textarea
            name={x.n}
            defaultValue={String(
              initial?.content[x.n as keyof ExamContent] ?? "",
            )}
          />
        </label>
      ))}
      <h2 className="my-5 text-xl">Checklist configurável</h2>
      {questions.map((q, i) => (
        <fieldset
          key={q.id}
          className="mb-4 rounded-xl border border-border p-4"
        >
          <legend className="px-2 font-semibold">Pergunta {i + 1}</legend>
          <label className="field">
            Pergunta
            <Input
              value={q.text}
              onChange={(e) => setQ(i, { text: e.target.value })}
              required
            />
          </label>
          <label className="field">
            Ajuda
            <Input
              value={q.help}
              onChange={(e) => setQ(i, { help: e.target.value })}
            />
          </label>
          <label className="field">
            Tipo
            <select
              value={q.type}
              onChange={(e) =>
                setQ(i, {
                  type: e.target.value as Question["type"],
                  pendingValues: [],
                  options: [],
                })
              }
            >
              <option value="YES_NO">Sim / Não</option>
              <option value="SINGLE">Escolha única</option>
              <option value="TEXT">Texto livre</option>
            </select>
          </label>
          {q.type === "SINGLE" && (
            <label className="field">
              Opções (uma por linha)
              <textarea
                value={q.options.join("\n")}
                onChange={(e) =>
                  setQ(i, { options: e.target.value.split("\n") })
                }
              />
            </label>
          )}
          {q.type !== "TEXT" && (
            <label className="field">
              Respostas que geram pendência (uma por linha; devem ser opções
              válidas)
              <textarea
                value={q.pendingValues.join("\n")}
                onChange={(e) =>
                  setQ(i, {
                    pendingValues: e.target.value
                      ? e.target.value.split("\n")
                      : [],
                  })
                }
              />
            </label>
          )}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={q.required}
              onChange={(e) => setQ(i, { required: e.target.checked })}
            />
            Obrigatória
          </label>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setQuestions((v) => v.filter((_, n) => i !== n))}
          >
            Remover pergunta
          </Button>
        </fieldset>
      ))}
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          setQuestions((v) => [
            ...v,
            {
              id: crypto.randomUUID(),
              text: "",
              help: "",
              type: "YES_NO",
              required: true,
              options: [],
              pendingValues: [],
            },
          ])
        }
      >
        Adicionar pergunta
      </Button>
      <label className="my-5 flex items-center gap-2">
        <input
          name="active"
          type="checkbox"
          defaultChecked={initial?.active ?? true}
        />
        Exame ativo
      </label>
      <Button disabled={pending}>Salvar nova versão</Button>
    </form>
  );
}
