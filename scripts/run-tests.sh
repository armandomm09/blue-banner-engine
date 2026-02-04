#!/bin/bash

# Test Suite Runner for BBE
# Runs all tests (frontend, backend, Python) with optional coverage reporting

set -e  # Exit on first error

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default values
VERBOSE=0
COVERAGE=0
SPECIFIC_TEST=""
PARALLEL=1

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--verbose)
            VERBOSE=1
            shift
            ;;
        -c|--coverage)
            COVERAGE=1
            shift
            ;;
        -t|--test)
            SPECIFIC_TEST="$2"
            shift 2
            ;;
        -s|--sequential)
            PARALLEL=0
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  -v, --verbose       Show verbose output"
            echo "  -c, --coverage      Generate coverage reports"
            echo "  -t, --test TEST     Run specific test (frontend|backend|python)"
            echo "  -s, --sequential    Run tests sequentially instead of parallel"
            echo "  -h, --help          Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Colors for test results
print_header() {
    echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Frontend Tests
run_frontend_tests() {
    print_header "Running Frontend Tests (Vitest)"
    
    cd "$PROJECT_ROOT/bbe-ui" || exit 1
    
    if [ $VERBOSE -eq 1 ]; then
        if [ $COVERAGE -eq 1 ]; then
            npm run test:coverage
        else
            npm run test
        fi
    else
        if [ $COVERAGE -eq 1 ]; then
            npm run test:coverage > /dev/null 2>&1
        else
            npm run test > /dev/null 2>&1
        fi
    fi
    
    print_success "Frontend tests passed"
    cd "$PROJECT_ROOT"
}

# Backend Tests
run_backend_tests() {
    print_header "Running Backend Tests (Go)"
    
    if [ $VERBOSE -eq 1 ]; then
        if [ $COVERAGE -eq 1 ]; then
            go test -v -race -coverprofile=coverage.out ./...
            go tool cover -func=coverage.out
        else
            go test -v -race ./...
        fi
    else
        if [ $COVERAGE -eq 1 ]; then
            go test -race -coverprofile=coverage.out ./... > /dev/null 2>&1
        else
            go test -race ./... > /dev/null 2>&1
        fi
    fi
    
    print_success "Backend tests passed"
}

# Python Tests
run_python_tests() {
    print_header "Running Python Tests (Pytest)"
    
    cd "$PROJECT_ROOT"
    
    if [ $VERBOSE -eq 1 ]; then
        if [ $COVERAGE -eq 1 ]; then
            python -m pytest -v --cov=matchpoint --cov-report=html --cov-report=term-missing
        else
            python -m pytest -v
        fi
    else
        if [ $COVERAGE -eq 1 ]; then
            python -m pytest --cov=matchpoint --cov-report=html --cov-report=term-missing > /dev/null 2>&1
        else
            python -m pytest > /dev/null 2>&1
        fi
    fi
    
    print_success "Python tests passed"
}

# Main test execution
main() {
    echo -e "${BLUE}BBE Test Suite Runner${NC}"
    echo "Project: $PROJECT_ROOT"
    echo ""
    
    if [ $COVERAGE -eq 1 ]; then
        echo -e "${YELLOW}Coverage reporting: ENABLED${NC}"
    fi
    
    # Determine which tests to run
    if [ -z "$SPECIFIC_TEST" ]; then
        # Run all tests
        TESTS=("frontend" "backend" "python")
    else
        # Run specific test
        TESTS=("$SPECIFIC_TEST")
    fi
    
    # Arrays to track results
    PASSED=()
    FAILED=()
    
    # Run tests
    if [ $PARALLEL -eq 1 ] && [ ${#TESTS[@]} -gt 1 ]; then
        print_warning "Running tests in parallel"
        
        for test in "${TESTS[@]}"; do
            (
                if run_${test}_tests; then
                    exit 0
                else
                    exit 1
                fi
            ) &
        done
        
        # Wait for all background jobs
        while IFS= read -r job; do
            wait "$job" && PASSED+=("$test") || FAILED+=("$test")
        done < <(jobs -p)
    else
        # Run tests sequentially
        for test in "${TESTS[@]}"; do
            if run_${test}_tests 2>&1; then
                PASSED+=("$test")
            else
                FAILED+=("$test")
            fi
        done
    fi
    
    # Print summary
    print_header "Test Summary"
    
    echo "Passed: ${#PASSED[@]}/${#TESTS[@]}"
    for test in "${PASSED[@]}"; do
        print_success "$test tests"
    done
    
    if [ ${#FAILED[@]} -gt 0 ]; then
        echo ""
        echo "Failed: ${#FAILED[@]}/${#TESTS[@]}"
        for test in "${FAILED[@]}"; do
            print_error "$test tests"
        done
        exit 1
    fi
    
    print_success "All tests passed!"
    
    if [ $COVERAGE -eq 1 ]; then
        echo ""
        print_warning "Coverage reports generated:"
        echo "  Frontend: $PROJECT_ROOT/bbe-ui/coverage/index.html"
        echo "  Backend:  $PROJECT_ROOT/coverage.html"
        echo "  Python:   $PROJECT_ROOT/htmlcov/index.html"
    fi
    
    exit 0
}

# Run main function
main
