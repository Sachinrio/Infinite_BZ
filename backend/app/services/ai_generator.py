import os
import json
import asyncio
from datetime import datetime
from openai import AsyncOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field
from typing import List, Optional

# Define Pydantic models for Langchain parsing
class AgendaItem(BaseModel):
    time: str = Field(description="Time of the session (e.g., 10:00 AM)")
    title: str = Field(description="Title of the session")
    speaker: str = Field(description="Speaker name")

class EventContent(BaseModel):
    description: str = Field(description="Engaging event description")
    agenda: List[AgendaItem] = Field(description="List of agenda items")
    tags: List[str] = Field(description="List of relevant tags")
    image_prompt: str = Field(description="Detailed prompt for image generation")

class AIGeneratorService:
    def __init__(self):
        # 1. Initialize LLMs
        self.google_api_key = os.getenv("GOOGLE_API_KEY")
        self.google_model_name = os.getenv("GOOGLE_MODEL_NAME", "gemini-2.5-flash")
        
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.groq_model_name = "llama-3.3-70b-versatile"

        self.llm_google = None
        self.llm_groq = None

        if self.google_api_key:
            print(f"Initializing Gemini (Text) with model: {self.google_model_name}")
            try:
                self.llm_google = ChatGoogleGenerativeAI(
                    temperature=0.7,
                    google_api_key=self.google_api_key,
                    model=self.google_model_name
                )
            except Exception as e:
                print(f"Failed to initialize Gemini: {e}")

        if self.groq_api_key:
            print(f"Initializing Groq (Text) with model: {self.groq_model_name}")
            try:
                from langchain_groq import ChatGroq
                self.llm_groq = ChatGroq(
                    temperature=0.7,
                    groq_api_key=self.groq_api_key,
                    model_name=self.groq_model_name
                )
            except Exception as e:
                 print(f"Failed to initialize Groq: {e}")

        if not self.llm_google and not self.llm_groq:
            print("WARNING: Neither GOOGLE_API_KEY nor GROQ_API_KEY working. AI features will be disabled.")
            
        # 2. Initialize EasyOCR for text detection (CNN)
        print("Initializing EasyOCR (this may take a moment)...")
        try:
            import easyocr
            # 'en' for English. gpu=False to be safe on standard servers, true if CUDA avail.
            # Using CPU to avoid CUDA dependency hell for now unless user asked for GPU.
            self.reader = easyocr.Reader(['en'], gpu=False) 
            self.ocr_enabled = True
        except ImportError:
            print("EasyOCR not installed. Text filtering disabled.")
            self.ocr_enabled = False
        except Exception as e:
            print(f"EasyOCR Init Failed: {e}")
            self.ocr_enabled = False

        self.parser = JsonOutputParser(pydantic_object=EventContent)

    async def generate_event_content(self, title: str, category: str, start_time: str, end_time: str) -> dict:
        """
        Generates content using Google Gemini (Text) and Pollinations.ai (Image).
        Falls back to Groq or Manual defaults if Quota is exceeded.
        """
        # Prompt Construction
        prompt = f"""
        You are an expert event planner. Create detailed content for an event.
        
        Event Details:
        Title: {title}
        Category: {category}
        Time: {start_time} to {end_time}
        
        {self.parser.get_format_instructions()}
        
        Ensure description is 200-300 words, engaging, and uses plain text (no markdown headers).
        Ensure the image_prompt is highly detailed, cinematic, and photorealistic. It MUST explicitly visualize the core subject of the event title: "{title}".
        Example: If title is "AI Summit", prompt should include "futuristic robot, glowing neural networks". If "Yoga Class", then "peaceful park, people doing yoga".
        """

        result = {}
        success = False

        # 1. Try Google Gemini
        if self.llm_google:
            try:
                print(f"Generating Text with Gemini...")
                chain = self.llm_google | self.parser
                result = await chain.ainvoke(prompt)
                success = True
            except Exception as e:
                error_msg = str(e)
                print(f"Gemini Generation Failed: {error_msg}")
                if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
                    print("Gemini Quota Exceeded. Attempting fallback...")
                else:
                    print("Gemini error (non-quota). Attempting fallback...")

        # 2. Try Groq (Fallback)
        if not success and self.llm_groq:
            try:
                print(f"Generating Text with Groq (Fallback)...")
                chain = self.llm_groq | self.parser
                result = await chain.ainvoke(prompt)
                success = True
            except Exception as e:
                 print(f"Groq Generation Failed: {e}")

        # 3. Last Resort: Default Content
        if not success:
            print("All AI Generation failed or disabled. returning default content.")
            result = {
                "description": f"Join us for {title}! This event falls under the {category} category. (AI content generation unavailable, please edit description).",
                "agenda": [
                    {"time": start_time, "title": "Opening", "speaker": "Organizer"}
                ],
                "tags": ["Event", category],
                "image_prompt": title # Keep title as prompt for search
            }

        # Post-processing (Common)
        try:
            if "description" in result:
                result["description"] = self._clean_description(result["description"])

            # Generate Image (DuckDuckGo Search)
            search_term = result.get("image_prompt", title)
            
            if search_term:
                print(f"Searching for image using: {search_term}")
                image_url = self._search_image(search_term)
                if image_url:
                    result["imageUrl"] = image_url
                    print(f"Image found: {result['imageUrl']}")
                else:
                    # Fallback to title if detailed prompt finds nothing
                    if search_term != title:
                        print(f"No image found for prompt, retrying with title: {title}")
                        image_url = self._search_image(title)
                        if image_url:
                            result["imageUrl"] = image_url
                        else:
                             result["imageUrl"] = ""
                    else:
                        result["imageUrl"] = ""
            else:
                result["imageUrl"] = ""

            return result

        except Exception as e:
            print(f"Error in post-processing/image search: {e}")
            # Even if image fails, return the text content we hopefully have
            return result

    def _search_image(self, query: str) -> Optional[str]:
        """
        Searches DuckDuckGo for images.
        Filters results using EasyOCR to prefer images WITHOUT text.
        """
        try:
            from duckduckgo_search import DDGS
            import requests

            search_query = f"{query} stock photo photography wallpaper"
            
            with DDGS() as ddgs:
                # Fetch more results to allow for filtering
                results = list(ddgs.images(
                    keywords=search_query,
                    region="wt-wt",
                    safesearch="on",
                    max_results=8 
                ))
                
                if not results:
                    return None

                print(f"Found {len(results)} candidate images. Filtering for text...")

                # If OCR is disabled, just return the first one
                if not self.ocr_enabled:
                    return results[0]['image']

                cleanest_image = None
                
                for res in results:
                    img_url = res['image']
                    if self._has_text(img_url):
                        print(f"Skipping image (Text Detected): {img_url}")
                    else:
                        print(f"Clean image found: {img_url}")
                        return img_url # Return first clean image
                
                # Fallback: If all have text, return the first one anyway
                print("All images had text. Returning first result as fallback.")
                return results[0]['image']

        except ImportError:
            print("duckduckgo_search not installed.")
        except Exception as e:
            print(f"Image Search Failed: {e}")
            
        return None

    def _has_text(self, image_url: str) -> bool:
        """
        Downloads image and checks for text using EasyOCR.
        Returns True if text is detected.
        """
        try:
            import requests
            
            # Download image with timeout
            response = requests.get(image_url, timeout=5)
            if response.status_code != 200:
                print(f"Failed to download image for OCR: {response.status_code}")
                return True # Treat as "bad" to skip it
            
            image_bytes = response.content
            
            # Run OCR
            # detail=0 returns just the text strings found
            result = self.reader.readtext(image_bytes, detail=0)
            
            # If result list is not empty, text was found
            if len(result) > 0:
                print(f"Text detected: {result}")
                return True
            
            return False

        except Exception as e:
            print(f"OCR check failed: {e}")
            return True # conservative: if lookup fails, assume bad to skip



    def _clean_description(self, text: str) -> str:
        """Removes markdown headers."""
        import re
        text = re.sub(r'^#+\s.*$', '', text, flags=re.MULTILINE)
        return text.strip()

# Initialize the service singleton
ai_service = AIGeneratorService()
