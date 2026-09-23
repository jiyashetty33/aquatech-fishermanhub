const voiceAssistant = {
  recognition: null,
  transcript: '',
  pendingConfirmation: null,
  isListening: false,

  safeParseAiResponse(response) {
    let value = response;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (value === null || value === undefined) return {};
      if (typeof value === 'string') {
        try { value = JSON.parse(value); } catch (error) { return {}; }
        continue;
      }
      if (typeof value !== 'object') return {};
      if (value.data && typeof value.data === 'object') { value = value.data; continue; }
      if (value.response && typeof value.response === 'object') { value = value.response; continue; }
      return value;
    }
    return {};
  },

  formatStatus(status) {
    const labels = { AT_HARBOR: 'At Harbor', DEPARTED: 'Departed', FISHING: 'Fishing', RETURNING: 'Returning', ANCHORED: 'Anchored', ARRIVED: 'Arrived', DOCKED: 'Docked' };
    return labels[status] || String(status || '').replace(/_/g, ' ');
  },

  showMessage(message) {
    const box = document.getElementById('voiceResponse');
    if (box) box.innerHTML = `<p>${message}</p>`;
  },

  speak(message) {
    if ('speechSynthesis' in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(message));
  },

  async getDashboard() {
    const token = localStorage.getItem('jwtToken');
    return request('/fisherman/dashboard', { method: 'GET', token });
  },

  renderConfirmation(action) {
    const box = document.getElementById('voiceResponse');
    if (!box) return;
    this.pendingConfirmation = action;
    box.innerHTML = `
      <div class="confirmation">
        <h3>${action.title}</h3>
        ${action.lines.map((line) => `<p>${line}</p>`).join('')}
        <div class="confirmation-actions">
          <button type="button" id="voiceConfirm">Confirm</button>
          <button type="button" id="voiceCancel" class="secondary">Cancel</button>
        </div>
      </div>
    `;
    document.getElementById('voiceConfirm').addEventListener('click', () => this.confirm());
    document.getElementById('voiceCancel').addEventListener('click', () => {
      this.pendingConfirmation = null;
      this.showMessage('Action cancelled.');
    });
  },

  async confirm() {
    const action = this.pendingConfirmation;
    if (!action) return;
    const token = localStorage.getItem('jwtToken');
    if (!token) { this.showMessage('Please log in again.'); return; }

    try {
      const dashboard = await this.getDashboard();
      const vesselId = dashboard.vessel?.id;
      let message;

      if (action.intent === 'UPDATE_VESSEL_STATUS') {
        await request(`/vessels/${vesselId}/status`, { method: 'PUT', token, body: JSON.stringify({ status: action.parameters.status, source: 'VOICE' }) });
        message = `Vessel status updated to ${this.formatStatus(action.parameters.status)}.`;
      } else {
        if (!vesselId) throw new Error('missing vessel');
        if (action.intent === 'RECORD_CATCH' || action.intent === 'RECORD_CATCH_AND_CREATE_AUCTION' || action.intent === 'RECORD_CATCH_AND_CREATE_DIRECT_SALE') {
          await request('/catches', { method: 'POST', token, body: JSON.stringify({ fishSpecies: action.parameters.species, quantity: action.parameters.quantity, unit: 'kg', quality: action.parameters.quality || 'A', vesselId }) });
        }
        if (action.intent === 'CREATE_DIRECT_SALE' || action.intent === 'RECORD_CATCH_AND_CREATE_DIRECT_SALE') {
          const listingQuantity = action.parameters.listingQuantity || action.parameters.quantity;
          await request('/listings', { method: 'POST', token, body: JSON.stringify({ fishSpecies: action.parameters.species, quantity: listingQuantity, price: action.parameters.price, saleType: 'DIRECT_SALE' }) });
          message = `${listingQuantity} kg of ${action.parameters.species} is now listed for direct sale.`;
        } else if (action.intent === 'CREATE_AUCTION' || action.intent === 'RECORD_CATCH_AND_CREATE_AUCTION') {
          const listingQuantity = action.parameters.listingQuantity || action.parameters.quantity;
          await request('/auctions', { method: 'POST', token, body: JSON.stringify({ fishSpecies: action.parameters.species, quantity: listingQuantity, startingPrice: action.parameters.price, durationMinutes: 60 }) });
          message = `${listingQuantity} kg of ${action.parameters.species} is now listed for auction.`;
        } else {
          message = `${action.parameters.quantity} kg of ${action.parameters.species} was recorded as your catch.`;
        }
      }

      this.pendingConfirmation = null;
      this.showMessage(message);
      this.speak(message);
    } catch (error) {
      this.showMessage('Sorry, I could not complete that action. Please check the details and try again.');
    }
  },

  async handleIntent(payload) {
    const parsed = this.safeParseAiResponse(payload);
    const intent = parsed.intent || 'UNKNOWN';
    const parameters = parsed.parameters || {};
    const missing = Array.isArray(parsed.missing || parsed.missingFields) ? (parsed.missing || parsed.missingFields) : [];

    if (intent === 'CLARIFICATION_REQUIRED') {
      this.showMessage(parsed.message || 'What would you like to do with this catch?');
      return;
    }
    if (intent === 'UNKNOWN') { this.showMessage("I couldn't understand that. Please try again."); return; }
    if (missing.includes('species')) { this.showMessage('Which fish species do you mean?'); return; }
    if (missing.includes('quantity')) { this.showMessage(`How many kilos of ${parameters.species || 'fish'} would you like to use?`); return; }
    if (missing.includes('listingQuantity')) { this.showMessage(`How many kilos of ${parameters.species} would you like to sell?`); return; }
    if (missing.includes('price')) {
      const pricePrompt = intent === 'CREATE_DIRECT_SALE' ? `What price would you like per kilo for ${parameters.species}?` : `What starting price would you like per kilo for ${parameters.species}?`;
      this.showMessage(pricePrompt);
      return;
    }

    if (intent === 'VIEW_MARKET_PRICE') {
      if (!parameters.species) { this.showMessage('Which fish price would you like to know?'); return; }
      const prices = await request('/prices', { method: 'GET', token: localStorage.getItem('jwtToken') });
      const price = prices.find((entry) => entry.fishSpecies.toLowerCase() === parameters.species.toLowerCase());
      this.showMessage(price ? `${price.fishSpecies} is currently ₹${price.recentPrice} per kg based on platform data.` : `I could not find a current platform price for ${parameters.species}.`);
      return;
    }
    if (intent === 'VIEW_EARNINGS') {
      const earnings = await request('/fisherman/earnings', { method: 'GET', token: localStorage.getItem('jwtToken') });
      this.showMessage(`Your total earnings are ₹${earnings.totalEarnings || 0}.`);
      return;
    }
    if (intent === 'VIEW_ORDERS') {
      const orders = await request('/fisherman/orders', { method: 'GET', token: localStorage.getItem('jwtToken') });
      this.showMessage(`You have ${orders.items?.length || 0} orders.`);
      return;
    }
    if (intent === 'VIEW_AUCTIONS') {
      const auctions = await request('/auctions', { method: 'GET', token: localStorage.getItem('jwtToken') });
      this.showMessage(`There are ${auctions.filter((auction) => auction.status === 'ACTIVE').length} active auctions.`);
      return;
    }
    if (intent === 'HELP') { this.showMessage('You can say: I caught 30 kilos of mackerel, or sell 10 kilos of sardines directly.'); return; }
    if (intent === 'EMERGENCY_ALERT') { this.showMessage('Emergency alerts are available from the port support team.'); return; }

    const dashboard = await this.getDashboard();
    if (intent === 'UPDATE_VESSEL_STATUS') {
      this.renderConfirmation({ intent, title: 'Update Vessel Status', parameters, lines: [`Vessel: ${dashboard.vessel?.name || 'Your vessel'}`, `New Status: ${this.formatStatus(parameters.status)}`] });
      return;
    }

    if (intent === 'RECORD_CATCH') {
      this.renderConfirmation({ intent, title: 'Record Catch', parameters, lines: [`${parameters.quantity} kg of ${parameters.species} will be recorded as your catch.`] });
      return;
    }

    if (intent === 'CREATE_FISH_LISTING') {
      this.showMessage(`Would you like to sell your ${parameters.species} directly or create an auction?`);
      return;
    }

    if (intent === 'CREATE_DIRECT_SALE' || intent === 'RECORD_CATCH_AND_CREATE_DIRECT_SALE') {
      if (!parameters.price) { this.showMessage(`What price would you like per kilo for ${parameters.species}?`); return; }
      const listingQuantity = parameters.listingQuantity || parameters.quantity;
      const lines = intent === 'RECORD_CATCH_AND_CREATE_DIRECT_SALE'
        ? [`${parameters.quantity} kg of good-quality ${parameters.species} will be recorded.`, `${listingQuantity} kg will be listed for direct sale at ₹${parameters.price}/kg.`]
        : [`${listingQuantity} kg of ${parameters.species}`, 'Direct Sale', `₹${parameters.price}/kg`];
      this.renderConfirmation({ intent, title: 'Create Direct Sale', parameters, lines });
      return;
    }

    if (intent === 'CREATE_AUCTION' || intent === 'RECORD_CATCH_AND_CREATE_AUCTION') {
      const listingQuantity = parameters.listingQuantity || parameters.quantity;
      const lines = intent === 'RECORD_CATCH_AND_CREATE_AUCTION'
        ? [`${parameters.quantity} kg of ${parameters.species} will be recorded.`, `${listingQuantity} kg will be auctioned starting at ₹${parameters.price}/kg.`]
        : [`${listingQuantity} kg of ${parameters.species}`, `Auction starting at ₹${parameters.price}/kg`];
      this.renderConfirmation({ intent, title: 'Create Auction', parameters, lines });
      return;
    }

    this.showMessage('I understood the request, but need a little more information.');
  },

  start() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { this.showMessage('Speech recognition is not supported here. Please type your request instead.'); return; }
    this.recognition = new SpeechRecognition();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const languageSelect = document.getElementById('voiceLanguage');
    const selectedLanguage = languageSelect?.value || user.language || 'en';
    this.recognition.lang = selectedLanguage === 'kn' ? 'kn-IN' : selectedLanguage === 'ml' ? 'ml-IN' : selectedLanguage === 'tulu' ? 'kn-IN' : 'en-IN';
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.onstart = () => { this.isListening = true; document.getElementById('voiceTranscript').textContent = 'Listening...'; };
    this.recognition.onresult = async (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim();
      if (!transcript) { this.showMessage('I did not hear anything. Please try again.'); return; }
      this.transcript = transcript;
      document.getElementById('voiceTranscript').textContent = transcript;
      try {
        const response = await request('/ai/command', { method: 'POST', token: localStorage.getItem('jwtToken'), body: JSON.stringify({ text: transcript, language: selectedLanguage }) });
        await this.handleIntent(response);
      } catch (error) {
        console.error('Voice assistant request failed', error);
        this.showMessage('Sorry, I could not process that request. Please try again.');
      }
    };
    this.recognition.onerror = (event) => {
      const messages = { 'not-allowed': 'Microphone permission was denied. Please allow microphone access and try again.', 'no-speech': 'I did not hear anything. Please try again.', 'audio-capture': 'No microphone was found. Please check your device.' };
      this.showMessage(messages[event.error] || 'Speech recognition could not start. Please try again.');
    };
    this.recognition.onend = () => { this.isListening = false; };
    this.recognition.start();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('jwtToken');
  if (!token) { window.location.href = 'login.html'; return; }
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const languageSelect = document.getElementById('voiceLanguage');
  if (languageSelect) {
    languageSelect.value = user.language || 'en';
    languageSelect.addEventListener('change', () => {
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      currentUser.language = languageSelect.value;
      localStorage.setItem('user', JSON.stringify(currentUser));
    });
  }
  const button = document.getElementById('startListeningBtn');
  if (button) button.addEventListener('click', () => voiceAssistant.start());
});
