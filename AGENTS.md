## Project: ChatToKanban (WhatsApp Group Chat Task & Announcement Extractor)

### Stack
- Streamlit + LangChain + Gemini 2.5 Flash + Pydantic

### Design Principle
Parse and filter chat exports locally by date in Pandas BEFORE sending payloads to Gemini to minimize latency and token count.
