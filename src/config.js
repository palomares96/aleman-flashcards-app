export const MASTERY_CRITERIA = {
  MIN_PLAYS: 5,
  MAX_ERROR_RATE: 0.2,
  STREAK_NEEDED: 4,
};

export const initialFormData = {
  german: '', spanish: '', type: 'noun', category: 'Otros', difficulty: '1',
  attributes: { 
    gender: '', 
    isRegular: true, 
    pastTense: '', 
    participle: '', 
    'case': '', 
    separablePrefixes: [{ prefix: '', meaning: '' }] 
  }
};