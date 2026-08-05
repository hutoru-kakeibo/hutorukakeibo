import Image from "next/image";
import { FACE_BY_STAGE, type CharacterStatus } from "@/lib/character/logic";

// 正式なキャラクターアートが揃っている段階。無い段階は絵文字プレースホルダーで代用する。
const ILLUSTRATED_STAGES: Partial<Record<CharacterStatus["stage"], string>> = {
  slim: "/characters/slim.png",
  round: "/characters/round.png",
  overweight: "/characters/overweight.png",
};

export function CharacterAvatar({ status }: { status: CharacterStatus }) {
  const size = 104 * status.scale;
  const illustration = ILLUSTRATED_STAGES[status.stage];

  return (
    <div className="flex flex-col items-center gap-2">
      {illustration ? (
        <Image
          src={illustration}
          alt={`キャラクターの状態: ${status.label}`}
          width={size}
          height={size}
          priority
          className="transition-all duration-500 ease-out"
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          role="img"
          aria-label={`キャラクターの状態: ${status.label}`}
          className="flex items-center justify-center rounded-full shadow-lg transition-all duration-500 ease-out"
          style={{ width: size, height: size, backgroundColor: status.accentColor }}
        >
          <span aria-hidden style={{ fontSize: size * 0.42 }}>
            {FACE_BY_STAGE[status.stage]}
          </span>
        </div>
      )}
      {!illustration && (
        <p className="text-center text-[11px] text-ink-muted">
          ※ プレースホルダーです。正式なキャラクターデザインに差し替え予定
        </p>
      )}
    </div>
  );
}
