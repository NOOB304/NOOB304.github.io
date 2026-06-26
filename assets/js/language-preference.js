(function () {
  'use strict';

  var storageKey = 'heng-wei-preferred-language';

  function rememberLanguage(language) {
    if (!language) {
      return;
    }

    try {
      window.localStorage.setItem(storageKey, language);
    } catch (error) {
      // Storage can be disabled in private browsing or strict privacy modes.
    }
  }

  document.addEventListener('click', function (event) {
    var link = event.target.closest ? event.target.closest('[data-language-switch]') : null;

    if (!link) {
      return;
    }

    rememberLanguage(link.getAttribute('data-language-switch'));
  });
}());
