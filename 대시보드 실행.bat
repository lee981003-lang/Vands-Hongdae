@echo off
chcp 65001 > nul
cd /d "%~dp0"
where node > nul 2> nul
if errorlevel 1 (
  echo Node.js가 설치되어 있지 않거나 PATH에 없습니다.
  echo https://nodejs.org 에서 LTS 버전을 설치한 뒤 다시 실행하세요.
  pause
  exit /b 1
)
node "%~dp0serve-dashboard.mjs"
echo.
echo 서버가 종료되었습니다. 위 오류 메시지를 확인해주세요.
pause
