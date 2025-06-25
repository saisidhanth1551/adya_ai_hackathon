export const ClientsConfig:any = [
    "MCP_CLIENT_OPENAI",
    "MCP_CLIENT_AZURE_AI",
    "MCP_CLIENT_GEMINI",
    // "CLAUDE",
]

export const ServersConfig:any = [
    {
        server_name :"WORDPRESS",
        server_features_and_capability:`WORDPRESS`,
        path : "build/index.js"
    },
    {
        server_name :"WOOCOMMERCE",
        server_features_and_capability:`WOOCOMMERCE`,
        path : "build/index.js"
    },
    {
        server_name :"TODOIST",
        server_features_and_capability:`TODOIST`,
        path : "build/index.js"
    },
    // {
    //     server_name :"WORDPRESS",
    //     server_features_and_capability:`WORDPRESS`,
    //     path : "build/index.js"
    // }
]

