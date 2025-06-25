# WordPress MCP Server – Demos and Payload Examples

## 🎥 Demo Video
- **MCP server setup explanation + API Execution + Features Testing**: [Watch Here](https://drive.google.com/drive/folders/17zbFX6Fw85evWqmiq7tdUT10mEQHDZSB?usp=sharing)

---

## 🎥 Credentials Gathering Video
- **Gathering Credentials & Setup(Full ene - to - end video)**: [Watch Here](https://drive.google.com/drive/folders/17zbFX6Fw85evWqmiq7tdUT10mEQHDZSB?usp=sharing)

---

## 🔐 Credential JSON Payload
Example payload format for sending credentials to the MCP Server which going to be use it in Client API paylod:
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
