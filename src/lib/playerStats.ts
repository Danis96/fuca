import { Player } from '../types';

export function getSavePoints(totalSaves: number) {
  return Math.floor(totalSaves / 4);
}

export function getTotalPoints(player: Pick<Player, 'totalGoals' | 'totalAssists' | 'totalSaves' | 'matchesPlayed'>) {
  return player.totalGoals + player.totalAssists + player.matchesPlayed + getSavePoints(player.totalSaves);
}
