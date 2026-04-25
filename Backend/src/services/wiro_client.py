import httpx
import asyncio
import json
from fastapi import UploadFile
from src.core.config import settings

# ---------- ARKAPLAN SİLME MODELİ ----------
BG_REMOVER_OWNER = "wiro"
BG_REMOVER_MODEL = "remove-background"

# ---------- ANA KAMPANYA MODELİ ----------
TARGET_MODEL = "product-ads-with-caption"
OWNER = "wiro"

# ---------- LLM MODELİ ----------
LLM_OWNER = "deepseek-ai"
LLM_MODEL = "deepseek-r1-distill-qwen-14b"

CONCEPTS = [
    {
        "name": "beach-campaign",
        "params": {
            "effectType": "product-with-text-product-beach-banner",
            "caption": "SUMMER SALE",  # placeholder, LLM ile güncellenecek
            "videoMode": "Standard",
            "ratio": "9:16"
        }
    },
    {
        "name": "storefront-campaign",
        "params": {
            "effectType": "scene-morphs-storefront-to-display",
            "caption": "NEW ARRIVAL",
            "videoMode": "Standard",
            "ratio": "9:16"
        }
    },
    {
        "name": "studio-campaign",
        "params": {
            "effectType": "animate-products-soft-studio-balance",
            "caption": "PREMIUM",
            "videoMode": "Standard",
            "ratio": "9:16"
        }
    }
]

# ---------- ORTAK İŞLEM FONKSİYONU ----------
async def _run_and_poll(owner: str, model: str, files: dict, data: dict) -> str | None:
    headers = {"x-api-key": settings.WIRO_API_KEY}
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            run_url = f"{settings.WIRO_BASE_URL}/Run/{owner}/{model}"
            resp = await client.post(run_url, headers=headers, files=files, data=data)
            resp.raise_for_status()
        except Exception:
            return None

        run_data = resp.json()
        task_id = run_data.get("taskid") or run_data.get("data", {}).get("taskid")
        if not task_id:
            return None

        while True:
            await asyncio.sleep(5)
            try:
                det_resp = await client.post(
                    f"{settings.WIRO_BASE_URL}/Task/Detail",
                    headers=headers,
                    json={"taskid": task_id}
                )
                det_resp.raise_for_status()
                det_json = det_resp.json()
                if "tasklist" in det_json and len(det_json["tasklist"]) > 0:
                    task = det_json["tasklist"][0]
                    status = task.get("status")
                    if status == "task_postprocess_end":
                        if task.get("pexit") == "0":
                            outputs = task.get("outputs", [])
                            # Görsel/Video için URL, LLM için text alanı
                            if outputs and "url" in outputs[0]:
                                return outputs[0]["url"]
                            elif outputs and "text" in outputs[0]:
                                return outputs[0]["text"]
                        return None
            except Exception:
                continue


# ---------- 1. ADIM: ARKAPLAN SİLME ----------
async def remove_background(image: UploadFile) -> str | None:
    print("[DEBUG] remove_background başladı")
    image_bytes = await image.read()
    files = {
        "inputImage": (image.filename or "input.jpg", image_bytes, image.content_type or "image/jpeg")
    }
    data = {"inputImageUrl": ""}
    result = await _run_and_poll(BG_REMOVER_OWNER, BG_REMOVER_MODEL, files, data)
    print(f"[DEBUG] remove_background bitti, sonuç: {result}")
    return result


# ---------- LLM İLE METİN ÜRETİMİ ----------
async def generate_ad_copy(prompt: str) -> str | None:
    """
    DeepSeek modeline prompt gönderir ve üretilen metni döndürür.
    """
    headers = {"x-api-key": settings.WIRO_API_KEY}
    data = {"prompt": prompt}
    # LLM modeline inputImage gerekmez, sadece prompt
    return await _run_and_poll(LLM_OWNER, LLM_MODEL, files={}, data=data)


