from __future__ import annotations

import os
from datetime import datetime
from typing import Any, Dict, Optional
from zoneinfo import ZoneInfo

import requests
from omniagents import function_tool


def _base_url() -> str:
    value = os.getenv("LIBRARY_API_BASE_URL", "http://127.0.0.1:8000")
    return value.rstrip("/")


def _normalize_api_base(value: str) -> str:
    api = (value or "").rstrip("/")
    if api.endswith("/api"):
        api = api[: -len("/api")]
    return api


def _auth_headers(token: Optional[str]) -> Dict[str, str]:
    resolved = token or os.getenv("LIBRARY_API_TOKEN")
    if not resolved:
        return {"Content-Type": "application/json"}
    return {"Authorization": f"Bearer {resolved}", "Content-Type": "application/json"}


def _parse_dt(value: str, default_tz: Optional[str] = None) -> datetime:
    dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        tz_name = default_tz or "America/Chicago"
        dt = dt.replace(tzinfo=ZoneInfo(tz_name))
    return dt


def _maybe_reinterpret_utc_as_local(value: str, *, client_tz: Optional[str], now_ct: datetime) -> Optional[datetime]:
    if not value or not client_tz:
        return None
    if not value.endswith("Z"):
        return None
    try:
        alt = _to_chicago(_parse_dt(value[:-1], default_tz=client_tz))
    except Exception:
        return None
    if alt <= now_ct:
        return None
    try:
        orig = _to_chicago(_parse_dt(value, default_tz=client_tz))
    except Exception:
        return alt
    if abs((alt - orig).total_seconds()) < 3600:
        return None
    return alt


def _to_chicago(dt: datetime) -> datetime:
    return dt.astimezone(ZoneInfo("America/Chicago"))


def _library_open_close(day: datetime) -> tuple[datetime, datetime]:
    d = _to_chicago(day)
    weekday = d.weekday()
    if weekday <= 3:
        open_hh, open_mm, close_hh, close_mm = 7, 30, 23, 30
    elif weekday == 4:
        open_hh, open_mm, close_hh, close_mm = 7, 30, 22, 0
    elif weekday == 5:
        open_hh, open_mm, close_hh, close_mm = 10, 0, 19, 0
    else:
        open_hh, open_mm, close_hh, close_mm = 13, 0, 22, 0

    tz = ZoneInfo("America/Chicago")
    open_dt = datetime(d.year, d.month, d.day, open_hh, open_mm, tzinfo=tz)
    close_dt = datetime(d.year, d.month, d.day, close_hh, close_mm, tzinfo=tz)
    return open_dt, close_dt


def _overlaps(a_start: datetime, a_end: datetime, b_start: datetime, b_end: datetime) -> bool:
    return a_start < b_end and a_end > b_start


def _find_next_free_slots(
    *,
    open_dt: datetime,
    close_dt: datetime,
    duration_minutes: int,
    busy: list[tuple[datetime, datetime]],
    limit: int = 3,
) -> list[dict[str, str]]:
    candidates: list[dict[str, str]] = []
    step = 30
    cursor = open_dt
    last_start = close_dt
    while cursor + _mins(duration_minutes) <= last_start and len(candidates) < limit:
        end = cursor + _mins(duration_minutes)
        ok = True
        for b0, b1 in busy:
            if _overlaps(cursor, end, b0, b1):
                ok = False
                break
        if ok:
            candidates.append({"start": cursor.isoformat(), "end": end.isoformat()})
        cursor = cursor + _mins(step)
    return candidates


def _mins(n: int):
    from datetime import timedelta

    return timedelta(minutes=n)


def _raise_for_error(resp: requests.Response) -> None:
    if resp.status_code < 400:
        return
    if resp.status_code in (401, 403):
        raise RuntimeError("AUTH_REQUIRED")
    try:
        payload = resp.json()
    except Exception:
        payload = resp.text
    raise RuntimeError(f"HTTP {resp.status_code}: {payload}")


