// D-026 룸 이름칸 색상 팔레트 — 기준 단일 소스.
// RoomSection(대시보드 표시)과 RoomBedSettings(설정 UI)가 모두 이 목록을 참조한다.
// 마이그레이션 SQL의 화이트리스트(set_room_color 허용 hex 집합)는 이 bg 목록과
// 정확히 일치하도록 수기로 동기화한다(소문자 hex). 값을 바꾸면 SQL도 함께 고친다.

export type RoomTagSwatch = {
  /** 이름칸 배경 hex (소문자). DB rooms.name_tag_color에 저장되는 값. */
  bg: string;
  /** 짝지은 글자색 hex. 대비 확보용. */
  fg: string;
  /** 설정 UI 스와치 접근성 라벨. */
  label: string;
};

// 미설정(null) 룸의 중립 기본색.
export const DEFAULT_TAG_BG = "#ffffff";
export const DEFAULT_TAG_FG = "#1f2937";

// 라벤더 브랜드 톤 기준 임시 8색(추후 브랜드 확정값으로 교체 가능).
// 앞 5색은 기존 이름 기반 자동 테마(VIP/제모/진료/레이저/관리)의 근사값으로,
// 마이그레이션 백필이 이 값으로 떨어져 자동 테마 제거 후에도 현 외형을 유지한다.
export const ROOM_TAG_PALETTE: RoomTagSwatch[] = [
  { bg: "#f3e8ff", fg: "#7c3aed", label: "라벤더" },
  { bg: "#e8f1ff", fg: "#006cff", label: "블루" },
  { bg: "#fff0e8", fg: "#f15a24", label: "오렌지" },
  { bg: "#e9f9ed", fg: "#10a23c", label: "그린" },
  { bg: "#fff1e6", fg: "#f97316", label: "앰버" },
  { bg: "#ffe8f1", fg: "#db2777", label: "핑크" },
  { bg: "#e6f7f5", fg: "#0d9488", label: "틸" },
  { bg: "#eef0f4", fg: "#475569", label: "그레이" },
];

const FG_BY_BG = new Map(ROOM_TAG_PALETTE.map((swatch) => [swatch.bg, swatch.fg]));

/**
 * 저장된 배경 hex로 글자색을 역참조한다.
 * 미설정(null·빈값)이거나 팔레트 밖 알 수 없는 값이면 중립 기본색을 안전 처리한다.
 */
export function resolveTagColors(bg: string | null | undefined): { bg: string; fg: string } {
  if (!bg) return { bg: DEFAULT_TAG_BG, fg: DEFAULT_TAG_FG };
  const fg = FG_BY_BG.get(bg.toLowerCase());
  if (!fg) return { bg: DEFAULT_TAG_BG, fg: DEFAULT_TAG_FG };
  return { bg, fg };
}
