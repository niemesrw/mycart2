#!/bin/sh

# API base URL
API="https://api.kroger.com/v1"

# Function to print usage instructions
print_usage() {
  echo "Usage: ./testauth.sh [options]"
  echo ""
  echo "Options:"
  echo "  -e, --env       Use environment variables for credentials"
  echo "  -f, --file      Use .env file for credentials (default)"
  echo "  -1, --onepass   Use 1Password CLI for credentials"
  echo "  -h, --help      Show this help message"
  echo ""
  echo "Environment variables (when using -e):"
  echo "  KROGER_CLIENT_ID      Your Kroger API client ID"
  echo "  KROGER_CLIENT_SECRET  Your Kroger API client secret"
  echo ""
  echo "Example:"
  echo "  KROGER_CLIENT_ID=your-id KROGER_CLIENT_SECRET=your-secret ./testauth.sh -e"
}

# Function to load credentials from .env file
load_from_env_file() {
  ENV_FILE=".env.kroger"
  
  if [ ! -f "$ENV_FILE" ]; then
    echo "Error: $ENV_FILE file not found."
    echo "Please create a $ENV_FILE file with the following content:"
    echo ""
    echo "KROGER_CLIENT_ID=your-client-id"
    echo "KROGER_CLIENT_SECRET=your-client-secret"
    echo ""
    echo "Make sure to add $ENV_FILE to your .gitignore file to keep credentials secure."
    exit 1
  fi
  
  # Source the .env file
  . "$ENV_FILE"
  
  # Check if variables are set
  if [ -z "$KROGER_CLIENT_ID" ] || [ -z "$KROGER_CLIENT_SECRET" ]; then
    echo "Error: KROGER_CLIENT_ID or KROGER_CLIENT_SECRET not found in $ENV_FILE"
    exit 1
  fi
  
  CLIENT_ID="$KROGER_CLIENT_ID"
  CLIENT_SECRET="$KROGER_CLIENT_SECRET"
}

# Function to load credentials from environment variables
load_from_env_vars() {
  # Check if variables are set
  if [ -z "$KROGER_CLIENT_ID" ] || [ -z "$KROGER_CLIENT_SECRET" ]; then
    echo "Error: KROGER_CLIENT_ID or KROGER_CLIENT_SECRET environment variables not set"
    echo "Please set them before running the script:"
    echo ""
    echo "KROGER_CLIENT_ID=your-client-id KROGER_CLIENT_SECRET=your-client-secret ./testauth.sh -e"
    exit 1
  fi
  
  CLIENT_ID="$KROGER_CLIENT_ID"
  CLIENT_SECRET="$KROGER_CLIENT_SECRET"
}

# Function to load credentials from 1Password
load_from_1password() {
  # Check if 1Password CLI is installed
  if ! command -v op >/dev/null 2>&1; then
    echo "Error: 1Password CLI (op) not found."
    echo "Please install it from: https://1password.com/downloads/command-line/"
    exit 1
  fi
  
  echo "Using 1Password CLI to retrieve credentials..."
  
  # Check if user is signed in
  if ! op account list >/dev/null 2>&1; then
    echo "Please sign in to 1Password CLI first:"
    echo "op signin"
    exit 1
  fi
  
  # Prompt for item name or use default
  echo "Enter the name of your 1Password item containing Kroger credentials"
  echo "(or press Enter to use 'Kroger API'):"
  read -r ITEM_NAME
  ITEM_NAME=${ITEM_NAME:-"Kroger API"}
  
  # Retrieve credentials
  echo "Retrieving credentials from 1Password..."
  CLIENT_ID=$(op item get "$ITEM_NAME" --fields "client_id" 2>/dev/null)
  CLIENT_SECRET=$(op item get "$ITEM_NAME" --fields "client_secret" 2>/dev/null)
  
  if [ -z "$CLIENT_ID" ] || [ -z "$CLIENT_SECRET" ]; then
    echo "Error: Could not retrieve credentials from 1Password."
    echo "Please make sure you have an item named '$ITEM_NAME' with fields 'client_id' and 'client_secret'."
    exit 1
  fi
  
  echo "Credentials retrieved successfully."
}

