// Independent draft POI seed. Bounding-box acceptance is not area coverage proof.
import {cleanPlace} from './bridge.mjs?v=3.7.1';
export function parsePlaceSeed(text) {
  if (typeof text !== 'string' || text.length > 200000) throw Error('Place seed size invalid');
  let data;
  try { data = JSON.parse(text); } catch { throw Error('Place seed must be JSON'); }
  if (!Array.isArray(data) || data.length < 1 || data.length > 200) throw Error('Place seed count invalid');
  const ids = new Set();
  return data.map(raw => {
    const place = cleanPlace(raw);
    if (!place || !place.id.trim() || !place.name.trim() || place.id !== raw.id || place.name !== raw.name) {
      throw Error('Place seed contains an invalid entry');
    }
    if (ids.has(place.id)) throw Error('Place seed contains duplicate IDs');
    ids.add(place.id);
    // Never turn a seed edit into provider/entrance/Naver verification.
    return place;
  });
}
