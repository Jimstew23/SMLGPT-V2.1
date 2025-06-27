# SMLGPT V2.0 Production Deployment Guide

## 🎯 Overview

This guide covers deploying SMLGPT V2.0 to production using Azure services with Docker containers and Kubernetes orchestration.

## 📋 Prerequisites

### Required Tools
- Azure CLI (v2.40+)
- Docker (v20.10+)
- kubectl (v1.25+)
- Node.js (v18+)
- Git

### Azure Services Required
- Azure OpenAI Service
- Azure Computer Vision
- Azure Document Intelligence
- Azure Storage Account
- Azure AI Search
- Azure Speech Services
- Azure Container Registry (ACR)
- Azure Kubernetes Service (AKS)
- Azure Key Vault

## 🚀 Quick Start (Docker Compose)

For smaller deployments, use Docker Compose:

### 1. Environment Setup
```bash
# Copy production environment template
cp .env.production.example .env.production

# Update with your Azure service credentials
nano .env.production
```

### 2. Deploy with Docker Compose
```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 3. Access Application
- Frontend: http://localhost:80
- Backend API: http://localhost:5000
- Health Check: http://localhost:5000/health

## 🏭 Enterprise Deployment (Kubernetes/AKS)

For production-grade deployments with auto-scaling and high availability:

### 1. Automated Setup
```bash
# Make setup script executable
chmod +x scripts/setup-production.sh

# Run complete setup (requires Azure login)
./scripts/setup-production.sh all
```

### 2. Manual Setup Steps

#### Step 1: Configure Environment
```bash
# Copy and update production environment
cp .env.production.example .env.production
# Edit .env.production with your values
```

#### Step 2: Setup Azure Key Vault (Recommended)
```bash
# Setup Azure Key Vault for secure secret management
chmod +x scripts/azure-keyvault-setup.sh
./scripts/azure-keyvault-setup.sh
```

#### Step 3: Create Azure Resources
```bash
# Login to Azure
az login

# Set variables
export RESOURCE_GROUP="smlgpt-rg"
export LOCATION="eastus2"
export ACR_NAME="smlgptregistry"
export AKS_NAME="smlgpt-aks"

# Create resource group
az group create --name $RESOURCE_GROUP --location $LOCATION

# Create Azure Container Registry
az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Standard

# Create AKS cluster
az aks create \
  --resource-group $RESOURCE_GROUP \
  --name $AKS_NAME \
  --node-count 3 \
  --node-vm-size Standard_D2s_v3 \
  --enable-addons monitoring \
  --attach-acr $ACR_NAME \
  --generate-ssh-keys
```

#### Step 4: Build and Push Images
```bash
# Login to ACR
az acr login --name $ACR_NAME

# Build and push backend
docker build -t $ACR_NAME.azurecr.io/smlgpt-backend:latest ./backend
docker push $ACR_NAME.azurecr.io/smlgpt-backend:latest

# Build and push frontend
docker build -t $ACR_NAME.azurecr.io/smlgpt-frontend:latest ./frontend
docker push $ACR_NAME.azurecr.io/smlgpt-frontend:latest
```

#### Step 5: Deploy to Kubernetes
```bash
# Get AKS credentials
az aks get-credentials --resource-group $RESOURCE_GROUP --name $AKS_NAME

# Update image references in manifests
sed -i "s|smlgptregistry|$ACR_NAME|g" k8s/backend.yaml
sed -i "s|smlgptregistry|$ACR_NAME|g" k8s/frontend.yaml

# Create namespace
kubectl apply -f k8s/namespace.yaml

# Create secrets (if not using Key Vault CSI)
kubectl create secret generic azure-secrets \
  --namespace=smlgpt \
  --from-literal=azure-openai-api-key="$AZURE_OPENAI_API_KEY" \
  --from-literal=azure-computer-vision-key="$AZURE_COMPUTER_VISION_KEY" \
  --from-literal=azure-document-intelligence-key="$AZURE_DOCUMENT_INTELLIGENCE_KEY" \
  --from-literal=azure-storage-connection-string="$AZURE_STORAGE_CONNECTION_STRING" \
  --from-literal=azure-search-api-key="$AZURE_SEARCH_API_KEY" \
  --from-literal=azure-speech-key="$AZURE_SPEECH_KEY" \
  --from-literal=jwt-secret="$JWT_SECRET"

