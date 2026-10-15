"""AUREN standalone DEMO booking API, single shared SQLite database.
Run from this directory: python app.py. Not a production deployment.
"""
from __future__ import annotations

import os
import re
import sqlite3
import uuid
import hmac
import time as clocktime
from threading import Lock
from datetime import datetime, timedelta, time
from pathlib import Path
from contextlib import closing
from zoneinfo import ZoneInfo
from flask import Flask, jsonify, request
from flask_cors import CORS

TZ = ZoneInfo("Asia/Kolkata")
DB_PATH = Path(os.environ.get("AUREN_BOOKING_DB", Path(__file__).with_name("bookings.sqlite3")))
SERVICES = {
    "haircut": (60, 1200), "styling": (45, 900), "color": (120, 2800),
    "facial": (75, 2200), "makeup": (90, 2500), "bridal": (60, 1500),
}
ARTISTS = {
    "artist-a": {"name": "Artist 01", "services": set(SERVICES)},
    "artist-b": {"name": "Artist 02", "services": {"haircut", "styling", "facial", "makeup"}},
}
OPEN_MIN, CLOSE_MIN, SLOT_STEP = 10*60, 19*60, 15
app = Flask(__name__)
CORS(app, resources={r"/api/booking/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]}})


def connection():
    db = sqlite3.connect(DB_PATH, timeout=15, isolation_level=None)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA busy_timeout = 15000")
    db.execute("PRAGMA journal_mode = WAL")
    return db


def initialize():
    with connection() as db:
        db.execute("""CREATE TABLE IF NOT EXISTS reservations (
            reference TEXT PRIMARY KEY,
            artist_id TEXT NOT NULL,
            date TEXT NOT NULL,
            start_min INTEGER NOT NULL,
            end_min INTEGER NOT NULL,
            service_ids TEXT NOT NULL,
            total_price INTEGER NOT NULL,
            customer_name TEXT NOT NULL,
            customer_phone TEXT NOT NULL,
            customer_email TEXT NOT NULL,
            notes TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'confirmed'
        )""")
        db.execute("CREATE INDEX IF NOT EXISTS idx_reservations_artist_day ON reservations(artist_id, date, status)")


def bad(message, code=400):
    return jsonify(error=message), code


def parse_services(items):
    if isinstance(items, str):
        items = items.split(",")
    if not isinstance(items, list) or not items or len(items) > len(SERVICES):
        raise ValueError("Select one or more valid services.")
    if any(not isinstance(i, str) or i not in SERVICES for i in items) or len(items) != len(set(items)):
        raise ValueError("Invalid or duplicate service selected.")
    return items


def parse_date(value):
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise ValueError("Invalid date.")
    chosen = datetime.strptime(value, "%Y-%m-%d").date()
    today = datetime.now(TZ).date()
    if chosen < today or chosen > today + timedelta(days=60):
        raise ValueError("Choose a date in the next 60 days.")
    return chosen


def parse_time(value):
    if not isinstance(value, str) or not re.fullmatch(r"\d{2}:\d{2}", value):
        raise ValueError("Time must be HH:MM.")
    hh, mm = map(int, value.split(":"))
    if hh > 23 or mm > 59:
        raise ValueError("Invalid time.")
    return hh*60 + mm


def valid_start(day, start_min, duration):
    if start_min < OPEN_MIN or start_min % SLOT_STEP != 0 or start_min + duration > CLOSE_MIN:
        return False
    current = datetime.now(TZ)
    start_dt = datetime.combine(day, time(start_min//60, start_min%60), TZ)
    return start_dt > current + timedelta(minutes=15)


def compatible(artist_id, ids):
    if artist_id == "any":
        return [key for key,a in ARTISTS.items() if set(ids).issubset(a["services"])]
    if artist_id not in ARTISTS:
        raise ValueError("Invalid specialist.")
    return [artist_id] if set(ids).issubset(ARTISTS[artist_id]["services"]) else []


def free(db, artist_id, date_str, start_min, end_min):
    overlap = db.execute("""SELECT 1 FROM reservations
        WHERE artist_id = ? AND date = ? AND status = 'confirmed'
          AND start_min < ? AND end_min > ? LIMIT 1""",
        (artist_id, date_str, end_min, start_min)).fetchone()
    return overlap is None


def pick_artist(db, ids, artist_id, day, start_min, duration):
    # Deterministic selection. Always validate skills AND full interval.
    for candidate in compatible(artist_id, ids):
        if free(db, candidate, day.isoformat(), start_min, start_min+duration):
            return candidate
    return None


# Lightweight in-process lookup throttling for the local demo.
# Production must use shared persistent rate limiting and verified customer identity.
_lookup_attempts = {}
_lookup_lock = Lock()


def allow_lookup(remote):
    now = clocktime.monotonic()
    with _lookup_lock:
        for key, attempts in list(_lookup_attempts.items()):
            recent = [t for t in attempts if now - t < 900]
            if recent:
                _lookup_attempts[key] = recent
            else:
                del _lookup_attempts[key]
        attempts = _lookup_attempts.setdefault(remote, [])
        if len(attempts) >= 10:
            return False
        attempts.append(now)
        return True


def normalize_phone(value):
    digits = re.sub(r"\D", "", str(value))
    return digits[-10:] if len(digits) >= 10 else digits


def clock_label(minutes):
    return datetime.strptime(f"{minutes//60:02d}:{minutes%60:02d}", "%H:%M").strftime("%I:%M %p").lstrip("0")


@app.get("/api/booking/availability")
def availability():
    try:
        ids = parse_services(request.args.get("service_ids", ""))
        day = parse_date(request.args.get("date"))
        artist_id = request.args.get("artist_id", "any")
        compatible(artist_id, ids)
        duration = sum(SERVICES[s][0] for s in ids)
        with closing(connection()) as db:
            starts = range(OPEN_MIN, CLOSE_MIN-duration+1, SLOT_STEP)
            slots = [{"time": f"{m//60:02d}:{m%60:02d}", "label": clock_label(m)}
                     for m in starts if valid_start(day,m,duration) and pick_artist(db,ids,artist_id,day,m,duration)]
        return jsonify(slots=slots, duration=duration, timezone="Asia/Kolkata")
    except ValueError as exc:
        return bad(str(exc))


@app.post("/api/booking/reservations")
def reserve():
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return bad("JSON request expected.")
    try:
        ids = parse_services(body.get("service_ids"))
        day = parse_date(body.get("date"))
        artist_id = body.get("artist_id", "any")
        compatible(artist_id, ids)
        start_min = parse_time(body.get("time"))
        duration = sum(SERVICES[s][0] for s in ids)
        if not valid_start(day,start_min,duration):
            return bad("This time is outside working hours or too soon.", 409)
        name = str(body.get("name", "")).strip()
        phone = str(body.get("phone", "")).strip()
        email = str(body.get("email", "")).strip()
        notes = str(body.get("notes", "")).strip()
        if not (1 <= len(name) <= 80 and re.fullmatch(r"[+0-9 ()-]{7,20}", phone)
                and len(email) <= 120 and re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email)
                and len(notes) <= 500):
            return bad("Check customer name, phone and email.")
        reference = "AUR-" + uuid.uuid4().hex[:12].upper()
        db = connection()
        try:
            # One writer at a time against the same SQLite DB.
            # Rechecking AFTER BEGIN IMMEDIATE prevents concurrent double booking.
            db.execute("BEGIN IMMEDIATE")
            assigned = pick_artist(db,ids,artist_id,day,start_min,duration)
            if not assigned:
                db.rollback()
                return bad("This slot was just taken or no qualified artist is free. Choose another.", 409)
            db.execute("""INSERT INTO reservations
                (reference,artist_id,date,start_min,end_min,service_ids,total_price,
                 customer_name,customer_phone,customer_email,notes,created_at,status)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?, 'confirmed')""",
                (reference,assigned,day.isoformat(),start_min,start_min+duration,
                 ",".join(ids),sum(SERVICES[s][1] for s in ids),name,phone,email,notes,
                 datetime.now(TZ).isoformat()))
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()
        return jsonify(reference=reference, date=day.isoformat(),
                       time=clock_label(start_min), artist_name=ARTISTS[assigned]["name"]), 201
    except ValueError as exc:
        return bad(str(exc))


@app.post("/api/booking/track")
def track_reservation():
    # Both booking reference and matching booking phone are required.
    # Return the same generic result for unknown reference / wrong phone.
    remote = request.remote_addr or "unknown"
    if not allow_lookup(remote):
        return bad("Too many lookups. Please try again later.", 429)
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return bad("Booking ID and phone number are required.")
    reference = str(body.get("reference", "")).strip().upper()
    phone = normalize_phone(body.get("phone", ""))
    if not re.fullmatch(r"AUR-[0-9A-F]{12}", reference) or len(phone) != 10:
        return bad("Enter a valid booking ID and 10-digit phone number.")
    with closing(connection()) as db:
        row = db.execute(
            """SELECT reference, artist_id, date, start_min, end_min,
                      service_ids, total_price, customer_phone, status
               FROM reservations WHERE reference = ?""", (reference,)
        ).fetchone()
    if not row or not hmac.compare_digest(normalize_phone(row["customer_phone"]), phone):
        return bad("No matching appointment found. Check your Booking ID and phone number.", 404)
    return jsonify(
        reference=row["reference"], status=row["status"],
        date=row["date"], time=clock_label(row["start_min"]),
        duration=row["end_min"]-row["start_min"],
        artist_name=ARTISTS.get(row["artist_id"], {}).get("name", "Assigned specialist"),
        service_ids=row["service_ids"].split(","), total_price=row["total_price"],
        timezone="Asia/Kolkata",
    )


if __name__ == "__main__":
    initialize()
    app.run(host="127.0.0.1", port=5001, debug=False)
