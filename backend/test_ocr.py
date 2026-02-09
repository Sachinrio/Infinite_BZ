print("Importing EasyOCR...")
try:
    import easyocr
    reader = easyocr.Reader(['en'], gpu=False)
    print("EasyOCR initialized successfully!")
except Exception as e:
    print(f"Failed to initialize EasyOCR: {e}")
