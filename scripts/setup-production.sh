#!/bin/bash
# SMLGPT V2.0 Production Setup Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 SMLGPT V2.0 Production Setup${NC}"
echo "=================================="

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"

MISSING_DEPS=()

if ! command_exists az; then
    MISSING_DEPS+=("Azure CLI")
fi

if ! command_exists docker; then
    MISSING_DEPS+=("Docker")
fi

if ! command_exists kubectl; then
    MISSING_DEPS+=("kubectl")
fi

if [ ${#MISSING_DEPS[@]} -ne 0 ]; then
    echo -e "${RED}❌ Missing dependencies: ${MISSING_DEPS[*]}${NC}"
    echo "Please install missing dependencies and retry."
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites met${NC}"

# Read configuration
echo -e "\n${YELLOW}Reading configuration...${NC}"

if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ .env.production file not found${NC}"
    echo "Please copy .env.production.example to .env.production and update with your values"
    exit 1
fi

source .env.production

# Validate required environment variables
REQUIRED_VARS=(
    "AZURE_OPENAI_API_KEY"
    "AZURE_COMPUTER_VISION_KEY"
    "AZURE_STORAGE_CONNECTION_STRING"
    "AZURE_SEARCH_API_KEY"
    "JWT_SECRET"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo -e "${RED}❌ Missing required environment variables: ${MISSING_VARS[*]}${NC}"
    echo "Please update .env.production with missing values"
    exit 1
fi

echo -e "${GREEN}✅ Configuration validated${NC}"

# Function to setup Azure resources
setup_azure_resources() {
    echo -e "\n${BLUE}Setting up Azure resources...${NC}"
    
    # Login to Azure
    echo "Logging into Azure..."
    az login
    
    # Create resource group
    echo "Creating resource group..."
    az group create --name "$AZURE_RESOURCE_GROUP" --location "$AZURE_LOCATION"
    
    # Create Azure Container Registry
    echo "Creating Azure Container Registry..."
    az acr create --resource-group "$AZURE_RESOURCE_GROUP" --name "$ACR_NAME" --sku Standard
    
    # Create AKS cluster
    echo "Creating AKS cluster..."
    az aks create \
        --resource-group "$AZURE_RESOURCE_GROUP" \
        --name "$AKS_CLUSTER_NAME" \
        --node-count 3 \
        --node-vm-size Standard_D2s_v3 \
        --enable-addons monitoring \
        --attach-acr "$ACR_NAME" \
        --generate-ssh-keys
    
    # Get AKS credentials
    echo "Getting AKS credentials..."
    az aks get-credentials --resource-group "$AZURE_RESOURCE_GROUP" --name "$AKS_CLUSTER_NAME"
    
    echo -e "${GREEN}✅ Azure resources created${NC}"
}

# Function to build and push Docker images
build_and_push_images() {
    echo -e "\n${BLUE}Building and pushing Docker images...${NC}"
    
    # Login to ACR
    az acr login --name "$ACR_NAME"
    
    # Build backend image
    echo "Building backend image..."
    docker build -t "$ACR_NAME.azurecr.io/smlgpt-backend:latest" ./backend
    
    # Build frontend image
    echo "Building frontend image..."
    docker build -t "$ACR_NAME.azurecr.io/smlgpt-frontend:latest" ./frontend
    
    # Push images
    echo "Pushing backend image..."
    docker push "$ACR_NAME.azurecr.io/smlgpt-backend:latest"
    
    echo "Pushing frontend image..."
    docker push "$ACR_NAME.azurecr.io/smlgpt-frontend:latest"
    
    echo -e "${GREEN}✅ Images built and pushed${NC}"
}

# Function to deploy to Kubernetes
deploy_to_kubernetes() {
    echo -e "\n${BLUE}Deploying to Kubernetes...${NC}"
    
    # Create namespace
    kubectl apply -f k8s/namespace.yaml
    
    # Create secrets
    kubectl create secret generic azure-secrets \
        --namespace=smlgpt \
        --from-literal=azure-openai-api-key="$AZURE_OPENAI_API_KEY" \
        --from-literal=azure-computer-vision-key="$AZURE_COMPUTER_VISION_KEY" \
        --from-literal=azure-document-intelligence-key="$AZURE_DOCUMENT_INTELLIGENCE_KEY" \
        --from-literal=azure-storage-connection-string="$AZURE_STORAGE_CONNECTION_STRING" \
        --from-literal=azure-search-api-key="$AZURE_SEARCH_API_KEY" \
        --from-literal=azure-speech-key="$AZURE_SPEECH_KEY" \
        --from-literal=jwt-secret="$JWT_SECRET" \
        --dry-run=client -o yaml | kubectl apply -f -
    
    # Update image references in manifests
    sed -i "s|smlgptregistry.azurecr.io|$ACR_NAME.azurecr.io|g" k8s/backend.yaml
    sed -i "s|smlgptregistry.azurecr.io|$ACR_NAME.azurecr.io|g" k8s/frontend.yaml
    
    # Deploy resources
    kubectl apply -f k8s/redis.yaml
    kubectl apply -f k8s/backend.yaml
    kubectl apply -f k8s/frontend.yaml
    kubectl apply -f k8s/ingress.yaml
    kubectl apply -f k8s/hpa.yaml
    
    # Wait for deployments
    echo "Waiting for deployments to be ready..."
    kubectl rollout status deployment/backend -n smlgpt --timeout=600s
    kubectl rollout status deployment/frontend -n smlgpt --timeout=600s
    
    echo -e "${GREEN}✅ Kubernetes deployment complete${NC}"
}

# Function to run health checks
run_health_checks() {
    echo -e "\n${BLUE}Running health checks...${NC}"
    
    # Get service endpoints
    BACKEND_IP=$(kubectl get svc backend -n smlgpt -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
    
    if [ -z "$BACKEND_IP" ]; then
        echo -e "${YELLOW}⚠️  LoadBalancer IP not yet assigned, checking internal service...${NC}"
        kubectl port-forward svc/backend 5000:5000 -n smlgpt &
        PORT_FORWARD_PID=$!
        sleep 5
        BACKEND_URL="http://localhost:5000"
    else
        BACKEND_URL="http://$BACKEND_IP:5000"
    fi
    
    # Test health endpoint
    if curl -f "$BACKEND_URL/health" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend health check passed${NC}"
    else
        echo -e "${RED}❌ Backend health check failed${NC}"
        exit 1
    fi
    
    # Cleanup port forward if used
    if [ ! -z "$PORT_FORWARD_PID" ]; then
        kill $PORT_FORWARD_PID 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✅ All health checks passed${NC}"
}

# Main execution
case "${1:-all}" in
    "azure")
        setup_azure_resources
        ;;
    "build")
        build_and_push_images
        ;;
    "deploy")
        deploy_to_kubernetes
        ;;
    "health")
        run_health_checks
        ;;
    "all")
        setup_azure_resources
        build_and_push_images
        deploy_to_kubernetes
        run_health_checks
        ;;
    *)
        echo "Usage: $0 [azure|build|deploy|health|all]"
        echo "  azure  - Setup Azure resources"
        echo "  build  - Build and push Docker images"
        echo "  deploy - Deploy to Kubernetes"
        echo "  health - Run health checks"
        echo "  all    - Run all steps (default)"
        exit 1
        ;;
esac

echo -e "\n${GREEN}🎉 SMLGPT V2.0 Production Setup Complete!${NC}"
echo "=================================="
echo -e "Frontend: ${BLUE}https://yourdomain.com${NC}"
echo -e "Backend:  ${BLUE}https://api.yourdomain.com${NC}"
echo ""
echo "Next steps:"
echo "1. Update DNS records to point to your ingress controller"
echo "2. Configure SSL certificates"
echo "3. Set up monitoring and alerting"
echo "4. Configure backup and disaster recovery"
