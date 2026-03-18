import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

/**
 * Normalizes body content by removing HTML comments and standardizing markdown formatting.
 * Uses remark to parse the markdown into an AST, removes HTML comment nodes that are at root level,
 * then stringifies back to markdown with consistent formatting.
 * @param {string} body - The body content to normalize
 * @returns {Promise<string>} The normalized body without root-level HTML comments
 */
export async function normalizeBody(body) {
  if (!body) return '';

  const file = await unified()
    .use(remarkParse)
    .use(removeHtmlComments)
    .use(remarkStringify)
    .process(body);

  return String(file);
}

/**
 * Remark plugin that removes HTML comment nodes from the AST.
 * Only removes HTML nodes that contain comments (starting with <!--).
 * HTML comments inside code blocks and blockquotes are naturally preserved
 * because they are part of the 'code' or 'blockquote' node content, not separate HTML nodes.
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
