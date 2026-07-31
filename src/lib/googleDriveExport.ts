import { supabase } from '@/integrations/supabase/client';

export interface DriveExportResult {
  success: boolean;
  fileId?: string;
  fileName?: string;
  webViewLink?: string;
  error?: string;
  code?: string;
}

async function exportToDrive(
  fileName: string,
  fileContent: string,
  mimeType: string,
  folderName?: string,
): Promise<DriveExportResult> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const providerToken = sessionData?.session?.provider_token;

    if (!providerToken) {
      return {
        success: false,
        error: 'Google Drive access not available. Please sign out and sign back in with Google to grant Drive permissions.',
        code: 'NO_PROVIDER_TOKEN',
      };
    }

    const { data, error } = await supabase.functions.invoke('export-to-drive', {
      body: {
        fileName,
        fileContent,
        mimeType,
        folderName,
        providerToken,
      },
    });

    if (error) {
      return {
        success: false,
        error: error.message || 'Failed to export to Google Drive',
      };
    }

    if (data.error) {
      return {
        success: false,
        error: data.error,
        code: data.code,
      };
    }

    return {
      success: true,
      fileId: data.fileId,
      fileName: data.fileName,
      webViewLink: data.webViewLink,
    };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      resolve(dataUrl.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function exportPdfBlobToDrive(
  pdfBlob: Blob,
  fileName: string,
  folderName?: string,
): Promise<DriveExportResult> {
  const base64 = await blobToBase64(pdfBlob);
  return exportToDrive(fileName, base64, 'application/pdf', folderName);
}
