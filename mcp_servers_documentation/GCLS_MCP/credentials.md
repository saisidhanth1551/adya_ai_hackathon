# WordPress MCP Server Credentials

## Overview
This document provides instructions on obtaining and structuring the credentials needed to connect the GOOGLE CLASSROOM  MCP Server in the Vanij Platform.

---

## Credential Format
```json
{
  "web": {
    "client_id": "YOUR_CLIENT_ID",
    "project_id": "YOUR_PROJECT_ID",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "YOUR_CLIENT_SECRET",
    "redirect_uris": ["http://localhost:5000/oauth2callback"]
  }
}
```
