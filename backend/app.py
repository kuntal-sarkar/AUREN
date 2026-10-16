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

from functools import wraps

from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

from zoneinfo import ZoneInfo

from flask import Flask, jsonify, request

from flask_cors import CORS

from dotenv import load_dotenv

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

CORS(app, resources={

    r"/api/booking/*": {

        "origins": [

            "http://localhost:5173",

            "http://127.0.0.1:5173",

            "https://auren-50q.pages.dev",

        ]

    },

    r"/api/admin/*": {

        "origins": [

            "http://localhost:5173",

            "http://127.0.0.1:5173",

            "https://auren-50q.pages.dev",

        ]

    },

})

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

        # Walk-in customers are recorded separately from scheduled reservations.
        # CREATE TABLE IF NOT EXISTS preserves all existing bookings and walk-ins.
        db.execute("""
            CREATE TABLE IF NOT EXISTS walkins (
                customer_id TEXT PRIMARY KEY,
                customer_name TEXT NOT NULL,
                customer_phone TEXT NOT NULL,
                service_ids TEXT NOT NULL,
                total_price INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'registered'
            )
        """)
        db.execute("""CREATE TABLE IF NOT EXISTS invoices (
            invoice_id TEXT PRIMARY KEY,
            source_id TEXT NOT NULL UNIQUE,
            source_type TEXT NOT NULL,
            customer_name TEXT NOT NULL,
            customer_phone TEXT NOT NULL,
            service_ids TEXT NOT NULL,
            total_price INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            payment_method TEXT NOT NULL DEFAULT 'unspecified',
            printed_at TEXT
        )""")
        # Safe migration for existing demo invoices.
        columns = {r[1] for r in db.execute("PRAGMA table_info(invoices)").fetchall()}
        if "payment_method" not in columns:
            db.execute("ALTER TABLE invoices ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'unspecified'")
        if "printed_at" not in columns:
            db.execute("ALTER TABLE invoices ADD COLUMN printed_at TEXT")
        db.execute("""CREATE TABLE IF NOT EXISTS admin_events (
            event_id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_id TEXT NOT NULL,
            source_type TEXT NOT NULL,
            event_type TEXT NOT NULL,
            details TEXT NOT NULL DEFAULT '',
            created_at TEXT NOT NULL
        )""")
        db.execute("CREATE INDEX IF NOT EXISTS idx_admin_events_day ON admin_events(created_at)")


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

        WHERE artist_id = ? AND date = ? AND status IN ('confirmed','billed','completed')

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

# Admin demo credentials and signing key are configured through environment variables.

# Never commit ADMIN_PASSWORD or ADMIN_SECRET_KEY to GitHub.

load_dotenv(Path(__file__).with_name(".env"))

ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "")

ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")

ADMIN_SECRET_KEY = os.environ.get("ADMIN_SECRET_KEY", "")

ADMIN_TOKEN_MAX_AGE = 8 * 60 * 60

_login_attempts = {}

_login_lock = Lock()

def admin_serializer():

    if not all((ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_SECRET_KEY)):

        return None

    return URLSafeTimedSerializer(ADMIN_SECRET_KEY, salt="auren-admin-v1")

def login_allowed(remote):

    now = clocktime.monotonic()

    with _login_lock:

        recent = [t for t in _login_attempts.get(remote, []) if now - t < 900]

        if len(recent) >= 5:

            _login_attempts[remote] = recent

            return False

        recent.append(now)

        _login_attempts[remote] = recent

        return True

def require_admin(func):

    @wraps(func)

    def wrapped(*args, **kwargs):

        serializer = admin_serializer()

        if serializer is None:

            return bad("Admin access is not configured.", 503)

        header = request.headers.get("Authorization", "")

        if not header.startswith("Bearer "):

            return bad("Admin login required.", 401)

        token = header[7:].strip()

        try:

            data = serializer.loads(token, max_age=ADMIN_TOKEN_MAX_AGE)

        except (BadSignature, SignatureExpired):

            return bad("Session expired or invalid. Please log in again.", 401)

        if not isinstance(data, dict) or data.get("role") != "admin" or data.get("user") != ADMIN_USERNAME:

            return bad("Admin login required.", 401)

        return func(*args, **kwargs)

    return wrapped

