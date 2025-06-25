import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { GoogleAuth } from "google-auth-library";
import fs from "fs";
import path from "path";

// ---- TypeScript interfaces ----
interface GcloudCommandArgs {
  command: string;
}
interface ComputeInstance {
  name: string;
  machineType: string;
  status: string;
  labels?: Record<string, string>;
}
interface ComputeInstanceListResponse {
  items?: ComputeInstance[];
}
interface ComputeOperationResponse {
  id: string;
  status: string;
  selfLink: string;
  targetLink?: string;
}
interface VmConfig {
  name: string;
  machineType: string;
  disks: Array<{
    boot: boolean;
    autoDelete: boolean;
    initializeParams: {
      sourceImage: string;
    };
  }>;
  networkInterfaces: Array<{
    network: string;
    accessConfigs: Array<{
      type: string;
      name: string;
    }>;
  }>;
  labels: {
    framework: string;
  };
  guestAccelerators?: Array<{
    acceleratorType: string;
    acceleratorCount: number;
  }>;
  scheduling?: {
    onHostMaintenance: string;
    automaticRestart: boolean;
  };
}

// ---- Google Cloud Auth ----
const keyPath = path.resolve(
  "D:/Everything/adya_mcp_hackathon-main/mcp_servers/js/servers/MCP-TFE/gcp-service-account.json"
);

console.log("[TFE] Checking service account at:", keyPath);

if (!fs.existsSync(keyPath)) {
  throw new Error(
    `Google Cloud service account key file not found at ${keyPath}. Please place your key file in the MCP-TFE directory.`
  );
}

const keys = JSON.parse(fs.readFileSync(keyPath, "utf8"));
console.log("[TFE] Successfully loaded service account credentials");

const auth = new GoogleAuth({
  credentials: keys,
  scopes: ["https://www.googleapis.com/auth/cloud-platform"]
});
const client = await auth.getClient();
const projectId = await auth.getProjectId();
console.log(`[TFE] Authenticated with project: ${projectId}`);

// ---- Tool definitions ----
const tools = [
  {
    name: "createdeeplearningvm",
    description: "Provision VMs with TF Enterprise",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", default: projectId },
        zone: { type: "string" },
        vmName: { type: "string" },
        machineType: { 
          type: "string",
          enum: ["n1-standard-4", "n1-highmem-8", "a2-highgpu-1g"]
        },
        framework: { type: "string" },
        accelerator: { 
          type: "string",
          enum: ["NVIDIA_TESLA_T4", "NVIDIA_TESLA_V100", "NVIDIA_A100"]
        }
      },
      required: ["zone", "vmName", "machineType", "framework"]
    }
  },
  {
    name: "deploycontainerinstance",
    description: "Start TF containers on GCE",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", default: projectId },
        zone: { type: "string", default: "us-central1-a" },
        machineType: { type: "string", default: "n1-standard-1" },
        vmNameBase: { type: "string", default: "container-vm" },
        containerImage: { type: "string" },
        replicas: { type: "number", default: 1 }
      },
      required: ["containerImage"]
    }
  },
  {
    name: "terraformapply",
    description: "Infrastructure as code automation",
    inputSchema: {
      type: "object",
      properties: {
        configPath: { type: "string" },
        variables: { type: "object" }
      },
      required: ["configPath"]
    }
  },
  {
    name: "createnotebookinstance",
    description: "Provision AI Platform Notebooks",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", default: projectId },
        instanceName: { type: "string" },
        machineType: { type: "string" },
        framework: { type: "string" },
        zone: { type: "string", default: "us-central1-a" },
        acceleratorType: {
          type: "string",
          enum: ["NVIDIA_TESLA_T4", "NVIDIA_TESLA_V100", "NVIDIA_A100", "NONE"],
          default: "NONE"
        },
        acceleratorCount: { type: "number", default: 0, minimum: 0, maximum: 8 }
      },
      required: ["instanceName", "machineType", "framework", "zone"]
    }
  },
  {
    name: "submittrainingjob",
    description: "Distributed/managed model training",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", default: projectId },
        jobName: { type: "string" },
        datasetUri: { type: "string" },
        modelType: { type: "string" },
        scaleTier: { type: "string" },
        epochs: { type: "number" }
      },
      required: ["jobName", "datasetUri", "modelType", "scaleTier"]
    }
  },
  {
    name: "monitortrainingjob",
    description: "Fetch logs/status of jobs",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", default: projectId },
        jobId: { type: "string" }
      },
      required: ["jobId"]
    }
  },
  {
    name: "sharetensorboarddashboard",
    description: "Share TensorBoard metrics",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", default: projectId },
        logDir: { type: "string" },
        shareWith: { type: "array", items: { type: "string" } }
      },
      required: ["logDir", "shareWith"]
    }

  },
  {
    name: "deploymentmanagerapply",
    description: "Batch deploy resources",
    inputSchema: {
      type: "object",
      properties: {
        configPath: { type: "string" }
      },
      required: ["configPath"]
    }
  },
  {
    name: "gcloudcommand",
    description: "Run custom gcloud operations",
    inputSchema: {
      type: "object",
      properties: {
        command: { type: "string" }
      },
      required: ["command"]
    }
  },
  {
    name: "listavailableimages",
    description: "Discover TF Enterprise images",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "listactiveinstances",
    description: "Inventory running resources",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", default: projectId },
        zone: { type: "string" }
      },
      required: ["zone"]
    }
  }
];

