import lgpio
import time

TRIG = 6
ECHO = 27

MIN_FILL_CM = 10       # 100 %
MAX_DIST_CM = 25       # 0 %
MAX_MEASURE_CM = 30
NUM_SAMPLES = 5
MIN_VALID_CM = 2

SPEED_CM_S = 34300.0

h = lgpio.gpiochip_open(0)
lgpio.gpio_claim_output(h, TRIG, 0)   # dôležité: init LOW
lgpio.gpio_claim_input(h, ECHO)

time.sleep(0.3)  # stabilizácia po štarte

def zmeraj_cm(wait_rise_s=0.05, wait_fall_s=0.05):
    # TRIG musí byť krátko LOW pred pulzom
    lgpio.gpio_write(h, TRIG, 0)
    time.sleep(0.000002)

    # 10 µs pulz
    lgpio.gpio_write(h, TRIG, 1)
    time.sleep(0.000010)
    lgpio.gpio_write(h, TRIG, 0)

    t0 = time.perf_counter()

    # čakaj na ECHO HIGH
    while lgpio.gpio_read(h, ECHO) == 0:
        if time.perf_counter() - t0 > wait_rise_s:
            return None
    start = time.perf_counter()

    # čakaj na ECHO LOW
    while lgpio.gpio_read(h, ECHO) == 1:
        if time.perf_counter() - start > wait_fall_s:
            return None
    stop = time.perf_counter()

    duration = stop - start
    distance = (duration * SPEED_CM_S) / 2.0

    if distance > MAX_MEASURE_CM:
        return None
    if distance < MIN_VALID_CM:
        distance = MIN_FILL_CM

    return round(distance, 2)

def vzdialenost_na_percenta(dist_cm):
    if dist_cm is None:
        return None
    if dist_cm <= MIN_FILL_CM:
        return 100.0
    percent = (MAX_DIST_CM - dist_cm) / (MAX_DIST_CM - MIN_FILL_CM) * 100.0
    percent = max(0.0, min(100.0, percent))
    return round(percent, 1)

def priemer_merani(n=NUM_SAMPLES):
    values = []
    for _ in range(n):
        d = zmeraj_cm()
        if d is not None:
            values.append(d)
        time.sleep(0.07)  # 70 ms je bezpečnejšie než 50
    if not values:
        return None
    return sum(values) / len(values)

try:
    vzd = priemer_merani()
    perc = vzdialenost_na_percenta(vzd)
    print(perc if perc is not None else "Error")
finally:
    try:
        lgpio.gpio_free(h, TRIG)
        lgpio.gpio_free(h, ECHO)
    except Exception:
        pass
    lgpio.gpiochip_close(h)
