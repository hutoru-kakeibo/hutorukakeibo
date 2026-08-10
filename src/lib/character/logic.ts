export type CharacterStage = "slim" | "fit" | "chubby" | "round" | "overweight";

// 実イラストが無い段階のフォールバック表示、およびシェア画像生成で共用する
export const FACE_BY_STAGE: Record<CharacterStage, string> = {
  slim: "😊",
  fit: "🙂",
  chubby: "😐",
  round: "😟",
  overweight: "😵",
};

export interface CharacterStatus {
  stage: CharacterStage;
  ratio: number;
  label: string;
  message: string;
  accentColor: string;
  scale: number;
}

interface StageDefinition {
  stage: CharacterStage;
  maxRatio: number;
  label: string;
  message: string;
  accentColor: string;
  scale: number;
}

// 支出/予算比率のしきい値。80%到達時点で警告を出し、100%超過前に
// ユーザーが行動を変えられるよう早めに変化を感じさせる設計にしている。
const STAGES: StageDefinition[] = [
  {
    stage: "slim",
    maxRatio: 0.5,
    label: "スリム",
    message: "まぁ、まだまだこれからじょ",
    accentColor: "#22a06b",
    scale: 0.9,
  },
  {
    stage: "fit",
    maxRatio: 0.8,
    label: "順調",
    message: "このくらいで抑えたいじょね",
    accentColor: "#4ade80",
    scale: 1,
  },
  {
    stage: "chubby",
    maxRatio: 1.0,
    label: "ややふっくら",
    message: "ちょっとやばいじょ",
    accentColor: "#f59e0b",
    scale: 1.15,
  },
  {
    stage: "round",
    maxRatio: 1.3,
    label: "ぽっちゃり",
    message: "ふとりすぎじょ！",
    accentColor: "#f97316",
    scale: 1.32,
  },
  {
    stage: "overweight",
    maxRatio: Infinity,
    label: "まるまる",
    message: "でぶすぎるじょ！！！",
    accentColor: "#ef4444",
    scale: 1.5,
  },
];

export function computeCharacterStatus(spent: number, budget: number): CharacterStatus {
  const safeSpent = Math.max(0, spent);
  // 予算未設定(0円)のまま支出があった場合は「使いすぎ」寄りの状態として扱う
  const ratio = budget > 0 ? safeSpent / budget : safeSpent > 0 ? 2 : 0;
  const matched = STAGES.find((definition) => ratio < definition.maxRatio) ?? STAGES[STAGES.length - 1];

  return {
    stage: matched.stage,
    ratio,
    label: matched.label,
    message: matched.message,
    accentColor: matched.accentColor,
    scale: matched.scale,
  };
}
