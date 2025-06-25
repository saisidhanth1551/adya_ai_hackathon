# Todoist MCP Server Overview

## What is the Todoist MCP Server?
The Todoist MCP Server is a connector within the Vanij Platform that enables seamless integration with Todoist’s task management platform using the Todoist REST API.

---

## Key Features
- ✅ Create and manage tasks and projects
- ✅ Retrieve active, completed, and archived tasks
- ✅ Add labels, priorities, comments, and due dates to tasks
- ✅ Use secure, token-based authenticated REST calls

---

## Capabilities
| Capability            | Description                                         |
|------------------------|-----------------------------------------------------|
| Task Management        | Create, update, delete, and fetch tasks             |
| Project Handling       | Retrieve and manage Todoist projects                |
| Label & Priority       | Assign labels, priorities, and due dates to tasks   |
| Commenting Support     | Add and read comments on tasks                      |
| Completed Task Access  | Fetch completed tasks with filters                  |

---

## Supported Todoist Features
- Todoist REST API v9+
- Requires a valid OAuth or personal access token

---

## Security Notes
- Authenticated via **OAuth token** or **API token**
- Respects user-based permissions from Todoist
- All communications must be secured over HTTPS

---

## Integration Use Cases
- Productivity dashboards and reminders
- Task syncing with CRM, calendars, or email services
- Automation of personal or team task workflows
