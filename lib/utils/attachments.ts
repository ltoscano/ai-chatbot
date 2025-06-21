import type { Attachment } from 'ai';

/**
 * Check if LOCAL_FS environment variable is set to TRUE
 */
export function shouldUseLocalFS(): boolean {
  return process.env.LOCAL_FS === 'TRUE';
}

/**
 * Convert attachment from URL to base64 format
 * Uses NEXT_PUBLIC_INTRA_CONTAINER_IMAGE_URL for blob-server communication when available
 * to optimize performance in containerized environments
 */
async function convertAttachmentToBase64(
  attachment: Attachment,
): Promise<Attachment> {
  console.log(`[DEBUG] convertAttachmentToBase64 called with URL: ${attachment.url}`);
  
  try {
    if (!attachment.url) {
      console.log(`[DEBUG] No URL provided, returning original attachment`);
      return attachment;
    }

    // Use intra-container URL if available for better performance
    let fetchUrl = attachment.url;
    const intraContainerImageUrl = process.env.NEXT_PUBLIC_INTRA_CONTAINER_IMAGE_URL;
    
    console.log(`[DEBUG] Original URL: ${attachment.url}`);
    console.log(`[DEBUG] NEXT_PUBLIC_INTRA_CONTAINER_IMAGE_URL: ${intraContainerImageUrl}`);
    console.log(`[DEBUG] URL contains /blob/: ${attachment.url.includes('/blob/')}`);
    console.log(`[DEBUG] Condition check: ${!!(intraContainerImageUrl && attachment.url.includes('/blob/'))}`);
    
    if (intraContainerImageUrl && attachment.url.includes('/blob/')) {
      // Replace the public URL with the intra-container URL
      fetchUrl = attachment.url.replace(
        /^https?:\/\/[^\/]+\/blob/,
        `${intraContainerImageUrl}/blob`
      );
      console.log(`[DEBUG] Using intra-container URL for base64 conversion: ${fetchUrl}`);
    } else {
      console.log(`[DEBUG] Not using intra-container URL, keeping original: ${fetchUrl}`);
    }

    // Fetch the file content from the URL
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      console.error(
        `Failed to fetch attachment: ${response.status} ${response.statusText}`,
      );
      return attachment;
    }

    // Convert to base64
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    // Create data URL with proper MIME type
    const dataUrl = `data:${attachment.contentType || 'application/octet-stream'};base64,${base64}`;

    return {
      ...attachment,
      url: dataUrl,
    };
  } catch (error) {
    console.error('Error converting attachment to base64:', error);
    return attachment; // Return original attachment if conversion fails
  }
}

/**
 * Process attachments based on LOCAL_FS setting
 * If LOCAL_FS=TRUE, convert URL attachments to base64
 */
export async function processAttachments(
  attachments: Attachment[],
): Promise<Attachment[]> {
  console.log(`[DEBUG] processAttachments called with ${attachments.length} attachments`);
  console.log(`[DEBUG] LOCAL_FS setting: ${process.env.LOCAL_FS}`);
  console.log(`[DEBUG] shouldUseLocalFS(): ${shouldUseLocalFS()}`);
  
  if (!shouldUseLocalFS() || !attachments.length) {
    console.log(`[DEBUG] Not processing attachments - LOCAL_FS: ${shouldUseLocalFS()}, attachments count: ${attachments.length}`);
    return attachments;
  }

  console.log(`[DEBUG] Processing attachments...`);
  const processedAttachments = await Promise.all(
    attachments.map(async (attachment) => {
      console.log(`[DEBUG] Processing attachment: ${attachment.url}`);
      // Only convert if it's a URL (not already base64)
      if (attachment.url && !attachment.url.startsWith('data:')) {
        return convertAttachmentToBase64(attachment);
      }
      return attachment;
    }),
  );

  return processedAttachments;
}
