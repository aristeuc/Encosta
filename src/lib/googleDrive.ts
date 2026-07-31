import { google } from "googleapis";
import { Readable } from "node:stream";

function isConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY &&
      process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID,
  );
}

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!;
  // Private keys are usually stored in env vars with literal "\n" — convert back to real newlines.
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY!.replace(/\\n/g, "\n");
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
