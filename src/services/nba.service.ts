import { logger } from '../utils/logger';

const API_BASE = 'https://api.balldontlie.io/v1';

export interface NBAPlayer {
  id: number;
  first_name: string;
  last_name: string;
  position: string;
  height: string | null;
  weight: string | null;
  jersey_number: string | null;
  college: string;
  country: string;
  draft_year: number | null;
  draft_round: number | null;
  draft_number: number | null;
  team: NBATeam;
}

export interface NBATeam {
  id: number;
  abbreviation: string;
  city: string;
  conference: string;
  division: string;
  full_name: string;
  name: string;
}

export interface NBAGame {
  id: number;
  date: string;
  season: number;
  status: string;
  period: number;
  time: string;
  postseason: boolean;
  postponed: boolean;
  home_team_score: number | null;
  visitor_team_score: number | null;
  home_team: NBATeam;
  visitor_team: NBATeam;
}

interface PlayersResponse {
  data: NBAPlayer[];
  meta: {
    next_cursor: number | null;
    per_page: number;
  };
}

interface TeamsResponse {
  data: NBATeam[];
}

interface GamesResponse {
  data: NBAGame[];
  meta: {
    next_cursor: number | null;
    per_page: number;
  };
}

async function apiFetch<T>(endpoint: string): Promise<T> {
  const apiKey = process.env.BALLDONTLIE_API_KEY;
  if (!apiKey) throw new Error('Missing BALLDONTLIE_API_KEY environment variable');

  const url = `${API_BASE}${endpoint}`;
  logger.debug(`NBA API: ${url}`);

  const res = await fetch(url, {
    headers: { Authorization: apiKey },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    logger.error(`NBA API request failed: ${res.status} ${res.statusText} — ${body}`);
    throw new Error(`NBA API error: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export async function searchPlayers(name: string): Promise<NBAPlayer[]> {
  const parts = name.trim().split(/\s+/);

  let endpoint: string;
  if (parts.length >= 2) {
    const first = encodeURIComponent(parts[0]);
    const last = encodeURIComponent(parts.slice(1).join(' '));
    endpoint = `/players?first_name=${first}&last_name=${last}&per_page=10`;
  } else {
    endpoint = `/players?search=${encodeURIComponent(name)}&per_page=10`;
  }

  const response = await apiFetch<PlayersResponse>(endpoint);
  return response.data;
}

export async function getTeams(): Promise<NBATeam[]> {
  const response = await apiFetch<TeamsResponse>('/teams');
  return response.data;
}

export async function getGamesByTeam(
  teamId: number,
  cursor?: number,
  perPage: number = 5,
  startDate?: string,
  endDate?: string,
): Promise<{ games: NBAGame[]; nextCursor: number | null }> {
  let endpoint = `/games?team_ids[]=${teamId}&per_page=${perPage}`;
  if (cursor) endpoint += `&cursor=${cursor}`;
  if (startDate) endpoint += `&start_date=${startDate}`;
  if (endDate) endpoint += `&end_date=${endDate}`;

  const response = await apiFetch<GamesResponse>(endpoint);
  return { games: response.data, nextCursor: response.meta.next_cursor };
}
