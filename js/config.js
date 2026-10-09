/* Site-wide settings. This is the only file to edit when going live. */
window.DMPA = window.DMPA || {};

DMPA.config = {
  whatsapp: {
    display: '078 168 0192',
    url: 'https://wa.me/27781680192',
  },

  /* Firebase web app config. Leave as null to use the sample data in
     js/data/sample-resources.js. To connect, paste the object from
     Firebase console → Project settings → Your apps, e.g.
     { apiKey: '…', authDomain: '…', projectId: '…', storageBucket: '…', appId: '…' }
     See docs/DATABASE.md for the collection schema and security rules. */
  firebase: null,
  firebaseSdkVersion: '10.12.2',
  resourcesCollection: 'resources',
};
