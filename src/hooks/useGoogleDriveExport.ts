import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExportResult {
  success: boolean;
  fileId?: string;
  fileName?: string;
  webViewLink?: string;
  error?: string;
  code?: string;
}

export function useGoogleDriveExport() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToDrive = async (
    fileName: string,
    fileContent: string, // Base64 encoded
    mimeType: string,
    folderName?: string
  ): Promise<ExportResult> => {
    setIsExporting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('export-to-drive', {
        body: {
          fileName,
          fileContent,
          mimeType,
          folderName,
        },
      });

      if (error) {
        console.error('Export to Drive failed:', error);
        return {
          success: false,
          error: error.message || 'Failed to export to Google Drive',
        };
      }

      if (data.error) {
        console.error('Export to Drive error:', data.error);
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
    } catch (err) {
      console.error('Export to Drive exception:', err);
      return {
        success: false,
        error: String(err),
      };
    } finally {
      setIsExporting(false);
    }
  };

  const exportPdfToDrive = async (
    pdfBlob: Blob,
    fileName: string,
    folderName?: string
  ): Promise<ExportResult> => {
    // Convert blob to base64
    const base64 = await blobToBase64(pdfBlob);
    return exportToDrive(fileName, base64, 'application/pdf', folderName);
  };

  const exportCsvToDrive = async (
    csvContent: string,
    fileName: string,
    folderName?: string
  ): Promise<ExportResult> => {
    // Convert string to base64
    const base64 = btoa(unescape(encodeURIComponent(csvContent)));
    return exportToDrive(fileName, base64, 'text/csv', folderName);
  };

  return {
    isExporting,
    exportToDrive,
    exportPdfToDrive,
    exportCsvToDrive,
  };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
