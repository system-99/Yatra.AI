import re

def clean_text(text):
    text = re.sub(r"\s+"," ",text)
    text = re.sub(r"https?://\S+","",text)
    return text.strip()

def remove_punctuation(text):
    text = clean_text(text)
    return re.sub(r"[^\w\s]","",text)