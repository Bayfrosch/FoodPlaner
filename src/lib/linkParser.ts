/**
 * Parses text and extracts URLs to return an array of text and link nodes
 * @param text The text to parse
 * @returns Array of objects with type ('text' or 'link') and content
 */
export function parseLinks(text: string): Array<{ type: 'text' | 'link'; content: string }> {
  // URL regex pattern that matches http, https, www, and common protocols
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;

  const parts: Array<{ type: 'text' | 'link'; content: string }> = [];
  let lastIndex = 0;
  let match;

  // Create a new regex instance for each match iteration
  const regex = new RegExp(urlRegex);

  while ((match = regex.exec(text)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex, match.index),
      });
    }

    // Add the URL as a link
    let url = match[0];
    // Ensure the URL has a protocol for proper linking
    if (url.startsWith('www.')) {
      url = 'https://' + url;
    }

    parts.push({
      type: 'link',
      content: match[0], // Keep original for display
    });

    lastIndex = regex.lastIndex;
  }

  // Add any remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex),
    });
  }

  // If no URLs were found, return the original text as-is
  if (parts.length === 0) {
    return [{ type: 'text', content: text }];
  }

  return parts;
}
