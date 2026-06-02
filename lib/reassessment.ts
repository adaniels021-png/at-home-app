export function getNextReassessmentDate(daysFromNow = 30) {
  const next = new Date();
  next.setDate(next.getDate() + daysFromNow);
  return next.toISOString();
}

export function isReassessmentDue(nextDueDate?: string | null) {
  if (!nextDueDate) return false;
  return new Date(nextDueDate).getTime() <= Date.now();
}

export function getDaysUntilReassessment(nextDueDate?: string | null) {
  if (!nextDueDate) return null;

  const diff = new Date(nextDueDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}