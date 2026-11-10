const hrvStatus: Record<string, string> = {
  BALANCED: 'Within your usual range',
  UNBALANCED: 'Outside your usual range',
  LOW: 'Below your usual range',
  POOR: 'Below your usual range',
  GOOD: 'Good',
};

const trainingEffect: Record<string, string> = {
  RECOVERY: 'Recovery',
  AEROBIC_BASE: 'Aerobic base',
  TEMPO: 'Tempo',
  LACTATE_THRESHOLD: 'Threshold',
  VO2MAX: 'VO₂ max',
  ANAEROBIC_CAPACITY: 'Anaerobic capacity',
  SPRINT: 'Sprint',
};

export function garminLabel(
  value: string | null | undefined,
  category: 'hrv_status' | 'training_effect',
): string | null {
  if (!value) return null;
  const key = value.toUpperCase().replaceAll(' ', '_');
  const labels = category === 'hrv_status' ? hrvStatus : trainingEffect;
  const fallback = value.replaceAll('_', ' ').trim().toLowerCase();
  return labels[key] ?? fallback.charAt(0).toUpperCase() + fallback.slice(1);
}
