from pydantic import BaseModel, Field
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage

from config import LLM_MODEL
from chat_parser import ChatParser


class Task(BaseModel):
    title: str = Field(description="Clear, actionable summary of the task.")
    assignee: str = Field(description="Person assigned to the task, or 'Unassigned'.")
    deadline: str = Field(description="Mentioned due date/time, or 'Not specified'.")
    priority: str = Field(description="High, Medium, or Low based on urgency.")
    status: str = Field(default="To Do", description="Task status, defaults to 'To Do'.")


class Announcement(BaseModel):
    title: str = Field(description="Short headline of the announcement or update.")
    details: str = Field(description="Concise summary of key info, links, or decisions.")
    posted_by: str = Field(description="Sender name.")
    timestamp: str = Field(description="Date/time posted.")


class ExtractionResult(BaseModel):
    announcements: list[Announcement] = Field(description="Formal announcements or updates.")
    tasks: list[Task] = Field(description="Actionable tasks, deliverables, or promises.")
    fluff_count: int = Field(description="Total count of non-actionable messages.")
    summary: str = Field(description="Two-sentence high-level summary of group activity.")


SYSTEM_INSTRUCTION = (
    "You are an executive project assistant analyzing a student group chat. "
    "Filter out chatter/fluff. Separate formal announcements/links from specific "
    "tasks, deliverables, and assigned promises."
)


class ChatExtractor:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(model=LLM_MODEL, temperature=0.1)

    def extract(self, chat_df) -> ExtractionResult:
        transcript_lines = []
        for _, row in chat_df.iterrows():
            ts = row["timestamp"].strftime("%Y-%m-%d %H:%M")
            transcript_lines.append(f"[{ts}] {row['sender']}: {row['message']}")
        transcript = "\n".join(transcript_lines)

        structured_llm = self.llm.with_structured_output(ExtractionResult)
        messages = [
            SystemMessage(content=SYSTEM_INSTRUCTION),
            HumanMessage(content=f"Analyze this chat transcript and extract structured data:\n\n{transcript}"),
        ]
        return structured_llm.invoke(messages)


if __name__ == "__main__":
    sample = """[11/09/26, 10:00:00] Alice: Hey everyone!
[11/09/26, 10:01:00] Bob: Don't forget the meeting at 3pm
11/09/26, 10:02 AM - Charlie: Thanks for the reminder
09/11/2026, 10:03:00 pm - Alice: See you all there!
[11/09/26, 10:05:00] System: Messages and calls are end-to-end encrypted.
[11/09/26, 10:06:00] Dave: Great, I'll prepare the slides
[04/09/26, 09:00:00] Alice: Old message from weeks ago
[11/09/26, 11:00:00] Bob: Project report is due Friday, assigning Charlie to compile it
[11/09/26, 11:05:00] Alice: Updated the shared drive with new resources
[11/09/26, 11:10:00] Charlie: ok
[11/09/26, 11:15:00] Dave: cool"""

    parser = ChatParser(sample)
    df = parser.parse()

    extractor = ChatExtractor()
    result = extractor.extract(df)

    print("=== Summary ===")
    print(result.summary)

    print("\n=== Tasks ===")
    for t in result.tasks:
        print(f"  [{t.priority}] {t.title} -> {t.assignee} | Deadline: {t.deadline} | Status: {t.status}")

    print("\n=== Announcements ===")
    for a in result.announcements:
        print(f"  {a.title} (by {a.posted_by} at {a.timestamp})")
        print(f"    {a.details}")

    print(f"\n=== Fluff Count: {result.fluff_count} ===")
