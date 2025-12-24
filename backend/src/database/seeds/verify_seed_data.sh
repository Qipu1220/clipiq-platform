#!/bin/bash

# Verification script for Linux/Mac
# Runs verification queries using docker exec

echo ""
echo "================================================"
echo "   SEED DATA VERIFICATION"
echo "================================================"
echo ""

docker exec -i clipiq_postgres psql -U clipiq_user -d clipiq_db < src/database/seeds/verify_seed_data.sql

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Verification failed"
    echo "    Make sure docker-compose is running: docker-compose up -d"
    exit 1
fi

echo ""

