export interface SeoFaqItem {
  question: string;
  answer: string;
}

export interface SeoEntityGraphOptions {
  title: string;
  description: string;
  path: string;
  image: string;
  mainEntity?: "organization" | "product";
  faqItems?: readonly (SeoFaqItem | readonly [string, string])[];
  citations?: readonly string[];
  dateModified?: string;
}

export const harborSiteUrl = "https://harbornavi.com";

const organizationId = `${harborSiteUrl}/#organization`;
const brandId = `${harborSiteUrl}/#brand`;
const websiteId = `${harborSiteUrl}/#website`;
const productId = `${harborSiteUrl}/#product`;

export function harborAbsoluteUrl(value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  if (value === "/") return harborSiteUrl;
  return `${harborSiteUrl}/${value.replace(/^\/+|\/+$/g, "")}`;
}

function normalizeFaqItem(item: SeoFaqItem | readonly [string, string]): SeoFaqItem {
  return "question" in item
    ? { question: item.question, answer: item.answer }
    : { question: item[0], answer: item[1] };
}

export function buildSeoEntityGraph({
  title,
  description,
  path,
  image,
  mainEntity,
  faqItems = [],
  citations = [],
  dateModified
}: SeoEntityGraphOptions) {
  const pageUrl = harborAbsoluteUrl(path);
  const imageUrl = harborAbsoluteUrl(image);
  const normalizedFaqItems = faqItems.map(normalizeFaqItem);
  const pageId = `${pageUrl}#webpage`;
  const faqId = `${pageUrl}#faq`;

  const organization = {
    "@type": "Organization",
    "@id": organizationId,
    name: "Harbor Innovations",
    url: `${harborSiteUrl}/about-harbor`,
    logo: {
      "@type": "ImageObject",
      url: `${harborSiteUrl}/harbornavi-logo-mark.png`
    },
    brand: { "@id": brandId }
  };

  const brand = {
    "@type": "Brand",
    "@id": brandId,
    name: "HarborNavi",
    url: harborSiteUrl
  };

  const website = {
    "@type": "WebSite",
    "@id": websiteId,
    name: "HarborNavi",
    url: harborSiteUrl,
    publisher: { "@id": organizationId },
    inLanguage: "en-US"
  };

  const product = {
    "@type": "Product",
    "@id": productId,
    name: "HarborNavi",
    url: harborSiteUrl,
    description: "HarborNavi is private, local-first AI that understands household context, coordinates supported devices, and keeps private data at home.",
    category: "Local-first smart-home AI",
    image: `${harborSiteUrl}/assets/home-v7-v8-memory-hero-id.png`,
    brand: { "@id": brandId },
    manufacturer: { "@id": organizationId }
  };

  const webpage: Record<string, unknown> = {
    "@type": "WebPage",
    "@id": pageId,
    url: pageUrl,
    name: title,
    description,
    isPartOf: { "@id": websiteId },
    publisher: { "@id": organizationId },
    inLanguage: "en-US",
    primaryImageOfPage: {
      "@type": "ImageObject",
      "@id": `${pageUrl}#primaryimage`,
      url: imageUrl,
      contentUrl: imageUrl
    }
  };

  if (mainEntity === "organization") webpage.mainEntity = { "@id": organizationId };
  if (mainEntity === "product") webpage.mainEntity = { "@id": productId };
  if (normalizedFaqItems.length) webpage.hasPart = { "@id": faqId };
  if (citations.length) {
    webpage.citation = citations.map((url) => ({
      "@type": "CreativeWork",
      url: harborAbsoluteUrl(url)
    }));
  }
  if (dateModified) webpage.dateModified = dateModified;

  const graph: Record<string, unknown>[] = [organization, brand, website];
  if (mainEntity === "product") graph.push(product);
  graph.push(webpage);

  if (normalizedFaqItems.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": faqId,
      url: `${pageUrl}#faq`,
      isPartOf: { "@id": pageId },
      inLanguage: "en-US",
      mainEntity: normalizedFaqItems.map(({ question, answer }) => ({
        "@type": "Question",
        name: question,
        acceptedAnswer: {
          "@type": "Answer",
          text: answer
        }
      }))
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph
  };
}
