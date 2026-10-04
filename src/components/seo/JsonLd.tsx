import { serializeJsonLd, type JsonLdObject } from "@/lib/jsonld";

/**
 * A JSON-LD data block. `type="application/ld+json"` is a data block, not a
 * script the browser executes, so it sits inside the site's CSP unchanged.
 */
export function JsonLd({ data }: { data: JsonLdObject }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
