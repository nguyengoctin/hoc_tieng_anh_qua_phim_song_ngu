import sqlite3
import os
import json

DB_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(DB_DIR, "learning.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Khởi tạo các bảng cơ sở dữ liệu nếu chưa tồn tại"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Bảng từ vựng
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS vocabulary (
            word TEXT PRIMARY KEY,
            ipa TEXT,
            translation TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # 2. Bảng cache kết quả AI giải thích
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS ai_cache (
            sentence TEXT PRIMARY KEY,
            response_json TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.commit()
    conn.close()

# --- Vocabulary Helpers ---

def add_vocab(word: str, ipa: str, translation: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT OR REPLACE INTO vocabulary (word, ipa, translation) VALUES (?, ?, ?)",
            (word, ipa, translation)
        )
        conn.commit()
        return True
    except Exception as e:
        print(f"Error adding vocab: {e}")
        return False
    finally:
        conn.close()

def get_all_vocab():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT word, ipa, translation, created_at FROM vocabulary ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def delete_vocab(word: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM vocabulary WHERE word = ?", (word,))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error deleting vocab: {e}")
        return False
    finally:
        conn.close()

# --- AI Cache Helpers ---

def get_ai_cached_explanation(sentence: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT response_json FROM ai_cache WHERE sentence = ?", (sentence.strip(),))
    row = cursor.fetchone()
    conn.close()
    if row:
        try:
            return json.loads(row["response_json"])
        except Exception:
            return None
    return None

def save_ai_explanation(sentence: str, explanation_dict: dict):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        response_json = json.dumps(explanation_dict, ensure_ascii=False)
        cursor.execute(
            "INSERT OR REPLACE INTO ai_cache (sentence, response_json) VALUES (?, ?)",
            (sentence.strip(), response_json)
        )
        conn.commit()
        return True
    except Exception as e:
        print(f"Error saving AI explanation to cache: {e}")
        return False
    finally:
        conn.close()
