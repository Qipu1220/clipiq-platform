@echo off
REM Verification script for Windows
REM Runs verification queries using docker exec

echo.
echo ================================================
echo   SEED DATA VERIFICATION
echo ================================================
echo.

docker exec clipiq_postgres psql -U clipiq_user -d clipiq_db -f /dev/stdin < src/database/seeds/verify_seed_data.sql

if errorlevel 1 (
    echo.
    echo ❌ Verification failed
    echo     Make sure docker-compose is running: docker-compose up -d
    exit /b 1
)

echo.
pause

