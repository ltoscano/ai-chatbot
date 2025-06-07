import type { Attachment } from 'ai';

/**
 * Check if LOCAL_FS environment variable is set to TRUE
 */
export function shouldUseLocalFS(): boolean {
  return process.env.LOCAL_FS === 'TRUE';
}

/**
 * Convert attachment from URL to base64 format
 */
async function convertAttachmentToBase64(
  attachment: Attachment,
): Promise<Attachment> {
  try {
    if (!attachment.url) {
      return attachment;
    }

    // Fetch the file content from the URL
    const response = await fetch(attachment.url);
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
  if (!shouldUseLocalFS() || !attachments.length) {
    return attachments;
  }

  const processedAttachments = await Promise.all(
    attachments.map(async (attachment) => {
      // Only convert if it's a URL (not already base64)
      if (attachment.url && !attachment.url.startsWith('data:')) {
        return convertAttachmentToBase64(attachment);
      }
      return attachment;
    }),
  );

  return processedAttachments;
}