@app.post("/api/admin/login")

def admin_login():

    serializer = admin_serializer()

    if serializer is None:

        return bad("Admin access is not configured.", 503)

    if not login_allowed(request.remote_addr or "unknown"):

        return bad("Too many login attempts. Try again in 15 minutes.", 429)

    data = request.get_json(silent=True)

    if not isinstance(data, dict):

        return bad("Username and password are required.")

    username = data.get("username", "")

    password = data.get("password", "")

    if not isinstance(username, str) or not isinstance(password, str):

        return bad("Invalid username or password.", 401)

    if not (hmac.compare_digest(username, ADMIN_USERNAME) and

            hmac.compare_digest(password, ADMIN_PASSWORD)):

        return bad("Invalid username or password.", 401)

    token = serializer.dumps({"role": "admin", "user": ADMIN_USERNAME})

    return jsonify(token=token, username=ADMIN_USERNAME, expires_in=ADMIN_TOKEN_MAX_AGE)

@app.get("/api/admin/me")

@require_admin

def admin_me():

    return jsonify(username=ADMIN_USERNAME, role="admin")

@app.get("/api/admin/bookings")

@require_admin

def admin_bookings():

    with closing(connection()) as db:

        rows = db.execute("""

            SELECT

                reference,

                customer_name,

                customer_phone,

                customer_email,

                artist_id,

                date,

                start_min,

                end_min,

                service_ids,

                total_price,

                status,

                created_at

            FROM reservations

            ORDER BY date DESC, start_min DESC

            LIMIT 200

        """).fetchall()

    bookings = []

    for row in rows:

        bookings.append({

            "reference": row["reference"],

            "name": row["customer_name"],

            "phone": row["customer_phone"],

            "email": row["customer_email"],

            "artist": ARTISTS.get(

                row["artist_id"], {}

            ).get("name", "Assigned specialist"),

            "date": row["date"],

            "time": clock_label(row["start_min"]),

            "service_ids": row["service_ids"].split(","),

            "duration": row["end_min"] - row["start_min"],

            "total_price": row["total_price"],

            "status": row["status"],

            "created_at": row["created_at"],

        })

    return jsonify(

        bookings=bookings,

        total=len(bookings)

    )


# ----------------------------------------------------
# Demo walk-in registration (admin only)
# ----------------------------------------------------
@app.post("/api/admin/walkins")
@require_admin
def register_walkin():
    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return bad("Customer details are required.")
    name = body.get("name", "")
    phone = body.get("phone", "")
    if not isinstance(name, str) or not 1 <= len(name.strip()) <= 80:
        return bad("Enter a valid customer name.")
    if not isinstance(phone, str) or not re.fullmatch(r"[+0-9 ()-]{7,20}", phone.strip()):
        return bad("Enter a valid phone number.")
    try:
        service_ids = parse_services(body.get("service_ids", []))
    except ValueError as exc:
        return bad(str(exc))
    customer_id = "AUR-W-" + uuid.uuid4().hex[:12].upper()
    created_at = datetime.now(TZ).isoformat()
    total_price = sum(SERVICES[s][1] for s in service_ids)
    with closing(connection()) as db:
        db.execute("""INSERT INTO walkins
            (customer_id,customer_name,customer_phone,service_ids,total_price,created_at,status)
            VALUES (?,?,?,?,?,?,'registered')""",
            (customer_id,name.strip(),phone.strip(),",".join(service_ids),total_price,created_at))
        log_event(db, customer_id, "walkin", "registered", "Walk-in registration")
    return jsonify(customer_id=customer_id,name=name.strip(),phone=phone.strip(),
                   service_ids=service_ids,total_price=total_price,
                   created_at=created_at,status="registered"), 201