async def generate_captions_for_concepts() -> dict:
    """
    Her konsept için kısa bir caption ve genel reklam metinleri üretir.
    Dönen: {"captions": {"beach-campaign": "yazı", ...}, "slogan": "...", "hashtags": "..."}
    """
    # 1. Her konsept için ayrı caption üret
    caption_tasks = []
    for concept in CONCEPTS:
        prompt = f'Write a short, catchy caption (max 4 words) for a product advertisement in "{concept["name"]}" style. Return only the caption text, nothing else.'
        caption_tasks.append(generate_ad_copy(prompt))

    captions_raw = await asyncio.gather(*caption_tasks, return_exceptions=True)
    captions = {}
    for i, concept in enumerate(CONCEPTS):
        caption_text = captions_raw[i]
        if isinstance(caption_text, Exception) or not caption_text:
            caption_text = concept["params"]["caption"]  # fallback
        else:
            caption_text = caption_text.strip().strip('"').strip("'")
        captions[concept["name"]] = caption_text

    # 2. Genel slogan, caption ve hashtag üret
    toolkit_prompt = (
        "Generate a marketing toolkit for a product advertisement consisting of:\n"
        "1. A catchy slogan (max 6 words)\n"
        "2. An Instagram caption (max 150 characters, with emojis)\n"
        "3. 5 relevant hashtags\n"
        "Return the result as a JSON object with keys: slogan, caption, hashtags."
    )
    toolkit_raw = await generate_ad_copy(toolkit_prompt)
    toolkit = {}
    try:
        # LLM çıktısından JSON parçala
        if toolkit_raw:
            # Bazen ```json ... ``` arasına sarıyor
            json_start = toolkit_raw.find("{")
            json_end = toolkit_raw.rfind("}") + 1
            if json_start != -1 and json_end > json_start:
                toolkit = json.loads(toolkit_raw[json_start:json_end])
    except Exception:
        pass

    return {
        "captions": captions,
        "slogan": toolkit.get("slogan", "Summer vibes!"),
        "caption": toolkit.get("caption", "Discover the new collection. #summer #style"),
        "hashtags": toolkit.get("hashtags", "#summer #newarrival #style")
    }


# ---------- 2. ADIM: KAMPANYA PAKETİ ÜRETİMİ (3 KONSEPT) ----------
async def create_campaign_package(decoupled_image_url: str, concept_captions: dict = None):
    headers = {"x-api-key": settings.WIRO_API_KEY}

    if concept_captions is None:
        concept_captions = {}

    async def process_one(concept):
        async with httpx.AsyncClient() as client:
            img_resp = await client.get(decoupled_image_url)
            img_bytes = img_resp.content

            # LLM'den gelen caption'ı parametreye yerleştir
            params = concept["params"].copy()
            concept_name = concept["name"]
            if concept_name in concept_captions:
                params["caption"] = concept_captions[concept_name]

            form_data = {
                "inputImageUrl": "",
                **params
            }
            files = {"inputImage": ("product.png", img_bytes, "image/png")}

            run_url = f"{settings.WIRO_BASE_URL}/Run/{OWNER}/{TARGET_MODEL}"
            resp = await client.post(run_url, headers=headers, files=files, data=form_data, timeout=60.0)

            run_data = resp.json()
            task_id = run_data.get("taskid") or run_data.get("data", {}).get("taskid")
            if not task_id:
                return {"concept": concept["name"], "status": "failed", "error": run_data}

            while True:
                await asyncio.sleep(5)
                det_resp = await client.post(
                    f"{settings.WIRO_BASE_URL}/Task/Detail",
                    headers=headers,
                    json={"taskid": task_id}
                )
                det_json = det_resp.json()
                if "tasklist" in det_json and len(det_json["tasklist"]) > 0:
                    task = det_json["tasklist"][0]
                    status = task.get("status")
                    if status == "task_postprocess_end":
                        if task.get("pexit") == "0":
                            return {
                                "concept": concept["name"],
                                "status": "success",
                                "url": task["outputs"][0]["url"]
                            }
                        else:
                            return {
                                "concept": concept["name"],
                                "status": "failed",
                                "error": f"Pexit: {task.get('pexit')}"
                            }

    tasks = [process_one(c) for c in CONCEPTS]
    return await asyncio.gather(*tasks)

