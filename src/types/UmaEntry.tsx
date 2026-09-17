export interface UmaStatBoosts {
  guts: number;
  power: number;
  speed: number;
  stamina: number;
  wisdom: number;
}

export interface UmaDistance {
  sprint: number;
  mile: number;
  medium: number;
  long: number;
  front: number;
  pace: number;
  late: number;
  end: number;
  turf: number;
  dirt: number;
}

export interface UmaEntry {
  id: number;
  charaId: number;
  baseCharacterName: string;
  outfitTitle: string;
  "stat-boosts"?: UmaStatBoosts;
  runningStyle?: number;
  distance?: UmaDistance;
}
