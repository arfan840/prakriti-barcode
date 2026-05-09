/**
 * Bag ID Generator for Prakriti Track
 * Format: JH-DGH-HCF0001-Y-20250509-000001
 *   JH      = state code
 *   DGH     = district code (first 3 chars, uppercased)
 *   HCF0001 = HCF code from hospital record
 *   Y/R/B/W = waste category initial
 *   YYYYMMDD = date
 *   000001  = zero-padded 6-digit sequence
 */

const CATEGORY_INITIALS = {
  Yellow: 'Y',
  Red: 'R',
  Blue: 'B',
  White: 'W',
};

/** Get district code: first 3 alpha chars of district, uppercased */
function districtCode(district = '') {
  return district.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase().padEnd(3, 'X');
}

/** Get today's date string: YYYYMMDD */
function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

/**
 * Get the next sequence number for a given HCF on today's date.
 * Uses the bag_sequence table in Supabase.
 * Returns sequence as zero-padded 6-digit string, e.g. "000001"
 */
export async function getNextSequence(supabase, hcfId, count = 1) {
  const dateStr = todayStr();

  // Upsert: if row doesn't exist create it, otherwise increment
  const { data: existing } = await supabase
    .from('bag_sequence')
    .select('id, seq')
    .eq('hcf_id', hcfId)
    .eq('date_str', dateStr)
    .single();

  let startSeq;
  if (!existing) {
    // Insert new row starting at count
    const { data: inserted } = await supabase
      .from('bag_sequence')
      .insert({ hcf_id: hcfId, date_str: dateStr, seq: count })
      .select()
      .single();
    startSeq = 1;
  } else {
    const newSeq = (existing.seq || 0) + count;
    await supabase
      .from('bag_sequence')
      .update({ seq: newSeq })
      .eq('id', existing.id);
    startSeq = (existing.seq || 0) + 1;
  }

  // Return array of sequences
  return Array.from({ length: count }, (_, i) =>
    String(startSeq + i).padStart(6, '0')
  );
}

/**
 * Generate bag IDs for a batch.
 * @param {object} supabase - Supabase client
 * @param {object} hospital - { id, hcf_code, district, state }
 * @param {string} category - 'Yellow' | 'Red' | 'Blue' | 'White'
 * @param {number} count - number of bags to generate
 * @returns {Promise<string[]>} array of bag ID strings
 */
export async function generateBagIds(supabase, hospital, category, count = 1) {
  const state = (hospital.state || 'JH').toUpperCase();
  const dist = districtCode(hospital.district || '');
  const hcfCode = (hospital.hcf_code || 'HCF0000').toUpperCase();
  const catInit = CATEGORY_INITIALS[category] || 'U';
  const date = todayStr();

  const sequences = await getNextSequence(supabase, hospital.id, count);

  return sequences.map(seq => `${state}-${dist}-${hcfCode}-${catInit}-${date}-${seq}`);
}

/** Parse a bag ID back into its components */
export function parseBagId(bagId) {
  const parts = (bagId || '').split('-');
  if (parts.length < 6) return null;
  const catMap = { Y: 'Yellow', R: 'Red', B: 'Blue', W: 'White' };
  return {
    state: parts[0],
    district: parts[1],
    hcfCode: parts[2],
    category: catMap[parts[3]] || parts[3],
    date: parts[4],
    sequence: parts[5],
  };
}
