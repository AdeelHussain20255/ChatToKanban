import os

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from starlette.requests import Request

from chat_parser import ChatParser
from extractor import ChatExtractor

load_dotenv()

app = FastAPI(title="ChatToKanban")
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

DATE_MAP = {
    "Last 3 Days": 3,
    "Last 7 Days": 7,
    "Last 14 Days": 14,
    "Last 30 Days": 30,
    "All Time": None,
}


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse(request=request, name="index.html")


@app.post("/api/analyze")
async def analyze(
    file: UploadFile = File(...),
    date_range: str = Form("Last 7 Days"),
):
    if not GEMINI_API_KEY:
        return {"error": "Missing GEMINI_API_KEY in .env file."}

    raw_bytes = await file.read()
    raw_text = raw_bytes.decode("utf-8", errors="replace")

    if not raw_text.strip():
        return {"error": "Uploaded file is empty."}

    parser = ChatParser(raw_text)
    df = parser.parse()

    if df.empty:
        return {"error": "Unable to match WhatsApp timestamp patterns in this file."}

    days = DATE_MAP.get(date_range)
    filtered_df = parser.filter_by_days(df, days)

    if filtered_df.empty:
        total = len(df)
        return {
            "error": f"Found {total} message(s) but none in the selected Date Range. Try 'All Time'."
        }

    stats = parser.get_chat_stats(filtered_df)

    os.environ["GEMINI_API_KEY"] = GEMINI_API_KEY
    extractor = ChatExtractor()
    result = extractor.extract(filtered_df)

    return {
        "tasks": [t.model_dump() for t in result.tasks],
        "announcements": [a.model_dump() for a in result.announcements],
        "fluff_count": result.fluff_count,
        "summary": result.summary,
        "stats": stats,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
