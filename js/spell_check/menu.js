/* global require, exports */
/* eslint-disable strict */

const { BrowserWindow, Menu } = require('electron').remote;

const noop = () => {};

/*
  Imported these defaults from electron-editor-context-menu.
  Because from this context electron.Menu is remote (main thread),
  passing a templating function to electron-editor-context-menu will
  become async and return undefined.
  See https://electronjs.org/docs/api/remote#passing-callbacks-to-the-main-process
*/

const DEFAULT_MAIN_TPL = [
  {
    label: 'Undo',
    role: 'undo',
  },
  {
    label: 'Redo',
    role: 'redo',
  },
  {
    type: 'separator',
  },
  {
    label: 'Cut',
    role: 'cut',
  },
  {
    label: 'Copy',
    role: 'copy',
  },
  {
    label: 'Paste',
    role: 'paste',
  },
  {
    label: 'Paste and Match Style',
    click: () => {
      BrowserWindow.getFocusedWindow().webContents.pasteAndMatchStyle();
    },
  },
  {
    label: 'Select All',
    role: 'selectall',
  },
  {
    type: 'separator',
  },
];

const DEFAULT_SUGGESTIONS_TPL = [
  {
    label: 'No suggestions',
    click: noop,
  },
  {
    type: 'separator',
  },
];

const replaceWithSuggestion = suggestion => () => {
  BrowserWindow.getFocusedWindow().webContents.replaceMisspelling(suggestion);
};

const languageSelection = (detectedLocales, currentLocale, onChangeLocale) => {
  const base = [
    {
      label: 'Disabled',
      type: 'radio',
      checked: currentLocale === null,
      click: () => {
        onChangeLocale(null);
      },
    },
  ];

  if (detectedLocales.length) {
    return [
      {
        label: 'All your languages',
        type: 'radio',
        checked: currentLocale === '*',
        click: () => {
          onChangeLocale('*');
        },
      },
      ...detectedLocales.map(l => ({
        label: l,
        type: 'radio',
        checked: l === currentLocale,
        click: () => {
          onChangeLocale(l);
        },
      })),
      ...base,
    ];
  }

  return [
    {
      label: 'Enabled',
      type: 'radio',
      checked: currentLocale !== null,
      click: () => {
        onChangeLocale(true);
      },
    },
    ...base,
  ];
};

exports.createMenu = (
  isMisspelled,
  spellingSuggestions,
  detectedLocales,
  currentLocale,
  onChangeLocale
) => {
  let template = DEFAULT_MAIN_TPL;

  if (isMisspelled) {
    if (spellingSuggestions.length) {
      template = [
        ...spellingSuggestions.map(s => ({
          label: s,
          click: replaceWithSuggestion(s),
        })),
        { type: 'separator' },
        ...template,
      ];
    } else {
      template = [...DEFAULT_SUGGESTIONS_TPL, ...template];
    }
  }

  template = [
    ...template,
    {
      label: 'Spellcheck',
      submenu: languageSelection(
        detectedLocales,
        currentLocale,
        onChangeLocale
      ),
    },
  ];

  return Menu.buildFromTemplate(template);
};
