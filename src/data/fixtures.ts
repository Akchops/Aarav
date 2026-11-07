/**
 * Worst-case project data for break-ui testing. NEVER shipped as content:
 * selected only by PROJECTS_FIXTURE=<name> at build time, or ?fixture=<name>
 * on the dev server.
 */
import { projects, type Project } from './projects';

const [kessel, prayatn] = projects;
const third: Project = { ...prayatn, slug: 'prayatn-copy', name: 'Prayatn (fixture copy)' };

// Featured counts 0-3.
const f0: Project[] = projects.map((p) => ({ ...p, featured: false }));
const f1: Project[] = [kessel, { ...prayatn, featured: false }];
const f2: Project[] = [kessel, prayatn];
const f3: Project[] = [kessel, prayatn, { ...third, featured: true }];

// Plausible worst case: a long real-world-shaped name with an unbreakable compound
// word, a long summary, and a very long URL.
const long: Project[] = [
  {
    ...kessel,
    name: 'Kesselhaus Werkstattgemeinschaft — Annual Open Studios Programme, Second Edition',
    summary:
      'A demo website for a cooperative of independent workshops, with a bilingual events calendar, a members directory and a booking flow for open-studio weekends across three neighbourhoods.',
  },
  {
    ...prayatn,
    url: 'https://prayatn-volunteer-network-foundation-international.example.org/get-involved/volunteer-opportunities',
  },
];
const nourl: Project[] = projects.map((p) => ({ ...p, url: undefined }));
const withurl: Project[] = projects.map((p) => ({ ...p, url: `https://example.com/${p.slug}` }));
const noimage: Project[] = projects.map((p) => ({ ...p, image: undefined }));
const many: Project[] = Array.from({ length: 8 }, (_, i) => ({
  ...projects[i % 2],
  slug: `${projects[i % 2].slug}-${i + 1}`,
  name: `${projects[i % 2].name} ${i + 1}`,
  featured: i % 3 === 0,
}));

export const fixtures: Record<string, Project[]> = { f0, f1, f2, f3, long, nourl, withurl, noimage, many };