@function_tool
def library_login(*, email: str, password: str, base_url: Optional[str] = None) -> Dict[str, Any]:
    """Log in to the Library API and return a JWT token.

    Args:
        email: The user's email.
        password: The user's password.
        base_url: API base URL (defaults to env LIBRARY_API_BASE_URL or http://127.0.0.1:8000).
    """

    api = _normalize_api_base(base_url or _base_url())
    url = f"{api}/api/auth/login/"
    resp = requests.post(url, json={"email": email, "password": password}, timeout=20)
    _raise_for_error(resp)
    token = resp.json().get("token")
    if not token:
        raise RuntimeError("Login succeeded but token was missing in response.")
    return {"token": token, "base_url": api}


@function_tool
def list_rooms(*, token: Optional[str] = None, base_url: Optional[str] = None) -> Dict[str, Any]:
    """List rooms.

    Args:
        token: JWT token (optional; falls back to env LIBRARY_API_TOKEN).
        base_url: API base URL (optional).
    """

    api = _normalize_api_base(base_url or _base_url())
    url = f"{api}/api/rooms/"
    resp = requests.get(url, headers=_auth_headers(token), timeout=20)
    _raise_for_error(resp)
    return {"rooms": resp.json()}


@function_tool
def list_equipment(*, token: Optional[str] = None, base_url: Optional[str] = None) -> Dict[str, Any]:
    """List equipment items.

    Args:
        token: JWT token (optional; falls back to env LIBRARY_API_TOKEN).
        base_url: API base URL (optional).
    """

    api = _normalize_api_base(base_url or _base_url())
    url = f"{api}/api/equipment/"
    resp = requests.get(url, headers=_auth_headers(token), timeout=20)
    _raise_for_error(resp)
    return {"equipment": resp.json()}


@function_tool
def list_my_reservations(*, token: Optional[str] = None, base_url: Optional[str] = None) -> Dict[str, Any]:
    """List the current user's reservations.

    Args:
        token: JWT token (optional; falls back to env LIBRARY_API_TOKEN).
        base_url: API base URL (optional).
    """

    api = _normalize_api_base(base_url or _base_url())

    url = f"{api}/api/reservations/"
    resp = requests.get(url, headers=_auth_headers(token), timeout=20)
    _raise_for_error(resp)
    return {"reservations": resp.json()}


@function_tool
def list_study_spaces(
    *,
    kind: Optional[str] = None,
    token: Optional[str] = None,
    base_url: Optional[str] = None,
) -> Dict[str, Any]:
    """List study spaces (rooms and computers).

    Notes:
        In this system, a “computer” is stored as a Room with has_monitor=true.

    Args:
        kind: Optional filter: "rooms" (no monitor) or "computers" (has monitor).
        token: JWT token (optional; falls back to env LIBRARY_API_TOKEN).
        base_url: API base URL (optional).
    """

    api = _normalize_api_base(base_url or _base_url())
    url = f"{api}/api/rooms/"
    resp = requests.get(url, headers=_auth_headers(token), timeout=20)
    _raise_for_error(resp)
    rooms = resp.json() if isinstance(resp.json(), list) else []

    normalized = (kind or "").strip().lower()
    if normalized in {"room", "rooms"}:
        rooms = [r for r in rooms if not bool(r.get("has_monitor"))]
    elif normalized in {"computer", "computers", "pcs", "workstations"}:
        rooms = [r for r in rooms if bool(r.get("has_monitor"))]

    return {"rooms": rooms}


@function_tool
def list_my_computer_reservations(*, token: Optional[str] = None, base_url: Optional[str] = None) -> Dict[str, Any]:
    """List the current user's reservations that are computers.

    Notes:
        A “computer” is stored as a room with has_monitor=true.
    """

    api = _normalize_api_base(base_url or _base_url())
    url = f"{api}/api/reservations/"
    resp = requests.get(url, headers=_auth_headers(token), timeout=20)
    _raise_for_error(resp)
    reservations = resp.json() if isinstance(resp.json(), list) else []

    computers = [r for r in reservations if bool(r.get("room_has_monitor"))]
    return {"reservations": computers}


@function_tool
def list_my_equipment(*, token: Optional[str] = None, base_url: Optional[str] = None) -> Dict[str, Any]:
    """List the current user's equipment checkouts.

    Args:
        token: JWT token (optional; falls back to env LIBRARY_API_TOKEN).
        base_url: API base URL (optional).
    """

    api = _normalize_api_base(base_url or _base_url())
    url = f"{api}/api/checkouts/"
    resp = requests.get(url, headers=_auth_headers(token), timeout=20)
    _raise_for_error(resp)

    data = resp.json()
    if isinstance(data, list):
        active = [c for c in data if not c.get("returned_at")]
    else:
        active = data
    return {"checkouts": active}


