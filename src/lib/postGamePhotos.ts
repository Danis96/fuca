import { Match } from '../types';

export const POST_GAME_PHOTO_DIRECTORY = '/assets/post-game';

export function getDefaultPostGamePhotoPath(matchId: string) {
  return `${POST_GAME_PHOTO_DIRECTORY}/${encodeURIComponent(matchId)}.jpg`;
}

export function resolvePostGamePhotoPath(match: Pick<Match, 'id' | 'postGameImage'>) {
  const configuredPath = match.postGameImage?.trim();
  if (!configuredPath) return getDefaultPostGamePhotoPath(match.id);
  if (configuredPath.startsWith('/') || /^https?:\/\//i.test(configuredPath)) return configuredPath;
  return `${POST_GAME_PHOTO_DIRECTORY}/${configuredPath}`;
}
