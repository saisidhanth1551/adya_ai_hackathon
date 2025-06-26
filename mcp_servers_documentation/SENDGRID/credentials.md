# SendGrid MCP Server Credentials

## Overview
This document provides instructions on obtaining and structuring the credentials needed to connect the SendGrid MCP Server in the Vanij Platform.

---

## Credential Format
```json
{
  "sendgrid-mcp": {
    "api_key": "your-sendgrid-api-key"
  }
}
```

## How to Obtain
- Log in to your SendGrid account.
- Navigate to **Settings > API Keys**.
- Create a new API Key with "Full Access" or at least "Mail Send" and "Marketing Campaigns" permissions.
- Copy the generated API key and use it in the credential format above.

## Notes
- The `api_key` is required for all SendGrid MCP operations.
- Keep your API key secure and do not share it publicly.
- The sender email address you use must be verified in your SendGrid account.
