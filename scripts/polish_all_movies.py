import os
import json
import time
import sys

# Try to import google-generativeai. If not found, exit with instruction.
try:
    import google.generativeai as genai
except ImportError:
    print("Error: google-generativeai package not found.")
    print("Please install it using: pip install google-generativeai")
    sys.exit(1)

# Ensure API key is configured
API_KEY = os.environ.get("GEMINI_API_KEY")
if not API_KEY:
    print("Error: GEMINI_API_KEY environment variable is not set.")
    print("Please set it: export GEMINI_API_KEY='your-api-key'")
    sys.exit(1)

genai.configure(api_key=API_KEY)

db_dir = os.path.join(os.path.dirname(__file__), '..', 'db')
files = [f for f in os.listdir(db_dir) if f.endswith('.json') and f != 'index.json']

# Define the system prompt with the rules from docs/movie_description_polish_procedure.md
SYSTEM_INSTRUCTION = """
You are a professional editor and Khmer language audit assistant. Your task is to polish and expand movie descriptions according to these rules:

1. EN Description: Expand to 2-3 paragraphs (approx. 100-150 words). Make it narrative-rich, clear, and touching. Emphasize character motivations, conflict, and emotional stakes.
2. KM Description: Translate the expanded English description into formal, natural Khmer.
   - Use a formal register (e.g. ភរិយា, ស្វាមី, ទទួលមរណភាព, កុមារភាព).
   - Use standard Khmer spelling and grammar.
   - For proper names/locations, format as "Khmer (English)" on first mention.
   - Inject Zero-Width Space (\u200B) characters between ALL word boundaries in Khmer text to support browser responsive line-wrapping.
   - Use normal spaces only between sentences/clauses.
3. Khmer Unicode Sequence Order: Consonant -> Subscript -> Dependent Vowel -> Diacritic.
4. Output Format: Return a raw JSON object with keys "en" and "km". Do not return markdown, backticks, or other text.
"""

def polish_movie(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Check if already polished to avoid wasting tokens
    if data.get("polished") is True:
        print(f"Skipping {data['slug']} (already polished)")
        return
        
    title_en = data["title"]["en"]
    title_km = data["title"]["km"]
    desc_en = data.get("description", {}).get("en", "")
    desc_km = data.get("description", {}).get("km", "")
    
    print(f"Polishing: {title_en} / {title_km}...")
    
    prompt = f"""
    Movie Title: {title_en} ({title_km})
    Current EN Description: {desc_en}
    Current KM Description: {desc_km}
    """
    
    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash",
        generation_config={"response_mime_type": "application/json"},
        system_instruction=SYSTEM_INSTRUCTION
    )
    
    response = model.generate_content(prompt)
    try:
        result = json.loads(response.text)
        data["description"] = {
            "en": result["en"],
            "km": result["km"]
        }
        data["polished"] = True
        
        # Save back to file
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
        print(f"✓ Successfully polished {data['slug']}.")
    except Exception as e:
        print(f"✗ Error polishing {data['slug']}: {e}")
        print("Response received:", response.text)

def main():
    print(f"Found {len(files)} movie files.")
    for idx, file in enumerate(files):
        path = os.path.join(db_dir, file)
        try:
            polish_movie(path)
            # Add a small delay to avoid hitting rate limits
            time.sleep(1.5)
        except Exception as e:
            print(f"Unexpected error: {e}")

if __name__ == "__main__":
    main()
