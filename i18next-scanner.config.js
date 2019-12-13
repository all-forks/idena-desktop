module.exports = {
  input: ['renderer/**/*.{js,jsx}', '!**/node_modules/**'],
  output: './locales',
  options: {
    debug: true,
    trans: null,
    func: {
      list: ['t'],
      extensions: ['.js', '.jsx'],
    },
    lngs: ['en', 'ru'],
    ns: [
      'common',
      'profile',
      'flips',
      'contacts',
      'wallets',
      'settings',
      'error',
    ],
    defaultLng: 'en',
    defaultNs: 'common',
    defaultValue(lng, ns, key) {
      if (lng === 'en') return key
      return '__NOT_TRANSLATED__'
    },
    resource: {
      loadPath: '{{lng}}/{{ns}}.json',
      savePath: '{{lng}}/{{ns}}.json',
      jsonIndent: 2,
    },
    nsSeparator: ':',
    keySeparator: false,
  },
}
