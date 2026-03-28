export interface ParsedTextSegment {
  type: 'text' | 'phone' | 'email' | 'website';
  content: string;
  href?: string;
}

export function parseTextForLinks(text: string): ParsedTextSegment[] {
  const segments: ParsedTextSegment[] = [];
  
  // Enhanced regex patterns for better detection
  const phoneRegex = /(\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})|\b(911|988|211|\d{1}-800-\d{3}-\d{4})\b)/g;
  const emailRegex = /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g;
  const websiteRegex = /(https?:\/\/[^\s<>"'[\]()]+(?:\([^\s<>"'[\]()]*\))?[^\s<>"'[\]()]*|(?:www\.)?[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}(?:\/[^\s<>"'[\]()]*)?)/g;
  
  let lastIndex = 0;
  const matches: { index: number; length: number; type: 'phone' | 'email' | 'website'; content: string; href: string }[] = [];
  
  // Find all matches
  let match;
  
  // Phone numbers
  while ((match = phoneRegex.exec(text)) !== null) {
    matches.push({
      index: match.index,
      length: match[0].length,
      type: 'phone',
      content: match[0],
      href: `tel:${match[0].replace(/[^\d]/g, '')}`
    });
  }
  
  // Emails
  while ((match = emailRegex.exec(text)) !== null) {
    matches.push({
      index: match.index,
      length: match[0].length,
      type: 'email',
      content: match[0],
      href: `mailto:${match[0]}`
    });
  }
  
  // Websites
  while ((match = websiteRegex.exec(text)) !== null) {
    const url = match[0];
    const href = url.startsWith('http') ? url : `https://${url}`;
    matches.push({
      index: match.index,
      length: match[0].length,
      type: 'website',
      content: match[0],
      href
    });
  }
  
  // Sort matches by index
  matches.sort((a, b) => a.index - b.index);
  
  // Build segments
  matches.forEach(match => {
    // Add text before the match
    if (lastIndex < match.index) {
      const beforeText = text.slice(lastIndex, match.index);
      if (beforeText.trim()) {
        segments.push({ type: 'text', content: beforeText });
      }
    }
    
    // Add the match
    segments.push({
      type: match.type,
      content: match.content,
      href: match.href
    });
    
    lastIndex = match.index + match.length;
  });
  
  // Add remaining text
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex);
    if (remainingText.trim()) {
      segments.push({ type: 'text', content: remainingText });
    }
  }
  
  // If no matches found, return the whole text as a single segment
  if (segments.length === 0) {
    segments.push({ type: 'text', content: text });
  }
  
  return segments;
}

export function formatAIResponse(text: string): string {
  // Enhanced formatting for ChatGPT-like appearance
  return text
    // Preserve and enhance paragraph breaks
    .replace(/\n\n/g, '\n\n')
    // Preserve markdown formatting (don't strip it)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold to HTML
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>') // Italic to HTML
    // Enhanced bullet point formatting
    .replace(/^[\s]*[-*+]\s/gm, '• ')
    // Enhanced numbered list formatting  
    .replace(/^[\s]*(\d+)[.)]\s/gm, '$1. ')
    // Format phone numbers
    .replace(/\b(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})\b/g, '$1')
    // Clean up extra whitespace while preserving intentional breaks
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

export function renderFormattedText(text: string): string {
  const formatted = formatAIResponse(text);
  return formatted
    .split('\n')
    .map(line => line.trim())
    .join('\n');
}