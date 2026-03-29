import { useMemo } from "react";

type ResponseBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "unordered"; items: string[] }
  | { type: "ordered"; items: string[] };

type FormattedConsultationResponseProps = {
  text: string;
  className?: string;
};

function normalizeResponseText(rawText: string): string {
  return rawText
    .replace(/\r\n/g, "\n")
    .replace(/\s+(\d+[.)]\s+)/g, "\n$1")
    .replace(/\s+([\-\u2022]\s+)/g, "\n$1")
    .trim();
}

function parseBlocks(rawText: string): ResponseBlock[] {
  const text = normalizeResponseText(rawText);
  if (!text) {
    return [];
  }

  const lines = text.split("\n").map((line) => line.trim());
  const blocks: ResponseBlock[] = [];
  let unorderedItems: string[] = [];
  let orderedItems: string[] = [];

  function flushLists() {
    if (unorderedItems.length > 0) {
      blocks.push({ type: "unordered", items: unorderedItems });
      unorderedItems = [];
    }

    if (orderedItems.length > 0) {
      blocks.push({ type: "ordered", items: orderedItems });
      orderedItems = [];
    }
  }

  for (const line of lines) {
    if (!line) {
      flushLists();
      continue;
    }

    const orderedMatch = line.match(/^\d+[.)]\s+(.+)$/);
    if (orderedMatch) {
      unorderedItems.length = 0;
      orderedItems.push(orderedMatch[1].trim());
      continue;
    }

    const unorderedMatch = line.match(/^[\-\u2022]\s+(.+)$/);
    if (unorderedMatch) {
      orderedItems.length = 0;
      unorderedItems.push(unorderedMatch[1].trim());
      continue;
    }

    flushLists();

    const isHeadingLike = (line.endsWith(":") || line.endsWith("\uFF1A")) && line.length <= 80;
    if (isHeadingLike) {
      blocks.push({ type: "heading", text: line.replace(/[:\uFF1A]$/, "") });
      continue;
    }

    blocks.push({ type: "paragraph", text: line });
  }

  flushLists();

  return blocks;
}

export function FormattedConsultationResponse({ text, className }: FormattedConsultationResponseProps) {
  const blocks = useMemo(() => parseBlocks(text), [text]);

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className={`formatted-response ${className ?? ""}`.trim()}>
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          return <h4 key={`heading-${index}`}>{block.text}</h4>;
        }

        if (block.type === "unordered") {
          return (
            <ul key={`ul-${index}`}>
              {block.items.map((item, itemIndex) => (
                <li key={`ul-item-${index}-${itemIndex}`}>{item}</li>
              ))}
            </ul>
          );
        }

        if (block.type === "ordered") {
          return (
            <ol key={`ol-${index}`}>
              {block.items.map((item, itemIndex) => (
                <li key={`ol-item-${index}-${itemIndex}`}>{item}</li>
              ))}
            </ol>
          );
        }

        return <p key={`p-${index}`}>{block.text}</p>;
      })}
    </div>
  );
}
