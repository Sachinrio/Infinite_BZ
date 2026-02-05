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
        # 1. Initialize Google Gemini (For Text)
        self.google_api_key = os.getenv("GOOGLE_API_KEY")
        self.google_model_name = os.getenv("GOOGLE_MODEL_NAME", "gemini-2.5-flash")
        
        if not self.google_api_key:
            print("WARNING: GOOGLE_API_KEY missing.")
            
        print(f"Initializing Gemini (Text) with model: {self.google_model_name}")
        self.llm_text = ChatGoogleGenerativeAI(
            temperature=0.7,
            google_api_key=self.google_api_key,
            model=self.google_model_name
        )
        self.parser = JsonOutputParser(pydantic_object=EventContent)

    async def generate_event_content(self, title: str, category: str, start_time: str, end_time: str) -> dict:
        """
        Generates content using Google Gemini (Text) and Pollinations.ai (Image).
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
        Ensure the image_prompt is highly detailed, cinematic, and photorealistic.
        """

        try:
            print(f"Generating Text with Google Gemini...")
            
            # Call Gemini
            chain = self.llm_text | self.parser
            result = await chain.ainvoke(prompt)
            
            # Post-processing
            if "description" in result:
                result["description"] = self._clean_description(result["description"])

            # Generate Image (Pollinations.ai -> Local File)
            if "image_prompt" in result:
                import urllib.parse
                import random
                import requests
                import uuid
                
                seed = random.randint(1, 1000000)
                # Enhance prompt slightly for Pollinations
                base_prompt = result["image_prompt"][:200]
                enhanced_prompt = base_prompt + ", cinematic lighting"
                encoded_prompt = urllib.parse.quote(enhanced_prompt)
                
                pollinations_api_key = os.getenv("POLLINATIONS_API_KEY")
                api_key_param = f"&api_key={pollinations_api_key}" if pollinations_api_key else ""
                
                # Use the direct image endpoint to avoid redirects
                # Appending .png to the prompt (before query params) hints the format to Pollinations
                pollinations_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}.png?width=1280&height=720&model=flux&nologo=true&seed={seed}{api_key_param}"
                print(f"Fetching Image from: {pollinations_url}")
                
                try:
                    # Download image server-side with User-Agent to avoid blocking
                    headers = {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                    }

                    img_response = requests.get(pollinations_url, headers=headers, timeout=30)
                    
                    if img_response.status_code == 200 and "image" in img_response.headers.get("Content-Type", ""):
                        filename = f"ai_gen_{uuid.uuid4()}.png"
                        file_path = os.path.join(os.getcwd(), "uploads", filename)
                        
                        # Ensure directory exists
                        os.makedirs(os.path.dirname(file_path), exist_ok=True)
                        
                        with open(file_path, "wb") as f:
                            f.write(img_response.content)
                            
                        result["imageUrl"] = f"http://localhost:8000/uploads/{filename}"
                        print(f"Image saved locally: {result['imageUrl']}")
                    else:
                        print(f"Pollinations Download Failed or Invalid Content-Type: {img_response.status_code} {img_response.headers.get('Content-Type')}")
                        # Fallback: Try Turbo if Flux fails
                        if "model=flux" in pollinations_url:
                             print("Retrying with Turbo model...")
                             retry_url = pollinations_url.replace("model=flux", "model=turbo")
                             img_response = requests.get(retry_url, headers=headers, timeout=30)
                             if img_response.status_code == 200 and "image" in img_response.headers.get("Content-Type", ""):
                                filename = f"ai_gen_{uuid.uuid4()}.png"
                                file_path = os.path.join(os.getcwd(), "uploads", filename)
                                os.makedirs(os.path.dirname(file_path), exist_ok=True)
                                with open(file_path, "wb") as f:
                                    f.write(img_response.content)
                                result["imageUrl"] = f"http://localhost:8000/uploads/{filename}"
                                print(f"Image saved locally (Turbo): {result['imageUrl']}")
                             else:
                                result["imageUrl"] = ""
                        else:
                             result["imageUrl"] = ""
                except Exception as dl_err:
                    print(f"Image Download Verification Failed: {dl_err}")
                    result["imageUrl"] = ""
            else:
                result["imageUrl"] = ""

            return result

        except Exception as e:
            print(f"Error generating content: {e}")
            raise e

    def _clean_description(self, text: str) -> str:
        """Removes markdown headers."""
        import re
        text = re.sub(r'^#+\s.*$', '', text, flags=re.MULTILINE)
        return text.strip()

# Initialize the service singleton
ai_service = AIGeneratorService()
