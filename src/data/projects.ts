/**
 * THE single source of truth for the work shown on the site.
 *
 * - The homepage shows the first three entries where `featured` is true, in
 *   array order (Featured Work, The Set, Scroll Film 2). None featured: the
 *   Featured Work section is left out and Scroll Film 2 shows only its slate.
 * - The Work archive (/work/) shows every entry.
 * - Everything is rendered from this file at build time (plugins/site-html.ts),
 *   so a project name or image is never hard-coded anywhere else.
 *
 * Use only facts Aarav has supplied: no invented clients, numbers, testimonials,
 * awards, prices or dates.
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
  /** Unique. Lowercase a-z, 0-9 and hyphens. */
  slug: string;
  name: string;
  /** One sentence, as supplied. */
  summary: string;
  /** Live site. Missing: "Link not yet published" and no link. */
  url?: string;
  /** 16:9 still of the live site. Missing: the labelled TODO placeholder. */
  image?: ProjectImage;
  /** Shown on the homepage (first three, in array order). */
  featured: boolean;
}

export const projects: Project[] = [
  {
    slug: 'kessel',
    name: 'Kessel',
    summary: 'A demo website.',
    // TODO: no live URL yet.
    url: undefined,
    // TODO: placeholder image. Replace with a 16:9 screenshot of the live site (min 2400×1350).
    image: {
      src: '/img/projects/kessel-todo.svg',
      alt: 'Placeholder for a screenshot of the Kessel website (to be supplied)',
      width: 1600,
      height: 900,
      todo: true,
    },
    featured: true,
  },
  {
    slug: 'prayatn',
    name: 'Prayatn',
    summary: 'A volunteer website for a non-profit.',
    // TODO: no live URL yet.
    url: undefined,
    // TODO: placeholder image. Replace with a 16:9 screenshot of the live site (min 2400×1350).
    image: {
      src: '/img/projects/prayatn-todo.svg',
      alt: 'Placeholder for a screenshot of the Prayatn website (to be supplied)',
      width: 1600,
      height: 900,
      todo: true,
    },
    featured: true,
  },
  // TODO: add project — copy this shape, fill in only facts Aarav supplies.
  // {
  //   slug: 'new-project',
  //   name: 'New project',
  //   summary: 'One sentence, as supplied.',
  //   url: 'https://…',
  //   image: { src: '/img/projects/new-project.webp', alt: '…', width: 2400, height: 1350 },
  //   featured: false,
  // },
];

/** The homepage's featured list: the first three featured entries, in array order. */
export function featuredOf(list: Project[]): Project[] {
  return list.filter((p) => p.featured).slice(0, 3);
}

/** The labelled TODO placeholder used wherever a project has no image. */
export const PLACEHOLDER_IMAGE: ProjectImage = {
  src: '/img/projects/placeholder-todo.svg',
  alt: 'Placeholder image (to be supplied)',
  width: 1600,
  height: 900,
  todo: true,
};
