const voiceAssistant = {
  recognition: null,
  transcript: '',
  context: {},
  start() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.setMessage('Speech recognition is not supported in this browser.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'en-IN';
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.onstart = () => this.setMessage('Listening...');
    this.recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      this.transcript = transcript;
      const box = document.getElementById('voiceTranscript');
      if (box) box.textContent = transcript;

      try {
        const result = await request('/ai/command', {
          method: 'POST',
          token: localStorage.getItem('jwtToken'),
          body: JSON.stringify({
            text: transcript.trim(),
            language: localStorage.getItem('language') || 'en',
            context: this.context
          })
        });
        this.context = result.context || this.context;
        this.renderResult(result);
      } catch (error) {
        this.setMessage(error.message);
      }
    };
    this.recognition.start();
  },
  speak(text) {
    if ('speechSynthesis' in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  },
  setMessage(message) {
    const responseBox = document.getElementById('voiceResponse');
    if (responseBox) responseBox.textContent = message;
  },
  renderResult(result) {
    const responseBox = document.getElementById('voiceResponse');
    if (!responseBox) return;
    if (result.missingFields?.length) {
      const questions = {
        species: 'Which fish would you like to use?',
        quantity: 'How many kilos would you like to sell?',
        price: 'What price would you like per kilo?',
        startingPrice: 'What starting price would you like per kilo?',
        saleType: 'Would you like to sell it directly or create an auction?'
      };
      const question = questions[result.missingFields[0]] || 'What detail should I use?';
      this.setMessage(question);
      this.speak(question);
      return;
    }
    if (result.requiresConfirmation) {
      const status = result.status || result.parameters?.status || 'RETURNING';
      const title = result.intent === 'UPDATE_VESSEL_STATUS' ? 'Update Vessel Status' : 'Confirm Voice Action';
      const detail = result.intent === 'UPDATE_VESSEL_STATUS'
        ? `<p>Vessel: <strong id="assistantVesselName">Your vessel</strong></p><p>New Status: <strong>${status.replace(/_/g, ' ')}</strong></p>`
        : `<div>${(result.actions || [result]).map((action) => `<p>${this.describeAction(action)}</p>`).join('')}</div><p>Please confirm.</p>`;
      responseBox.innerHTML = `<div class="confirmation"><h3>${title}</h3>${detail}<div class="confirmation-actions"><button id="confirmVoiceAction">Confirm</button><button id="cancelVoiceAction" class="secondary">Cancel</button></div></div>`;
      document.dispatchEvent(new CustomEvent('voice-confirmation-ready', { detail: result }));
      return;
    }
    const messages = {
      HELP: 'You can ask about your vessel, catches, listings, auctions, orders, earnings, or market prices.',
      VIEW_EARNINGS: 'Your earnings are available from the dashboard.',
      VIEW_ORDERS: 'Your latest orders are available from the dashboard.',
      VIEW_AUCTIONS: 'Your active auctions are available from the dashboard.'
    };
    this.setMessage(messages[result.intent] || 'I understood your request. Please choose an available action from the dashboard.');
  },
  describeAction(result) {
    const parameters = result.parameters || result;
    if (result.intent === 'RECORD_CATCH') return `Record ${parameters.quantity} kg of ${parameters.species}.`;
    if (result.intent === 'CREATE_AUCTION') return `Auction ${parameters.quantity} kg of ${parameters.species} at ₹${parameters.startingPrice}/kg.`;
    if (result.intent === 'CREATE_DIRECT_SALE') return `Sell ${parameters.quantity} kg of ${parameters.species} at ₹${parameters.price}/kg.`;
    if (result.intent === 'CREATE_FISH_LISTING') return `List ${parameters.quantity} kg of ${parameters.species}.`;
    if (result.intent === 'START_FISHING_TRIP') return 'Start a new fishing trip.';
    if (result.intent === 'END_FISHING_TRIP') return 'End the current fishing trip.';
    return 'Apply this action?';
  }
};

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('voiceAssistantPage')) return;
  const token = localStorage.getItem('jwtToken');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  let vessel;
  let dashboard;
  request('/fisherman/dashboard', { method: 'GET', token }).then((dashboardData) => {
    dashboard = dashboardData;
    vessel = dashboardData.vessel;
  }).catch(() => voiceAssistant.setMessage('Vessel information is temporarily unavailable.'));

  document.getElementById('startListeningBtn').addEventListener('click', () => voiceAssistant.start());
  document.addEventListener('voice-confirmation-ready', (event) => {
    const vesselName = document.getElementById('assistantVesselName');
    if (vesselName && vessel) vesselName.textContent = vessel.name;
    document.getElementById('confirmVoiceAction').addEventListener('click', async () => {
      if (event.detail.intent === 'UPDATE_VESSEL_STATUS' && !vessel) return voiceAssistant.setMessage('Vessel information is unavailable.');
      try {
        if (event.detail.intent === 'UPDATE_VESSEL_STATUS') {
          const status = event.detail.parameters?.status || event.detail.status;
          await request(`/vessels/${vessel.id}/status`, { method: 'PUT', token, body: JSON.stringify({ status, source: 'FISHERMAN' }) });
          const readableStatus = status.replace(/_/g, ' ');
          voiceAssistant.setMessage(`Vessel status updated to ${readableStatus}.`);
          voiceAssistant.speak(`Your vessel status has been updated to ${readableStatus}.`);
        } else if (!dashboard) {
          voiceAssistant.setMessage('Dashboard information is unavailable.');
        } else {
          const actions = event.detail.actions || [event.detail];
          const trip = dashboard.trips.find((entry) => entry.status === 'ACTIVE');
          for (const action of actions) {
            const parameters = action.parameters || action;
            if (action.intent === 'RECORD_CATCH') {
              await request('/catches', { method: 'POST', token, body: JSON.stringify({
                fishSpecies: parameters.species,
                quantity: parameters.quantity,
                unit: parameters.unit || 'kg',
                quality: parameters.quality || 'A',
                vesselId: vessel.id,
                fishingTripId: trip?.id || null
              }) });
            } else if (action.intent === 'CREATE_AUCTION') {
              await request('/auctions', { method: 'POST', token, body: JSON.stringify({ fishSpecies: parameters.species, quantity: parameters.quantity, startingPrice: parameters.startingPrice, quality: parameters.quality || 'A' }) });
            } else if (action.intent === 'CREATE_DIRECT_SALE' || action.intent === 'CREATE_FISH_LISTING') {
              await request('/listings', { method: 'POST', token, body: JSON.stringify({ fishSpecies: parameters.species, quantity: parameters.quantity, price: parameters.price, quality: parameters.quality || 'A', saleType: action.intent === 'CREATE_DIRECT_SALE' ? 'DIRECT_SALE' : parameters.saleType }) });
            } else if (action.intent === 'START_FISHING_TRIP') {
              await request('/fishing-trips', { method: 'POST', token, body: JSON.stringify({ vesselId: vessel.id, fishermanId: dashboard.fisherman.id, status: 'ACTIVE' }) });
            }
          }
          voiceAssistant.setMessage('Your catch and sale details were saved successfully.');
          voiceAssistant.speak('Your catch and sale details were saved successfully.');
        }
      } catch (error) {
        voiceAssistant.setMessage(error.message);
      }
    });
    document.getElementById('cancelVoiceAction').addEventListener('click', () => voiceAssistant.setMessage('Update cancelled.'));
  });
});
