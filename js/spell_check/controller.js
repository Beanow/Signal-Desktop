/* global require, module */
/* eslint-disable strict */

const {
  Spellchecker,
  getAvailableDictionaries: upstreamAvailable,
} = require('spellchecker');
const {
  ProxyProvider,
  SimpleProvider,
  CompositeProvider,
  DummyProvider,
  setProvider,
} = require('./providers');
const setup = require('./setup');

function getAvailableDictionaries() {
  const upstreamDictionaries = upstreamAvailable();
  const allDictionaries = [...upstreamDictionaries, ...setup.getExtraLocales()];

  // Filter duplicate entries.
  return Object.keys(
    allDictionaries.reduce((acc, d) => ({ ...acc, [d]: true }), {})
  );
}

/*
  A wrapper around the spellchecker module which provides additional features:
    - Disabling spellcheck
    - Finding available locales on Linux
    - A Chrome-like "All my languages" option
*/
module.exports = function SpellcheckControllerFactory() {
  const proxyProvider = ProxyProvider();
  const location = setup.getLocation();
  let currentLocale = setup.getDefaultLocale();

  const createSimple = locale => {
    const spellchecker = new Spellchecker();
    spellchecker.setDictionary(locale, location);
    return SimpleProvider(locale, spellchecker);
  };

  const createComposite = locales => {
    const providers = locales.map(createSimple);
    return CompositeProvider(providers);
  };

  const changeLocale = locale => {
    let provider = DummyProvider();
    currentLocale = locale;

    if (locale === true) {
      currentLocale = setup.getDefaultLocale();
      provider = createSimple(locale);
    } else if (locale === '*') {
      const all = getAvailableDictionaries();
      if (all.length === 0) {
        provider = createSimple(setup.getDefaultLocale());
      } else if (all.length === 1) {
        provider = createSimple(all[0]);
      } else {
        provider = createComposite(all);
      }
    } else if (locale !== null) {
      provider = createSimple(locale);
    }

    proxyProvider[setProvider](provider);
  };

  changeLocale(currentLocale);

  return {
    getSpellCheckProvider() {
      return proxyProvider;
    },
    getCurrentLocale() {
      return currentLocale;
    },
    getAvailableDictionaries() {
      return getAvailableDictionaries();
    },
    changeLocale,
    enable() {
      changeLocale(true);
    },
    disable() {
      changeLocale(null);
    },
  };
};
