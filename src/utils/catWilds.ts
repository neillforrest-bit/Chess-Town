import type { Movie } from '@/lib/game';
/** Wildcard films for the Feline Intervention: Cats (2019) + an 80s B-movie. Hand-entered, merged into BY_ID by game.ts so every client resolves them. */
export const CAT_WILDS: Movie[] = [
  { id: 536869, t: 'Cats', y: 2019, r: 5.1, g: ['Comedy', 'Fantasy'], o: 'A tribe of cats called the Jellicles must decide yearly which one will ascend to the Heaviside Layer and come back to a new Jellicle life. The fur is digital. The regret is not.', p: '/aCNch5FmzT2WaUcY44925owIZXY.jpg', w: false, pop: 20, c: ['Francesca Hayward', 'Jennifer Hudson', 'Idris Elba'], k: 'PG', rn: 110, rt: 19, mc: 32, imdb: 2.8, tag: 'Embrace your inner feline.' },
  { id: 16296, t: 'Killer Klowns from Outer Space', y: 1988, r: 6.0, g: ['Horror', 'Comedy', 'Science Fiction'], o: 'A small town is invaded by alien clowns from a circus tent shaped like a spaceship. They harvest people in cotton-candy cocoons. It is exactly as good as it sounds.', p: '/lHdAk5T42ofyi3NTjmrdyR7xPmY.jpg', w: false, pop: 25, c: ['Grant Cramer', 'Suzanne Snyder', 'John Allen Nelson'], k: 'PG-13', rn: 88, rt: 71, mc: null, imdb: 6.2, tag: 'They are coming to a town near you.' },
];
