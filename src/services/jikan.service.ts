import { logger } from '../utils/logger';

const BASE_URL = 'https://api.jikan.moe/v4';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface RelatedAnime {
  mal_id: number;
  title: string;
  url: string;
  type: string;
}

export interface AnimeCharacter {
  mal_id: number;
  name: string;
  image: string;
  role: string;
}

export interface AnimeResult {
  mal_id: number;
  title: string;
  titleEnglish: string;
  image: string;
  imageLarge: string;
  synopsis: string;
  type: string;
  episodes: number;
  score: number;
  status: string;
  season: string;
  seasonYear: number;
  malUrl: string;
  relations: RelatedAnime[];
}

export interface CharacterResult {
  mal_id: number;
  name: string;
  image: string;
  about: string;
  animeTitle: string;
  animeId: number;
}

export async function searchAnime(query: string): Promise<AnimeResult | null> {
  try {
    const searchRes = await fetch(
      `${BASE_URL}/anime?q=${encodeURIComponent(query)}&limit=1&order_by=members&sort=desc`,
    );
    if (!searchRes.ok) {
      logger.error(`Jikan anime search failed: ${searchRes.status}`);
      return null;
    }

    const searchData = await searchRes.json() as { data: Array<{ mal_id: number }> };
    const anime = searchData.data?.[0];
    if (!anime) return null;

    await delay(400);

    const detailRes = await fetch(`${BASE_URL}/anime/${anime.mal_id}/full`);
    if (!detailRes.ok) {
      logger.error(`Jikan anime detail failed: ${detailRes.status}`);
      return null;
    }

    const detailData = await detailRes.json() as {
      data: {
        mal_id: number;
        title: string;
        title_english: string;
        images: { jpg: { image_url: string; large_image_url: string } };
        synopsis: string;
        type: string;
        episodes: number;
        score: number;
        status: string;
        season: string;
        year: number;
        url: string;
        relations: Array<{
          relation: string;
          entry: Array<{ mal_id: number; name: string; url: string; type: string }>;
        }>;
      };
    };

    const data = detailData.data;

    const seasons: RelatedAnime[] = [];
    for (const rel of data.relations ?? []) {
      if (['Sequel', 'Prequel', 'Alternative version', 'Alternative setting'].includes(rel.relation)) {
        for (const entry of rel.entry) {
          seasons.push({
            mal_id: entry.mal_id,
            title: entry.name,
            url: entry.url,
            type: rel.relation,
          });
        }
      }
    }

    return {
      mal_id: data.mal_id,
      title: data.title,
      titleEnglish: data.title_english,
      image: data.images.jpg.image_url,
      imageLarge: data.images.jpg.large_image_url,
      synopsis: data.synopsis,
      type: data.type,
      episodes: data.episodes,
      score: data.score,
      status: data.status,
      season: data.season,
      seasonYear: data.year,
      malUrl: data.url,
      relations: seasons,
    };
  } catch (error) {
    logger.error('Jikan searchAnime error:', error);
    return null;
  }
}

export async function getAnimeCharacters(animeId: number): Promise<AnimeCharacter[]> {
  try {
    const res = await fetch(`${BASE_URL}/anime/${animeId}/characters`);
    if (!res.ok) return [];

    const data = await res.json() as {
      data: Array<{
        character: { mal_id: number; name: string; images: { jpg: { image_url: string } } };
        role: string;
      }>;
    };

    return data.data.slice(0, 5).map((c) => ({
      mal_id: c.character.mal_id,
      name: c.character.name,
      image: c.character.images.jpg.image_url,
      role: c.role,
    }));
  } catch (error) {
    logger.error('Jikan getAnimeCharacters error:', error);
    return [];
  }
}

export async function searchCharacter(query: string): Promise<CharacterResult | null> {
  try {
    const searchRes = await fetch(
      `${BASE_URL}/characters?q=${encodeURIComponent(query)}&limit=1&order_by=favorites&sort=desc`,
    );
    if (!searchRes.ok) {
      logger.error(`Jikan character search failed: ${searchRes.status}`);
      return null;
    }

    const searchData = await searchRes.json() as { data: Array<{ mal_id: number }> };
    const character = searchData.data?.[0];
    if (!character) return null;

    await delay(400);

    const detailRes = await fetch(`${BASE_URL}/characters/${character.mal_id}/full`);
    if (!detailRes.ok) {
      logger.error(`Jikan character detail failed: ${detailRes.status}`);
      return null;
    }

    const detailData = await detailRes.json() as {
      data: {
        mal_id: number;
        name: string;
        images: { jpg: { image_url: string } };
        about: string;
        anime: Array<{ anime: { mal_id: number; title: string } }>;
      };
    };

    const data = detailData.data;
    const animeography = data.anime?.[0];
    if (!animeography) return null;

    return {
      mal_id: data.mal_id,
      name: data.name,
      image: data.images.jpg.image_url,
      about: data.about?.replace(/<[^>]*>/g, '').trim() || 'No description available.',
      animeTitle: animeography.anime.title,
      animeId: animeography.anime.mal_id,
    };
  } catch (error) {
    logger.error('Jikan searchCharacter error:', error);
    return null;
  }
}
