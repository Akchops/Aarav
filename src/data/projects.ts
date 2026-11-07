/**
 * THE single source of truth for the work shown on the site.
 *
 * Both the Work grid (Home and /work/) and the Home hero scene read from this
 * file: the grid is rendered from it at build time (plugins/site-html.ts), and
 * the scene reads the rendered frames. Adding a project = adding one entry.
 *
 * Rules: use only facts Aarav has supplied. No invented clients, numbers,
 * testimonials, awards or prices.
 */

export interface ProjectImage {
  /** Path under /public. */
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Marks a placeholder that must be replaced before launch. */
  todo?: true;
}

export interface Project {
  /** Lowercase a-z, 0-9 and hyphens. Used for ids and data attributes. */
  slug: string;
  name: string;
  /** The description as supplied. One sentence. */
  summary: string;
  /** Live site. Missing → the frame shows "Link not yet published" and no link. */
  url?: string;
  /** 16:9 still of the live site. Missing → a typographic placeholder frame. */
  image?: ProjectImage;
  /** The project the Home scene brings to full frame (beat 3). Defaults to the first. */
  featured?: boolean;
}

export const projects: Project[] = [
  {
    slug: 'kessel',
    name: 'Kessel',
    summary: 'A demo website.',
    featured: true,
    // TODO: [KESSEL_URL] — live URL not supplied yet.
    url: undefined,
    // TODO: placeholder image. Replace with a 16:9 screenshot of the live site (min 2400×1350).
    image: {
      src: '/img/projects/kessel-todo.svg',
      alt: 'Placeholder for a screenshot of the Kessel website (to be supplied)',
      width: 1600,
      height: 900,
      todo: true,
    },
  },
  {
    slug: 'prayatn',
    name: 'Prayatn',
    summary: 'A volunteer website for a non-profit.',
    // TODO: [PRAYATN_URL] — live URL not supplied yet.
    url: undefined,
    // TODO: placeholder image. Replace with a 16:9 screenshot of the live site (min 2400×1350).
    image: {
      src: '/img/projects/prayatn-todo.svg',
      alt: 'Placeholder for a screenshot of the Prayatn website (to be supplied)',
      width: 1600,
      height: 900,
      todo: true,
    },
  },
];