@app.get("/api/admin/walkins")
@require_admin
def list_walkins():
    with closing(connection()) as db:
        rows = db.execute("""SELECT customer_id,customer_name,customer_phone,
            service_ids,total_price,created_at,status FROM walkins
            ORDER BY created_at DESC LIMIT 200""").fetchall()
    walkins = [{"customer_id":r["customer_id"],"name":r["customer_name"],
                "phone":r["customer_phone"],"service_ids":r["service_ids"].split(","),
                "total_price":r["total_price"],"created_at":r["created_at"],
                "status":r["status"]} for r in rows]
    return jsonify(walkins=walkins,total=len(walkins))


# ----------------------------------------------------
# Demo billing. Invoices are generated once per source ID.
# Revenue is the sum of generated invoices, not reservations.
# ----------------------------------------------------
def invoice_payload(row):
    return {
        "invoice_id": row["invoice_id"], "source_id": row["source_id"],
        "source_type": row["source_type"], "name": row["customer_name"],
        "phone": row["customer_phone"],
        "service_ids": row["service_ids"].split(","),
        "items": [{"id":sid,"name":sid.replace("_", " ").title(),"price":SERVICES[sid][1]}
                  for sid in row["service_ids"].split(",") if sid in SERVICES],
        "total_price": row["total_price"], "created_at": row["created_at"],
        "payment_method": row["payment_method"],
        "printed_at": row["printed_at"],
        "status": "completed" if row["printed_at"] else "billed",
    }


@app.post("/api/admin/invoices")
@require_admin
def generate_invoice():
    body = request.get_json(silent=True)
    if not isinstance(body, dict) or not isinstance(body.get("customer_id"), str):
        return bad("Enter a valid booking or walk-in ID.")
    source_id = body["customer_id"].strip().upper()
    payment_method = str(body.get("payment_method", "")).strip().lower()
    if payment_method not in ("cash", "upi", "card"):
        return bad("Choose Cash, UPI or Card payment method.")
    if not re.fullmatch(r"AUR-(?:W-)?[0-9A-F]{12}", source_id):
        return bad("Invalid booking or walk-in ID.")

    with closing(connection()) as db:
        try:
            db.execute("BEGIN IMMEDIATE")
            existing = db.execute("SELECT * FROM invoices WHERE source_id=?", (source_id,)).fetchone()
            if existing:
                db.rollback()
                return jsonify(error="Invoice already generated for this ID.",
                               invoice=invoice_payload(existing)), 409
            if source_id.startswith("AUR-W-"):
                source_type = "walkin"
                customer = db.execute("""SELECT customer_name,customer_phone,service_ids,total_price
                    FROM walkins WHERE customer_id=?""", (source_id,)).fetchone()
            else:
                source_type = "booking"
                customer = db.execute("""SELECT customer_name,customer_phone,service_ids,total_price
                    FROM reservations WHERE reference=?""", (source_id,)).fetchone()
            if customer is None:
                db.rollback()
                return bad("No customer record matches this ID.", 404)
            if not customer["service_ids"]:
                db.rollback()
                return bad("No services found for this record.")
            invoice_id = "INV-" + uuid.uuid4().hex[:12].upper()
            created_at = datetime.now(TZ).isoformat()
            db.execute("""INSERT INTO invoices
                (invoice_id,source_id,source_type,customer_name,customer_phone,
                 service_ids,total_price,created_at,payment_method)
                 VALUES(?,?,?,?,?,?,?,?,?)""",
                 (invoice_id,source_id,source_type,customer["customer_name"],
                  customer["customer_phone"],customer["service_ids"],
                  customer["total_price"],created_at,payment_method))
            if source_type == "booking":
                state = db.execute("SELECT status FROM reservations WHERE reference=?", (source_id,)).fetchone()
                if state and state["status"] not in ("arrived", "billed"):
                    db.rollback()
                    return bad("Mark the appointment Arrived before billing.", 409)
                db.execute("UPDATE reservations SET status='billed' WHERE reference=?", (source_id,))
            else:
                db.execute("UPDATE walkins SET status='billed' WHERE customer_id=?", (source_id,))
            log_event(db, source_id, source_type, "billed", f"{payment_method.upper()} • ₹{customer['total_price']} • {invoice_id}")
            db.commit()
            row = db.execute("SELECT * FROM invoices WHERE invoice_id=?", (invoice_id,)).fetchone()
        except Exception:
            db.rollback()
            raise
    return jsonify(invoice=invoice_payload(row)), 201


