import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Configure marked options with GFM tables and images enabled
marked.setOptions({
  gfm: true,
  breaks: true,
  pedantic: false,
});

/**
 * Converts Markdown string into safe, styled HTML for the visual editor and EventDetails
 * @param {string} markdown 
 * @returns {string} Safe HTML string
 */
export function markdownToHtml(markdown) {
  if (!markdown || !markdown.trim()) return '<p><br></p>';
  try {
    const rawHtml = marked.parse(markdown);
    return DOMPurify.sanitize(rawHtml, {
      ADD_TAGS: [
        'table',
        'thead',
        'tbody',
        'tfoot',
        'tr',
        'th',
        'td',
        'img',
        'input',
        'u',
        's',
        'del',
        'strike',
      ],
      ADD_ATTR: [
        'src',
        'alt',
        'title',
        'loading',
        'width',
        'height',
        'style',
        'align',
        'target',
        'rel',
        'contenteditable',
        'data-checked',
        'class',
        'scope',
        'colspan',
        'rowspan',
      ],
    });
  } catch (err) {
    console.error('Error converting markdown to HTML:', err);
    return `<p>${escapeHtml(markdown)}</p>`;
  }
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Serializes a DOM Node or HTML string into clean, normalized GitHub Flavored Markdown
 * @param {Node|HTMLElement|string} input 
 * @returns {string} Clean Markdown
 */
export function htmlToMarkdown(input) {
  if (!input) return '';

  let container;
  if (typeof input === 'string') {
    container = document.createElement('div');
    container.innerHTML = input;
  } else if (input instanceof HTMLElement || input instanceof Node) {
    container = input;
  } else {
    return '';
  }

  const result = serializeNode(container).trim();
  // Clean multiple excess newlines
  return result.replace(/\n{3,}/g, '\n\n');
}

/**
 * Recursive DOM to Markdown Serializer
 */
function serializeNode(node) {
  if (!node) return '';

  // Text Node
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent;
  }

  // Not an element node
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const tag = node.tagName.toLowerCase();
  const children = Array.from(node.childNodes);
  const innerMarkdown = children.map(serializeNode).join('');

  switch (tag) {
    case 'h1':
      return `\n\n# ${innerMarkdown.trim()}\n\n`;
    case 'h2':
      return `\n\n## ${innerMarkdown.trim()}\n\n`;
    case 'h3':
      return `\n\n### ${innerMarkdown.trim()}\n\n`;
    case 'h4':
      return `\n\n#### ${innerMarkdown.trim()}\n\n`;
    case 'h5':
    case 'h6':
      return `\n\n##### ${innerMarkdown.trim()}\n\n`;

    case 'p':
    case 'div': {
      if (!innerMarkdown.trim() && (node.querySelector('br') || !node.hasChildNodes())) {
        return '\n';
      }
      return `\n\n${innerMarkdown.trim()}\n\n`;
    }

    case 'strong':
    case 'b': {
      const trimmed = innerMarkdown.trim();
      if (!trimmed) return '';
      return `**${trimmed}**`;
    }

    case 'em':
    case 'i': {
      const trimmed = innerMarkdown.trim();
      if (!trimmed) return '';
      return `*${trimmed}*`;
    }

    case 'u': {
      const trimmed = innerMarkdown.trim();
      if (!trimmed) return '';
      return `<u>${trimmed}</u>`;
    }

    case 'del':
    case 's':
    case 'strike': {
      const trimmed = innerMarkdown.trim();
      if (!trimmed) return '';
      return `~~${trimmed}~~`;
    }

    case 'code': {
      const trimmed = innerMarkdown.trim();
      if (!trimmed) return '';
      // If parent is PRE, handled by PRE case
      if (node.parentElement && node.parentElement.tagName.toLowerCase() === 'pre') {
        return trimmed;
      }
      return `\`${trimmed}\``;
    }

    case 'pre': {
      const codeChild = node.querySelector('code');
      const codeText = codeChild ? codeChild.textContent : node.textContent;
      return `\n\n\`\`\`\n${codeText.trim()}\n\`\`\`\n\n`;
    }

    case 'blockquote': {
      const lines = innerMarkdown.trim().split('\n').filter(Boolean);
      const quoted = lines.map((l) => `> ${l.trim()}`).join('\n');
      return `\n\n${quoted}\n\n`;
    }

    case 'ul': {
      const items = Array.from(node.children).filter((c) => c.tagName.toLowerCase() === 'li');
      const listMd = items
        .map((li) => {
          const checkbox = li.querySelector('input[type="checkbox"]');
          let liText = serializeNode(li).trim();
          if (checkbox) {
            const isChecked = checkbox.checked || checkbox.getAttribute('checked') !== null;
            liText = liText.replace(/^\[[ xX]\]\s*/, '');
            return `- [${isChecked ? 'x' : ' '}] ${liText}`;
          }
          return `- ${liText}`;
        })
        .join('\n');
      return `\n\n${listMd}\n\n`;
    }

    case 'ol': {
      const items = Array.from(node.children).filter((c) => c.tagName.toLowerCase() === 'li');
      const listMd = items
        .map((li, idx) => {
          const liText = serializeNode(li).trim();
          return `${idx + 1}. ${liText}`;
        })
        .join('\n');
      return `\n\n${listMd}\n\n`;
    }

    case 'li': {
      return innerMarkdown.trim();
    }

    case 'a': {
      const href = node.getAttribute('href') || '';
      const text = innerMarkdown.trim() || href;
      if (!href) return text;
      return `[${text}](${href})`;
    }

    case 'img': {
      const src = node.getAttribute('src') || '';
      const alt = node.getAttribute('alt') || '';
      const width = node.getAttribute('width') || node.style.width || '';
      const height = node.getAttribute('height') || node.style.height || '';
      const align = node.getAttribute('align') || '';
      if (!src) return '';

      // If custom width, height, or alignment specified, preserve as standard HTML img tag in Markdown
      if (width || height || align) {
        const attrs = [`src="${src}"`];
        if (alt) attrs.push(`alt="${alt}"`);
        if (width) attrs.push(`width="${width}"`);
        if (height) attrs.push(`height="${height}"`);
        if (align) attrs.push(`align="${align}"`);
        return `\n\n<img ${attrs.join(' ')} />\n\n`;
      }

      // Default clean markdown image
      return `\n\n![${alt}](${src})\n\n`;
    }

    case 'hr':
      return '\n\n---\n\n';

    case 'br':
      return '\n';

    case 'table': {
      const rows = Array.from(node.querySelectorAll('tr'));
      if (rows.length === 0) return '';

      const tableData = rows.map((row) => {
        const cells = Array.from(row.querySelectorAll('th, td'));
        return cells.map((cell) => {
          const inner = Array.from(cell.childNodes).map(serializeNode).join('').trim();
          return inner.replace(/\n+/g, ' ').replace(/\|/g, '\\|') || ' ';
        });
      });

      if (tableData.length === 0) return '';

      const colCount = Math.max(...tableData.map((r) => r.length), 1);
      const padRow = (row) => {
        const padded = [...row];
        while (padded.length < colCount) {
          padded.push(' ');
        }
        return padded;
      };

      const headerRow = padRow(tableData[0]);
      const headerLine = `| ${headerRow.join(' | ')} |`;
      const dividerLine = `| ${headerRow.map(() => '---').join(' | ')} |`;
      const bodyRows = tableData.slice(1);
      const bodyLines = bodyRows.length > 0
        ? bodyRows.map((row) => `| ${padRow(row).join(' | ')} |`).join('\n')
        : '';

      if (!bodyLines) {
        return `\n\n${headerLine}\n${dividerLine}\n| ${headerRow.map(() => ' ').join(' | ')} |\n\n`;
      }

      return `\n\n${headerLine}\n${dividerLine}\n${bodyLines}\n\n`;
    }

    default:
      return innerMarkdown;
  }
}
