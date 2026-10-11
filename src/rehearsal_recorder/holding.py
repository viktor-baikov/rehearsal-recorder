"""
Where a removed take, rehearsal or draft waits while its Undo can still
bring it back; and the take as it was before a crop, while the crop's can.

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
(put_back, or swap for a crop's files), or the Trash, or the _deleted
folder where there is no Trash (send_on). Nothing in this module deletes a
file, and a folder is only removed with rmdir, which refuses one that is
not empty. An entry's record is removed only once nothing is left in it, so
whatever is in an entry is always said by its record.

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

from rehearsal_recorder import platform_support

HOLDING_DIR = "_deleting"
RECORD_FILE = "record.json"
# An entry left waiting this long has outlived any notice: the window was
# reloaded, or the interface never said it ended. The next removal sends it on.
STALE_SEC = 120

# Eight hex characters: plenty for the handful waiting at once, and short,
# because a take's path inside it still has to fit under Windows' limit.
_TOKEN = re.compile(r"[0-9a-f]{8}")


def gone_text():
    """
    What Undo says once the item it was for has gone on, by the end of its
    notice or another: to the Trash, the Recycle Bin on Windows, or the
    _deleted folder where there is neither (platform_support.trash_name).
    The interface words it itself from the answer's "gone" (Api.undo_trash);
    this is the answer's "error", for whatever reads that.
    """
    kind = platform_support.trash_kind()
    went = "moved" if kind == "folder" else "gone"
    return f"It has already {went} to {platform_support.trash_name(kind)}."


# Why an entry whose record cannot be read is kept as it is.
UNREADABLE = "its record cannot be read"


class Gone(FileNotFoundError):
    """The entry is not there any more: it has gone on (gone_text), or an
    Undo or an end has put it back."""

    def __init__(self):
        super().__init__("It is not waiting for its Undo any more")


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


# ---------- the Undo of a crop ----------
#
# A crop's entry holds one folder: the take as it was before the crop, its
# files by their own names (with a notes file not yet made, and its clock,
# when there was one). Undo exchanges them for the files the crop made, which
# are in the take's places now: each cropped file moves into a second folder
# of the entry, and the uncut file of its name takes its place (swap). Only
# renames, each place asked again right before its move, so nothing is ever
# renamed over anything. Either way, what is where says how far an exchange
# got, so a broken-off one is finished, or taken back (unswap), from there.


def held(recordings: Path, token: str, i: int) -> Path | None:
    """Where item i of an entry is held, <entry>/<i>/<its own name>, or
    None without the entry or the item."""
    entry = _entry(recordings, token)
    items = (read(recordings, token) or {}).get("items") or []
    if entry is None or not 0 <= i < len(items) or not items[i].get("from"):
        return None
    return entry / str(i) / Path(items[i]["from"]).name


def _slot_for(data, place, recordings):
    """The index of the item recorded as coming from `place`, or the next
    one, with its relative path."""
    rel = _relative(place, recordings)
    items = data.get("items") or []
    for i, item in enumerate(items):
        if item.get("from") == rel:
            return i, rel
    return len(items), rel


def add(recordings: Path, token: str, place: Path) -> Path:
    """
    A new item of an entry: an empty folder named as `place`, and recorded
    as coming from there, which is where put_back would put it, whole. It is
    for what an exchange moves into the entry (swap). The record says so
    before the folder is made. An item already recorded as coming from
    `place` is the one answered, made again if need be. Raises Gone without
    the entry.
    """
    recordings = Path(recordings)
    entry = _entry(recordings, token)
    data = read(recordings, token)
    if entry is None or data is None:
        raise Gone()
    i, rel = _slot_for(data, place, recordings)
    items = list(data.get("items") or [])
    if i == len(items):
        _write(entry, {**data, "items": [*items, {"from": rel}]})
    folder = entry / str(i) / Path(rel).name
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def would_add(recordings: Path, token: str, place: Path) -> Path:
    """Where add() would make its folder, without making it or writing
    anything: for asking whether an exchange can be done before it starts."""
    recordings = Path(recordings)
    entry = _entry(recordings, token)
    data = read(recordings, token)
    if entry is None or data is None:
        raise Gone()
    i, rel = _slot_for(data, place, recordings)
    return entry / str(i) / Path(rel).name


def _in_entry(recordings, token, folder):
    entry = _entry(recordings, token)
    if entry is None or read(recordings, token) is None:
        raise Gone()
    folder = Path(folder)
    if folder.parent.parent != entry:
        raise ValueError(f"{folder} is not an item of the entry")
    return folder


def _swaps(recordings, token, inside, aside, pairs):
    """(the file in the entry, its place, where what is at its place goes)
    for each of `pairs` whose file is still in `inside`; a file at its place
    already is passed over. Raises FileExistsError("Something else is in its
    place now: …") for a place that is taken by what may not move aside."""
    recordings = Path(recordings)
    inside = _in_entry(recordings, token, inside)
    aside = _in_entry(recordings, token, aside)
    todo = []
    for name, place, displace in pairs:
        place = Path(place)
        _relative(place, recordings)
        src, out = inside / name, aside / name
        if not os.path.lexists(src):
            continue
        if os.path.lexists(place) and (not displace or os.path.lexists(out)):
            raise FileExistsError(f"Something else is in its place now: {place}")
        todo.append((src, place, out, displace))
    return todo


def check_swap(recordings: Path, token: str, inside: Path, aside: Path, pairs) -> None:
    """Raises as swap would before moving anything, and moves nothing."""
    _swaps(recordings, token, inside, aside, pairs)


def swap(recordings: Path, token: str, inside: Path, aside: Path, pairs,
         take_back: bool = True) -> None:
    """
    pairs: [(name, place, displace)]. The file `name` in the entry's folder
    `inside` goes to `place`; when something is at that place, and it may
    move (`displace`: the cropped file of that name), it first moves into
    the entry's folder `aside`, under the same name. A place that is taken
    by what may not move, or whose file has nowhere to go in `aside`, is
    refused before anything moves: FileExistsError("Something else is in
    its place now: {place}"). A file that is at its place already (an
    exchange broken off, done again) is passed over.

    A move that fails part way takes every pair back (unswap) and raises;
    should that fail too, Stuck says what would not go back, and where it
    is, and the caller's record carries on saying an exchange is under way.
    Without `take_back` it only raises, whatever moved staying where it is,
    for an exchange the caller's record says is under way to be done again.
    """
    todo = _swaps(recordings, token, inside, aside, pairs)
    try:
        for src, place, out, displace in todo:
            # Asked again right before each move: a rename onto a file that
            # is there replaces it without a word on macOS and Linux.
            if os.path.lexists(place):
                if not displace or os.path.lexists(out):
                    raise FileExistsError(f"Something else is in its place now: {place}")
                os.rename(place, out)
            place.parent.mkdir(parents=True, exist_ok=True)
            if os.path.lexists(place):
                raise FileExistsError(f"Something else is in its place now: {place}")
            os.rename(src, place)
    except OSError as e:
        if not take_back:
            raise
        try:
            unswap(recordings, token, inside, aside, pairs)
        except Stuck as again:
            raise Stuck(f"{e}; {again}") from e
        raise


def unswap(recordings: Path, token: str, inside: Path, aside: Path, pairs) -> None:
    """
    swap taken back, from wherever it got: a file that left `inside` (none
    of its name is there) and is at its place goes back in, and then the
    file of its name in `aside` back to that place. Each move only onto
    nothing. Raises Stuck naming each file that would not move, and where it
    is; the others are moved all the same.
    """
    inside = _in_entry(recordings, token, inside)
    aside = _in_entry(recordings, token, aside)
    stuck = []
    for name, place, displace in reversed(list(pairs)):
        place, src, out = Path(place), inside / name, aside / name
        try:
            if not os.path.lexists(src) and os.path.lexists(place):
                os.rename(place, src)
            if os.path.lexists(out):
                if os.path.lexists(place):
                    raise FileExistsError(f"Something else is in its place now: {place}")
                os.rename(out, place)
        except OSError as e:
            where = out if os.path.lexists(out) else place
            stuck.append(f"{name} could not be put back ({e}); it is in {where.parent}")
    if stuck:
        raise Stuck("; ".join(stuck))


def drop_empty(recordings: Path, token: str, folder: Path) -> None:
    """An item's folder in the entry, once nothing is in it, and the slot it
    is in: an exchange's folder left empty, so that nothing empty is sent on
    in its name. rmdir only: anything in it keeps it."""
    folder = _in_entry(recordings, token, folder)
    for p in (folder, folder.parent):
        try:
            p.rmdir()
        except OSError:
            return


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
                return {"ok": False, "error": res.get("error")
                        or f"Could not move it to {platform_support.trash_name()}"}
    if not _remove(entry):
        return {"ok": False, "error": f"Something is still in {entry}"}
    return {"ok": True}
