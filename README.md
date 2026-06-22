# 실시간 시술 현황 대시보드

Vite + React + TypeScript 기반의 시술 베드 현황 대시보드 초기 구현입니다.

## 실행

```bash
npm install
npm run dev
```

Supabase를 연결하려면 `.env.example`을 참고해 `.env.local`에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 설정하세요.

새 Supabase 프로젝트를 만들거나 DB를 복구할 때는 아래 마이그레이션을 **반드시 이 순서대로 모두 적용**한 뒤, 마지막에 seed를 적용하세요.

```text
supabase/migrations/001_initial.sql
supabase/migrations/002_tablet_simplify.sql
supabase/migrations/003_memo_without_pin.sql
supabase/migrations/004_waiting_started_at.sql
supabase/migrations/20260619155022_secure_authenticated_dashboard.sql
supabase/migrations/20260620060000_require_admin.sql
supabase/seed.sql
```

`20260619155022_secure_authenticated_dashboard.sql`은 익명 접근을 차단하고 로그인한 사용자만 대시보드 데이터를 조회·수정하도록 만드는 보안 마이그레이션입니다. 초기 마이그레이션과 seed만 적용한 상태로 배포하지 마세요.

## 최초 관리자 설정

Supabase 대시보드에서 **Authentication → Users → 대상 사용자**를 열고, `app_metadata`에 아래 값을 설정하세요.

```json
{"role":"admin"}
```

`app_metadata.role`이 `admin`이 아닌 사용자는 staff로 처리됩니다. DB를 복구하거나 새 Supabase 프로젝트를 만들었다면, 마이그레이션과 seed 적용 후 최초 관리자를 다시 지정하세요.

## 배포 전 환경 변수 확인

- `VITE_SUPABASE_URL`이 배포 환경에 주입되었는지 확인합니다.
- `VITE_SUPABASE_ANON_KEY`가 배포 환경에 주입되었는지 확인합니다.
- 환경 변수를 변경했다면 새 빌드·배포에 반영됐는지 확인합니다.

Supabase 환경 변수가 없으면 로컬 목업 데이터로 화면과 타이머 동작을 확인할 수 있습니다.

## Edge Function 배포 (admin-users)

계정 생성·비밀번호 변경은 `admin-users` Edge Function이 처리합니다. Supabase CLI를 인증한 뒤, 배포 대상 프로젝트를 확인하고 함수를 배포합니다.

```bash
supabase projects list
supabase functions deploy admin-users --project-ref qcbtbgfiojgjkvegihhu --no-verify-jwt
```

함수는 요청의 JWT를 내부에서 검증하고 관리자(`app_metadata.role === "admin"`)만 허용합니다. `--no-verify-jwt`는 CORS preflight와 함수 내부 검증을 함께 사용하기 위한 설정이며, 인증을 생략하는 설정이 아닙니다.

배포된 Edge Function에는 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`가 기본 시크릿으로 주입됩니다. 로컬 실행에서만 `supabase/functions/.env`에 두 값을 설정합니다. `SUPABASE_SERVICE_ROLE_KEY`는 서버 전용 비밀값이므로 `VITE_` 환경변수·프런트엔드 소스·클라이언트 번들에 절대 넣지 마세요.

## 활동 로그 정리

활동 로그는 30일간 보관합니다. pg_cron을 사용하지 않는 현재 운영 환경에서는 Supabase SQL Editor에서 아래 함수를 수동 실행해 오래된 기록을 삭제합니다.

```sql
select private.purge_activity_log();
```
