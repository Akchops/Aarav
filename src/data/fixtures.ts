/**
 * Worst-case project data for break-ui testing. NEVER shipped as content:
 * selected only by PROJECTS_FIXTURE=<name> at build time, or ?fixture=<name>
 * on the dev server.
 */
import { projects, type Project } from './projects';

// Plausible worst case, not nonsense: a long real-world-shaped project name with an
// unbreakable compound word, and a summary at the length a client brief often has.
const long: Project[] = [
  {
    ...projects[0],
    name: 'Kesselhaus Werkstattgemeinschaft — Annual Open Studios Programme 2026–2027',
    summary:
      'A demo website for a cooperative of independent workshops, with a bilingual events calendar, a members directory and a booking flow for open-studio weekends across three neighbourhoods.',
  },
  {
    ...projects[1],
    name: 'Prayatn',
    summary: 'A volunteer website for a non-profit.',
    url: 'https://prayatn-volunteer-network-foundation-international.example.org/get-involved/volunteer-opportunities',
  },
];

const nourl: Project[] = projects.map((p) => ({ ...p, url: undefined }));
const withurl: Project[] = projects.map((p) => ({ ...p, url: `https://example.com/${p.slug}` }));
const noimage: Project[] = projects.map((p) => ({ ...p, image: undefined }));
const single: Project[] = [projects[0]];
const empty: Project[] = [];
const many: Project[] = Array.from({ length: 8 }, (_, i) => ({
  ...projects[i % 2],
  slug: `${projects[i % 2].slug}-${i + 1}`,
  name: `${projects[i % 2].name} ${i + 1}`,
  featured: i === 0,
}));

export const fixtures: Record<string, Project[]> = { long, nourl, withurl, noimage, single, empty, many };
