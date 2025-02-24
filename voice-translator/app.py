from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
import speech_recognition as sr
from deep_translator import GoogleTranslator
from gtts import gTTS
import os
import base64
import tempfile

app = Flask(__name__, static_folder='static')
# Enable CORS for all routes
CORS(app, resources={r"/*": {"origins": "*"}})

@app.route('/')
def home():
    return '''
    <html>
        <head>
            <title>Voice Translator API</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    max-width: 800px; 
                    margin: 20px auto; 
                    padding: 20px;
                }
            </style>
        </head>
        <body>
            <h1>Voice Translator API</h1>
            <p>API Endpoints:</p>
            <ul>
                <li><strong>POST /translate</strong> - Translate voice recording</li>
                <li><strong>GET /test</strong> - Test if API is working</li>
                <li><strong>GET /translator</strong> - Access the translator interface</li>
            </ul>
        </body>
    </html>
    '''

@app.route('/translator')
def translator():
    return send_from_directory('static', 'index.html')

@app.route('/test', methods=['GET'])
def test():
    return jsonify({"status": "API is working!"})

def recognize_speech_from_file(audio_file):
    recognizer = sr.Recognizer()
    with sr.AudioFile(audio_file) as source:
        audio = recognizer.record(source)
    try:
        text = recognizer.recognize_google(audio)
        return text
    except sr.UnknownValueError:
        return None
    except sr.RequestError as e:
        print(f"Could not request results from speech recognition service; {e}")
        return None

def translate_text(text, target_lang="es"):
    translator = GoogleTranslator(source="auto", target=target_lang)
    return translator.translate(text)

def text_to_speech(text, lang="es"):
    temp_file = "temp_audio.mp3"
    tts = gTTS(text=text, lang=lang)
    tts.save(temp_file)
    
    with open(temp_file, 'rb') as audio_file:
        audio_data = base64.b64encode(audio_file.read()).decode('utf-8')
    
    os.remove(temp_file)
    return audio_data

@app.route('/translate', methods=['POST'])
def translate():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400
    
    audio_file = request.files['audio']
    target_lang = request.form.get('target_lang', 'es')
    
    # Create a temporary file with .wav extension
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_wav:
        temp_wav_path = temp_wav.name
        audio_file.save(temp_wav_path)
    
    try:
        # Speech to text
        text = recognize_speech_from_file(temp_wav_path)
        if not text:
            return jsonify({'error': 'Could not recognize speech'}), 400
        
        # Translate text
        translated_text = translate_text(text, target_lang)
        
        # Text to speech
        audio_data = text_to_speech(translated_text, target_lang)
        
        return jsonify({
            'original_text': text,
            'translated_text': translated_text,
            'audio_data': audio_data
        })
    
    except Exception as e:
        return jsonify({'error': f'Translation error: {str(e)}'}), 500
    
    finally:
        # Clean up
        if os.path.exists(temp_wav_path):
            os.remove(temp_wav_path)

if __name__ == '__main__':
    # Ensure the static folder exists
    os.makedirs('static', exist_ok=True)
    app.run(debug=True)