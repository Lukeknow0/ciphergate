import { readFile } from 'node:fs/promises';

const vectors = JSON.parse(await readFile(new URL('../test/policy-boundaries.json', import.meta.url)));
const decide = ({ amount, riskScore, counterpartyFlags }) => {
  if (amount > 10000 || riskScore > 80 || counterpartyFlags > 0) return 'BLOCK';
  if (riskScore > 50) return 'REVIEW';
  return 'PASS';
};

for (const vector of vectors) {
  const actual = decide(vector);
  if (actual !== vector.expected) throw new Error(`${vector.name}: expected ${vector.expected}, got ${actual}`);
  console.log(`PASS ${vector.name}: ${actual}`);
}
