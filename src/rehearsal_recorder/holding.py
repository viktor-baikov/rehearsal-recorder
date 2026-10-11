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
removed with rmdir, which refuses one that is not empty. An entry's record
is removed only once nothing is left in it, so whatever is in an entry is
always said by its record.

File mechanics only: the database is api.py's, and so is which way an entry
goes. The record says whether the item's rows were dropped yet, and an entry
whose rows were never dropped goes back, never to the Trash (Api._end).
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

# What Undo says once the item it was for has gone on: to the Trash, or the
# _deleted folder where there is none, by the end of its notice or another.
GONE_TO_TRASH = "It has already gone to the Trash."


# Why an entry whose record cannot be read is kept as it is.
UNREADABLE = "its record cannot be read"


class Gone(FileNotFoundError):
    """The entry is not there any more: it has gone on (GONE_TO_TRASH)."""

    def __init__(self):
        super().__init__(GONE_TO_TRASH)


class Stuck(OSError):
    """put_back failed part way, and what it had put back would not all go
    back in: some of the entry is in its places now, the rest in the entry."""


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
    """record.json, written beside itself, on the disk, and only then moved
    into place, so a crash mid-write (or a power cut just after) leaves the
    old record or none, never half of one."""
    writing = entry / (RECORD_FILE + ".writing")
    with open(writing, "w", encoding="utf-8") as f:
        f.write(json.dumps(data, ensure_ascii=False, indent=1))
        f.flush()
        os.fsync(f.fileno())
    os.replace(writing, entry / RECORD_FILE)


def _remove(entry):
    """The entry once nothing of the user's is in it: its empty folders, then
    its record, then itself. rmdir only, so anything still in it stays, and
    so does the record saying what it is. Returns whether it is gone."""
    try:
        inside = [p for p in entry.iterdir()
                  if p.name not in (RECORD_FILE, RECORD_FILE + ".writing")]
    except FileNotFoundError:
        return True
    except OSError:
        return False  # what is in it cannot be told: the record stays
    left = False
    for p in inside:
        try:
            p.rmdir()  # a file, or a folder with anything in it, refuses
        except OSError:
            left = True
    if left:
        return False
    for name in (RECORD_FILE, RECORD_FILE + ".writing"):
        try:
            (entry / name).unlink()
        except FileNotFoundError:
            pass
    try:
        entry.rmdir()
    except OSError:
        return not entry.exists()
    try:
        entry.parent.rmdir()  # the holding folder itself, once it is empty
    except OSError:
        pass
    return True


def hold(recordings: Path, record: dict, paths: list[Path]) -> str:
    """
    Moves each of `paths` into a new entry, item i into
    <recordings>/_deleting/<token>/<i>/, and returns the token. The record
    is written first, saying where each item comes from, so an entry left by
    a crash part way still says what is in it.

    All or nothing: a move that fails puts back every item moved before it,
    removes the entry and raises the OSError. Should an item then refuse to
    go back too, the entry is kept with it inside, and the error says where
    it is. Its record still says where it came from, and the caller's record
    that its rows were never dropped, so the next end puts it back.
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
    try:
        _write(entry, {"record": record, "items": items, "time": time.time()})
    except BaseException:
        _remove(entry)  # nothing has moved in yet
        raise
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


def _todo(recordings, token, places):
    """(item in the entry, its place) for each item still in it: one put
    back already, or never moved in, is passed over. Raises Gone without the
    entry, and FileExistsError("Something else is in its place now: …")
    when a place is taken."""
    recordings = Path(recordings)
    entry = _entry(recordings, token)
    data = read(recordings, token)
    if entry is None or data is None:
        raise Gone()
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
    return todo


def check_places(recordings: Path, token: str, places: list[Path]) -> None:
    """Raises as put_back would before moving anything (Gone, or
    FileExistsError for a place taken), and moves nothing."""
    _todo(recordings, token, places)


def put_back(recordings: Path, token: str, places: list[Path]) -> None:
    """
    Moves item i of the entry to places[i] (its parent made if need be). The
    entry stays, with its record, until the caller drops it (drop): Undo
    drops it only once the rows are back too, so a crash in between leaves a
    record of what was under way. Refused before anything moves when a place
    is taken, with FileExistsError("Something else is in its place now:
    {place}"), and with Gone when the entry is gone. A move that fails part
    way takes back into the entry what it had put back, and raises; should
    one not go back in, Stuck says which, and where it is.
    """
    todo = _todo(recordings, token, places)
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
    except OSError as e:
        stuck = []
        for src, place in reversed(done):
            try:
                os.rename(place, src)
            except OSError as again:
                # It stays where it was going: back in its own place.
                stuck.append(f"{place.name} could not be taken back in ({again}); it is in {place}")
        if stuck:
            raise Stuck(f"{e}; " + "; ".join(stuck)) from e
        raise


def drop(recordings: Path, token: str) -> bool:
    """Removes an entry once nothing is left in it (put_back moved it all
    out), with its record. Anything still in it stays, record and all.
    Returns whether it is gone."""
    entry = _entry(recordings, token)
    if entry is None or not entry.is_dir():
        return True
    return _remove(entry)


def send_on(recordings: Path, token: str, trash) -> dict:
    """
    Sends every item of the entry on with trash(path, recordings) (Api passes
    platform_support.move_to_trash), then removes the entry. An item already
    gone counts as sent, so an entry a failure left part way is finished
    where it stopped. {"ok": True}, or {"ok": False, "error"} with the entry
    left as it is for the next start. An entry that is not there is nothing
    to do. One whose record cannot be read is never sent on: whether its
    rows were dropped cannot be told, and the Trash is the wrong way if not.
    """
    recordings = Path(recordings)
    entry = _entry(recordings, token)
    if entry is None or not entry.is_dir():
        return {"ok": True}
    data = read(recordings, token)
    if data is None:
        return {"ok": False, "error": UNREADABLE}
    slots = [entry / str(i) for i in range(len(data.get("items") or []))]
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
    if not _remove(entry):
        return {"ok": False, "error": f"Something is still in {entry}"}
    return {"ok": True}
