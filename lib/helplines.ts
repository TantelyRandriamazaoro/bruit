export type Helpline = {
  id: string;
  name: string;
  number: string;
  subtitle: string;
  /** tel: href digits / plus */
  tel: string;
  kind: "emergency" | "support";
};

/**
 * Default helplines for Madagascar (app fallback region).
 * Numbers are public emergency services — verify locally if needed.
 */
export const HELPLINES: Helpline[] = [
  {
    id: "police",
    name: "Police",
    number: "117",
    subtitle: "Police Nationale",
    tel: "117",
    kind: "emergency",
  },
  {
    id: "gendarmerie",
    name: "Gendarmerie",
    number: "19",
    subtitle: "Emergency gendarmerie",
    tel: "19",
    kind: "emergency",
  },
  {
    id: "fire",
    name: "Firefighters",
    number: "18",
    subtitle: "Pompiers",
    tel: "18",
    kind: "emergency",
  },
  {
    id: "samu",
    name: "Medical emergency",
    number: "124",
    subtitle: "SAMU",
    tel: "124",
    kind: "emergency",
  },
  {
    id: "police-secours",
    name: "Police secours",
    number: "17",
    subtitle: "Urgent police assistance",
    tel: "17",
    kind: "emergency",
  },
];
