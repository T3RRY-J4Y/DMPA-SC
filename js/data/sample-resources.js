/* Placeholder resources shown until Firebase is connected (see js/config.js).
   Field names match the Firestore schema in docs/DATABASE.md, so this
   doubles as seed data. A fileUrl of '#' renders as "Coming soon". */
window.DMPA = window.DMPA || {};

DMPA.sampleResources = [
  {
    id: 'pocketbook', order: 1, published: true,
    title: 'DMPA-SC Pocketbook', type: 'Guide', audience: 'For women', format: 'PDF', details: '16 pages',
    description: 'Contraception in simple terms: how every method works, a side-by-side comparison, self-injection steps and your reminder card.',
    fileUrl: '#',
  },
  {
    id: 'one-pager', order: 2, published: true,
    title: 'Self-injection one-pager', type: 'Guide', audience: 'For women', format: 'PDF', details: '2 sides',
    description: 'The MAPS method with pictures, what to expect afterwards and a quick checklist, to keep at home.',
    fileUrl: '#',
  },
  {
    id: 'reminder-card', order: 3, published: true,
    title: 'Personal reminder card', type: 'Card', audience: 'For women', format: 'PDF', details: 'printable',
    description: 'Track each self-injection and follow-up clinic visit, and never miss a date.',
    fileUrl: '#',
  },
  {
    id: 'job-aid', order: 4, published: true,
    title: 'Self-injection training job aid', type: 'Guide', audience: 'For health workers', format: 'PDF', details: '4 pages',
    description: 'Step-by-step counselling and training flow for teaching a client to self-inject, with eligibility checks and follow-up.',
    fileUrl: '#',
  },
  {
    id: 'logo-pack', order: 5, published: true,
    title: 'DMPA self-inject logo', type: 'Brand', audience: 'For partners', format: 'PNG', details: 'purple, full lock-up',
    description: 'Primary logo with the “Contraception Made Simple” tagline, for use on partner materials.',
    fileUrl: 'assets/images/logo-full-purple.png',
  },
];
