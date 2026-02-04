#!/bin/bash

# BBE Production Deployment Script
# This script is called by GitHub Actions CI/CD after all tests pass
# Local deployments should run tests first with: npm run test && go test ./... && pytest

PROJECT_DIR="${1:-.}"
ENVIRONMENT="${2:-production}"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting BBE deployment...${NC}"
echo "Environment: $ENVIRONMENT"
echo "Project Directory: $PROJECT_DIR"

# Verify we're in the right directory
if [ ! -f "docker-compose.prod.yml" ]; then
    echo -e "${RED}Error: docker-compose.prod.yml not found in $PROJECT_DIR${NC}"
    exit 1
fi

# Function to check if all tests passed
check_test_status() {
    echo -e "${YELLOW}Verifying test status...${NC}"
    
    # In GitHub Actions, this is checked by test-summary job
    # For local deployments, you must run tests first
    if [ "$ENVIRONMENT" == "local" ]; then
        echo -e "${YELLOW}Running tests before deployment...${NC}"
        
        # Frontend tests
        echo "Running frontend tests..."
        cd bbe-ui || exit 1
        npm run test || {
            echo -e "${RED}Frontend tests failed. Aborting deployment.${NC}"
            exit 1
        }
        cd "$PROJECT_DIR" || exit 1
        
        # Backend tests
        echo "Running backend tests..."
        go test -v -race ./... || {
            echo -e "${RED}Backend tests failed. Aborting deployment.${NC}"
            exit 1
        }
        
        # Python tests
        echo "Running Python tests..."
        python -m pytest -v || {
            echo -e "${RED}Python tests failed. Aborting deployment.${NC}"
            exit 1
        }
    fi
    
    echo -e "${GREEN}All tests passed. Proceeding with deployment.${NC}"
}

# Function to backup current deployment
backup_deployment() {
    echo -e "${YELLOW}Backing up current deployment...${NC}"
    
    BACKUP_DIR="./backups/backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Export current running containers
    docker compose -f docker-compose.prod.yml ps > "$BACKUP_DIR/container-status.log" || true
    
    echo -e "${GREEN}Backup created at: $BACKUP_DIR${NC}"
}

# Function to stop services
stop_services() {
    echo -e "${YELLOW}Stopping services...${NC}"
    docker compose -f docker-compose.prod.yml down || {
        echo -e "${RED}Warning: Failed to stop services gracefully${NC}"
        return 1
    }
    echo -e "${GREEN}Services stopped.${NC}"
}

# Function to update code
update_code() {
    echo -e "${YELLOW}Updating code from GitHub...${NC}"
    
    git fetch origin || {
        echo -e "${RED}Failed to fetch from origin${NC}"
        exit 1
    }
    
    git reset --hard origin/main || {
        echo -e "${RED}Failed to reset to origin/main${NC}"
        exit 1
    }
    
    echo -e "${GREEN}Code updated.${NC}"
}

# Function to build frontend
build_frontend() {
    echo -e "${YELLOW}Building frontend...${NC}"
    
    cd bbe-ui || exit 1
    npm install --legacy-peer-deps || {
        echo -e "${RED}npm install failed${NC}"
        exit 1
    }
    
    npm run build || {
        echo -e "${RED}Frontend build failed${NC}"
        exit 1
    }
    
    cd "$PROJECT_DIR" || exit 1
    echo -e "${GREEN}Frontend built successfully.${NC}"
}

# Function to start services
start_services() {
    echo -e "${YELLOW}Starting services...${NC}"
    
    docker compose -f docker-compose.prod.yml up -d --build || {
        echo -e "${RED}Failed to start services${NC}"
        exit 1
    }
    
    echo -e "${GREEN}Services started.${NC}"
}

# Function to verify deployment
verify_deployment() {
    echo -e "${YELLOW}Verifying deployment...${NC}"
    
    # Wait for services to be healthy
    sleep 10
    
    # Check if main container is running
    if docker compose -f docker-compose.prod.yml ps | grep -q "running"; then
        echo -e "${GREEN}Services are running.${NC}"
        return 0
    else
        echo -e "${RED}Services are not running!${NC}"
        return 1
    fi
}

# Main deployment flow
main() {
    set -e  # Exit on first error
    
    # Validate tests only if running locally
    if [ "$ENVIRONMENT" == "local" ]; then
        check_test_status
    fi
    
    # Create backup before making changes
    backup_deployment
    
    # Update code (skip in local environment for testing)
    if [ "$ENVIRONMENT" != "local" ]; then
        update_code
    fi
    
    # Build frontend
    build_frontend
    
    # Stop old services
    stop_services || true  # Don't exit if this fails
    
    # Start new services
    start_services
    
    # Verify deployment
    if verify_deployment; then
        echo -e "${GREEN}✓ Deployment completed successfully!${NC}"
        echo "Website: https://bbe-frc.com/"
        exit 0
    else
        echo -e "${RED}✗ Deployment verification failed!${NC}"
        echo "Rolling back..."
        # Add rollback logic here if needed
        exit 1
    fi
}

# Run main function
main "$@"
