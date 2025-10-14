/**
 * Get display text for an element badge
 * Format:
 * - If ID exists: tag#id (e.g., "div#user-profile")
 * - If no ID but class exists: tag.class (e.g., "div.container")
 * - If neither: tag (e.g., "div")
 */
export function getElementDisplayText(element: {
  tag: string;
  id?: string;
  classes?: string;
}): string {
  const tag = element.tag;

  // If ID exists, use it (IDs are unique, no need for class)
  if (element.id) {
    return `${tag}#${element.id}`;
  }

  // If no ID but classes exist, use first non-ave class
  if (element.classes) {
    const classList = element.classes
      .split('.')
      .filter(c => c && !c.startsWith('ave-')); // Filter out extension's own classes

    if (classList.length > 0) {
      return `${tag}.${classList[0]}`;
    }
  }

  // Fallback to just the tag
  return tag;
}
