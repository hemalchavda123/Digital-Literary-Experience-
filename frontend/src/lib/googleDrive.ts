export interface DriveFile {
  id: string;
  name: string;
  size?: string;
  mimeType?: string;
  modifiedTime?: string;
  thumbnailLink?: string;
  iconLink?: string;
}

export function formatFileSize(bytes?: string | number): string {
  if (!bytes) return "Unknown size";
  const num = typeof bytes === "string" ? parseInt(bytes, 10) : bytes;
  if (isNaN(num) || num <= 0) return "Unknown size";
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
}

export function extractDriveFileId(urlOrId: string): string | null {
  if (!urlOrId || typeof urlOrId !== "string") return null;
  const trimmed = urlOrId.trim();

  // If directly an ID
  if (/^[a-zA-Z0-9_-]{20,60}$/.test(trimmed)) {
    return trimmed;
  }

  // /file/d/<id>
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (fileDMatch && fileDMatch[1]) return fileDMatch[1];

  // id=<id>
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
  if (idMatch && idMatch[1]) return idMatch[1];

  return null;
}

export async function listGoogleDrivePdfs(
  accessToken: string,
  searchText: string = ""
): Promise<DriveFile[]> {
  let q = "mimeType='application/pdf' and trashed=false";
  if (searchText.trim()) {
    const escaped = searchText.trim().replace(/['\\]/g, "");
    q += ` and name contains '${escaped}'`;
  }

  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    q
  )}&fields=files(id,name,size,modifiedTime,thumbnailLink,iconLink)&orderBy=modifiedTime desc&pageSize=50`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message =
      errorData?.error?.message ||
      `Google Drive API returned error ${res.status}`;
    throw new Error(message);
  }

  const data = await res.json();
  return (data.files || []) as DriveFile[];
}

/**
 * Open official Google Picker dialog if NEXT_PUBLIC_GOOGLE_API_KEY is available
 */
export function openGooglePicker({
  accessToken,
  apiKey,
  clientId,
  onPick,
  onError,
}: {
  accessToken: string;
  apiKey: string;
  clientId?: string;
  onPick: (file: { id: string; name: string }) => void;
  onError?: (err: any) => void;
}): void {
  const loadPickerScript = () => {
    return new Promise<void>((resolve, reject) => {
      // @ts-ignore
      if (window.gapi && window.google?.picker) {
        resolve();
        return;
      }

      const scriptId = "google-picker-api-script";
      let script = document.getElementById(scriptId) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://apis.google.com/js/api.js";
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
      }

      script.onload = () => {
        // @ts-ignore
        if (window.gapi) {
          // @ts-ignore
          window.gapi.load("picker", {
            callback: () => resolve(),
            onerror: () => reject(new Error("Failed to load Google Picker library")),
          });
        } else {
          reject(new Error("Google API script failed to initialize"));
        }
      };
      script.onerror = () => reject(new Error("Failed to load https://apis.google.com/js/api.js"));
    });
  };

  loadPickerScript()
    .then(() => {
      // @ts-ignore
      const google = window.google;
      if (!google?.picker) {
        throw new Error("Google Picker is not available");
      }

      const view = new google.picker.DocsView(google.picker.ViewId.DOCS)
        .setMimeTypes("application/pdf")
        .setMode(google.picker.DocsViewMode.LIST);

      const appId = clientId ? clientId.split("-")[0] : "";

      const builder = new google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(accessToken)
        .setDeveloperKey(apiKey)
        .setCallback((data: any) => {
          if (data.action === google.picker.Action.PICKED) {
            const doc = data.docs?.[0];
            if (doc) {
              onPick({ id: doc.id, name: doc.name });
            }
          }
        });

      if (appId) {
        builder.setAppId(appId);
      }

      const picker = builder.build();
      picker.setVisible(true);
    })
    .catch((err) => {
      console.error("Failed to open Google Picker:", err);
      if (onError) onError(err);
    });
}
