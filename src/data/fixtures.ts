/**
 * Worst-case project data for break-ui testing. NEVER shipped as content:
 * selected only by PROJECTS_FIXTURE=<name> at build time, or ?fixture=<name>
 * on the dev server.
 */
import { projects, type Project } from './projects';

const long: Project[] = [
  {
    ...projects[0],
    name: 'Kesselwerkstattgesamtgestaltungsplattform — Internationale Sonderausgabe für sehr lange Projektnamen',
    summary:
      'An intentionally overlong description used to stress the frame, the slate and the full-frame card: it keeps going past the point where any real summary would stop, to find out what breaks.',
  },
  { ...projects[1], name: 'Prayatn', summary: 'A volunteer website for a non-profit.' },
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
