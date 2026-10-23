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
  firebase: {
    apiKey: 'AIzaSyBkG_5mZmhtOZ2tM1E4NXpOI0xt-AO--CM',
    authDomain: 'dmpa-selfinject.firebaseapp.com',
    projectId: 'dmpa-selfinject',
    storageBucket: 'dmpa-selfinject.firebasestorage.app',
    messagingSenderId: '836389127400',
    appId: '1:836389127400:web:67776443a1a003b2bcf55d',
  },
  firebaseSdkVersion: '10.12.2',
  resourcesCollection: 'resources',

  /* Share links for resources. On the hosts listed here, links are /r/<id>,
     which gives each resource its own WhatsApp and Facebook link preview
     (Firebase Hosting plus the sharePage function, see docs/DATABASE.md).
     Anywhere else they are resources.html?resource=<id>. Add the custom
     domain here when the site moves to it. */
  sharePath: '/r/',
  shareHosts: ['dmpa-selfinject.web.app', 'dmpa-selfinject.firebaseapp.com', 'localhost:5000', '127.0.0.1:5000'],
};
