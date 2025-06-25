# SendGrid MCP Server

## Overview
The SendGrid MCP Server is a connector for the Vanij Platform that enables seamless integration with SendGrid's Email and Marketing APIs. It allows you to send emails, manage contacts, templates, lists, and more, all via a unified Model Context Protocol (MCP) interface.

---

## Features
- Send transactional and marketing emails
- Manage contacts and contact lists
- Create, update, and delete email templates
- Retrieve email statistics and analytics
- Validate email addresses
- Manage suppression groups and verified senders

---

## Setup Instructions
1. **Clone the repository** (if not already done).
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Build the server** (if using TypeScript):
   ```bash
   npm run build
   ```
4. **Start the MCP server**:
   ```bash
   npm start
   ```
   or, if running directly:
   ```bash
   node build/index.js
   ```

---

## Credentials
You need a SendGrid API Key to use this server.

**Credential format:**
```json
{
  "sendgrid-mcp": {
    "api_key": "your-sendgrid-api-key"
  }
}
```
- Obtain your API key from the SendGrid dashboard under **Settings > API Keys**.
- The sender email address you use must be verified in your SendGrid account.

---

## Usage Example (with JSON)
Here is an example of a JSON payload to send an email and add a contact:

```json
{
  "selected_server_credentials": {
    "sendgrid-mcp": {
      "api_key": "your-sendgrid-api-key"
    }
  },
  "client_details": {
    "input": "Send an email and add a contact.",
    "tools": [
      { "function": { "name": "send_email", "description": "Send an email using SendGrid" } },
      { "function": { "name": "add_contact", "description": "Add a contact to your SendGrid marketing contacts" } }
    ],
    "tool_call_arguments": {
      "send_email": {
        "from": "your_verified_sender@example.com",
        "to": "recipient@example.com",
        "subject": "Hello from MCP",
        "text": "This is a test email from MCP client.",
        "html": "<b>This is a test email from MCP client.</b>"
      },
      "add_contact": {
        "email": "recipient@example.com",
        "first_name": "Recipient",
        "last_name": "User"
      }
    }
  },
  "selected_client": "MCP_CLIENT_GEMINI",
  "selected_servers": ["sendgrid-mcp"]
}
```

---

## Supported Tools
- `send_email`: Send an email
- `add_contact`: Add a contact
- `create_contact_list`: Create a contact list
- `list_contacts`: List all contacts
- `delete_contacts`: Delete contacts
- `add_contacts_to_list`: Add contacts to a list
- `create_template`: Create an email template
- `get_template`: Retrieve a template
- `delete_template`: Delete a template
- `validate_email`: Validate an email address
- `get_stats`: Get email statistics
- `list_templates`: List all templates
- `delete_list`: Delete a contact list
- `list_contact_lists`: List all contact lists
- `get_contacts_by_list`: Get contacts in a list
- `list_verified_senders`: List verified senders
- `list_suppression_groups`: List suppression groups
- `send_to_list`: Send an email to a contact list
- `get_single_send`: Get details of a single send
- `list_single_sends`: List all single sends
- `remove_contacts_from_list`: Remove contacts from a list

---

## Troubleshooting
- **400 Bad Request:** Ensure your `from` address is verified in SendGrid and all required fields are provided.
- **Invalid API Key:** Double-check your API key and permissions.
- **Missing Arguments:** Refer to the tool's input schema for required fields.
- **Check Logs:** Detailed error messages are logged to help diagnose issues.

---

## Security Notes
- Keep your API key secure and do not share it publicly.
- All communications should be over HTTPS.
- Only use verified sender addresses for sending emails.

---