@app.post("/api/admin/invoices/<invoice_id>/complete")
@require_admin
def complete_invoice(invoice_id):
    if not re.fullmatch(r"INV-[0-9A-F]{12}", invoice_id):
        return bad("Invalid invoice ID.")
    with closing(connection()) as db:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute("SELECT * FROM invoices WHERE invoice_id=?", (invoice_id,)).fetchone()
        if not row:
            db.rollback()
            return bad("Invoice not found.", 404)
        if not row["printed_at"]:
            db.execute("UPDATE invoices SET printed_at=? WHERE invoice_id=?",
                       (datetime.now(TZ).isoformat(), invoice_id))
            if row["source_type"] == "booking":
                db.execute("UPDATE reservations SET status='completed' WHERE reference=?", (row["source_id"],))
            else:
                db.execute("UPDATE walkins SET status='completed' WHERE customer_id=?", (row["source_id"],))
            log_event(db, row["source_id"], row["source_type"], "completed", f"Bill printed • {invoice_id}")
        db.commit()
        updated = db.execute("SELECT * FROM invoices WHERE invoice_id=?", (invoice_id,)).fetchone()
    return jsonify(invoice=invoice_payload(updated))


@app.get("/api/admin/customers/search")
@require_admin
def search_customers():
    query = str(request.args.get("q", "")).strip()
    if not query or len(query) > 80:
        return jsonify(customers=[])
    pattern = "%" + query + "%"
    with closing(connection()) as db:
        rows = db.execute("""
            SELECT source_id, name, phone, source_type, service_ids, total_price, status, date
            FROM (
              SELECT reference AS source_id, customer_name AS name, customer_phone AS phone,
                     'booking' AS source_type, service_ids, total_price, status, date
              FROM reservations
              UNION ALL
              SELECT customer_id, customer_name, customer_phone,
                     'walkin', service_ids, total_price, status, substr(created_at,1,10)
              FROM walkins
            )
            WHERE source_id LIKE ? COLLATE NOCASE
               OR name LIKE ? COLLATE NOCASE
               OR phone LIKE ?
            ORDER BY date DESC LIMIT 12
        """, (pattern, pattern, pattern)).fetchall()
        billed = {r[0] for r in db.execute("SELECT source_id FROM invoices WHERE source_id IN (" +
                   ",".join("?" for _ in rows) + ")", [r["source_id"] for r in rows]).fetchall()} if rows else set()
    return jsonify(customers=[{
        "source_id": r["source_id"], "name": r["name"], "phone": r["phone"],
        "source_type": r["source_type"], "service_ids": r["service_ids"].split(","),
        "total_price": r["total_price"], "status": r["status"], "date": r["date"],
        "already_billed": r["source_id"] in billed,
    } for r in rows])


@app.get("/api/admin/invoices")
@require_admin
def list_invoices():
    with closing(connection()) as db:
        rows = db.execute("SELECT * FROM invoices ORDER BY created_at DESC LIMIT 200").fetchall()
    return jsonify(invoices=[invoice_payload(row) for row in rows], total=len(rows))


