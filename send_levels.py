from supabase import create_client
from datetime import datetime, timezone
import senzor_plast as plast
import senzor_papier as papier
import senzor_kov as kov
import senzor_komunal as komunal
import os

SUPABASE_URL = "https://heahkxgngnnhugdsurfl.supabase.co"
SUPABASE_KEY = "sb_secret_t6OWA0UYYmeBuvhshK7xiw_Es3eMvTf"

def get_pi_serial():
    """Získa seriové číslo Raspberry Pi"""
    try:
        with open("/proc/cpuinfo", "r") as f:
            for line in f:
                if line.startswith("Serial"):
                    return line.strip().split(":")[1].strip()
    except Exception:
        return "UNKNOWN"

DEVICE_SERIAL = get_pi_serial()

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# 1️⃣ zisti device_id podľa serial_number
device = (
    supabase
    .table("devices")
    .select("id")
    .eq("name", DEVICE_SERIAL)
    .single()
    .execute()
)

device_id = device.data["id"]
now = datetime.now(timezone.utc).isoformat()

# 2️⃣ dáta pre 4 nádoby
tanks = [
    {"tank_id": 1, "level": plast.perc},
    {"tank_id": 2, "level": papier.perc},
    {"tank_id": 3, "level": kov.perc},
    {"tank_id": 4, "level": komunal.perc},
]

# 3️⃣ UPSERT do tank_status
status_payload = [
    {
        "device_id": device_id,
        "tank_id": t["tank_id"],
        "level": t["level"],
        "updated_at": now
    }
    for t in tanks
]

supabase.table("tank_status").upsert(
    status_payload,
    on_conflict="device_id,tank_id"
).execute()

# 4️⃣ INSERT do histórie
history_payload = [
    {
        "device_id": device_id,
        "tank_id": t["tank_id"],
        "level": t["level"],
        "created_at": now
    }
    for t in tanks
]

supabase.table("tank_history").insert(history_payload).execute()
