const translations = {
  en: {
    welcome: 'Welcome',
    status: 'Status',
    voice: 'Speak to Assistant',
    listen: 'Listen',
    confirm: 'Confirm',
    cancel: 'Cancel',
    help: 'Help me create a listing',
    newBid: 'New bid received',
    created: 'Created successfully.',
    updated: 'Updated successfully.'
  },
  kn: {
    welcome: 'ಸ್ವಾಗತ',
    status: 'ಸ್ಥಿತಿ',
    voice: 'ಸಹಾಯಕನೊಂದಿಗೆ ಮಾತನಾಡಿ',
    listen: 'ಆಲಿಸಿ',
    confirm: 'ಸರಿ',
    cancel: 'ರದ್ದುಮಾಡಿ',
    help: 'ಪಟ್ಟಿ ರಚಿಸಲು ನೆರವ ದಯವಿಟ್ಟು',
    newBid: 'ಹೊಸ bidding ಬಂದಿದೆ',
    created: 'ಸೃಷ್ಟಿಯಾಗಿದೆ.',
    updated: 'ನವೀಕರಣ ಯಶಸ್ವಿಯಾಗಿದೆ.'
  },
  tulu: {
    welcome: 'ಸ್ವಾಗತ',
    status: 'ಸ್ಥಿತಿ',
    voice: 'ಸಹಾಯಕೊಡು ಮಾತನಾಡೊ',
    listen: 'ಕೇಳೆ',
    confirm: 'ಎನ್ಮು',
    cancel: 'ರದ್ದೆ',
    help: 'ಪಟ್ಟಿ ದೆಣ್ ಉಂಟುಮೆ',
    newBid: 'ಪೊಸ ಬಿಡ್ ಬಂದೆ',
    created: 'ಸೃಷ್ಟಿಮಾಡ್ಪಟ್ಟೆ.',
    updated: 'ಪರಿಷ್ಕರಣೆ ಆಯೆ.'
  },
  ml: {
    welcome: 'സ്വാഗതം',
    status: 'സ്ഥിതി',
    voice: 'സഹായകരുമായി സംസാരിക്കുക',
    listen: 'കേൾക്കുക',
    confirm: 'സ്ഥിരീകരിക്കുക',
    cancel: 'റദ്ദാക്കുക',
    help: 'ലിസ്റ്റ് ഉണ്ടാക്കാൻ സഹായം',
    newBid: 'പുതിയ ബിഡ് ലഭിച്ചു',
    created: 'സൃഷ്ടിച്ചു.',
    updated: 'അപ്ഡേറ്റ് ചെയ്തു.'
  }
};

function getTranslation(language = 'en', key) {
  return (translations[language] && translations[language][key]) || translations.en[key] || key;
}
