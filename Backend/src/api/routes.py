import json
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from ..services.wiro_client import (
    remove_background,
    generate_image_ad,   # Shopify Template (görsel) üreten fonksiyon
    generate_ad_copy
)

router = APIRouter(prefix="/campaign", tags=["campaign"])

@router.post("/generate-from-image")
async def generate_campaign_from_image(
    image: UploadFile = File(...),
    effect_type: str = Form("shopify-template-soft-studio-glow"),
    caption: str = Form("")  # Kullanıcıdan gelen özel caption (boş olabilir)
):
    # 1. Arkaplan sil
    decoupled_url = await remove_background(image)
    if not decoupled_url:
        raise HTTPException(status_code=500, detail="Arkaplan silme başarısız oldu.")

    # 2. Görseli oluştur (Shopify Template, caption ile)
    # Eğer kullanıcı bir caption göndermişse onu, yoksa boş string gider, fonksiyon içinde fallback var.
    result_url = await generate_image_ad(decoupled_url, caption if caption else None, effect_type)
    if not result_url:
        raise HTTPException(status_code=500, detail="Kampanya üretimi başarısız oldu.")

    # 3. Marketing toolkit için genel metinler üret (isteğe bağlı, daha yaratıcı prompt)
    toolkit_prompt = (
        f"Generate a marketing toolkit for a product advertisement using the theme '{effect_type}':\n"
        "1. A catchy slogan (max 6 words)\n"
        "2. An Instagram caption (max 150 characters, with emojis)\n"
        "3. 5 relevant hashtags\n"
        "Return the result as a JSON object with keys: slogan, caption, hashtags."
    )
    toolkit_raw = await generate_ad_copy(toolkit_prompt)
    toolkit = {}
    try:
        if toolkit_raw:
            json_start = toolkit_raw.find("{")
            json_end = toolkit_raw.rfind("}") + 1
            if json_start != -1 and json_end > json_start:
                toolkit = json.loads(toolkit_raw[json_start:json_end])
    except Exception:
        pass

    return {
        "image_url": result_url,   # Artık görsel dönüyoruz
        "copywriting": {
            "slogan": toolkit.get("slogan", "Şimdi Tam Zamanı!"),
            "caption": toolkit.get("caption", "Bu fırsat kaçmaz! Hemen tıkla. 🚀"),
            "hashtags": toolkit.get("hashtags", "#kampanya #fırsat #indirim")
        }
    }


@router.get("/suggest-caption")
async def suggest_caption(effect_type: str):
    prompt = f'Write a short catchy caption (max 4 words) for a product advertisement with effect type "{effect_type}". Return only the caption, nothing else.'
    caption = await generate_ad_copy(prompt)
    if not caption:
        caption = "SALE"
    return {"caption": caption.strip('"').strip("'")}