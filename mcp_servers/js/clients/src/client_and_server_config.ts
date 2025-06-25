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
    {
        server_name :"MCP-TFE",
        server_features_and_capability:`MCP-TFE`,
        path : "build/index.js"
    },
    {
        server_name: "GCLS_MCP",
        server_features_and_capability: "GOOGLE CLASSROOM",
        path: "index.js"
    }
    // {
    //     server_name :"WORDPRESS",
    //     server_features_and_capability:`WORDPRESS`,
    //     path : "build/index.js"
    // }
]

