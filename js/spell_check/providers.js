/* global exports, _ */
/* eslint-disable strict */

const EN_VARIANT = /^en/;

// Prevent the spellchecker from showing contractions as errors.
const ENGLISH_SKIP_WORDS = [
  'ain',
  'couldn',
  'didn',
  'doesn',
  'hadn',
  'hasn',
  'mightn',
  'mustn',
  'needn',
  'oughtn',
  'shan',
  'shouldn',
  'wasn',
  'weren',
  'wouldn',
];

exports.SimpleProvider = (locale, spellchecker) => ({
  locale,
  spellCheck(text) {
    return !this.isMisspelled(text);
  },
  isMisspelled(text) {
    const misspelled = spellchecker.isMisspelled(text);

    // The idea is to make this as fast as possible. For the many, many calls which
    //   don't result in the red squiggly, we minimize the number of checks.
    if (!misspelled) {
      return false;
    }

    // Only if we think we've found an error do we check the locale and skip list.
    if (locale.match(EN_VARIANT) && _.contains(ENGLISH_SKIP_WORDS, text)) {
      return false;
    }

    return true;
  },
  getSuggestions(text) {
    return spellchecker.getCorrectionsForMisspelling(text);
  },
  add(text) {
    spellchecker.add(text);
  },
});

exports.CompositeProvider = providers => ({
  spellCheck(text) {
    return !this.isMisspelled(text);
  },
  isMisspelled(text) {
    for (let i = 0; i < providers.length; i += 1) {
      if (!providers[i].isMisspelled(text)) {
        return false;
      }
    }
    return true;
  },
  getSuggestions(text) {
    // First try to limit the sources of suggestions to one per base language.
    // This is to mitigate performance issues (easily 20+ seconds in some cases).
    const sources = Object.values(
      providers.reduce((acc, p) => {
        if (!p.locale) return acc;
        return { ...acc, [p.locale.substring(0, 2)]: p };
      }, {})
    );

    let suggestions = [];
    for (let i = 0; i < sources.length; i += 1) {
      suggestions = [...suggestions, ...sources[i].getSuggestions(text)];
    }

    // Remove duplicates.
    return Object.keys(
      suggestions.reduce((acc, d) => ({ ...acc, [d]: true }), {})
    );
  },
  add() {
    // It's ambiguous which locale should receive this, so ignore it.
  },
});

exports.setProvider = Symbol('setProvider');
exports.ProxyProvider = () => {
  let provider = exports.DummyProvider();
  return {
    spellCheck(...args) {
      return provider.spellCheck(...args);
    },
    isMisspelled(...args) {
      return provider.isMisspelled(...args);
    },
    getSuggestions(...args) {
      return provider.getSuggestions(...args);
    },
    add(...args) {
      return provider.add(...args);
    },
    [exports.setProvider](val) {
      provider = val;
    },
  };
};

exports.DummyProvider = () => ({
  locale: null,
  spellCheck() {
    return true;
  },
  isMisspelled() {
    return false;
  },
  getSuggestions() {
    return [];
  },
  add() {
    // nothing
  },
});
