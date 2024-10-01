/**
 * Returns a uniform distribution random number between 0 and max (exclusive).
 */
export const uniformDistributionRandom = (max: number) =>
    Math.floor(Math.random() * max);
