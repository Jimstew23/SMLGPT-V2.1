#!/bin/bash
# Azure Key Vault Setup for SMLGPT V2.0

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}🔐 Azure Key Vault Setup for SMLGPT V2.0${NC}"
echo "==========================================="

# Configuration
KEYVAULT_NAME="${KEYVAULT_NAME:-smlgpt-keyvault-$(date +%s)}"
RESOURCE_GROUP="${AZURE_RESOURCE_GROUP:-smlgpt-rg}"
LOCATION="${AZURE_LOCATION:-eastus2}"

echo -e "\n${YELLOW}Configuration:${NC}"
echo "Key Vault Name: $KEYVAULT_NAME"
echo "Resource Group: $RESOURCE_GROUP"
echo "Location: $LOCATION"

# Create Key Vault
echo -e "\n${BLUE}Creating Azure Key Vault...${NC}"
az keyvault create \
    --name "$KEYVAULT_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --location "$LOCATION" \
    --enable-rbac-authorization true \
    --public-network-access Enabled

# Get current user principal ID
USER_PRINCIPAL_ID=$(az ad signed-in-user show --query id -o tsv)

# Assign Key Vault Administrator role to current user
echo -e "${BLUE}Assigning Key Vault Administrator role...${NC}"
az role assignment create \
    --role "Key Vault Administrator" \
    --assignee "$USER_PRINCIPAL_ID" \
    --scope "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.KeyVault/vaults/$KEYVAULT_NAME"

# Wait for role assignment to propagate
echo -e "${YELLOW}Waiting for role assignment to propagate...${NC}"
sleep 30

# Function to set secret
set_secret() {
    local secret_name=$1
    local secret_value=$2
    local description=$3
    
    echo -e "${BLUE}Setting secret: $secret_name${NC}"
    az keyvault secret set \
        --vault-name "$KEYVAULT_NAME" \
        --name "$secret_name" \
        --value "$secret_value" \
        --description "$description" \
        --output none
}

# Read secrets from .env.production if it exists
if [ -f ".env.production" ]; then
    echo -e "\n${BLUE}Reading secrets from .env.production...${NC}"
    source .env.production
    
    # Set secrets in Key Vault
    set_secret "azure-openai-api-key" "$AZURE_OPENAI_API_KEY" "Azure OpenAI API Key"
    set_secret "azure-computer-vision-key" "$AZURE_COMPUTER_VISION_KEY" "Azure Computer Vision API Key"
    set_secret "azure-document-intelligence-key" "$AZURE_DOCUMENT_INTELLIGENCE_KEY" "Azure Document Intelligence API Key"
    set_secret "azure-storage-connection-string" "$AZURE_STORAGE_CONNECTION_STRING" "Azure Storage Connection String"
    set_secret "azure-search-api-key" "$AZURE_SEARCH_API_KEY" "Azure AI Search API Key"
    set_secret "azure-speech-key" "$AZURE_SPEECH_KEY" "Azure Speech Services API Key"
    set_secret "jwt-secret" "$JWT_SECRET" "JWT Secret for authentication"
    
    # Set non-secret configuration values
    set_secret "azure-openai-endpoint" "$AZURE_OPENAI_ENDPOINT" "Azure OpenAI Endpoint URL"
    set_secret "azure-computer-vision-endpoint" "$AZURE_COMPUTER_VISION_ENDPOINT" "Azure Computer Vision Endpoint URL"
    set_secret "azure-document-intelligence-endpoint" "$AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT" "Azure Document Intelligence Endpoint URL"
    set_secret "azure-search-endpoint" "$AZURE_SEARCH_ENDPOINT" "Azure AI Search Endpoint URL"
    set_secret "azure-speech-region" "$AZURE_SPEECH_REGION" "Azure Speech Services Region"
    
else
    echo -e "${YELLOW}⚠️  .env.production not found. Please set secrets manually.${NC}"
    echo "Example commands:"
    echo "az keyvault secret set --vault-name '$KEYVAULT_NAME' --name 'azure-openai-api-key' --value 'your-key'"
fi

