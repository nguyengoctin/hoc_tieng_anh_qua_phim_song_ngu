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
            part_of_speech TEXT,
            audio_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Thực hiện migration nhỏ nếu các cột mới chưa tồn tại
    try:
        cursor.execute("ALTER TABLE vocabulary ADD COLUMN part_of_speech TEXT")
    except sqlite3.OperationalError:
        pass # Cột đã tồn tại
    try:
        cursor.execute("ALTER TABLE vocabulary ADD COLUMN audio_url TEXT")
    except sqlite3.OperationalError:
        pass # Cột đã tồn tại
    try:
        cursor.execute("ALTER TABLE vocabulary ADD COLUMN next_review TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE vocabulary ADD COLUMN interval_days INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE vocabulary ADD COLUMN repetitions INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE vocabulary ADD COLUMN efactor REAL DEFAULT 2.5")
    except sqlite3.OperationalError:
        pass
    
    # 2. Bảng cache kết quả AI giải thích
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS ai_cache (
            sentence TEXT PRIMARY KEY,
            response_json TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 3. Bảng tiến trình xem phim (Persisted Watch Progress)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS watch_progress (
            episode_id TEXT PRIMARY KEY,
            last_position REAL,
            duration REAL,
            completed INTEGER DEFAULT 0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.commit()
    conn.close()

# --- Watch Progress Helpers ---

def save_progress(episode_id: str, last_position: float, duration: float, completed: int):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT OR REPLACE INTO watch_progress (episode_id, last_position, duration, completed, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        """, (episode_id, last_position, duration, completed))
        conn.commit()
        return True
    except Exception as e:
        print(f"Error saving watch progress: {e}")
        return False
    finally:
        conn.close()

def get_progress(episode_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT last_position, duration, completed FROM watch_progress WHERE episode_id = ?", (episode_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def get_completed_episodes():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT episode_id FROM watch_progress WHERE completed = 1")
    rows = cursor.fetchall()
    conn.close()
    return [row["episode_id"] for row in rows]

# --- Vocabulary Helpers ---

def add_vocab(word: str, ipa: str, translation: str, part_of_speech: str = None, audio_url: str = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            INSERT INTO vocabulary (word, ipa, translation, part_of_speech, audio_url) 
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(word) DO UPDATE SET
                ipa = excluded.ipa,
                translation = excluded.translation,
                part_of_speech = COALESCE(excluded.part_of_speech, vocabulary.part_of_speech),
                audio_url = COALESCE(excluded.audio_url, vocabulary.audio_url)
            """,
            (word, ipa, translation, part_of_speech, audio_url)
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
    cursor.execute("SELECT word, ipa, translation, part_of_speech, audio_url, next_review, interval_days, repetitions, efactor, created_at FROM vocabulary ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def update_vocab_srs(word: str, next_review: str, interval_days: int, repetitions: int, efactor: float):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE vocabulary SET next_review = ?, interval_days = ?, repetitions = ?, efactor = ? WHERE word = ?",
            (next_review, interval_days, repetitions, efactor, word)
        )
        conn.commit()
        return True
    except Exception as e:
        print(f"Error updating vocab SRS: {e}")
        return False
    finally:
        conn.close()

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
    if not sentence:
        return None
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT response_json FROM ai_cache WHERE sentence = ?", (sentence.strip(),))
    row = cursor.fetchone()
    conn.close()
    if row:
        try:
            data = json.loads(row["response_json"])
            # Đảm bảo dữ liệu cache phải đúng cấu trúc Google Dictionary mới (có chứa key definition)
            if isinstance(data, dict) and "definition" in data:
                return data
            return None
        except Exception:
            return None
    return None

def save_ai_explanation(sentence: str, explanation_dict: dict):
    if not sentence:
        return False
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
