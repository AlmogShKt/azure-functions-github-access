import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import { Octokit } from "octokit";
import { TableClient } from "@azure/data-tables";
import { z } from "zod";

// ----- Config (env variables) -----
const GH_OWNER = process.env.GH_OWNER!;
const GH_REPO = process.env.GH_REPO!;
const GH_PERMISSION = process.env.GH_PERMISSION || "pull";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN!; // local: in local.settings.json; Azure: via Key Vault reference
const TABLE_CONN = process.env.TABLE_CONN!;
const TABLE_NAME = process.env.TABLE_NAME || "Entitlements";

// ----- Request validation -----
const ReqSchema = z.object({
  email: z.string().email(),
  github_username: z.string().min(1),
  permission: z
    .enum(["pull", "triage", "push", "maintain", "admin"])
    .optional(),
});

// ----- Table helpers -----
type EntRow = {
  partitionKey: string;
  rowKey: string;
  email?: string;
  status?: "pending" | "invited" | "active" | "revoked" | "expired";
  permission?: string;
  invitation_id?: string;
  source?: string;
  created_at?: string;
  updated_at?: string;
  expires_at?: string;
};

// Initialize TableClient lazily to avoid startup errors
let _tableClient: TableClient | null = null;
function getTableClient(): TableClient {
  if (!_tableClient) {
    if (!TABLE_CONN || TABLE_CONN === "your-azure-storage-connection-string") {
      throw new Error(
        "TABLE_CONN environment variable is not properly configured"
      );
    }
    _tableClient = TableClient.fromConnectionString(TABLE_CONN, TABLE_NAME);
  }
  return _tableClient;
}

async function upsertEnt(row: EntRow) {
  const now = new Date().toISOString();
  row.updated_at = now;
  row.created_at = row.created_at ?? now;
  await getTableClient().upsertEntity(row, "Merge");
}

async function getEnt(
  partitionKey: string,
  rowKey: string
): Promise<EntRow | null> {
  try {
    const res = await getTableClient().getEntity<EntRow>(partitionKey, rowKey);
    return res as unknown as EntRow;
  } catch (e: any) {
    if (e.statusCode === 404) return null;
    throw e;
  }
}

// ----- GitHub client (sets User-Agent automatically) -----
const octokit = new Octokit({
  auth: GITHUB_TOKEN,
  userAgent: "repo-access-minimal/1.0",
});

async function inviteCollaborator(username: string, permission: string) {
  const resp = await octokit.request(
    "PUT /repos/{owner}/{repo}/collaborators/{username}",
    {
      owner: GH_OWNER,
      repo: GH_REPO,
      username,
      permission,
    }
  );
  return resp.status; // 201/202/204
}

async function listInvitations() {
  const resp = await octokit.request("GET /repos/{owner}/{repo}/invitations", {
    owner: GH_OWNER,
    repo: GH_REPO,
  });
  return resp.data;
}

// ----- HTTP Function -----
export async function handler(
  req: HttpRequest,
  ctx: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const json = await req.json();
    const parsed = ReqSchema.safeParse(json);
    if (!parsed.success) {
      return {
        status: 400,
        jsonBody: { status: "error", message: parsed.error.flatten() },
      };
    }

    const { email, github_username } = parsed.data;
    const permission = parsed.data.permission ?? GH_PERMISSION;

    const partitionKey = GH_REPO; // single-repo MVP
    const rowKey = github_username.trim();

    // Idempotency: already invited/active?
    const existing = await getEnt(partitionKey, rowKey);
    if (
      existing &&
      (existing.status === "active" || existing.status === "invited")
    ) {
      return {
        status: 200,
        jsonBody: {
          status: "ok",
          message: `@${rowKey} already ${existing.status}.`,
        },
      };
    }

    // Save pending row
    await upsertEnt({
      partitionKey,
      rowKey,
      email,
      status: "pending",
      permission,
      source: "form",
    });

    // Call GitHub
    const status = await inviteCollaborator(rowKey, permission);

    // Determine final state
    const invites = await listInvitations();
    const pending = invites.find(
      (i: any) => i.invitee?.login?.toLowerCase() === rowKey.toLowerCase()
    );

    if (pending) {
      await upsertEnt({
        partitionKey,
        rowKey,
        email,
        status: "invited",
        permission,
        invitation_id: String(pending.id),
      });
      return {
        status: 200,
        jsonBody: { status: "ok", message: `Invitation sent to @${rowKey}.` },
      };
    } else {
      await upsertEnt({
        partitionKey,
        rowKey,
        email,
        status: "active",
        permission,
      });
      return {
        status: 200,
        jsonBody: { status: "ok", message: `@${rowKey} has access.` },
      };
    }
  } catch (err: any) {
    if (err.status === 401 || err.status === 403) {
      return {
        status: 400,
        jsonBody: {
          status: "error",
          message:
            "GitHub token lacks permission (Repo Administration: Read & write).",
        },
      };
    }
    if (err.status === 404) {
      return {
        status: 400,
        jsonBody: {
          status: "error",
          message: "Repo not found or username invalid.",
        },
      };
    }
    return {
      status: 500,
      jsonBody: {
        status: "error",
        message: err?.message ?? "Unexpected error",
      },
    };
  }
}

app.http("request-access", {
  methods: ["POST"],
  authLevel: "anonymous",
  handler,
});
