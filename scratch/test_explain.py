import os
import sys
import json
from dotenv import load_dotenv

# load env
load_dotenv(dotenv_path="/home/ngoctin/hoc_tieng_anh_qua_friends/.env")

from google import genai

sentence = "There's nothing to tell. It's just some guy I work with."
vietnamese = "Không có gì đáng nói cả. Chỉ là một anh chàng làm chung thôi."
word = ""

focus_part = f'\nTừ/cụm từ đang chú ý: "{word}"' if word else ""
viet_part = f'\nBản dịch tiếng Việt: "{vietnamese}"' if vietnamese else ""

prompt = f"""Bạn là từ điển giải thích ngữ cảnh của Google. Hãy phân tích câu thoại sau theo phong cách Google Dictionary (cực kỳ khoa học, rõ ràng, ngắn gọn):

Câu thoại: "{sentence}"{viet_part}{focus_part}

Hãy trả về JSON thuần túy (không markdown codeblock) có cấu trúc sau:
{{
  "translation": "Bản dịch tiếng Việt tự nhiên nhất của câu thoại trong văn cảnh phim này.",
  "definition": "Nghĩa cốt lõi của câu thoại trong văn cảnh (ngắn gọn 1 câu).",
  "tone": "Sắc thái giao tiếp (ví dụ: Thân mật, Mỉa mai, Lịch sự, Suồng sã). Tối đa 3 từ.",
  "example": "Một câu ví dụ thực tế tương tự trong đời sống (bằng tiếng Anh).",
  "example_translation": "Bản dịch tiếng Việt của câu ví dụ trên.",
  "key_vocabulary": {{
    "cụm từ/từ vựng/cấu trúc 1": "nghĩa tiếng Việt ngắn gọn của từ/cấu trúc 1",
    "cụm từ/từ vựng/cấu trúc 2": "nghĩa tiếng Việt ngắn gọn của từ/cấu trúc 2"
  }} // Nếu câu thoại không có cấu trúc, cụm từ, slang hay idiom nào cần chú ý, hãy đặt giá trị này là null.
}}"""

print("GEMINI_API_KEY =", os.getenv("GEMINI_API_KEY"))
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
response = client.models.generate_content(
    model="gemini-3.1-flash-lite", contents=prompt
)
print("Response text:")
print(response.text)
try:
    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    data = json.loads(text.strip())
    print("Parsed data OK:", data)
except Exception as e:
    print("Failed to parse:", e)