// ---- MCP Server ----
const server = new Server(
  {
    name: "MCP-TFE",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// ---- Tool List Handler ----
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// ---- Tool Execution Handler ----
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = tools.find(t => t.name === request.params.name);
  if (!tool) {
    throw new McpError(ErrorCode.MethodNotFound, "Tool not found");
  }

  let result: any;
  try {
    switch (request.params.name) {
      case "createdeeplearningvm":
        result = await createDeepLearningVM(request.params.arguments);
        break;
      case "deploycontainerinstance":
        result = await deployContainerInstance(request.params.arguments);
        break;
      case "terraformapply":
      case "createnotebookinstance":
      case "submittrainingjob":
      case "monitortrainingjob":
      case "sharetensorboarddashboard":
      case "deploymentmanagerapply":
      case "gcloudcommand":
        // Type-safe argument handling
        if (!request.params.arguments || typeof request.params.arguments !== 'object') {
          throw new McpError(ErrorCode.InvalidParams, "Arguments must be an object");
        }
        const args = request.params.arguments as Record<string, unknown>;
        if (typeof args.command !== 'string') {
          throw new McpError(ErrorCode.InvalidParams, "Command must be a string");
        }
        result = await gcloudcommand({ command: args.command });
        break;
      case "listavailableimages":
        result = { message: `${request.params.name} stub executed.` };
        break;
      case "listactiveinstances":
        result = await listActiveInstances(request.params.arguments);
        break;
      default:
        result = { message: `Executed ${request.params.name} successfully` };
    }
    console.log(`[TFE] Tool ${request.params.name} executed successfully`);
  } catch (error: any) {
    console.error(`[TFE] Tool ${request.params.name} failed:`, error.message);
    throw new McpError(
      ErrorCode.InternalError,
      `${tool.name} failed: ${error.message}`
    );
  }
  return {
    toolResult: result
  };
});

// ---- Deep Learning VM Creation ----
async function createDeepLearningVM(args: any) {
  const { 
    projectId = await auth.getProjectId(), 
    zone, 
    vmName, 
    machineType, 
    framework, 
    accelerator 
  } = args;

  // Determine image family based on framework
  let imageFamily: string;
  const frameworkLower = framework.toLowerCase();
  
  if (frameworkLower.includes("tensorflow")) {
    if (frameworkLower.includes("enterprise")) {
      imageFamily = accelerator ? "tf-ent-latest-gpu" : "tf-ent-latest-cpu";
    } else {
      // Use latest stable TF version
      imageFamily = accelerator ? "tf-2-15-cu122" : "tf-2-15-cpu";
    }
  } else if (frameworkLower.includes("pytorch")) {
    imageFamily = accelerator ? "pytorch-latest-gpu" : "pytorch-latest-cpu";
  } else {
    throw new Error(`Unsupported framework: ${framework}. Supported: TensorFlow, PyTorch, TensorFlow Enterprise`);
  }

  // Compose VM config
  const vmConfig: VmConfig = {
    name: vmName,
    machineType: `zones/${zone}/machineTypes/${machineType}`,
    disks: [{
      boot: true,
      autoDelete: true,
      initializeParams: {
        sourceImage: `projects/deeplearning-platform-release/global/images/family/${imageFamily}`
      }
    }],
    networkInterfaces: [{
      network: "global/networks/default",
      accessConfigs: [{
        type: "ONE_TO_ONE_NAT",
        name: "External NAT"
      }]
    }],
    labels: {
      framework: framework.toLowerCase().replace(/_/g, '-')
    }
  };

  // Add GPU if specified
  if (accelerator) {
    vmConfig.guestAccelerators = [{
      acceleratorType: `zones/${zone}/acceleratorTypes/${accelerator}`,
      acceleratorCount: 1
    }];
    vmConfig.scheduling = {
      onHostMaintenance: "TERMINATE",
      automaticRestart: false
    };
  }

  const url = `https://compute.googleapis.com/compute/v1/projects/${projectId}/zones/${zone}/instances`;
  try {
    const response = await client.request<ComputeOperationResponse>({
      url,
      method: "POST",
      data: vmConfig
    });

    return {
      operationId: response.data.id,
      status: response.data.status,
      selfLink: response.data.selfLink,
      targetLink: response.data.targetLink
    };
  } catch (error: any) {
    if (error.response?.data?.error) {
      const gcpError = error.response.data.error;
      throw new Error(`GCP Error [${gcpError.code}]: ${gcpError.message}`);
    }
    throw new Error(`VM creation failed: ${error.message}`);
  }
}

