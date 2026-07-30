export interface NewsItem {
  title: string;
  source: string;
  pubDate: string;
  link: string;
}

function extractTag(xml: string, tag: string): string {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  if (!match) return "";
  return match[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, "$1")
    .trim();
}

export async function fetchNews(query: string, limit = 5): Promise<NewsItem[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
    query
  )}&hl=es-419&gl=US&ceid=US:es-419`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; trading-pwa/1.0)" },
    cache: "no-store",
  });

  if (!res.ok) {
    return [];
  }

  const xml = await res.text();
  const items = xml.split("<item>").slice(1);

  return items.slice(0, limit).map((item) => ({
    title: extractTag(item, "title"),
    source: extractTag(item, "source"),
    pubDate: extractTag(item, "pubDate"),
    link: extractTag(item, "link"),
  }));
}
