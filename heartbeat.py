import requests

def get_pi_serial():
    """Získa seriové číslo Raspberry Pi"""
    try:
        with open("/proc/cpuinfo", "r") as f:
            for line in f:
                if line.startswith("Serial"):
                    return line.strip().split(":")[1].strip()
    except Exception:
        return "UNKNOWN"

DEVICE_NAME = get_pi_serial()

SUPABASE_URL = "https://heahkxgngnnhugdsurfl.supabase.co/rest/v1/devices"
SERVICE_ROLE_KEY = "sb_publishable_aeDyK6nTKjbQPrUiZ7prog_mxaMkBPp"  # ⚠️ NEPOSIELAJ PUBLISHABLE KEY

data = {
    "name": DEVICE_NAME,
    "status": "online"
}

headers = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation"
}

# Upsert: vloží nové zariadenie alebo aktualizuje existujúce
try:
    response = requests.post(
        f"{SUPABASE_URL}?on_conflict=name",
        json=data,
        headers=headers
    )
    if response.status_code in [200, 201]:
        print("Heartbeat odoslaný / zariadenie vložené")
    else:
        print(f"Chyba heartbeat: {response.status_code} {response.text}")
except Exception as e:
    print(f"Chyba pripojenia: {e}")
