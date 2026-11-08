import bibliography from '../research/index.json';
import claimRegistry from '../research/claims.json';
import reviewRegistry from '../research/reviews.json';

export const papers = bibliography.papers;
export const reviews = reviewRegistry.reviews;
export const claims = claimRegistry.claims;
export function claimsForInsight(insightId: string) {
  return claims
    .filter((claim) => claim.applies_to.includes(insightId))
    .map((claim) => ({
      ...claim,
      sources: claim.paper_ids
        .map((id) => papers.find((p) => p.id === id))
        .filter((p): p is (typeof papers)[number] => Boolean(p)),
    }));
}
