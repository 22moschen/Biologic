import type { ExamContent } from "../src/lib/domain";
export const examNames = [
  ["HEM", "Hemograma", "SANGUE"],
  ["GLI", "Glicemia", "SANGUE"],
  ["LIP", "Perfil lipídico", "SANGUE"],
  ["TSH", "TSH", "SANGUE"],
  ["URI", "Exame de urina", "URINA"],
  ["URO", "Urocultura", "URINA"],
  ["PAR", "Parasitológico de fezes", "FEZES"],
  ["OUT", "Outros exames — orientação individual", "OUTROS"],
] as const;
export function demoExam(name: string): ExamContent {
  return {
    name,
    description:
      "Exemplo educacional para demonstração do fluxo de orientação. Conteúdo pendente de revisão pelo responsável técnico.",
    preparation:
      "Confirme com a equipe as orientações de preparo aplicáveis ao seu atendimento. Este exemplo não define tempo de jejum nem alterações de medicamentos.",
    collection:
      "Consulte a equipe responsável sobre a forma de coleta. Não utilize este conteúdo demonstrativo como protocolo clínico.",
    storage:
      "Confirme com o laboratório as condições e o prazo de entrega antes de realizar uma coleta externa.",
    material: "A definir e revisar pelo responsável técnico do laboratório.",
    notes:
      "Projeto acadêmico — utilizar somente pacientes fictícios na apresentação.",
    color: "",
    state: "DEMONSTRATIVO",
    reviewer: "",
    reviewedAt: "",
    questions: [
      {
        id: "identificacao",
        text: "A identificação do paciente foi conferida?",
        help: "Confira os dados com o paciente, sem assumir a identidade.",
        required: true,
        type: "YES_NO",
        options: [],
        pendingValues: ["Não"],
      },
      {
        id: "orientacoes",
        text: "O paciente recebeu as orientações disponíveis?",
        help: "Encaminhe dúvidas à equipe responsável.",
        required: true,
        type: "YES_NO",
        options: [],
        pendingValues: ["Não"],
      },
      {
        id: "duvidas",
        text: "Há dúvida que precisa ser encaminhada?",
        help: "A opção Sim gera uma pendência neste exemplo.",
        required: true,
        type: "YES_NO",
        options: [],
        pendingValues: ["Sim"],
      },
      {
        id: "observacoes",
        text: "Observações da conferência",
        help: "Não registrar dados desnecessários.",
        required: false,
        type: "TEXT",
        options: [],
        pendingValues: [],
      },
    ],
  };
}
const common = [
  {
    id: "q1",
    text: "Como agir quando houver dúvida sobre um procedimento?",
    options: [
      "Improvisar uma resposta",
      "Encaminhar à equipe responsável",
      "Ignorar a dúvida",
    ],
    correctIndex: 1,
    explanation:
      "Dúvidas devem ser encaminhadas à equipe responsável, sem improvisar orientações clínicas.",
  },
  {
    id: "q2",
    text: "O que significa conferência concluída no BioLogic?",
    options: [
      "Autorização clínica automática",
      "Resultado de exame liberado",
      "Conclusão do registro no sistema",
    ],
    correctIndex: 2,
    explanation:
      "A conferência conclui o registro. Não substitui avaliação profissional nem autoriza automaticamente uma coleta.",
  },
  {
    id: "q3",
    text: "O que fazer ao identificar informação divergente?",
    options: [
      "Registrar a pendência e solicitar análise",
      "Alterar a resposta para concluir",
      "Apagar o atendimento",
    ],
    correctIndex: 0,
    explanation:
      "Registre a informação recebida e encaminhe a pendência para análise; preserve o histórico.",
  },
];
export const demoModules = [
  {
    slug: "atendimento-humanizado",
    title: "Atendimento humanizado",
    summary: "Acolhimento, escuta e comunicação clara em cada atendimento.",
    content:
      "Acolher é ouvir com atenção e respeito. Explique cada etapa com linguagem acessível e verifique se a pessoa compreendeu.\n\nPreserve a privacidade e evite expor informações em espaços compartilhados. Não faça promessas sobre resultados ou condutas. Encaminhe dúvidas técnicas à equipe responsável.",
  },
  {
    slug: "cadastro-identificacao",
    title: "Cadastro e identificação",
    summary: "Registro cuidadoso e conferência da identidade do paciente.",
    content:
      "Peça que a pessoa informe seus dados e confira o cadastro. Não suponha a identidade com base em aparência ou reconhecimento.\n\nNome e nascimento ajudam a identificar possíveis duplicidades. O CPF é opcional no projeto. Não unifique registros automaticamente e não use CPF como senha.",
  },
  {
    slug: "orientacao-exames",
    title: "Orientação sobre exames",
    summary:
      "Informação organizada, respeito às orientações e encaminhamento de dúvidas.",
    content:
      "Utilize as orientações cadastradas e revisadas pelo responsável técnico. No protótipo, os conteúdos são demonstrativos e não definem condutas clínicas.\n\nConfirme o recebimento das orientações pelo paciente. Nunca recomende suspensão de medicamentos ou modifique preparo por conta própria. Registre dúvidas para encaminhamento.",
  },
  {
    slug: "qualidade-seguranca",
    title: "Qualidade e segurança",
    summary: "Pendências, rastreabilidade e proteção das informações.",
    content:
      "Responda o checklist com as informações efetivamente conferidas. Uma resposta pode gerar pendência conforme a configuração do exame.\n\nA administração registra uma justificativa ao resolver uma pendência. A resposta original é preservada. Conferência concluída significa apenas a conclusão do registro, e não autorização clínica automática. Compartilhe links individuais somente com o paciente correto.",
  },
].map((m) => ({ ...m, questions: common.map((q) => ({ ...q })) }));
