from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone

from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image-preview"

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ----------------------------- Models -----------------------------
class GenerateRequest(BaseModel):
    prompt: str
    style: Optional[str] = "dreamy"


class EditRequest(BaseModel):
    image_base64: str
    prompt: str


class ImageResponse(BaseModel):
    image_base64: str


class CreationCreate(BaseModel):
    type: str  # "edited" | "ai"
    image_base64: str
    prompt: Optional[str] = None


class Creation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str
    image_base64: str
    prompt: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class Template(BaseModel):
    id: str
    url: str
    title: str


# ----------------------------- Prompt helpers -----------------------------
STYLE_DESCRIPTORS = {
    "dreamy": "dreamy soft focus, pastel pink and peach flowers, gentle bokeh, ethereal",
    "watercolor": "delicate watercolor painting style, soft pastel blooms, artistic brush texture",
    "minimal": "minimal clean aesthetic, a single elegant flower, lots of soft negative space",
    "vintage": "vintage retro film aesthetic, muted warm tones, dried pressed flowers",
    "bold": "bold vibrant saturated colorful flowers, striking modern composition",
}


def build_generate_prompt(prompt: str, style: str) -> str:
    desc = STYLE_DESCRIPTORS.get(style, STYLE_DESCRIPTORS["dreamy"])
    return (
        f"Create a beautiful floral image for an Instagram post: {prompt}. "
        f"Style: {desc}. Square 1:1 composition, high quality, aesthetic, "
        f"suitable for social media, no text or watermarks."
    )


# ----------------------------- Routes -----------------------------
@api_router.get("/")
async def root():
    return {"message": "InstaBloom API running"}


TEMPLATES = [
    Template(id="t1", title="Bloom Paper", url="https://images.unsplash.com/photo-1686177991278-b7a3c37739d4?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHwzfHxiZWF1dGlmdWwlMjBmbG9yYWwlMjBJbnN0YWdyYW0lMjBwb3N0JTIwdGVtcGxhdGVzfGVufDB8fHx8MTc4NjM5NTMxOXww&ixlib=rb-4.1.0&q=85"),
    Template(id="t2", title="Painted Petals", url="https://images.unsplash.com/photo-1579591040245-1b25289ff4c5?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzh8MHwxfHNlYXJjaHwxfHxiZWF1dGlmdWwlMjBmbG9yYWwlMjBJbnN0YWdyYW0lMjBwb3N0JTIwdGVtcGxhdGVzfGVufDB8fHx8MTc4NjM5NTMxOXww&ixlib=rb-4.1.0&q=85"),
    Template(id="t3", title="Minimal Bloom", url="https://images.unsplash.com/photo-1494058303350-0bd5a9ecc5d3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NjZ8MHwxfHNlYXJjaHwyfHxtaW5pbWFsaXN0JTIwZmxvd2VyJTIwcGhvdG9ncmFwaHl8ZW58MHx8fHwxNzg1MTg0MDcyfDA&ixlib=rb-4.1.0&q=85"),
    Template(id="t4", title="Pastel Spring", url="https://images.unsplash.com/photo-1616285720779-9e597265df0c?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDJ8MHwxfHNlYXJjaHwxfHxwYXN0ZWwlMjBwaW5rJTIwc3ByaW5nJTIwZmxvd2Vyc3xlbnwwfHx8fDE3ODYzOTUzMTh8MA&ixlib=rb-4.1.0&q=85"),
]


@api_router.get("/templates", response_model=List[Template])
async def get_templates():
    return TEMPLATES


@api_router.post("/ai/generate", response_model=ImageResponse)
async def ai_generate(req: GenerateRequest):
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"gen-{uuid.uuid4()}",
            system_message="You are a creative floral image generator.",
        )
        chat.with_model("gemini", GEMINI_IMAGE_MODEL).with_params(modalities=["image", "text"])
        msg = UserMessage(text=build_generate_prompt(req.prompt, req.style or "dreamy"))
        _, images = await chat.send_message_multimodal_response(msg)
        if not images:
            raise HTTPException(status_code=502, detail="No image was generated")
        return ImageResponse(image_base64=images[0]["data"])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ai_generate failed: {e}")
        raise HTTPException(status_code=500, detail="Image generation failed")


@api_router.post("/ai/edit", response_model=ImageResponse)
async def ai_edit(req: EditRequest):
    if not req.image_base64:
        raise HTTPException(status_code=400, detail="Image is required")
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"edit-{uuid.uuid4()}",
            system_message="You are a creative floral photo editor.",
        )
        chat.with_model("gemini", GEMINI_IMAGE_MODEL).with_params(modalities=["image", "text"])
        instruction = (
            f"Edit this photo. Keep the main subject clearly visible and looking natural. "
            f"{req.prompt}. Add a beautiful floral aesthetic suitable for an Instagram post. "
            f"High quality, no text or watermarks."
        )
        msg = UserMessage(text=instruction, file_contents=[ImageContent(req.image_base64)])
        _, images = await chat.send_message_multimodal_response(msg)
        if not images:
            raise HTTPException(status_code=502, detail="No image was generated")
        return ImageResponse(image_base64=images[0]["data"])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ai_edit failed: {e}")
        raise HTTPException(status_code=500, detail="Photo edit failed")


@api_router.post("/creations", response_model=Creation)
async def create_creation(req: CreationCreate):
    creation = Creation(type=req.type, image_base64=req.image_base64, prompt=req.prompt)
    await db.creations.insert_one(creation.dict())
    return creation


@api_router.get("/creations", response_model=List[Creation])
async def list_creations(type: Optional[str] = None):
    query = {}
    if type:
        query["type"] = type
    docs = await db.creations.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [Creation(**d) for d in docs]


@api_router.delete("/creations/{creation_id}")
async def delete_creation(creation_id: str):
    result = await db.creations.delete_one({"id": creation_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Creation not found")
    return {"success": True}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