async def generate_single_ad(decoupled_image_url: str, effect_type: str, caption: str = None) -> str | None:
    print(f"[ADIM 1] generate_single_ad çağrıldı. Efekt: {effect_type}")
    
    # Caption belirtilmemişse LLM'den al
    if not caption:
        print("[ADIM 2] Caption yok, LLM'den alınacak...")
        llm_prompt = f'Write a short catchy caption (max 4 words) for a product advertisement with effect type "{effect_type}". Return only the caption, nothing else.'
        caption = await generate_ad_copy(llm_prompt)
        print(f"[ADIM 2] LLM'den dönen caption: {caption}")
        if not caption or len(caption.strip()) == 0:
            caption = "SALE"
            print("[ADIM 2] LLM boş döndü, fallback: SALE")

    headers = {"x-api-key": settings.WIRO_API_KEY}
    async with httpx.AsyncClient() as client:
        # Arkaplanı silinmiş görseli indir
        print("[ADIM 3] Arkaplanı silinmiş görsel indiriliyor...")
        img_resp = await client.get(decoupled_image_url)
        img_bytes = img_resp.content
        print(f"[ADIM 3] Görsel indirildi, boyut: {len(img_bytes)} bytes")

        # Wiro'ya gönderilecek form verisi
        form_data = {
            "inputImageUrl": "",
            "effectType": effect_type,
            "caption": caption.strip('"').strip("'"),
            "videoMode": "Standard",
            "ratio": "9:16"
        }
        files = {"inputImage": ("product.png", img_bytes, "image/png")}

        run_url = f"{settings.WIRO_BASE_URL}/Run/{OWNER}/{TARGET_MODEL}"
        print(f"[ADIM 4] Wiro'ya POST isteği: {run_url}")
        try:
            resp = await client.post(run_url, headers=headers, files=files, data=form_data, timeout=60.0)
            resp.raise_for_status()
        except Exception as e:
            print(f"[HATA] Wiro isteği başarısız: {e}")
            return None

        run_data = resp.json()
        print(f"[ADIM 5] Wiro cevabı: {run_data}")
        task_id = run_data.get("taskid") or run_data.get("data", {}).get("taskid")
        if not task_id:
            print("[HATA] task_id alınamadı!")
            return None
        print(f"[ADIM 6] task_id alındı: {task_id}")

        # Polling - 40 deneme, her biri 5 saniye = 200 saniye
        for attempt in range(1, 41):
            print(f"[ADIM 7.{attempt}] Polling deneniyor ({attempt}/40)...")
            await asyncio.sleep(5)
            try:
                det_resp = await client.post(
                    f"{settings.WIRO_BASE_URL}/Task/Detail",
                    headers=headers,
                    json={"taskid": task_id}
                )
                det_resp.raise_for_status()
                det_json = det_resp.json()

                if "tasklist" in det_json and len(det_json["tasklist"]) > 0:
                    task = det_json["tasklist"][0]
                    status = task.get("status", "bilinmiyor")
                    pexit = task.get("pexit", "?")
                    outputs = task.get("outputs", [])

                    print(f"[ADIM 7.{attempt}] Durum: {status}, Pexit: {pexit}, Çıktı sayısı: {len(outputs)}")

                    # SADECE BİTİŞ DURUMLARINI DİNLE, task_output'u ATLA
                    if status == "task_postprocess_end":
                        if str(pexit) == "0":
                            if outputs and "url" in outputs[0]:
                                print(f"[BAŞARILI] Video URL: {outputs[0]['url']}")
                                return outputs[0]["url"]
                            else:
                                print("[HATA] task başarılı görünüyor ama çıktı URL'si boş!")
                                return None
                        else:
                            print(f"[HATA] İşlem başarısız. Pexit: {pexit}")
                            return None

                    if status == "task_failed":
                        print(f"[HATA] İşlem başarısız (task_failed).")
                        return None

                    # task_output veya diğer ara durumlar: döngüye devam et

            except Exception as e:
                print(f"[UYARI] Polling isteği hata verdi (devam ediliyor): {e}")
                continue

        print("[HATA] Zaman aşımı! 200 saniye içinde sonuç alınamadı.")
        return None
# ---------- GÖRSEL (AFİŞ) ÜRETİMİ ----------
SHOPIFY_MODEL = "shopify-template"
SHOPIFY_OWNER = "wiro"

async def generate_image_ad(decoupled_image_url: str, caption: str = None, effect_type: str = "standard") -> str | None:
    """Shopify Template ile ürün görseli üretir."""
    if not caption:
        caption = "SHOP NOW"
    headers = {"x-api-key": settings.WIRO_API_KEY}
    async with httpx.AsyncClient() as client:
        img_resp = await client.get(decoupled_image_url)
        img_bytes = img_resp.content
        form_data = {
            "inputImageUrl": "",
            "effectType": effect_type,          # eksik parametre eklendi
            "caption": caption.strip('"').strip("'"),
            "ratio": "1:1"
        }
        files = {"inputImage": ("product.png", img_bytes, "image/png")}
        run_url = f"{settings.WIRO_BASE_URL}/Run/{SHOPIFY_OWNER}/{SHOPIFY_MODEL}"

        try:
            resp = await client.post(run_url, headers=headers, files=files, data=form_data, timeout=60.0)
            resp.raise_for_status()
        except Exception as e:
            print(f"[HATA] Shopify isteği başarısız: {e}")
            return None

        run_data = resp.json()
        task_id = run_data.get("taskid") or run_data.get("data", {}).get("taskid")
        if not task_id:
            return None

        # Polling (max 20 deneme, görseller daha hızlı oluşur)
        for _ in range(20):
            await asyncio.sleep(3)
            try:
                det_resp = await client.post(
                    f"{settings.WIRO_BASE_URL}/Task/Detail",
                    headers=headers,
                    json={"taskid": task_id}
                )
                det_resp.raise_for_status()
                det_json = det_resp.json()
                if "tasklist" in det_json and len(det_json["tasklist"]) > 0:
                    task = det_json["tasklist"][0]
                    if task.get("status") == "task_postprocess_end" and task.get("pexit") == "0":
                        outputs = task.get("outputs", [])
                        if outputs and "url" in outputs[0]:
                            return outputs[0]["url"]
                        return None
            except Exception:
                continue
        return None