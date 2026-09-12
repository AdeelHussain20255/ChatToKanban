import re
from datetime import datetime, timedelta

import pandas as pd
from dateutil import parser as dateutil_parser

UNICODE_CHARS = re.compile(r"[\u200e\u200f\ufeff]")

SYSTEM_NOISE_PATTERNS = [
    re.compile(r"messages? and calls? are end-to-end encrypted", re.IGNORECASE),
    re.compile(r"created group", re.IGNORECASE),
    re.compile(r"changed the group description", re.IGNORECASE),
    re.compile(r"changed the group icon", re.IGNORECASE),
    re.compile(r"added you", re.IGNORECASE),
    re.compile(r"left$", re.IGNORECASE),
    re.compile(r"removed$", re.IGNORECASE),
]

PATTERNS = [
    re.compile(
        r"^\[?(\d{1,4}[\/.-]\d{1,2}[\/.-]\d{1,4}[,\s]+\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AaPp][Mm])?)\]?\s*(?:-\s*)?([^:]+):\s*(.*)$"
    ),
    re.compile(
        r"^(\d{1,4}[\/.-]\d{1,2}[\/.-]\d{1,4}[,\s]+\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AaPp][Mm])?)\s*-\s*([^:]+):\s*(.*)$"
    ),
]


def _clean_line(line: str) -> str:
    return UNICODE_CHARS.sub("", line).strip()


def _parse_timestamp(raw: str) -> datetime | None:
    cleaned = raw.strip().rstrip("]").lstrip("[")
    try:
        return dateutil_parser.parse(cleaned, fuzzy=True)
    except (ValueError, TypeError):
        return None


class ChatParser:
    def __init__(self, raw_text: str):
        self.raw_text = raw_text
        self.records: list[dict] = []

    def _is_system_message(self, message: str) -> bool:
        return any(p.search(message) for p in SYSTEM_NOISE_PATTERNS)

    def parse(self) -> pd.DataFrame:
        for line in self.raw_text.splitlines():
            line = _clean_line(line)
            if not line:
                continue
            for pattern in PATTERNS:
                match = pattern.match(line)
                if match:
                    raw_ts = match.group(1).strip("[]")
                    sender = match.group(2).strip()
                    message = match.group(3).strip()
                    if self._is_system_message(message):
                        break
                    ts = _parse_timestamp(raw_ts)
                    if ts is not None:
                        self.records.append(
                            {"timestamp": ts, "sender": sender, "message": message}
                        )
                    break

        df = pd.DataFrame(self.records)
        if not df.empty:
            df.sort_values("timestamp", inplace=True)
            df.reset_index(drop=True, inplace=True)
        return df

    def filter_by_days(self, df: pd.DataFrame, days_back) -> pd.DataFrame:
        if df.empty or days_back is None or str(days_back).lower() == "all":
            return df
        max_date = df["timestamp"].max()
        cutoff = max_date - timedelta(days=int(days_back))
        return df[df["timestamp"] >= cutoff].copy()

    def get_chat_stats(self, df: pd.DataFrame) -> dict:
        if df.empty:
            return {
                "total_messages": 0,
                "start_date": "",
                "end_date": "",
                "unique_senders": [],
            }
        return {
            "total_messages": len(df),
            "start_date": df["timestamp"].min().strftime("%Y-%m-%d"),
            "end_date": df["timestamp"].max().strftime("%Y-%m-%d"),
            "unique_senders": sorted(df["sender"].unique().tolist()),
        }


if __name__ == "__main__":
    sample = """[11/09/26, 10:00:00] Alice: Hey everyone!
[11/09/26, 10:01:00] Bob: Don't forget the meeting at 3pm
11/09/26, 10:02 AM - Charlie: Thanks for the reminder
09/11/2026, 10:03:00 pm - Alice: See you all there!
[11/09/26, 10:05:00] System: Messages and calls are end-to-end encrypted.
[11/09/26, 10:06:00] Dave: Great, I'll prepare the slides
04/09/26, 09:00:00 - Alice: Old message from weeks ago
\u200e12/25/2026, 08:30 AM - Bob: Merry Christmas everyone!
12.31.2026, 11:59 PM - Charlie: Happy New Year!
[01-15-2027, 14:30] Dave: iOS bracketed format with dashes
06/20/2027, 9:15 AM - Eve: Standard Android format"""

    parser = ChatParser(sample)
    df = parser.parse()
    print("=== All messages ===")
    print(df.to_string(index=False))

    filtered = parser.filter_by_days(df, 30)
    print("\n=== Last 30 days ===")
    print(filtered.to_string(index=False))

    stats = parser.get_chat_stats(df)
    print("\nStats:", stats)
