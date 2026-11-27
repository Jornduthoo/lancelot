// Zet de teksten van de extensie in de taal van de Chromebook (_locales).
for (const el of document.querySelectorAll('[data-t]')) el.textContent = chrome.i18n.getMessage(el.dataset.t) || el.textContent;
for (const el of document.querySelectorAll('[data-t-ph]')) el.placeholder = chrome.i18n.getMessage(el.dataset.tPh) || el.placeholder;
document.title = chrome.i18n.getMessage('naam') || 'LANcelot';
