import remarkGemoji from 'remark-gemoji';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

/**
 * Normalizes body content by removing HTML comments, converting emoji shortcodes, and standardizing markdown formatting.
 * Uses remark to parse the markdown into an AST, removes HTML comment nodes that are at root level,
 * converts GitHub emoji shortcodes (:cat:) to Unicode emoji (🐱),
 * then stringifies back to markdown with consistent formatting.
 * @param {string} body - The body content to normalize
 * @returns {Promise<string>} The normalized body without root-level HTML comments and with emoji converted
 */
export async function normalizeBody(body) {
  if (!body) return '';

  const file = await unified()
    .use(remarkParse)
    .use(removeHtmlComments)
    .use(remarkGemoji)
    .use(remarkStringify)
    .process(body);

  return String(file);
}

/**
 * Creates a transformer function that removes HTML comment nodes from a syntax tree.
 * @returns {Function} A transformer function that accepts a tree parameter and removes HTML comment nodes by visiting and filtering them out
 */
function removeHtmlComments() {
  return (tree) => {
    visit(tree, 'html', (node, index, parent) => {
      // Check if this HTML node is a comment
      if (node.value && node.value.trim().startsWith('<!--')) {
        // Remove the node from its parent
        parent.children.splice(index, 1);
        // Return SKIP to avoid visiting removed node
        return ['skip', index];
      }
    });
  };
}
