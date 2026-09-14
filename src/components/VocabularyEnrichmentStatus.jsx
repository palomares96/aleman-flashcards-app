import React, { useEffect, useState } from 'react';
import { backfillOwnVocabulary } from '../services/vocabularyMigration.js';

export default function VocabularyEnrichmentStatus({ user }) {
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState('working');
  useEffect(() => {
    let active = true;
    setStatus('working');
    backfillOwnVocabulary(user.uid).then(() => {
      if (active) setStatus('done');
    }).catch(error => {
      console.error('No se pudieron guardar las ayudas de vocabulario:', error.code || error.message);
      if (active) setStatus('error');
    });
    return () => { active = false; };
  }, [user.uid, attempt]);
  if (status === 'done') return null;
  return <div role="status" className="relative mb-3 rounded-xl border border-teal-400/20 bg-teal-950/30 px-4 py-3 text-xs text-teal-100">
    {status === 'working' ? 'Preparando tus ayudas de vocabulario… Puedes seguir practicando.' : <>
      No se pudieron guardar algunas ayudas. <button className="underline font-semibold" onClick={() => setAttempt(value => value + 1)}>Volver a intentar</button>
    </>}
  </div>;
}
