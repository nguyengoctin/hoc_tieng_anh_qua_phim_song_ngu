import json
import urllib.request
import urllib.parse
from fastapi import APIRouter, HTTPException
from deep_translator import GoogleTranslator

router = APIRouter(prefix="/api/translate", tags=["dictionary"])

def get_phonetic_and_pos(word: str):
    # Only try for single words
    if " " in word:
        return None, None, None
    try:
        url = f"https://api.dictionaryapi.dev/api/v2/entries/en/{urllib.parse.quote(word)}"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=1.2) as response:
            data = json.loads(response.read().decode())
            if data and isinstance(data, list):
                entry = data[0]
                ipa = entry.get("phonetic")
                if not ipa and entry.get("phonetics"):
                    for p in entry["phonetics"]:
                        if p.get("text"):
                            ipa = p["text"]
                            break
                audio = None
                if entry.get("phonetics"):
                    for p in entry["phonetics"]:
                        if p.get("audio"):
                            audio = p["audio"]
                            break
                
                pos = None
                if entry.get("meanings") and len(entry["meanings"]) > 0:
                    pos = entry["meanings"][0].get("partOfSpeech")
                
                return ipa, pos, audio
    except Exception:
        return None, None, None
    return None, None, None

@router.get("")
def translate_word(word: str):
    """Dịch nhanh một từ/cụm từ từ Anh sang Việt và tra từ điển Free Dictionary API."""
    cleaned_word = "".join(c for c in word if c.isalnum() or c.isspace() or c == "'").strip()
    cleaned_word = " ".join(cleaned_word.split())
    if not cleaned_word:
        raise HTTPException(status_code=400, detail="Cụm từ tra cứu không hợp lệ")
    
    try:
        translator = GoogleTranslator(source='en', target='vi')
        translation = translator.translate(cleaned_word)
        
        # Look up phonetic/pos/audio from Free Dictionary API if it is a single word
        ipa, pos, audio_url = get_phonetic_and_pos(cleaned_word.lower())
        
        # Fallbacks
        if not ipa:
            ipa = f"/{cleaned_word}/" if " " not in cleaned_word else ""
        if not pos:
            pos = "phrase" if " " in cleaned_word else "word"
            
        return {
            "word": cleaned_word,
            "translation": translation,
            "ipa": ipa,
            "part_of_speech": pos,
            "audio_url": audio_url
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