# Deploy all resources
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/hpa.yaml
kubectl apply -f k8s/monitoring.yaml

# Wait for deployments
kubectl rollout status deployment/backend -n smlgpt --timeout=600s
kubectl rollout status deployment/frontend -n smlgpt --timeout=600s
```

## 🔐 Security Configuration

### Azure Key Vault Integration

For production deployments, use Azure Key Vault to manage secrets:

1. **Setup Key Vault**:
   ```bash
   ./scripts/azure-keyvault-setup.sh
   ```

2. **Enable CSI Driver** (if not already enabled):
   ```bash
   az aks enable-addons --addons azure-keyvault-secrets-provider --name $AKS_NAME --resource-group $RESOURCE_GROUP
   ```

3. **Deploy CSI Configuration**:
   ```bash
   kubectl apply -f k8s/keyvault-csi.yaml
   ```

### SSL/TLS Configuration

1. **Install cert-manager**:
   ```bash
   kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
   ```

2. **Configure Let's Encrypt**:
   - Update `k8s/ingress.yaml` with your domain
   - Update `cert-manager.io/cluster-issuer` annotation

3. **Custom SSL Certificates**:
   ```bash
   kubectl create secret tls smlgpt-tls \
     --cert=path/to/cert.pem \
     --key=path/to/key.pem \
     -n smlgpt
   ```

## 📊 Monitoring and Observability

### Application Insights Integration

1. **Enable in Environment**:
   ```bash
   export AZURE_APPLICATION_INSIGHTS_CONNECTION_STRING="your-connection-string"
   ```

2. **Grafana Dashboard**:
   - Import dashboard from `k8s/monitoring.yaml`
   - Connect to Prometheus metrics

### Logging

- **Application logs**: Streamed to Azure Log Analytics
- **Kubernetes logs**: Available via `kubectl logs`
- **Nginx logs**: Stored in `/var/log/nginx/`

## 🔄 CI/CD Setup

### GitHub Actions Secrets

Configure these secrets in your GitHub repository:

```bash
AZURE_CREDENTIALS="$(az ad sp create-for-rbac --sdk-auth)"
AZURE_RESOURCE_GROUP="smlgpt-rg"
AKS_CLUSTER_NAME="smlgpt-aks"
ACR_USERNAME="$(az acr credential show --name $ACR_NAME --query username -o tsv)"
ACR_PASSWORD="$(az acr credential show --name $ACR_NAME --query passwords[0].value -o tsv)"

# Azure service keys
AZURE_OPENAI_API_KEY="your-key"
AZURE_COMPUTER_VISION_KEY="your-key"
AZURE_DOCUMENT_INTELLIGENCE_KEY="your-key"
AZURE_STORAGE_CONNECTION_STRING="your-connection-string"
AZURE_SEARCH_API_KEY="your-key"
AZURE_SPEECH_KEY="your-key"
JWT_SECRET="your-jwt-secret"

# Optional: Slack notifications
SLACK_WEBHOOK_URL="your-webhook-url"
```

### Deployment Workflow

The GitHub Actions workflow (`.github/workflows/deploy-production.yml`) automatically:

1. **Security Scan**: Trivy vulnerability scanning
2. **Build & Test**: Runs all tests with coverage
3. **Build Images**: Multi-platform Docker builds
4. **Deploy**: Zero-downtime deployment to AKS
5. **Health Checks**: Validates deployment success
6. **Notifications**: Slack alerts for deployment status

## 🚨 Troubleshooting

### Common Issues

#### 1. Pod Fails to Start
```bash
# Check pod status
kubectl get pods -n smlgpt

