"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { perform } from "@/app/actions";
import { trainingSchema, trainingQuestionSchema } from "@/lib/domain";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
export function TrainingQuiz({
  versionId,
  questions,
}: {
  versionId: string;
  questions: { id: string; text: string; options: string[] }[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [feedback, setFeedback] = useState<
    { text: string; correct: boolean; explanation: string }[]
  >([]);
  const [pending, start] = useTransition();
  const [key, setKey] = useState(() => crypto.randomUUID());
  return (
    <form
      className="mt-8"
      action={(f) =>
        start(async () => {
          const r = await perform("attempt", {
            versionId,
            requestKey: key,
            read: f.get("read") === "on",
            answers: questions.map((_, i) =>
              f.get(`q${i}`) === null ? -1 : Number(f.get(`q${i}`)),
            ),
          });
          if (!r.ok) {
            setMessage(r.error);
            return;
          }
          const result = r.data as {
            correct: number;
            total: number;
            passed: boolean;
            feedback: typeof feedback;
          };
          setMessage(
            `${result.correct} de ${result.total} respostas corretas. ${result.passed ? "Aprovada! Leitura e conclusão registradas." : "Ainda não foi desta vez. Leia as explicações e tente novamente."}`,
          );
          setFeedback(result.feedback);
          setKey(crypto.randomUUID());
          router.refresh();
        })
      }
    >
      <h2 className="mb-6">Confira o que você aprendeu</h2>
      {questions.map((q, i) => (
        <fieldset
          key={q.id}
          className="mb-6 rounded-xl border border-border bg-white p-5"
        >
          <legend className="px-2 text-sm font-semibold">
            {i + 1}. {q.text}
          </legend>
          {q.options.map((v, n) => (
            <label
              key={n}
              className="flex items-center gap-3 rounded-lg px-2 py-3 text-sm font-normal"
            >
              <input type="radio" name={`q${i}`} value={n} required />
              {v}
            </label>
          ))}
        </fieldset>
      ))}
      <label className="mb-6 flex items-start gap-3">
        <input type="checkbox" name="read" required />
        Confirmo que li o conteúdo do módulo.
      </label>
      {message && (
        <p role="status" className="notice mb-5">
          {message}
        </p>
      )}
      {feedback.length > 0 && (
        <div className="mb-5 space-y-3">
          {feedback.map((v, i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-white p-4 text-sm"
            >
              <strong>
                {v.correct ? "Correto" : "Revise"} · {v.text}
              </strong>
              <p className="mt-2 muted">{v.explanation}</p>
            </div>
          ))}
        </div>
      )}
      <Button disabled={pending}>
        {pending
          ? "Corrigindo…"
          : feedback.length
            ? "Enviar nova tentativa"
            : "Enviar avaliação"}
      </Button>
      <p className="mt-3 text-xs muted">
        Aprovação: pelo menos 70% de acertos. Com três perguntas, é necessário
        acertar as três.
      </p>
    </form>
  );
}
export function TrainingEditor({
  initial,
}: {
  initial?: {
    id: string;
    published: boolean;
    data: z.infer<typeof trainingSchema>;
  };
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const [questions, setQuestions] = useState<
    z.infer<typeof trainingQuestionSchema>[]
  >(
    initial?.data.questions ??
      [1, 2, 3].map((i) => ({
        id: `q${i}`,
        text: "",
        options: ["", "", ""],
        correctIndex: 0,
        explanation: "",
      })),
  );
  const setQ = (
    i: number,
    patch: Partial<z.infer<typeof trainingQuestionSchema>>,
  ) => setQuestions((v) => v.map((q, n) => (i === n ? { ...q, ...patch } : q)));
  return (
    <form
      action={(f) =>
        start(async () => {
          const r = await perform("training", {
            id: initial?.id,
            published: f.get("published") === "on",
            data: {
              title: f.get("title"),
              summary: f.get("summary"),
              content: f.get("content"),
              questions,
            },
          });
          setMessage(r.ok ? "Versão salva." : r.error);
          if (r.ok) router.push("/equipe/treinamentos");
        })
      }
    >
      {message && (
        <p role="status" className="notice mb-5">
          {message}
        </p>
      )}
      <label className="field">
        Título
        <Input name="title" defaultValue={initial?.data.title} required />
      </label>
      <label className="field">
        Resumo
        <textarea
          name="summary"
          defaultValue={initial?.data.summary}
          required
        />
      </label>
      <label className="field">
        Conteúdo (texto; separe parágrafos com uma linha em branco)
        <textarea
          name="content"
          defaultValue={initial?.data.content}
          rows={12}
          required
        />
      </label>
      <p className="mb-6 text-xs muted">
        Texto é renderizado com segurança, sem HTML arbitrário. Cada edição cria
        uma versão e preserva as tentativas anteriores.
      </p>
      {questions.map((q, i) => (
        <fieldset
          className="mb-5 rounded-xl border border-border p-5"
          key={q.id}
        >
          <legend className="px-2 font-semibold">Pergunta {i + 1}</legend>
          <label className="field">
            Enunciado
            <Input
              value={q.text}
              onChange={(e) => setQ(i, { text: e.target.value })}
              required
            />
          </label>
          {q.options.map((v, n) => (
            <label className="field" key={n}>
              Alternativa {n + 1}
              <Input
                value={v}
                onChange={(e) =>
                  setQ(i, {
                    options: q.options.map((o, k) =>
                      k === n ? e.target.value : o,
                    ),
                  })
                }
                required
              />
            </label>
          ))}
          <label className="field">
            Resposta correta
            <select
              value={q.correctIndex}
              onChange={(e) =>
                setQ(i, { correctIndex: Number(e.target.value) })
              }
            >
              {q.options.map((_, n) => (
                <option key={n} value={n}>
                  Alternativa {n + 1}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Explicação
            <textarea
              value={q.explanation}
              onChange={(e) => setQ(i, { explanation: e.target.value })}
              required
            />
          </label>
        </fieldset>
      ))}
      <label className="my-5 flex items-center gap-2">
        <input
          type="checkbox"
          name="published"
          defaultChecked={initial?.published ?? false}
        />
        Publicar para a equipe
      </label>
      <Button disabled={pending}>Salvar nova versão</Button>
    </form>
  );
}
