# 실시간 시술 현황 대시보드

Vite + React + TypeScript 기반의 시술 베드 현황 대시보드 초기 구현입니다.

## 실행

```bash
npm install
npm run dev
```

Supabase를 연결하려면 `.env.example`을 참고해 `.env.local`에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 설정하고 `supabase/migrations/001_initial.sql`, `supabase/seed.sql`을 적용하세요.

Supabase 환경 변수가 없으면 로컬 목업 데이터로 화면과 타이머 동작을 확인할 수 있습니다.
