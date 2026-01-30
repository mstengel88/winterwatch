import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ExportRequest {
  fileName: string;
  fileContent: string; // Base64 encoded file content
  mimeType: string;
  folderName?: string; // Optional folder to create/use in Drive
  providerToken: string; // Google OAuth provider token from client
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.error("Missing or invalid authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user and get claims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("Failed to verify JWT:", claimsError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log("User authenticated:", userId);

    // Parse request body
    const body: ExportRequest = await req.json();
    const { fileName, fileContent, mimeType, folderName, providerToken } = body;

    if (!fileName || !fileContent || !mimeType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: fileName, fileContent, mimeType" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!providerToken) {
      console.error("No Google provider token provided in request body");
      return new Response(
        JSON.stringify({ 
          error: "Google Drive access not available. Please sign out and sign back in with Google to grant Drive permissions.",
          code: "NO_PROVIDER_TOKEN"
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Uploading file: ${fileName}, type: ${mimeType}`);

    let folderId: string | null = null;

    // If folder name is specified, find or create it
    if (folderName) {
      // Search for existing folder
      const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(folderName)}' and mimeType='application/vnd.google-apps.folder' and trashed=false&spaces=drive`;
      
      const searchRes = await fetch(searchUrl, {
        headers: { Authorization: `Bearer ${providerToken}` },
      });

      if (!searchRes.ok) {
        const errText = await searchRes.text();
        console.error("Failed to search for folder:", errText);
        
        if (searchRes.status === 401) {
          return new Response(
            JSON.stringify({ 
              error: "Google Drive token expired. Please sign out and sign back in with Google.",
              code: "TOKEN_EXPIRED"
            }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        const searchData = await searchRes.json();
        
        if (searchData.files && searchData.files.length > 0) {
          folderId = searchData.files[0].id;
          console.log(`Found existing folder: ${folderId}`);
        } else {
          // Create the folder
          const createFolderRes = await fetch(
            "https://www.googleapis.com/drive/v3/files",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${providerToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name: folderName,
                mimeType: "application/vnd.google-apps.folder",
              }),
            }
          );

          if (!createFolderRes.ok) {
            const errText = await createFolderRes.text();
            console.error("Failed to create folder:", errText);
          } else {
            const folderData = await createFolderRes.json();
            folderId = folderData.id;
            console.log(`Created new folder: ${folderId}`);
          }
        }
      }
    }

    // Decode base64 content
    const binaryContent = Uint8Array.from(atob(fileContent), (c) => c.charCodeAt(0));

    // Prepare file metadata
    const metadata: Record<string, unknown> = {
      name: fileName,
      mimeType: mimeType,
    };

    if (folderId) {
      metadata.parents = [folderId];
    }

    // Create multipart upload body
    const boundary = "winterwatch_boundary_" + Date.now();
    const metadataStr = JSON.stringify(metadata);

    // Build the multipart body manually
    const encoder = new TextEncoder();
    const metadataPart = encoder.encode(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadataStr}\r\n`
    );
    const filePart1 = encoder.encode(
      `--${boundary}\r\nContent-Type: ${mimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n`
    );
    const filePart2 = encoder.encode(`\r\n--${boundary}--`);

    // Combine all parts
    const bodyParts = new Uint8Array(
      metadataPart.length + filePart1.length + binaryContent.length + filePart2.length
    );
    let offset = 0;
    bodyParts.set(metadataPart, offset);
    offset += metadataPart.length;
    bodyParts.set(filePart1, offset);
    offset += filePart1.length;
    bodyParts.set(binaryContent, offset);
    offset += binaryContent.length;
    bodyParts.set(filePart2, offset);

    // Upload to Google Drive
    const uploadRes = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${providerToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body: bodyParts,
      }
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error("Google Drive upload failed:", errText);
      
      if (uploadRes.status === 401 || uploadRes.status === 403) {
        return new Response(
          JSON.stringify({ 
            error: "Google Drive access denied. Please sign out and sign back in with Google to grant Drive permissions.",
            code: "ACCESS_DENIED"
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to upload to Google Drive", details: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const uploadData = await uploadRes.json();
    console.log("File uploaded successfully:", uploadData);

    return new Response(
      JSON.stringify({
        success: true,
        fileId: uploadData.id,
        fileName: uploadData.name,
        webViewLink: uploadData.webViewLink,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Export to Drive error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
