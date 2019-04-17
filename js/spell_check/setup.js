/* global require, process, module */
/* eslint-disable strict */

const osLocale = require('os-locale');
const { basename } = require('path');
const semver = require('semver');
const glob = require('glob');
const os = require('os');

// We load locale this way and not via app.getLocale() because this call returns
//   'es_ES' and not just 'es.' And hunspell requires the fully-qualified locale.
const defaultLocale = osLocale.sync().replace('-', '_');

// The LANG environment variable is how node spellchecker finds its default language:
//   https://github.com/atom/node-spellchecker/blob/59d2d5eee5785c4b34e9669cd5d987181d17c098/lib/spellchecker.js#L29
if (!process.env.LANG) {
  process.env.LANG = defaultLocale;
}

let location = process.env.HUNSPELL_DICTIONARIES;
let extraLocales = [];

function setupLinux(locale) {
  // apt-get install hunspell-<locale> can be run for easy access
  //   to other dictionaries
  location = location || '/usr/share/hunspell';

  // Hunnspell's getAvailableDictionaries does nothing, workaround using glob.
  glob(`${location}/*.dic`, (err, res) => {
    if (err) {
      window.log.error('Failed to glob hunspell dictionaries', err);
    } else {
      const locales = res
        .map(f =>
          basename(f)
            .replace('.dic', '')
            .replace('-', '_')
        )
        .filter(l => l.includes('_'));
      window.log.info('Found hunspell dictionaries', locales);
      extraLocales = locales;
    }
  });

  if (process.env.HUNSPELL_DICTIONARIES || locale !== 'en_US') {
    window.log.info(
      'Detected Linux. Setting up spell check with locale',
      locale,
      'and dictionary location',
      location
    );
  } else {
    window.log.info(
      'Detected Linux. Using default en_US spell check dictionary'
    );
  }
}

function setupWin7AndEarlier(locale) {
  if (process.env.HUNSPELL_DICTIONARIES || locale !== 'en_US') {
    window.log.info(
      'Detected Windows 7 or below. Setting up spell-check with locale',
      locale,
      'and dictionary location',
      location
    );
  } else {
    window.log.info(
      'Detected Windows 7 or below. Using default en_US spell check dictionary'
    );
  }
}

if (process.platform === 'linux') {
  setupLinux(defaultLocale);
} else if (process.platform === 'windows' && semver.lt(os.release(), '8.0.0')) {
  setupWin7AndEarlier(defaultLocale);
} else {
  // OSX and Windows 8+ have OS-level spellcheck APIs
  window.log.info('Using OS-level spell check API with locale', defaultLocale);
}

module.exports = {
  getExtraLocales() {
    return extraLocales;
  },
  getLocation() {
    return location;
  },
  getDefaultLocale() {
    return defaultLocale;
  },
};
