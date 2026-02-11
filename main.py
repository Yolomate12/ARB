import time
import cv2
import lgpio
from ultralytics import YOLO
from picamera2 import Picamera2
from gpiozero import DigitalOutputDevice

# ==================================================
# MOTOR – NEMA17 (STEP / DIR) cez gpiozero
# ==================================================
DIR_PIN = 7
STEP_PIN = 20
EN_PIN = 9
GPIO = 14

DIR = DigitalOutputDevice(DIR_PIN)
STEP = DigitalOutputDevice(STEP_PIN)
EN = DigitalOutputDevice(EN_PIN, active_high=False)  # LOW = enable
EN.on()

STEPS_PER_REV = 1600
STEP_DELAY = 0.0005
STOP_US = 1500        # tvoj nameraný STOP
RUN_US = 1350         # rýchlosť otáčania (upravíš podľa potreby)

# ⏱️ ČAS PRE 90°
# TOTO MUSÍŠ MAŤ Z MERANIA 360°
# príklad: ak 360° = 1.20 s → 90° = 0.30 s
TIME_90 = 1.05 

h = lgpio.gpiochip_open(0)
lgpio.gpio_claim_output(h, GPIO, 0)

def set_servo(us: int):
    lgpio.tx_servo(h, GPIO, us)


def rotate_motor(degrees):
    if degrees == 0:
        return

    steps = int(STEPS_PER_REV * abs(degrees) / 360)

    DIR.value = 1 if degrees > 0 else 0

    for _ in range(steps):
        STEP.on()
        time.sleep(STEP_DELAY)
        STEP.off()
        time.sleep(STEP_DELAY)


# ==================================================
# YOLO NCNN MODEL
# ==================================================
MODEL_PATH = "waste_detection_2_ncnn_model"  # priečinok s .param/.bin
CONF_THRESH = 0.5

model = YOLO(MODEL_PATH, task="detect")
labels = model.names

# ===== PRISPÔSOB PODĽA SVOJHO MODELU =====
PAPER_CLASSES = ["papier"]
PLASTIC_CLASSES = ["plast", "plast_obal","sacok"]
METAL_CLASSES = ["plechovka"]


# ==================================================
# PICAMERA2
# ==================================================
picam = Picamera2()
picam.configure(
    picam.create_preview_configuration(
        main={"format": "RGB888", "size": (680, 680)}
    )
)
picam.start()

print("\n======================================")
print(" SPACE  → zachytiť + triediť")
print(" Q      → ukončiť program")
print("======================================\n")


# ==================================================
# HLAVNÝ CYKLUS
# ==================================================
try:
    while True:
        frame = picam.capture_array()
        cv2.imshow("Picamera", frame)

        key = cv2.waitKey(1)

        if key == ord('q') or key == ord('q'):
            break

        if key == 32:  # SPACE
            print("Zachytávam snímok a spúšťam detekciu...")

            results = model(frame, verbose=False)
            detections = results[0].boxes

            material = "komunal"

            if detections is not None and len(detections) > 0:
                best = max(detections, key=lambda d: d.conf.item())
                class_id = int(best.cls.item())
                class_name = labels[class_id]
                confidence = best.conf.item()

                print(f"Detekované: {class_name} ({confidence:.2f})")

                if class_name in PAPER_CLASSES:
                    material = "papier"
                elif class_name in PLASTIC_CLASSES:
                    material = "plast"
                elif class_name in METAL_CLASSES:
                    material = "kov"

            # ==================================================
            # ROZHODNUTIE – UHOL MOTORA
            # ==================================================
            if material == "papier":
                angle = -810
            elif material == "plast":
                angle = -270
            elif material == "kov":
                angle = 810
            else:
                angle = 270

            print(f"Triedim ako: {material} → {angle}°")

            rotate_motor(angle)
            #set_servo(STOP_US)
            #time.sleep(1)
            set_servo(STOP_US)
            time.sleep(1)
            set_servo(2*STOP_US - RUN_US)
            time.sleep(TIME_90)
            set_servo(RUN_US)
            time.sleep(TIME_90)
            set_servo(STOP_US)
            time.sleep(0.5)		 
            
            time.sleep(1)
            rotate_motor(-angle)

            print("Motor vrátený do 0°\n")

finally:
    # ==================================================
    # CLEANUP
    # ==================================================
    print("Ukončujem program...")
    lgpio.tx_servo(h, GPIO, 0)   # vypne PWM
    lgpio.gpiochip_close(h)
    picam.stop()
    cv2.destroyAllWindows()
    DIR.close()
    STEP.close()
    EN.close()