@app.get("/api/admin/stats")
@require_admin
def admin_stats():
    today = datetime.now(TZ).date().isoformat()
    with closing(connection()) as db:
        bookings = db.execute("SELECT COUNT(*) FROM reservations").fetchone()[0]
        walkins = db.execute("SELECT COUNT(*) FROM walkins").fetchone()[0]
        today_bookings = db.execute("SELECT COUNT(*) FROM reservations WHERE date=?", (today,)).fetchone()[0]
        revenue = db.execute("SELECT COALESCE(SUM(total_price),0) FROM invoices").fetchone()[0]
        invoice_count = db.execute("SELECT COUNT(*) FROM invoices").fetchone()[0]
    return jsonify(total_bookings=bookings,total_walkins=walkins,
                   today_appointments=today_bookings,total_revenue=revenue,
                   total_invoices=invoice_count)


# ------------------------------------------------------------------
# RECEPTION DESK: attendance, today's log, and finalized status lock
# ------------------------------------------------------------------
def log_event(db, source_id, source_type, event_type, details=""):
    db.execute("""INSERT INTO admin_events(source_id,source_type,event_type,details,created_at)
               VALUES (?,?,?,?,?)""", (source_id,source_type,event_type,details,datetime.now(TZ).isoformat()))


@app.post("/api/admin/bookings/<reference>/attendance")
@require_admin
def update_attendance(reference):
    reference = reference.strip().upper()
    if not re.fullmatch(r"AUR-[0-9A-F]{12}", reference):
        return bad("Invalid booking reference.")
    payload = request.get_json(silent=True)
    status = payload.get("status") if isinstance(payload, dict) else None
    if status not in ("arrived", "absent", "confirmed"):
        return bad("Choose Arrived, Absent, or Confirmed.")
    with closing(connection()) as db:
        try:
            db.execute("BEGIN IMMEDIATE")
            record = db.execute("SELECT status FROM reservations WHERE reference=?",(reference,)).fetchone()
            if not record:
                db.rollback()
                return bad("Booking not found.", 404)
            if record["status"] in ("billed", "completed", "cancelled"):
                db.rollback()
                return bad("This appointment is billed, completed, or cancelled and cannot be changed.", 409)
            if record["status"] != status:
                db.execute("UPDATE reservations SET status=? WHERE reference=?", (status,reference))
                log_event(db, reference,"booking",status, "Attendance updated")
            db.commit()
        except Exception:
            db.rollback()
            raise
    return jsonify(reference=reference,status=status)


@app.get("/api/admin/today-log")
@require_admin
def today_log():
    today = datetime.now(TZ).date().isoformat()
    with closing(connection()) as db:
        events = db.execute("""SELECT e.source_id,e.source_type,e.event_type,e.details,e.created_at,
                  COALESCE(r.customer_name,w.customer_name,'Customer') AS name,
                  COALESCE(r.customer_phone,w.customer_phone,'') AS phone
            FROM admin_events e
            LEFT JOIN reservations r ON e.source_type='booking' AND e.source_id=r.reference
            LEFT JOIN walkins w ON e.source_type='walkin' AND e.source_id=w.customer_id
            WHERE substr(e.created_at,1,10)=? ORDER BY e.created_at DESC, e.event_id DESC""", (today,)).fetchall()
        appointments = db.execute("""SELECT reference,customer_name,customer_phone,date,start_min,status
                           FROM reservations WHERE date=? ORDER BY start_min""",(today,)).fetchall()
        walkins = db.execute("""SELECT customer_id,customer_name,customer_phone,created_at,status
                       FROM walkins WHERE substr(created_at,1,10)=? ORDER BY created_at DESC""",(today,)).fetchall()
        invoices = db.execute("""SELECT invoice_id,source_id,source_type,customer_name,
                      payment_method,total_price,created_at,printed_at FROM invoices
                      WHERE substr(created_at,1,10)=? OR substr(printed_at,1,10)=?""",(today,today)).fetchall()
    return jsonify(date=today,
        events=[dict(row) for row in events],
        appointments=[dict(row) for row in appointments],
        walkins=[dict(row) for row in walkins],
        invoices=[dict(row) for row in invoices])


initialize()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.environ.get("PORT", 5001)), debug=False)