@function_tool
def check_time_window(
    *,
    start_time_iso: str,
    end_time_iso: str,
    client_tz: Optional[str] = None,
) -> Dict[str, Any]:
    """Validate a requested time window (without needing a specific room).

    Returns:
        { ok: bool, reason?: str, suggested_slots: [], window?: {start,end} }
    """

    now = datetime.now(tz=ZoneInfo("America/Chicago"))
    try:
        start = _to_chicago(_parse_dt(start_time_iso, default_tz=client_tz))
        end = _to_chicago(_parse_dt(end_time_iso, default_tz=client_tz))
    except Exception:
        return {"ok": False, "reason": "I couldn't read that date/time.", "suggested_slots": []}

    if start < now:
        alt_start = _maybe_reinterpret_utc_as_local(start_time_iso, client_tz=client_tz, now_ct=now)
        alt_end = _maybe_reinterpret_utc_as_local(end_time_iso, client_tz=client_tz, now_ct=now)
        if alt_start and alt_end:
            start, end = alt_start, alt_end

    if end <= start:
        return {"ok": False, "reason": "End time must be after the start time.", "suggested_slots": []}

    today = now.date()
    latest_sunday = today
    while latest_sunday.weekday() != 6:
        latest_sunday = latest_sunday.fromordinal(latest_sunday.toordinal() - 1)
    window_start = latest_sunday
    window_end = latest_sunday.fromordinal(latest_sunday.toordinal() + 6)
    if start.date() < window_start or start.date() > window_end:
        return {
            "ok": False,
            "reason": f"That day isn’t available to book yet. Pick a date between {window_start.isoformat()} and {window_end.isoformat()}.",
            "suggested_slots": [],
            "window": {"start": window_start.isoformat(), "end": window_end.isoformat()},
        }

    if start < now:
        return {"ok": False, "reason": "That time is in the past.", "suggested_slots": []}
    if start < now + _mins(30):
        return {"ok": False, "reason": "Reservations must be made at least 30 minutes in advance.", "suggested_slots": []}

    duration_minutes = int((end - start).total_seconds() // 60)
    if duration_minutes < 30:
        return {"ok": False, "reason": "Reservations must be at least 30 minutes.", "suggested_slots": []}
    if duration_minutes > 180:
        return {"ok": False, "reason": "Reservations can be at most 3 hours.", "suggested_slots": []}

    open_dt, close_dt = _library_open_close(start)
    last_end = close_dt - _mins(30)
    if start < open_dt:
        return {"ok": False, "reason": "That time is before the library opens.", "suggested_slots": []}
    if end > last_end:
        return {"ok": False, "reason": "That booking would go too close to closing time.", "suggested_slots": []}

    return {"ok": True, "suggested_slots": []}


@function_tool
def check_item_availability(
    *,
    equipment_item_id: int,
    token: Optional[str] = None,
    base_url: Optional[str] = None,
) -> Dict[str, Any]:
    """Check if an equipment item is currently available.

    Returns:
        { ok: bool, available: int, item: {...}, alternatives: [...] }
    """

    api = _normalize_api_base(base_url or _base_url())
    url = f"{api}/api/equipment/"
    resp = requests.get(url, headers=_auth_headers(token), timeout=20)
    _raise_for_error(resp)
    items = resp.json() if isinstance(resp.json(), list) else []

    item = next((i for i in items if int(i.get("id")) == int(equipment_item_id)), None)
    if not item:
        return {"ok": False, "reason": "Item not found."}

    category = item.get("category")
    category_alternatives = [
        i
        for i in items
        if i.get("category") == category
        and int(i.get("availableQuantity") or 0) > 0
        and int(i.get("id")) != int(equipment_item_id)
    ]

    if token:
        try:
            checkouts_url = f"{api}/api/checkouts/"
            checkout_resp = requests.get(checkouts_url, headers=_auth_headers(token), timeout=20)
            _raise_for_error(checkout_resp)
            checkouts = checkout_resp.json() if isinstance(checkout_resp.json(), list) else []
            already_has_one = any(
                (c.get("returned_at") in (None, "") and int(c.get("item") or 0) == int(equipment_item_id))
                for c in checkouts
            )
            if already_has_one:
                return {
                    "ok": False,
                    "reason": "You can only check out 1 of that item at a time.",
                    "available": int(item.get("availableQuantity") or 0),
                    "item": item,
                    "alternatives": [],
                }
        except RuntimeError:
            raise
        except Exception:
            pass

    available = item.get("availableQuantity")
    try:
        available_int = int(available)
    except Exception:
        available_int = 0

    if available_int > 0:
        return {"ok": True, "available": available_int, "item": item, "alternatives": []}

    alternatives = category_alternatives
    return {
        "ok": False,
        "available": available_int,
        "item": item,
        "reason": "That item is currently unavailable.",
        "alternatives": alternatives[:5],
    }


@function_tool
def check_reservation_feasibility(
    *,
    room_id: int,
    start_time_iso: str,
    end_time_iso: str,
    token: Optional[str] = None,
    base_url: Optional[str] = None,
    client_tz: Optional[str] = None,
) -> Dict[str, Any]:
    """Validate a requested reservation window and detect conflicts.

    Returns:
        { ok: bool, reason?: str, can_waitlist: bool, suggested_slots: [...] }
    """

    now = datetime.now(tz=ZoneInfo("America/Chicago"))
    try:
        start = _to_chicago(_parse_dt(start_time_iso, default_tz=client_tz))
        end = _to_chicago(_parse_dt(end_time_iso, default_tz=client_tz))
    except Exception:
        return {"ok": False, "reason": "I couldn't read that date/time.", "can_waitlist": False, "suggested_slots": []}

    if start < now:
        alt_start = _maybe_reinterpret_utc_as_local(start_time_iso, client_tz=client_tz, now_ct=now)
        alt_end = _maybe_reinterpret_utc_as_local(end_time_iso, client_tz=client_tz, now_ct=now)
        if alt_start and alt_end:
            start, end = alt_start, alt_end

    if end <= start:
        return {"ok": False, "reason": "End time must be after the start time.", "can_waitlist": False, "suggested_slots": []}

    # Only allow booking within the currently released 7-day window.
    # Window refreshes every Sunday (America/Chicago) and covers Sunday..Saturday.
    today = now.date()
    latest_sunday = today
    while latest_sunday.weekday() != 6:
        latest_sunday = latest_sunday.fromordinal(latest_sunday.toordinal() - 1)
    window_start = latest_sunday
    window_end = latest_sunday.fromordinal(latest_sunday.toordinal() + 6)
    if start.date() < window_start or start.date() > window_end:
        return {
            "ok": False,
            "reason": f"That day isn’t available to book yet. Pick a date between {window_start.isoformat()} and {window_end.isoformat()}.",
            "can_waitlist": False,
            "suggested_slots": [],
            "window": {"start": window_start.isoformat(), "end": window_end.isoformat()},
        }
    if start < now:
        return {"ok": False, "reason": "That time is in the past.", "can_waitlist": False, "suggested_slots": []}
    if start < now + _mins(30):
        return {"ok": False, "reason": "Reservations must be made at least 30 minutes in advance.", "can_waitlist": False, "suggested_slots": []}

    duration_minutes = int((end - start).total_seconds() // 60)
    if duration_minutes < 30:
        return {"ok": False, "reason": "Reservations must be at least 30 minutes.", "can_waitlist": False, "suggested_slots": []}
    if duration_minutes > 180:
        return {"ok": False, "reason": "Reservations can be at most 3 hours.", "can_waitlist": False, "suggested_slots": []}

    open_dt, close_dt = _library_open_close(start)
    last_end = close_dt - _mins(30)
    if start < open_dt:
        return {"ok": False, "reason": "That time is before the library opens.", "can_waitlist": False, "suggested_slots": []}
    if end > last_end:
        return {"ok": False, "reason": "That booking would go too close to closing time.", "can_waitlist": False, "suggested_slots": []}

    api = _normalize_api_base(base_url or _base_url())

    room_is_computer = False
    try:
        rooms_url = f"{api}/api/rooms/"
        rooms_resp = requests.get(rooms_url, headers=_auth_headers(token), timeout=20)
        _raise_for_error(rooms_resp)
        rooms = rooms_resp.json() if isinstance(rooms_resp.json(), list) else []
        room = next((r for r in rooms if int(r.get("id") or 0) == int(room_id)), None)
        room_is_computer = bool(room and room.get("has_monitor"))
    except RuntimeError:
        raise
    except Exception:
        room_is_computer = False

    schedule_url = f"{api}/api/studyspaces/{room_id}/schedule/?date={start.date().isoformat()}"
    resp = requests.get(schedule_url, headers=_auth_headers(token), timeout=20)
    _raise_for_error(resp)
    sched = resp.json() if isinstance(resp.json(), dict) else {}

    busy: list[tuple[datetime, datetime]] = []
    for key in ("booked", "held", "waitlisted"):
        for w in sched.get(key, []) or []:
            try:
                b0 = _to_chicago(_parse_dt(w.get("start"), default_tz=client_tz))
                b1 = _to_chicago(_parse_dt(w.get("end"), default_tz=client_tz))
            except Exception:
                continue
            reserved_for_me = bool(w.get("reserved_for_me"))
            if reserved_for_me:
                continue
            busy.append((b0, b1))

    conflict = any(_overlaps(start, end, b0, b1) for b0, b1 in busy)
    if conflict:
        suggested = _find_next_free_slots(open_dt=open_dt, close_dt=close_dt, duration_minutes=duration_minutes, busy=busy)
        return {
            "ok": False,
            "reason": "That room is already booked for that time.",
            "can_waitlist": (not room_is_computer),
            "suggested_slots": suggested,
        }

    return {"ok": True, "can_waitlist": False, "suggested_slots": []}


@function_tool
def create_room_reservation(
    *,
    room_id: int,
    start_time_iso: str,
    end_time_iso: str,
    token: Optional[str] = None,
    base_url: Optional[str] = None,
    reminder_phone_number: Optional[str] = None,
) -> Dict[str, Any]:
    """Create a room reservation.

    Args:
        room_id: Room ID.
        start_time_iso: ISO-8601 datetime for start (timezone-aware recommended).
        end_time_iso: ISO-8601 datetime for end (timezone-aware recommended).
        token: JWT token (optional; falls back to env LIBRARY_API_TOKEN).
        base_url: API base URL (optional).
        reminder_phone_number: Optional phone number for reminders.
    """

    api = _normalize_api_base(base_url or _base_url())
    url = f"{api}/api/reservations/"
    payload: Dict[str, Any] = {"room": room_id, "start_time": start_time_iso, "end_time": end_time_iso}
    if reminder_phone_number is not None:
        payload["reminder_phone_number"] = reminder_phone_number
    resp = requests.post(url, headers=_auth_headers(token), json=payload, timeout=20)
    _raise_for_error(resp)
    return {"reservation": resp.json()}


@function_tool
def cancel_reservation(*, reservation_id: int, token: Optional[str] = None, base_url: Optional[str] = None) -> Dict[str, Any]:
    """Cancel a reservation (delete it).

    Args:
        reservation_id: Reservation ID.
        token: JWT token (optional; falls back to env LIBRARY_API_TOKEN).
        base_url: API base URL (optional).
    """

    api = _normalize_api_base(base_url or _base_url())
    url = f"{api}/api/reservations/{reservation_id}/"
    resp = requests.delete(url, headers=_auth_headers(token), timeout=20)
    _raise_for_error(resp)
    return {"ok": True, "reservation_id": reservation_id}


@function_tool
def join_waitlist(
    *,
    room_id: int,
    room_start_time_iso: Optional[str] = None,
    room_end_time_iso: Optional[str] = None,
    token: Optional[str] = None,
    base_url: Optional[str] = None,
) -> Dict[str, Any]:
    """Join the waitlist for a room.

    Args:
        room_id: Room ID.
        room_start_time_iso: Optional requested start time (ISO-8601 string).
        room_end_time_iso: Optional requested end time (ISO-8601 string).
        token: JWT token (optional; falls back to env LIBRARY_API_TOKEN).
        base_url: API base URL (optional).
    """

    api = _normalize_api_base(base_url or _base_url())
    url = f"{api}/api/waitlist/join/"
    payload: Dict[str, Any] = {"room_id": room_id}
    if room_start_time_iso is not None:
        payload["room_start_time"] = room_start_time_iso
    if room_end_time_iso is not None:
        payload["room_end_time"] = room_end_time_iso
    resp = requests.post(url, headers=_auth_headers(token), json=payload, timeout=20)
    _raise_for_error(resp)
    data = resp.json() if resp.headers.get("content-type", "").lower().startswith("application/json") else {}
    return {"waitlist": {"room_id": room_id}, **(data if isinstance(data, dict) else {"message": str(data)})}


@function_tool
def decline_waitlist(*, room_id: int, token: Optional[str] = None, base_url: Optional[str] = None) -> Dict[str, Any]:
    """Decline a waitlist notification (remove yourself from the notified spot).

    Args:
        room_id: Room ID.
        token: JWT token (optional; falls back to env LIBRARY_API_TOKEN).
        base_url: API base URL (optional).
    """

    api = _normalize_api_base(base_url or _base_url())
    url = f"{api}/api/waitlist/decline/"
    resp = requests.post(url, headers=_auth_headers(token), json={"room_id": room_id}, timeout=20)
    _raise_for_error(resp)
    data = resp.json() if resp.headers.get("content-type", "").lower().startswith("application/json") else {}
    return {"ok": True, "room_id": room_id, **(data if isinstance(data, dict) else {"message": str(data)})}


@function_tool
def create_equipment_checkout(
    *,
    equipment_item_id: int,
    token: Optional[str] = None,
    base_url: Optional[str] = None,
    reminder_phone_number: Optional[str] = None,
) -> Dict[str, Any]:
    """Checkout an equipment item.

    Args:
        equipment_item_id: Equipment item ID.
        token: JWT token (optional; falls back to env LIBRARY_API_TOKEN).
        base_url: API base URL (optional).
        reminder_phone_number: Optional phone number for reminders.
    """

    api = _normalize_api_base(base_url or _base_url())
    url = f"{api}/api/checkouts/"
    payload: Dict[str, Any] = {"item": equipment_item_id}
    if reminder_phone_number is not None:
        payload["reminder_phone_number"] = reminder_phone_number
    resp = requests.post(url, headers=_auth_headers(token), json=payload, timeout=20)
    _raise_for_error(resp)
    return {"checkout": resp.json()}


@function_tool
def return_equipment(
    *,
    checkout_id: int,
    returned_at_iso: Optional[str] = None,
    token: Optional[str] = None,
    base_url: Optional[str] = None,
) -> Dict[str, Any]:
    """Mark a checkout as returned.

    Args:
        checkout_id: Checkout ID.
        returned_at_iso: ISO-8601 datetime for return time (defaults to now in America/Chicago).
        token: JWT token (optional; falls back to env LIBRARY_API_TOKEN).
        base_url: API base URL (optional).
    """

    api = _normalize_api_base(base_url or _base_url())
    url = f"{api}/api/checkouts/{checkout_id}/"
    if not returned_at_iso:
        returned_at_iso = datetime.now(tz=ZoneInfo("America/Chicago")).isoformat()
    resp = requests.patch(url, headers=_auth_headers(token), json={"returned_at": returned_at_iso}, timeout=20)
    _raise_for_error(resp)
    return {"checkout": resp.json()}


@function_tool
def cancel_equipment(
    *,
    checkout_id: int,
    cancelled_at_iso: Optional[str] = None,
    token: Optional[str] = None,
    base_url: Optional[str] = None,
) -> Dict[str, Any]:
    """Cancel an equipment checkout (student-facing wording).

    Notes:
        This uses the same API behavior as returning equipment.
        In the UI/assistant wording, this represents cancelling an equipment checkout.
    """

    api = _normalize_api_base(base_url or _base_url())
    url = f"{api}/api/checkouts/{checkout_id}/"
    if not cancelled_at_iso:
        cancelled_at_iso = datetime.now(tz=ZoneInfo("America/Chicago")).isoformat()
    resp = requests.patch(url, headers=_auth_headers(token), json={"returned_at": cancelled_at_iso}, timeout=20)
    _raise_for_error(resp)
    return {"checkout": resp.json()}