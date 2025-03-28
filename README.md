# Kroger API OAuth2 Client

A secure OAuth2 authentication flow implementation for the Kroger API, featuring a web interface for customer authorization, secure credential handling, and comprehensive token management.

## Features

- Complete OAuth2 authorization flow implementation
- Secure credential storage using environment variables
- Token management (exchange, refresh, and secure storage)
- User-friendly authorization interface
- Comprehensive error handling
- Security best practices for OAuth2

## Technical Implementation

This application implements the following OAuth2 endpoints:

- Authorization endpoint (`/authorize`)
- Token exchange endpoint (`/callback`)
- Token refresh functionality
- Secure token storage with encryption

## Setup Instructions

### Prerequisites

- Node.js 14+ 
- npm or yarn
- Kroger API Developer account with registered application

### Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd kroger-oauth2-client
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create environment configuration:
   ```
   cp .env.example .env
   ```

4. Edit `.env` file with your Kroger API credentials:
   ```
   KROGER_CLIENT_ID=your-client-id
   KROGER_CLIENT_SECRET=your-client-secret
   KROGER_REDIRECT_URI=http://localhost:3000/callback
   SESSION_SECRET=your-session-secret
   ENCRYPTION_KEY=your-32-character-encryption-key
   ```

### Running the Application

Start the development server:
```
npm run dev
```

The application will be available at: http://localhost:3000

## Usage

1. Visit the home page to initiate the OAuth2 flow
2. Click "Connect with Kroger" to start the authorization process
3. After authorization, you'll be redirected to your profile page
4. You can then use the API demo features on the profile page

## Security Features

- CSRF protection using state parameter
- Secure token storage with AES encryption
- HTTP-only cookies for session management
- Token refresh before expiration
- Proper error handling and validation

## API Endpoints

- `/login` - Initiates the OAuth2 flow
- `/callback` - Handles the OAuth2 callback from Kroger
- `/profile` - Displays user profile (protected route)
- `/refresh-token` - Endpoint to manually refresh the access token
- `/logout` - Ends the user session
- `/api/*` - Protected API endpoints that proxy to Kroger API

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.