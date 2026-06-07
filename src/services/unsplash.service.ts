import { logger } from '../utils/logger';

export async function searchVehicleImage(
  make: string,
  model: string,
  year: number,
  type: string,
): Promise<string | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!accessKey) {
    logger.warn('Missing UNSPLASH_ACCESS_KEY environment variable');
    return null;
  }

  try {
    const typeKeyword = type === 'moto' ? 'motorcycle' : 'car';
    const query = encodeURIComponent(`${year} ${make} ${model} ${typeKeyword}`);

    const url = `https://api.unsplash.com/search/photos?query=${query}&per_page=1&orientation=landscape`;
    logger.debug(`Unsplash URL: ${url}`);

    const res = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        'Accept-Version': 'v1',
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      logger.error(`Unsplash request failed: ${res.status} ${res.statusText} — ${body}`);
      return null;
    }

    const data = (await res.json()) as {
      results: Array<{
        urls: { regular: string };
      }>;
    };

    logger.debug(`Unsplash results count: ${data.results?.length ?? 0}`);

    if (!data.results || data.results.length === 0) {
      logger.warn('No Unsplash images found');
      return null;
    }

    return data.results[0].urls.regular;
  } catch (error) {
    logger.error('Unsplash searchVehicleImage error:', error);
    return null;
  }
}
