document.addEventListener('DOMContentLoaded', () => {
    const micContainer = document.getElementById('micContainer');
    const micIcon = document.getElementById('micIcon');
    const languageSelect = document.getElementById('language');
    const originalText = document.getElementById('originalText');
    const translatedText = document.getElementById('translatedText');
    const errorDiv = document.getElementById('error');
    const statusIndicator = document.getElementById('status');

    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;

    // Update status indicator
    function updateStatus(message, isError = false) {
        statusIndicator.textContent = message;
        statusIndicator.style.color = isError ? '#d93025' : '#34a853';
        if (isError) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'block';
            errorDiv.classList.add('animate__animated', 'animate__shakeX');
        } else {
            errorDiv.style.display = 'none';
            errorDiv.classList.remove('animate__animated', 'animate__shakeX');
        }
    }

    micContainer.addEventListener('click', async () => {
        if (!isRecording) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = (event) => {
                    audioChunks.push(event.data);
                };

                mediaRecorder.onstop = handleRecordingStop;
                mediaRecorder.onerror = (event) => {
                    updateStatus('Recording error: ' + event.error, true);
                };

                mediaRecorder.start();
                isRecording = true;
                micContainer.classList.add('recording');
                micIcon.classList.add('recording');
                updateStatus('Recording in progress...');
                originalText.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Listening...';
            } catch (error) {
                updateStatus('Microphone access denied. Please check permissions.', true);
            }
        } else {
            mediaRecorder.stop();
            isRecording = false;
            micContainer.classList.remove('recording');
            micIcon.classList.remove('recording');
            updateStatus('Processing recording...');
        }
    });

    async function handleRecordingStop() {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const formData = new FormData();
        formData.append('audio', audioBlob);
        formData.append('target_lang', languageSelect.value);

        try {
            originalText.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Processing...';
            translatedText.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Translating...';

            const response = await fetch('http://localhost:5000/translate', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.error) {
                updateStatus(data.error, true);
                resetInterface();
                return;
            }

            // Success animations
            originalText.classList.add('animate__animated', 'animate__fadeIn');
            translatedText.classList.add('animate__animated', 'animate__fadeIn');

            originalText.textContent = data.original_text;
            translatedText.textContent = data.translated_text;
            updateStatus('Translation complete');

            // Play the translated audio with visual feedback
            const audio = new Audio(`data:audio/mp3;base64,${data.audio_data}`);
            const speakerContainer = document.getElementById('speakerContainer');
            
            audio.onplay = () => {
                speakerContainer.classList.add('active');
                speakerContainer.querySelector('.wave').style.display = 'block';
            };
            
            audio.onended = () => {
                speakerContainer.classList.remove('active');
                speakerContainer.querySelector('.wave').style.display = 'none';
            };

            audio.play();

        } catch (error) {
            updateStatus('Translation service error. Please try again.', true);
            resetInterface();
        }
    }

    function resetInterface() {
        originalText.textContent = 'Click microphone to start recording...';
        translatedText.textContent = 'Translation will appear here...';
        originalText.classList.remove('animate__animated', 'animate__fadeIn');
        translatedText.classList.remove('animate__animated', 'animate__fadeIn');
    }

    // Add event listener for language selection change
    languageSelect.addEventListener('change', () => {
        updateStatus(`Ready to translate to ${languageSelect.options[languageSelect.selectedIndex].text}`);
    });

    // Initialize speaker container click handler for replay
    const speakerContainer = document.getElementById('speakerContainer');
    speakerContainer.addEventListener('click', () => {
        const audioElement = document.querySelector('audio');
        if (audioElement && audioElement.src) {
            audioElement.play();
        }
    });

    // Add keyboard shortcuts
    document.addEventListener('keydown', (event) => {
        // Space bar to toggle recording
        if (event.code === 'Space' && !event.repeat) {
            event.preventDefault();
            micContainer.click();
        }
    });

    // Initialize the interface
    updateStatus('Ready to translate');
});