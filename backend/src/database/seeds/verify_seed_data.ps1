# Verification script for PowerShell
# Runs verification queries using docker exec

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   SEED DATA VERIFICATION" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Run verification SQL file
Get-Content "src\database\seeds\verify_seed_data.sql" | docker exec -i clipiq_postgres psql -U clipiq_user -d clipiq_db

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Verification failed" -ForegroundColor Red
    Write-Host "    Make sure docker-compose is running: docker-compose up -d" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Read-Host "Press Enter to exit"