// ---- Container Instance Deployment ----
async function deployContainerInstance(args: any) {
  const { 
    projectId = await auth.getProjectId(),
    zone = "us-central1-a",
    machineType = "n1-standard-1",
    vmNameBase = "container-vm",
    containerImage,
    replicas = 1
  } = args;

  // Validate required parameters
  if (!containerImage) {
    throw new Error("containerImage is required");
  }

  const operations = [];
  
  for (let i = 0; i < replicas; i++) {
    const vmName = `${vmNameBase}-${Date.now()}-${i}`;
    
    // Container declaration (YAML format)
    const containerDeclaration = `
spec:
  containers:
  - name: ${vmName}-container
    image: ${containerImage}
    stdin: false
    tty: false
  restartPolicy: Always
`.trim();

    const vmConfig = {
      name: vmName,
      machineType: `zones/${zone}/machineTypes/${machineType}`,
      disks: [{
        boot: true,
        autoDelete: true,
        initializeParams: {
          sourceImage: "projects/cos-cloud/global/images/family/cos-stable"
        }
      }],
      networkInterfaces: [{
        network: "global/networks/default",
        accessConfigs: [{
          type: "ONE_TO_ONE_NAT",
          name: "External NAT"
        }]
      }],
      metadata: {
        items: [{
          key: "gce-container-declaration",
          value: containerDeclaration
        }]
      },
      labels: {
        deployment: "container-instance",
        timestamp: Date.now().toString()
      }
    };
     const apiUrl = `https://compute.googleapis.com/compute/v1/projects/${projectId}/zones/${zone}/instances`;
    // Type assertion for response
    const response = await client.request<ComputeOperationResponse>({
      url: apiUrl,
      method: "POST",
      data: vmConfig
    });

    const operationData = response.data as ComputeOperationResponse;

    operations.push({
      vmName: vmName,
      operationId: operationData.id,
      status: operationData.status,
      selfLink: operationData.selfLink
    });
  }

  return {
    message: `Deployed ${replicas} container instance(s)`,
    operations: operations,
    containerImage: containerImage,
    serviceEndpoint: `http://${operations[0].vmName}:8501` // Example endpoint
  };
}

async function gcloudcommand(args: GcloudCommandArgs) {
  const { command } = args;
  if (!command) {
    throw new Error('gcloud command is required');
  }

  try {
    const { stdout, stderr } = await promisify(exec)(`gcloud ${command}`);
      
    if (stderr) {
      console.warn(`[gcloud stderr] ${stderr}`);
    }
    
    return { 
      output: stdout,
      stderr: stderr || ''
    };
  } catch (error: any) {
    throw new Error(`gcloud command failed: ${error.stderr || error.message}`);
  }
}

// ---- List Active Instances ----
async function listActiveInstances(args: any) {
  const { projectId = await auth.getProjectId(), zone } = args;
  const url = `https://compute.googleapis.com/compute/v1/projects/${projectId}/zones/${zone}/instances`;
  const response = await client.request<ComputeInstanceListResponse>({ url });
  const items = response.data.items || [];
  const activeInstances = items.filter(
    (inst: ComputeInstance) => inst.status === "RUNNING"
  );

  return {
    instances: activeInstances.map((i: ComputeInstance) => ({
      name: i.name,
      machineType: i.machineType.split('/').pop() || i.machineType,
      status: i.status,
      framework: i.labels?.framework || "Unknown"
    })),
    count: activeInstances.length
  };
}

// ---- Start the server ----
const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  console.log("TensorFlow Enterprise MCP server is running.");
});