# Check pod logs
kubectl logs <pod-name> -n smlgpt

# Describe pod for events
kubectl describe pod <pod-name> -n smlgpt
```

#### 2. Image Pull Errors
```bash
# Check if ACR is attached to AKS
az aks check-acr --name $AKS_NAME --resource-group $RESOURCE_GROUP --acr $ACR_NAME

# Manual attachment if needed
az aks update --name $AKS_NAME --resource-group $RESOURCE_GROUP --attach-acr $ACR_NAME
```

#### 3. Service Not Accessible
```bash
# Check service status
kubectl get svc -n smlgpt

# Check ingress
kubectl get ingress -n smlgpt

# Check DNS resolution
nslookup yourdomain.com
```

#### 4. High Memory/CPU Usage
```bash
# Check resource usage
kubectl top pods -n smlgpt

# Scale deployment
kubectl scale deployment backend --replicas=5 -n smlgpt

# Check HPA status
kubectl get hpa -n smlgpt
```

### Performance Optimization

#### 1. Resource Limits
- Adjust CPU/memory limits in deployment manifests
- Monitor actual usage with `kubectl top`

#### 2. Scaling Configuration
- Tune HPA metrics in `k8s/hpa.yaml`
- Consider vertical pod autoscaling (VPA)

#### 3. Database Optimization
- Configure Redis memory policies
- Set up Redis clustering for high availability

## 📈 Scaling Considerations

### Horizontal Scaling
- **Backend**: Auto-scales 3-10 pods based on CPU/memory
- **Frontend**: Auto-scales 2-6 pods based on CPU
- **Redis**: Consider Redis Cluster for large datasets

### Vertical Scaling
- Increase node VM sizes in AKS
- Adjust resource requests/limits
- Consider spot instances for cost optimization

### Multi-Region Deployment
- Deploy to multiple AKS clusters
- Use Azure Traffic Manager for global load balancing
- Replicate data with geo-redundant storage

## 🔧 Maintenance

### Regular Updates
```bash
# Update deployment with new image
kubectl set image deployment/backend backend=$ACR_NAME.azurecr.io/smlgpt-backend:v2.1.0 -n smlgpt

# Rolling restart
kubectl rollout restart deployment/backend -n smlgpt

# Check rollout status
kubectl rollout status deployment/backend -n smlgpt
```

### Backup Strategy
- **Database**: Redis persistence enabled
- **Files**: Azure Blob Storage with geo-redundancy
- **Configuration**: GitOps with version control

### Disaster Recovery
- **RTO**: < 15 minutes with automated failover
- **RPO**: < 5 minutes with continuous replication
- **Backup**: Daily automated backups to geo-redundant storage

## 📞 Support

### Health Monitoring
- **Health Endpoint**: `/health`
- **Metrics Endpoint**: `/metrics`
- **Status Dashboard**: Available in Grafana

### Log Analysis
```bash
# Stream logs
kubectl logs -f deployment/backend -n smlgpt

# Search logs
kubectl logs deployment/backend -n smlgpt | grep ERROR

# Export logs
kubectl logs deployment/backend -n smlgpt > backend.log
```

### Emergency Procedures
1. **Scale down**: `kubectl scale deployment backend --replicas=0 -n smlgpt`
2. **Emergency maintenance**: Enable maintenance mode in ingress
3. **Rollback**: `kubectl rollout undo deployment/backend -n smlgpt`

---

## 🎉 Success Checklist

- [ ] All Azure services provisioned and configured
- [ ] Docker images built and pushed to ACR
- [ ] Kubernetes cluster deployed and healthy
- [ ] SSL certificates configured and valid
- [ ] Monitoring and alerting operational
- [ ] CI/CD pipeline tested and functional
- [ ] Backup and disaster recovery validated
- [ ] Performance benchmarks met
- [ ] Security scan passed
- [ ] Documentation updated

**🚀 Your SMLGPT V2.0 production deployment is now complete!**
