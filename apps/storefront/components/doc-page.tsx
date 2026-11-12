/**
 * Policy and FAQ pages. The copy is the design's own markup (including its highlighted
 * `[placeholder]` marks for facts still to be confirmed), stored in `content/*.ts`.
 * It is trusted static content from this repository, never user input.
 */
export function DocPage({ html }: { html: string }) {
  return (
    <div className="page-doc">
      <main className="wrap doc-main" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