# Create service principal for AKS
echo -e "\n${BLUE}Creating service principal for AKS access...${NC}"
SP_NAME="smlgpt-aks-sp"
SP_CREDENTIALS=$(az ad sp create-for-rbac --name "$SP_NAME" --skip-assignment --output json)
SP_OBJECT_ID=$(echo "$SP_CREDENTIALS" | jq -r '.appId')
SP_SECRET=$(echo "$SP_CREDENTIALS" | jq -r '.password')

# Assign Key Vault Secrets User role to service principal
echo -e "${BLUE}Assigning Key Vault Secrets User role to service principal...${NC}"
az role assignment create \
    --role "Key Vault Secrets User" \
    --assignee "$SP_OBJECT_ID" \
    --scope "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$RESOURCE_GROUP/providers/Microsoft.KeyVault/vaults/$KEYVAULT_NAME"

# Store service principal credentials
set_secret "aks-service-principal-id" "$SP_OBJECT_ID" "AKS Service Principal App ID"
set_secret "aks-service-principal-secret" "$SP_SECRET" "AKS Service Principal Secret"

# Create Key Vault CSI driver configuration
echo -e "\n${BLUE}Creating Key Vault CSI driver configuration...${NC}"
cat > k8s/keyvault-csi.yaml << EOF
apiVersion: v1
kind: SecretProviderClass
metadata:
  name: azure-secrets
  namespace: smlgpt
spec:
  provider: azure
  parameters:
    usePodIdentity: "false"
    useVMManagedIdentity: "false"
    userAssignedIdentityID: ""
    keyvaultName: "$KEYVAULT_NAME"
    cloudName: ""
    objects: |
      array:
        - |
          objectName: azure-openai-api-key
          objectType: secret
          objectVersion: ""
        - |
          objectName: azure-computer-vision-key
          objectType: secret
          objectVersion: ""
        - |
          objectName: azure-document-intelligence-key
          objectType: secret
          objectVersion: ""
        - |
          objectName: azure-storage-connection-string
          objectType: secret
          objectVersion: ""
        - |
          objectName: azure-search-api-key
          objectType: secret
          objectVersion: ""
        - |
          objectName: azure-speech-key
          objectType: secret
          objectVersion: ""
        - |
          objectName: jwt-secret
          objectType: secret
          objectVersion: ""
    tenantId: "$(az account show --query tenantId -o tsv)"
  secretObjects:
  - secretName: azure-secrets
    type: Opaque
    data:
    - objectName: azure-openai-api-key
      key: azure-openai-api-key
    - objectName: azure-computer-vision-key
      key: azure-computer-vision-key
    - objectName: azure-document-intelligence-key
      key: azure-document-intelligence-key
    - objectName: azure-storage-connection-string
      key: azure-storage-connection-string
    - objectName: azure-search-api-key
      key: azure-search-api-key
    - objectName: azure-speech-key
      key: azure-speech-key
    - objectName: jwt-secret
      key: jwt-secret
EOF

# Output information
echo -e "\n${GREEN}✅ Azure Key Vault setup complete!${NC}"
echo "=================================="
echo -e "Key Vault Name: ${BLUE}$KEYVAULT_NAME${NC}"
echo -e "Key Vault URI: ${BLUE}https://$KEYVAULT_NAME.vault.azure.net/${NC}"
echo -e "Service Principal ID: ${BLUE}$SP_OBJECT_ID${NC}"
echo ""
echo "Next steps:"
echo "1. Update your AKS cluster to use the CSI driver:"
echo "   kubectl apply -f k8s/keyvault-csi.yaml"
echo ""
echo "2. Update your backend deployment to use CSI secrets:"
echo "   Update k8s/backend.yaml to mount secrets from CSI driver"
echo ""
echo "3. Set these GitHub Actions secrets:"
echo "   AZURE_KEYVAULT_NAME=$KEYVAULT_NAME"
echo "   AZURE_SERVICE_PRINCIPAL_ID=$SP_OBJECT_ID"
echo "   AZURE_SERVICE_PRINCIPAL_SECRET=$SP_SECRET"
