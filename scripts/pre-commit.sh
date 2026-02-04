#!/bin/bash

# Pre-commit hook to remind developers to run tests
# Install with: cp scripts/pre-commit.sh .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit

YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Pre-commit Hook${NC}"
echo "Checking for common issues before commit..."

# Check if any tests have been modified
if git diff --cached --name-only | grep -qE "(test|spec)" && \
   ! git diff --cached --name-only | grep -qE "\.(ts|tsx|go|py)$"; then
    echo -e "${RED}⚠ Warning: Test files modified but no source files changed${NC}"
fi

# Check for console.log, print, etc. in source files
echo "Checking for debug statements..."

if git diff --cached --name-only | grep -qE "\.(ts|tsx)$"; then
    if git diff --cached | grep -q "console\.log\|console\.error\|console\.warn" && \
       ! git diff --cached --name-only | grep -q "test\|spec"; then
        echo -e "${RED}⚠ Warning: Found console.log in TypeScript files${NC}"
    fi
fi

# Suggest running tests
echo ""
echo -e "${YELLOW}Reminder: Run tests before pushing:${NC}"
echo -e "${GREEN}./scripts/run-tests.sh${NC}"
echo ""

# Don't block the commit
exit 0
