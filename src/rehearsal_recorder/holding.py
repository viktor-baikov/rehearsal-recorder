"""
Where a removed take, rehearsal or draft waits while its Undo can still
bring it back.

Removing something no longer asks first (B1 in
docs/superpowers/specs/2026-10-08-design-system-design.md): it is moved
out of the way at once, and the interface offers Undo for a few seconds.
The Trash cannot be that place. send2trash says nothing of where an item
went, and finding it again is a different fragile search on each system
(see design-system/plan/trash-flow.md), so the item first moves here:

    <recordings>/_deleting/<token>/<i>/<its own name>
    <recordings>/_deleting/<token>/record.json

A rename on the same drive, so a rehearsal of several GB moves at once. Each
item keeps its own name inside its numbered folder, so whatever finally
reaches the Trash is called what it was called. record.json says where each
item came from and when, with the caller's record of what it was (its rows,
for the database to take back). The folder is plainly named and visible, like
_drafts and _deleted, never inside a rehearsal or a drafts folder, so it is
neither mistaken for one nor lost track of.

Every way out of here ends in one of two places: back where it came from
(put_back), or the Trash, or the _deleted folder where there is no Trash
(send_on). Nothing in this module deletes a file, and a folder is only
removed with rmdir, which refuses one that is not empty.

File mechanics only: the database is api.py's.
"""

import json
import os
import re
import secrets
import time
from pathlib import Path

HOLDING_DIR = "_deleting"
RECORD_FILE = "record.json"
# An entry left waiting this long has outlived any notice: the window was
# reloaded, or the interface never said it ended. The next removal sends it on.
STALE_SEC = 120

# Eight hex characters: plenty for the handful waiting at once, and short,
# because a take's path inside it still has to fit under Windows' limit.
_TOKEN = re.compile(r"[0-9a-f]{8}")


def _entry(recordings, token):
    """The entry's folder, or None for anything that is not a token: tokens
    come back from the interface, and one must never name a path."""
    if not isinstance(token, str) or _TOKEN.fullmatch(token) is None:
        return None
    return Path(recordings) / HOLDING_DIR / token


def _relative(path, recordings):
    """`path` relative to the recordings folder, with forward slashes. A path
    outside it, the folder itself, and the holding folder or anything in it
    are refused (ValueError) before anything moves: the recordings folder
    would be moved into itself.

    The path is taken as it is spelled and not resolved, so a take folder
    that is a link is held as the link; only when the two spellings differ
    (a recordings folder reached through a link) are the parents resolved."""
    # normpath folds "a/../b", which would otherwise hide where it leads.
    path = Path(os.path.normpath(Path(path).absolute()))
    recordings = Path(os.path.normpath(Path(recordings).absolute()))
    try:
        rel = path.relative_to(recordings)
    except ValueError:
        try:
            rel = (path.parent.resolve() / path.name).relative_to(recordings.resolve())
        except ValueError:
            raise ValueError(f"{path} is not inside the recordings folder") from None
    if not rel.parts or rel.parts[0].casefold() == HOLDING_DIR.casefold():
        raise ValueError(f"{path} cannot be held")
    return rel.as_posix()


def _write(entry, data):
    """record.json, written beside itself and moved into place, so a crash
    mid-write leaves the old record or none, never half of one."""
    writing = entry / (RECORD_FILE + ".writing")
    writing.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    os.replace(writing, entry / RECORD_FILE)


def _remove(entry):
    """The entry once nothing of the user's is in it: its record, then its
    empty folders. rmdir only, so anything still in it stays."""
    for name in (RECORD_FILE, RECORD_FILE + ".writing"):
        try:
            (entry / name).unlink()
        except FileNotFoundError:
            pass
    try:
        slots = list(entry.iterdir())
    except OSError:
        slots = []
    for slot in slots:
        try:
            slot.rmdir()
        except OSError:
            pass
    try:
        entry.rmdir()
    except OSError:
        pass
    try:
        entry.parent.rmdir()  # the holding folder itself, once it is empty
    except OSError:
        pass


def hold(recordings: Path, record: dict, paths: list[Path]) -> str:
    """
    Moves each of `paths` into a new entry, item i into
    <recordings>/_deleting/<token>/<i>/, and returns the token. The record
    is written first, saying where each item comes from, so an entry left by
    a crash part way still says what is in it.

    All or nothing: a move that fails puts back every item moved before it,
    removes the entry and raises the OSError. Should an item then refuse to
    go back too, the entry is kept with it inside, and the error says where
    it is: it reaches the Trash with the entry, never nowhere.
    """
    recordings = Path(recordings)
    paths = [Path(p) for p in paths]
    items = [{"from": _relative(p, recordings)} for p in paths]
    root = recordings / HOLDING_DIR
    root.mkdir(exist_ok=True)
    while True:
        token = secrets.token_hex(4)
        entry = root / token
        try:
            entry.mkdir()
            break
        except FileExistsError:
            continue
    _write(entry, {"record": record, "items": items, "time": time.time()})
    moved = []
    try:
        for i, path in enumerate(paths):
            slot = entry / str(i)
            slot.mkdir()
            os.rename(path, slot / path.name)
            moved.append(i)
    except OSError as e:
        stuck = []
        for i in reversed(moved):
            src, back = entry / str(i) / paths[i].name, paths[i]
            try:
                if os.path.lexists(back):
                    raise FileExistsError(f"Something else is in its place now: {back}")
                os.rename(src, back)
            except OSError as again:
                stuck.append(f"{back.name} could not be put back ({again}); it is in {src.parent}")
        if stuck:
            raise OSError(f"{e}; " + "; ".join(stuck)) from e
        _remove(entry)
        raise
    return token


