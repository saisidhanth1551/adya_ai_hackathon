from collections.abc import Sequence
from mcp.types import (
    Tool,
    TextContent,
    ImageContent,
    EmbeddedResource,
)

from . import gauth

USER_ID_ARG = "__user_id__"
CREDENTIALS_ARG = "__credentials__"

class ToolHandler():
    def __init__(self, tool_name: str):
        self.name = tool_name

    def get_account_descriptions(self) -> list[str]:
        return [a.to_description() for a in gauth.get_account_info()]
    
    # we ingest this information into every tool that requires a specified __user_id__. 
    # we also add what information actually can be used (account info). This way Claude
    # will know what to do.
    def get_supported_emails_tool_text(self) -> str:
        return f"""This tool requires a authorized Google account email for {USER_ID_ARG} argument. You can choose one of: {', '.join(self.get_account_descriptions())}"""

    def get_user_id_arg_schema(self) -> dict:
        return {
            "type": "string",
            "description": f"The EMAIL of the Google account for which you are executing this action. Can be one of: {', '.join(self.get_account_descriptions())}"
        }

    def get_tool_description(self) -> Tool:
        raise NotImplementedError()

    def run_tool(self, args: dict) -> Sequence[TextContent | ImageContent | EmbeddedResource]:
        raise NotImplementedError()