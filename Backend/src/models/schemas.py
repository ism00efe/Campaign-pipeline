from pydantic import BaseModel
from typing import List

class ResponseModel(BaseModel):
    items: List[str]
    metadata: str
