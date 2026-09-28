import { adToBs, formatBS } from '@coder-safal/bs-calendar';
import { Calendar } from './picker';

export default function Page() {
  // Date-only values passed from the server keep SSR and hydration deterministic.
  const initialDate = adToBs('2025-04-14');
  return <main><h1>BS Calendar + Next.js</h1><p>Server formatted: {formatBS(initialDate, { locale: 'ne' })}</p><Calendar initialDate={initialDate} /></main>;
}