def read(recordings: Path, token: str) -> dict | None:
    """An entry's record.json, {"record", "items", "time"}, or None when
    there is no such entry or its record cannot be read."""
    entry = _entry(recordings, token)
    if entry is None:
        return None
    try:
        data = json.loads((entry / RECORD_FILE).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    return data if isinstance(data, dict) else None


def tokens(recordings: Path) -> list[str]:
    """Every entry waiting, oldest first."""
    root = Path(recordings) / HOLDING_DIR
    try:
        found = [p.name for p in root.iterdir()
                 if _TOKEN.fullmatch(p.name) and p.is_dir()]
    except OSError:
        return []

    def made(token):
        data = read(recordings, token) or {}
        try:
            return float(data.get("time") or 0)
        except (TypeError, ValueError):
            return 0.0

    return sorted(found, key=lambda t: (made(t), t))


def update(recordings: Path, token: str, record: dict) -> None:
    """Replaces the caller's record in an entry, leaving where its items came
    from and when: for what moved while it waited, such as a cloud copy."""
    entry = _entry(recordings, token)
    data = read(recordings, token)
    if entry is None or data is None:
        return
    _write(entry, {**data, "record": record})


def put_back(recordings: Path, token: str, places: list[Path]) -> None:
    """
    Moves item i of the entry to places[i] (its parent made if need be), then
    removes the entry. Refused before anything moves when a place is taken,
    with FileExistsError("Something else is in its place now: {place}"), and
    with FileNotFoundError when the entry is gone. A move that fails part way
    takes back into the entry what it had put back, and raises.
    """
    recordings = Path(recordings)
    entry = _entry(recordings, token)
    data = read(recordings, token)
    if entry is None or data is None:
        raise FileNotFoundError("It has already gone to the Trash.")
    items = data.get("items") or []
    if len(places) != len(items):
        raise ValueError(f"{len(items)} places are needed, not {len(places)}")
    todo = []
    for i, (item, place) in enumerate(zip(items, places)):
        src = entry / str(i) / Path(item["from"]).name
        if os.path.lexists(src):
            _relative(place, recordings)
            todo.append((src, Path(place)))
    for _, place in todo:
        if os.path.lexists(place):
            raise FileExistsError(f"Something else is in its place now: {place}")
    done = []
    try:
        for src, place in todo:
            place.parent.mkdir(parents=True, exist_ok=True)
            # Asked again right before the move: a rename onto a file that
            # is there replaces it without a word on macOS and Linux.
            if os.path.lexists(place):
                raise FileExistsError(f"Something else is in its place now: {place}")
            os.rename(src, place)
            done.append((src, place))
    except OSError:
        for src, place in reversed(done):
            try:
                os.rename(place, src)
            except OSError:
                pass  # it stays where it was going: back in its own place
        raise
    _remove(entry)


def send_on(recordings: Path, token: str, trash) -> dict:
    """
    Sends every item of the entry on with trash(path, recordings) (Api passes
    platform_support.move_to_trash), then removes the entry. An item already
    gone counts as sent, so an entry a failure left part way is finished
    where it stopped. {"ok": True}, or {"ok": False, "error"} with the entry
    left as it is for the next start. An entry that is not there is nothing
    to do.
    """
    recordings = Path(recordings)
    entry = _entry(recordings, token)
    if entry is None or not entry.is_dir():
        return {"ok": True}
    data = read(recordings, token)
    if data is not None:
        slots = [entry / str(i) for i in range(len(data.get("items") or []))]
    else:
        # A record that cannot be read: what the numbered folders hold is
        # still what was held.
        slots = sorted((p for p in entry.iterdir() if p.name.isdigit() and p.is_dir()),
                       key=lambda p: int(p.name))
    for slot in slots:
        try:
            inside = sorted(slot.iterdir()) if slot.is_dir() else []
        except OSError as e:
            return {"ok": False, "error": str(e)}
        for item in inside:
            try:
                res = trash(item, recordings)
            except Exception as e:  # noqa: BLE001 - the entry waits for the next start
                res = {"ok": False, "error": str(e)}
            if not res.get("ok"):
                return {"ok": False, "error": res.get("error") or "Could not move it to the Trash"}
    _remove(entry)
    return {"ok": True}
