/* global require */
/* eslint-disable strict */

const electron = require('electron');
const { createMenu } = require('./menu');
const Controller = require('./controller');

const { remote, webFrame } = electron;

const controller = Controller();

// Exposed so it can be smoke-tested. See /test/spellcheck_test.js.
window.spellChecker = controller.getSpellCheckProvider();

window.enableSpellCheck = () => {
  controller.enable();
};
window.disableSpellCheck = () => {
  controller.disable();
};

// Since we will offer the enable/disable at least, we always want to add our handler.
window.addEventListener('contextmenu', spellcheckContextMenu);

// Bind our proxy provider.
webFrame.setSpellCheckProvider(
  controller.getCurrentLocale() || 'en-US',
  // Not sure what this parameter (`autoCorrectWord`) does: https://github.com/atom/electron/issues/4371
  // The documentation for `webFrame.setSpellCheckProvider` passes `true` so we do too.
  true,
  controller.getSpellCheckProvider()
);

function spellcheckContextMenu(e) {
  // Only show the context menu in text editors.
  if (!e.target.closest('textarea, input, [contenteditable="true"]')) {
    return;
  }

  const selectedText = window.getSelection().toString();
  const isMisspelled =
    selectedText &&
    controller.getSpellCheckProvider().isMisspelled(selectedText);
  const spellingSuggestions =
    isMisspelled &&
    controller
      .getSpellCheckProvider()
      .getSuggestions(selectedText)
      .slice(0, 5);

  const onChangeLocale = locale => {
    // This will pass true if we don't know what locales are available.
    window.log.info('Selecting spellchecking language', locale);

    // This ensures the settings page knows it's enabled or not.
    const enable = locale !== null;
    window.Events.setSpellCheck(enable);

    controller.changeLocale(locale);
  };

  const menu = createMenu(
    isMisspelled,
    spellingSuggestions,
    controller.getAvailableDictionaries(),
    controller.getCurrentLocale(),
    onChangeLocale
  );

  // The 'contextmenu' event is emitted after 'selectionchange' has fired
  //   but possibly before the visible selection has changed. Try to wait
  //   to show the menu until after that, otherwise the visible selection
  //   will update after the menu dismisses and look weird.
  setTimeout(() => {
    menu.popup(remote.getCurrentWindow());
  }, 30);
}
