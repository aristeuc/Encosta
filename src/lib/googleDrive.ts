import { google } from "googleapis";
import { Readable } from "node:stream";

function isConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY &&
      process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID,
  );
}

function normalizePrivateKey(raw: string): string {
  let key = raw.trim();
  // Strip a surrounding pair of quotes some users leave in when pasting the
  // JSON key file's "private_key" field value (including the quotes).
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  // Private keys are usually stored in env vars with literal "\n" — convert back to real newlines.
  key = key.replace(/\\n/g, "\n").replace(/\\r/g, "");
  return key;
}

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!.trim();
  const key = normalizePrivateKey(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!);
  if (!key.includes("BEGIN PRIVATE KEY")) {
    throw new Error(
      'A chave privada da conta de serviço (GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) não parece válida — tem de começar por "-----BEGIN PRIVATE KEY-----". Confirme que colou o valor completo do campo "private_key" do ficheiro JSON descarregado da Google.',
    );
  }
  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
}

function getDrive() {
  return google.drive({ version: "v3", auth: getAuth() });
}

export interface DriveFolderResult {
  ok: boolean;
  id?: string;
  url?: string;
  error?: string;
}

export async function createProjectFolder(projectName: string): Promise<DriveFolderResult> {
  if (!isConfigured()) {
    return { ok: false, error: "Google Drive não está configurado (defina GOOGLE_SERVICE_ACCOUNT_*/GOOGLE_DRIVE_ROOT_FOLDER_ID)." };
  }
  try {
    const drive = getDrive();
    const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!;
    const res = await drive.files.create({
      requestBody: {
        name: projectName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [rootFolderId],
      },
      fields: "id, webViewLink",
    });
    return { ok: true, id: res.data.id ?? undefined, url: res.data.webViewLink ?? undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface DriveFileResult {
  ok: boolean;
  id?: string;
  url?: string;
  error?: string;
}

export async function uploadFileToFolder(
  folderId: string,
  filename: string,
  mimeType: string,
  buffer: Buffer,
): Promise<DriveFileResult> {
  if (!isConfigured()) {
    return { ok: false, error: "Google Drive não está configurado." };
  }
  try {
    const drive = getDrive();
    const res = await drive.files.create({
      requestBody: { name: filename, parents: [folderId] },
      media: { mimeType, body: Readable.from(buffer) },
      fields: "id, webViewLink",
    });
    return { ok: true, id: res.data.id ?? undefined, url: res.data.webViewLink ?? undefined };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  modifiedTime?: string;
}

export async function listFilesInFolder(folderId: string): Promise<DriveFile[]> {
  if (!isConfigured()) return [];
  const drive = getDrive();
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, mimeType, webViewLink, modifiedTime)",
    orderBy: "modifiedTime desc",
  });
  return (res.data.files ?? []).map((f) => ({
    id: f.id!,
    name: f.name ?? "",
    mimeType: f.mimeType ?? "",
    webViewLink: f.webViewLink ?? undefined,
    modifiedTime: f.modifiedTime ?? undefined,
  }));
}

export { isConfigured as isGoogleDriveConfigured };
