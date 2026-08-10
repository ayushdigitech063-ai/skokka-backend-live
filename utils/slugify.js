/**
 * Generate a clean, URL-safe SEO slug from a string.
 * @param {string} text 
 * @returns {string}
 */
export function generateSlug(text) {
  if (!text) return '';
  return String(text)
    .normalize('NFD') // decompose combined characters
    .replace(/[\u0300-\u036f]/g, '') // remove accent marks
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // remove non-alphanumeric chars except space and dash
    .replace(/[\s_]+/g, '-') // replace spaces and underscores with single dash
    .replace(/-+/g, '-'); // collapse multiple dashes
}

export default generateSlug;
