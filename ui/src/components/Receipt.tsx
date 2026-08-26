/** Minimal renderer for the agent's markdown mission receipt.
 *
 * The receipt is model-written text, so it is rendered as structured elements
 * rather than injected as HTML.
 */

type Block =
  | { kind: "heading"; text: string }
  | { kind: "bullet"; items: string[] }
  | { kind: "para"; text: string };

function parse(markdown: string): Block[] {
  const blocks: Block[] = [];
  let bullets: string[] = [];

  const flush = () => {
    if (bullets.length) { blocks.push({ kind: "bullet", items: bullets }); bullets = []; }
  };

  for (const raw of markdown.split("\n")) {
    const line = raw.trim();
    if (!line) { flush(); continue; }

    if (/^#{1,6}\s/.test(line)) {
      flush();
      blocks.push({ kind: "heading", text: line.replace(/^#{1,6}\s*/, "") });
      continue;
    }
    // "* item", "- item" and "1. item" all read as list items.
    const bullet = line.match(/^(?:[*-]|\d+\.)\s+(.*)$/);
    if (bullet) { bullets.push(bullet[1]); continue; }

    flush();
    blocks.push({ kind: "para", text: line });
  }
  flush();
  return blocks;
}

/** Renders **bold** and `code` spans without dangerouslySetInnerHTML. */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
        if (part.startsWith("`") && part.endsWith("`")) return <code key={i}>{part.slice(1, -1)}</code>;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export function Receipt({ markdown }: { markdown: string }) {
  return (
    <div className="receipt-body">
      {parse(markdown).map((block, i) => {
        if (block.kind === "heading") return <h4 key={i}><Inline text={block.text} /></h4>;
        if (block.kind === "bullet")
          return (
            <ul key={i}>
              {block.items.map((item, j) => <li key={j}><Inline text={item} /></li>)}
            </ul>
          );
        return <p className="line" key={i}><Inline text={block.text} /></p>;
      })}
    </div>
  );
}