# Parse command line arguments
CREDENTIAL_SOURCE="file"  # Default to .env file

while [ "$#" -gt 0 ]; do
  case "$1" in
    -e|--env)
      CREDENTIAL_SOURCE="env"
      shift
      ;;
    -f|--file)
      CREDENTIAL_SOURCE="file"
      shift
      ;;
    -1|--onepass)
      CREDENTIAL_SOURCE="1password"
      shift
      ;;
    -h|--help)
      print_usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      print_usage
      exit 1
      ;;
  esac
done

# Load credentials from the selected source
case "$CREDENTIAL_SOURCE" in
  "env")
    load_from_env_vars
    ;;
  "file")
    load_from_env_file
    ;;
  "1password")
    load_from_1password
    ;;
esac

# Create a temporary file for the response
TEMP_FILE=$(mktemp)
VERBOSE_LOG=$(mktemp)
trap 'rm -f $TEMP_FILE $VERBOSE_LOG' EXIT

# Print debug info (without exposing full secrets)
echo "Debug info:"
echo "- API URL: $API/connect/oauth2/token"
echo "- Client ID: ${CLIENT_ID:0:10}...${CLIENT_ID: -10}"
echo "- Credential source: $CREDENTIAL_SOURCE"
echo ""

# Request the token using curl's built-in basic auth
echo "Requesting Kroger API token..."
HTTP_STATUS=$(curl -s -o "$TEMP_FILE" -w "%{http_code}" \
  -X POST \
  "$API/connect/oauth2/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Accept: application/json" \
  --compressed \
  -u "$CLIENT_ID:$CLIENT_SECRET" \
  -d "grant_type=client_credentials" 2>"$VERBOSE_LOG")

# Check if the request was successful
if [ "$HTTP_STATUS" -eq 200 ]; then
  echo "Success! Token saved to 'krogertoken' file"
  
  # Copy the response to the krogertoken file
  cp "$TEMP_FILE" krogertoken
  
  # Extract token information
  TOKEN_TYPE=$(grep -o '"token_type":"[^"]*"' krogertoken | cut -d'"' -f4)
  EXPIRES_IN=$(grep -o '"expires_in":[0-9]*' krogertoken | cut -d':' -f2)
  
  # Format the output
  echo ""
  echo "Token details:"
  echo "-------------"
  echo "Type: $TOKEN_TYPE"
  
  if [ -n "$EXPIRES_IN" ]; then
    MINUTES=$(echo "$EXPIRES_IN / 60" | bc)
    echo "Expires in: $EXPIRES_IN seconds ($MINUTES minutes)"
    # Calculate expiration time
    EXPIRY_TIME=$(date -v+${EXPIRES_IN}S 2>/dev/null || date -d "+${EXPIRES_IN} seconds" 2>/dev/null || echo "Unknown")
    if [ "$EXPIRY_TIME" != "Unknown" ]; then
      echo "Expiration time: $EXPIRY_TIME"
    fi
  fi
  
  echo "Token saved to: $(pwd)/krogertoken"
  echo ""
  echo "To use this token in API requests, include the following header:"
  echo "Authorization: Bearer <token>"
else
  echo "Error: HTTP status $HTTP_STATUS"
  
  # Copy the response to the krogertoken file
  cp "$TEMP_FILE" krogertoken
  
  echo "Response body:"
  cat krogertoken
  
  echo ""
  echo "Verbose log (for debugging):"
  cat "$VERBOSE_LOG" | grep -v "Authorization: Basic"
  
  echo ""
  echo "The authentication failed. This could be due to:"
  echo "1. Incorrect CLIENT_ID or CLIENT_SECRET"
  echo "2. Expired or revoked credentials"
  echo "3. API endpoint restrictions"
  echo ""
  echo "Please check your credentials and try again."
fi
