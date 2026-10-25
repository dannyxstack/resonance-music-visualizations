// Static public pages work without the account API and share the app language preference.
const languageSelect = document.querySelector('[data-language-select]');
if (languageSelect && window.resonanceI18n) {
  languageSelect.value = window.resonanceI18n.language;
  languageSelect.addEventListener('change', () => window.resonanceI18n.setLanguage(languageSelect.value));
}
