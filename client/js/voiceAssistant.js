const voiceAssistant = {
  recognition: null,
  transcript: '',
  start() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please type your command instead.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'en-IN';
    this.recognition.continuous = false;
    this.recognition.interimResults = false;

    this.recognition.onstart = () => {
      const box = document.getElementById('voiceTranscript');
      if (box) box.textContent = 'Listening...';
    };

    this.recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      this.transcript = transcript;
      const box = document.getElementById('voiceTranscript');
      if (box) box.textContent = transcript;

      const token = localStorage.getItem('jwtToken');
      try {
        const aiResponse = await request('/ai/command', {
          method: 'POST',
          token,
          body: JSON.stringify({ text: transcript })
        });

        const responseBox = document.getElementById('voiceResponse');
        if (responseBox) responseBox.textContent = JSON.stringify(aiResponse);
        if (window.speechSynthesis) {
          const speech = new SpeechSynthesisUtterance(`I understood: ${JSON.stringify(aiResponse)}`);
          window.speechSynthesis.speak(speech);
        }
      } catch (error) {
        const responseBox = document.getElementById('voiceResponse');
        if (responseBox) responseBox.textContent = error.message;
      }
    };

    this.recognition.start();
  },

  speak(text) {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  }
};
