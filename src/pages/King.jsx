import { useMemo, useState } from "react";

const API_URL = "https://kitchenbrain.cucina656.workers.dev";
const TYPES = [
  ["love", "Meet Someone", "Love profiles and matching"],
  ["walk", "Walk Together", "Walks and people interested"],
  ["money", "Make Money Together", "Missions and Mission Rooms"],
];
const ITEM_STATUSES = ["active", "paused", "matched", "closed", "hidden"];
const ROOM_STATUSES = ["team_forming", "talking", "ready_to_meet", "meeting_planned", "closed"];
const MATCH_STATUSES = ["pending", "approved", "rejected", "closed"];

async function kingApi(path, pin, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("X-King-Pin", String(pin || "").trim());
  if (options.body) headers.set("Content-Type", "application/json");

  const response = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(
      data.error || data.message || `Request failed (${response.status})`
    );
  }

  return data;
}

const count = (overview, type) =>
  Object.values(overview?.counts?.[type] || {}).reduce(
    (sum, n) => sum + Number(n || 0),
    0
  );

const titleCase = (value) =>
  String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const waLink = (phone) =>
  `https://wa.me/${String(phone || "").replace(/\D/g, "")}`;

function DataRows({ data }) {
  const rows = Object.entries(data || {}).filter(
    ([, value]) => value !== "" && value != null
  );

  if (!rows.length) {
    return <p className="muted">No extra data.</p>;
  }

  return (
    <div className="dataRows">
      {rows.map(([key, value]) => (
        <div className="dataRow" key={key}>
          <span>{titleCase(key)}</span>
          <b>
            {typeof value === "object"
              ? JSON.stringify(value)
              : String(value)}
          </b>
        </div>
      ))}
    </div>
  );
}

export default function King() {
  const [pin, setPin] = useState("");
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("love");
  const [overview, setOverview] = useState(null);
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState({});
  const [walkPanel, setWalkPanel] = useState(null);
  const [roomPanel, setRoomPanel] = useState(null);
  const [loveMatches, setLoveMatches] = useState([]);
  const [matchForm, setMatchForm] = useState({
    a: "",
    b: "",
    revealA: false,
    revealB: false,
    status: "pending",
    note: "",
  });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;

    return items.filter((item) =>
      [
        item.creator_name,
        item.location,
        item.creator_whatsapp,
        item.status,
      ].some((value) =>
        String(value || "").toLowerCase().includes(query)
      )
    );
  }, [items, search]);

  async function load(nextType = type) {
    if (!pin.trim()) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const jobs = [
        kingApi("/api/king/overview", pin),
        kingApi(
          `/api/king/items?type=${encodeURIComponent(nextType)}&limit=100`,
          pin
        ),
      ];

      if (nextType === "love") {
        jobs.push(kingApi("/api/king/love/matches", pin));
      }

      const [summary, list, matches] = await Promise.all(jobs);

      setOverview(summary);
      setItems(list.items || []);
      setDrafts(
        Object.fromEntries(
          (list.items || []).map((item) => [
            item.id,
            {
              status: item.status || "active",
              group_url: item.group_url || "",
              admin_note: item.admin_note || "",
            },
          ])
        )
      );

      if (nextType === "love") {
        setLoveMatches(matches?.matches || []);
      }

      setType(nextType);
      setOpen(true);
    } catch (err) {
      setOpen(false);
      setError(err.message || "Could not open King.");
    } finally {
      setBusy(false);
    }
  }

  const setDraft = (id, key, value) => {
    setDrafts((current) => ({
      ...current,
      [id]: {
        ...(current[id] || {}),
        [key]: value,
      },
    }));
  };

  async function saveItem(item) {
    const draft = drafts[item.id] || {};

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await kingApi("/api/king/item", pin, {
        method: "PATCH",
        body: JSON.stringify({
          id: item.id,
          status: draft.status || item.status,
          group_url: draft.group_url ?? item.group_url ?? "",
          admin_note: draft.admin_note ?? item.admin_note ?? "",
        }),
      });

      await load(type);
      setNotice("Saved.");
    } catch (err) {
      setError(err.message || "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(item) {
    if (
      !window.confirm(
        `Delete ${item.creator_name || "this item"} permanently?`
      )
    ) {
      return;
    }

    setBusy(true);
    setError("");

    try {
      await kingApi("/api/king/item", pin, {
        method: "DELETE",
        body: JSON.stringify({ id: item.id }),
      });

      await load(type);
      setNotice("Deleted.");
    } catch (err) {
      setError(err.message || "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  async function showWalk(item) {
    setBusy(true);
    setError("");

    try {
      const data = await kingApi(
        `/api/king/walk/interests?walk_id=${encodeURIComponent(item.id)}`,
        pin
      );

      setWalkPanel({
        item,
        interests: data.interests || [],
      });
    } catch (err) {
      setError(err.message || "Could not load interests.");
    } finally {
      setBusy(false);
    }
  }

  async function showRoom(item) {
    setBusy(true);
    setError("");

    try {
      const data = await kingApi(
        `/api/king/money/room?mission_id=${encodeURIComponent(item.id)}`,
        pin
      );

      setRoomPanel(data);
    } catch (err) {
      setError(err.message || "Could not open Mission Room.");
    } finally {
      setBusy(false);
    }
  }

  async function changeRoomStatus(status) {
    if (!roomPanel?.mission?.id) return;

    setBusy(true);
    setError("");

    try {
      await kingApi("/api/king/money/room/status", pin, {
        method: "PATCH",
        body: JSON.stringify({
          mission_id: roomPanel.mission.id,
          status,
        }),
      });

      setNotice("Mission Room updated.");
      await showRoom(roomPanel.mission);
    } catch (err) {
      setError(err.message || "Room update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function createMatch(event) {
    event.preventDefault();

    if (
      !matchForm.a ||
      !matchForm.b ||
      matchForm.a === matchForm.b
    ) {
      setError("Choose two different people.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      await kingApi("/api/king/love/match", pin, {
        method: "POST",
        body: JSON.stringify({
          profile_a_id: matchForm.a,
          profile_b_id: matchForm.b,
          reveal_to_a: matchForm.revealA,
          reveal_to_b: matchForm.revealB,
          status: matchForm.status,
          admin_note: matchForm.note,
        }),
      });

      setMatchForm({
        a: "",
        b: "",
        revealA: false,
        revealB: false,
        status: "pending",
        note: "",
      });

      await load("love");
      setNotice("Match saved.");
    } catch (err) {
      setError(err.message || "Could not save match.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <main className="king login">
        <style>{CSS}</style>

        <section className="loginCard">
          <div className="mark">K</div>
          <div className="eyebrow">GWAMO CONNECT CONTROL</div>
          <h1>King</h1>
          <p>
            Private control center for Connect. This page is separate
            from the normal Gwamo admin.
          </p>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              load("love");
            }}
          >
            <label>King PIN</label>
            <input
              type="password"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              placeholder="Enter private PIN"
              autoFocus
            />

            <button
              className="primary"
              disabled={busy || !pin.trim()}
            >
              {busy ? "Checking..." : "Enter King"}
            </button>
          </form>

          {error && <div className="alert error">{error}</div>}
        </section>
      </main>
    );
  }

  return (
    <main className="king">
      <style>{CSS}</style>

      <header className="topbar">
        <div>
          <div className="eyebrow">GWAMO CONNECT CONTROL</div>
          <h1>King</h1>
          <p>Manage people, matches, walks and money missions.</p>
        </div>

        <div className="headBtns">
          <button onClick={() => load(type)} disabled={busy}>
            Refresh
          </button>

          <button
            onClick={() => {
              setOpen(false);
              setPin("");
              setItems([]);
              setOverview(null);
            }}
          >
            Lock
          </button>
        </div>
      </header>

      <section className="stats">
        {TYPES.map(([key, label]) => (
          <button
            className={`stat ${type === key ? "active" : ""}`}
            key={key}
            onClick={() => load(key)}
          >
            <span>{label}</span>
            <strong>{count(overview, key)}</strong>
            <small>{overview?.counts?.[key]?.active || 0} active</small>
          </button>
        ))}

        <div className="stat passive">
          <span>Mission Rooms</span>
          <strong>
            {Object.values(overview?.money_rooms || {}).reduce(
              (a, b) => a + Number(b || 0),
              0
            )}
          </strong>
          <small>all room states</small>
        </div>
      </section>

      <section className="guide">
        <b>How to manage:</b>
        <span>
          <strong>Meet Someone:</strong> use Match Desk to pair two
          people and choose what private details each person can see.
        </span>
        <span>
          <strong>Walk Together:</strong> open View interests, add the
          group link, then Save.
        </span>
        <span>
          <strong>Make Money:</strong> open Mission Room to see
          members/messages and move the room progress.
        </span>
      </section>

      <section className="toolbar">
        <div>
          <h2>{TYPES.find((entry) => entry[0] === type)?.[1]}</h2>
          <p>{TYPES.find((entry) => entry[0] === type)?.[2]}</p>
        </div>

        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, location, phone..."
        />
      </section>

      {error && <div className="alert error">{error}</div>}
      {notice && <div className="alert notice">{notice}</div>}

      {type === "love" && (
        <section className="matchDesk">
          <div>
            <h3>Match Desk</h3>
            <p>
              Choose two people. You control when private details are
              revealed.
            </p>
          </div>

          <form onSubmit={createMatch}>
            <select
              value={matchForm.a}
              onChange={(event) =>
                setMatchForm({
                  ...matchForm,
                  a: event.target.value,
                })
              }
            >
              <option value="">Choose Person A</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.creator_name || "Unnamed"} -{" "}
                  {item.location || "No location"}
                </option>
              ))}
            </select>

            <select
              value={matchForm.b}
              onChange={(event) =>
                setMatchForm({
                  ...matchForm,
                  b: event.target.value,
                })
              }
            >
              <option value="">Choose Person B</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.creator_name || "Unnamed"} -{" "}
                  {item.location || "No location"}
                </option>
              ))}
            </select>

            <select
              value={matchForm.status}
              onChange={(event) =>
                setMatchForm({
                  ...matchForm,
                  status: event.target.value,
                })
              }
            >
              {MATCH_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {titleCase(status)}
                </option>
              ))}
            </select>

            <label className="check">
              <input
                type="checkbox"
                checked={matchForm.revealA}
                onChange={(event) =>
                  setMatchForm({
                    ...matchForm,
                    revealA: event.target.checked,
                  })
                }
              />
              Reveal B details to A
            </label>

            <label className="check">
              <input
                type="checkbox"
                checked={matchForm.revealB}
                onChange={(event) =>
                  setMatchForm({
                    ...matchForm,
                    revealB: event.target.checked,
                  })
                }
              />
              Reveal A details to B
            </label>

            <input
              value={matchForm.note}
              onChange={(event) =>
                setMatchForm({
                  ...matchForm,
                  note: event.target.value,
                })
              }
              placeholder="Private admin note"
            />

            <button className="primary" disabled={busy}>
              Save Match
            </button>
          </form>

          {!!loveMatches.length && (
            <details>
              <summary>Existing matches ({loveMatches.length})</summary>

              <div className="matchList">
                {loveMatches.map((match) => (
                  <div key={match.id}>
                    <b>
                      {match.profile_a_name || "Person A"} +{" "}
                      {match.profile_b_name || "Person B"}
                    </b>

                    <span>
                      {titleCase(match.status)} | reveal A:{" "}
                      {match.reveal_to_a ? "yes" : "no"} | reveal B:{" "}
                      {match.reveal_to_b ? "yes" : "no"}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </section>
      )}

      <section className="grid">
        {!busy && !filtered.length && (
          <div className="empty">Nothing here yet.</div>
        )}

        {filtered.map((item) => {
          const draft = drafts[item.id] || {};

          return (
            <article className="card" key={item.id}>
              <div className="person">
                <img
                  src={item.creator_photo_url || "/favicon.ico"}
                  alt=""
                />

                <div>
                  <h3>{item.creator_name || "Unnamed"}</h3>
                  <p>{item.location || "Location not set"}</p>
                </div>

                <span
                  className={`status ${item.status || "active"}`}
                >
                  {titleCase(item.status || "active")}
                </span>
              </div>

              <div className="quick">
                {item.creator_whatsapp && (
                  <a
                    href={waLink(item.creator_whatsapp)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp {item.creator_whatsapp}
                  </a>
                )}

                {item.group_url && (
                  <a
                    href={item.group_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open group
                  </a>
                )}
              </div>

              <details open={type === "love"}>
                <summary>Profile details</summary>
                <DataRows data={item.public_data} />
              </details>

              <details open={type === "love"}>
                <summary>Private admin data</summary>
                <DataRows data={item.private_data} />
              </details>

              <div className="manage">
                <label>
                  Status
                  <select
                    value={
                      draft.status || item.status || "active"
                    }
                    onChange={(event) =>
                      setDraft(
                        item.id,
                        "status",
                        event.target.value
                      )
                    }
                  >
                    {ITEM_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {titleCase(status)}
                      </option>
                    ))}
                  </select>
                </label>

                {type === "walk" && (
                  <label>
                    WhatsApp group URL
                    <input
                      value={
                        draft.group_url ??
                        item.group_url ??
                        ""
                      }
                      onChange={(event) =>
                        setDraft(
                          item.id,
                          "group_url",
                          event.target.value
                        )
                      }
                      placeholder="https://..."
                    />
                  </label>
                )}

                <label>
                  Admin note
                  <textarea
                    value={
                      draft.admin_note ??
                      item.admin_note ??
                      ""
                    }
                    onChange={(event) =>
                      setDraft(
                        item.id,
                        "admin_note",
                        event.target.value
                      )
                    }
                    placeholder="Only King can see this"
                  />
                </label>

                <div className="actions">
                  <button
                    className="primary"
                    onClick={() => saveItem(item)}
                    disabled={busy}
                  >
                    Save
                  </button>

                  {type === "walk" && (
                    <button
                      onClick={() => showWalk(item)}
                      disabled={busy}
                    >
                      View interests
                    </button>
                  )}

                  {type === "money" && (
                    <button
                      onClick={() => showRoom(item)}
                      disabled={busy}
                    >
                      Open Mission Room
                    </button>
                  )}

                  <button
                    className="danger"
                    onClick={() => remove(item)}
                    disabled={busy}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {walkPanel && (
        <div
          className="modal"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setWalkPanel(null);
            }
          }}
        >
          <section className="panel">
            <button
              className="close"
              onClick={() => setWalkPanel(null)}
            >
              X
            </button>

            <div className="eyebrow">WALK TOGETHER</div>
            <h2>
              {walkPanel.item.creator_name || "Walk"} - Interests
            </h2>

            {!walkPanel.interests.length ? (
              <p className="muted">
                No one has shown interest yet.
              </p>
            ) : (
              <div className="list">
                {walkPanel.interests.map((interest) => (
                  <div
                    className="listRow"
                    key={interest.id || interest.created_at}
                  >
                    <img
                      src={
                        interest.member_photo_url ||
                        "/favicon.ico"
                      }
                      alt=""
                    />

                    <div>
                      <b>
                        {interest.member_name || "Unnamed"}
                      </b>
                      <span>
                        {interest.member_whatsapp ||
                          interest.created_at ||
                          ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {roomPanel && (
        <div
          className="modal"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setRoomPanel(null);
            }
          }}
        >
          <section className="panel wide">
            <button
              className="close"
              onClick={() => setRoomPanel(null)}
            >
              X
            </button>

            <div className="eyebrow">
              MAKE MONEY TOGETHER
            </div>
            <h2>Mission Room</h2>

            <p>
              {roomPanel.mission?.creator_name || "Mission"} |{" "}
              {titleCase(roomPanel.room?.status)}
            </p>

            <label className="roomStatus">
              Room progress
              <select
                value={
                  roomPanel.room?.status || "team_forming"
                }
                onChange={(event) =>
                  changeRoomStatus(event.target.value)
                }
              >
                {ROOM_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {titleCase(status)}
                  </option>
                ))}
              </select>
            </label>

            <h3>Members</h3>
            <div className="list">
              {(roomPanel.room?.members || []).map((member) => (
                <div className="listRow" key={member.id}>
                  <div>
                    <b>
                      {member.name || "Unnamed"} ({member.role})
                    </b>
                    <span>{member.whatsapp || ""}</span>
                  </div>
                </div>
              ))}
            </div>

            <h3>Messages</h3>

            <div className="messages">
              {(roomPanel.room?.messages || []).length ? (
                roomPanel.room.messages.map((message) => (
                  <div key={message.id}>
                    <b>
                      {message.member_name || "Member"}
                    </b>
                    <p>
                      {message.message || message.text || ""}
                    </p>
                    <small>{message.created_at || ""}</small>
                  </div>
                ))
              ) : (
                <p className="muted">No messages yet.</p>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

const CSS = `
*{box-sizing:border-box}
.king{width:100vw;max-width:none;min-height:100vh;margin-left:calc(50% - 50vw);margin-right:calc(50% - 50vw);background:#050810;color:#f7f9fc;font-family:Inter,"Segoe UI",Arial,sans-serif;padding:32px}
.king button,.king input,.king select,.king textarea{font:inherit}
.king button{cursor:pointer}
.login{display:grid;place-items:center;background:radial-gradient(circle at 50% 20%,#12244b 0,#060a13 38%,#03050a 100%)}
.loginCard{width:min(460px,94vw);padding:38px;border:1px solid #263247;border-radius:22px;background:#0b111d;box-shadow:0 30px 80px #0009}
.mark{width:54px;height:54px;border-radius:16px;display:grid;place-items:center;background:#1677ff;font-size:26px;font-weight:900;margin-bottom:20px}
.eyebrow{font-size:12px;letter-spacing:.14em;color:#7fa9ff;font-weight:800}
.login h1,.topbar h1{font-size:38px;margin:6px 0}
.login p,.topbar p,.toolbar p{color:#94a3b8}
.login form{display:grid;gap:10px;margin-top:24px}
.king input,.king select,.king textarea{width:100%;border:1px solid #29364b;background:#0a101b;color:#fff;border-radius:11px;padding:11px 12px;outline:none}
.king textarea{min-height:76px;resize:vertical}
.king input:focus,.king select:focus,.king textarea:focus{border-color:#438dff;box-shadow:0 0 0 3px #1677ff22}
.king button{border:1px solid #2b3b54;background:#101827;color:#eef5ff;border-radius:10px;padding:10px 14px;font-weight:700}
.king button:hover{border-color:#4b78b8}
.king button:disabled{opacity:.5;cursor:not-allowed}
.king .primary{background:#1677ff;border-color:#1677ff;color:#fff}
.king .danger{background:#2a1117;border-color:#6b2632;color:#ffb9c3}
.topbar{max-width:1500px;margin:auto;display:flex;align-items:flex-end;justify-content:space-between;gap:24px;padding-bottom:24px}
.headBtns{display:flex;gap:10px}
.stats{max-width:1500px;margin:0 auto 24px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.stat{min-height:112px!important;text-align:left!important;padding:18px!important;background:#0b111d!important;border:1px solid #202b3d!important;border-radius:16px!important}
.stat span,.stat small{display:block;color:#9aa8ba}
.stat strong{display:block;font-size:34px;margin:7px 0;color:white}
.stat.active{border-color:#247dff!important;box-shadow:inset 0 0 0 1px #247dff55}
.stat.passive{cursor:default}
.guide{max-width:1500px;margin:0 auto 18px;padding:14px 16px;border:1px solid #24344d;border-radius:14px;background:#091322;display:flex;flex-wrap:wrap;gap:10px 22px;color:#aebed2;font-size:13px}
.guide>b{color:#fff}
.guide strong{color:#d9e8ff}
.toolbar{max-width:1500px;margin:0 auto 18px;display:flex;align-items:end;justify-content:space-between;gap:20px}
.toolbar h2{font-size:26px;margin:0 0 4px}
.toolbar p{margin:0}
.toolbar input{max-width:360px}
.alert{max-width:1500px;margin:0 auto 14px;padding:12px 14px;border-radius:10px}
.error{background:#31151b;border:1px solid #6b2632;color:#ffd4da}
.notice{background:#0d2b22;border:1px solid #1f6b51;color:#c7ffe9}
.matchDesk{max-width:1500px;margin:0 auto 20px;padding:18px;border:1px solid #26364e;border-radius:16px;background:#0a111d}
.matchDesk h3{margin:0 0 4px}
.matchDesk p{margin:0;color:#9aa8ba}
.matchDesk form{display:grid;grid-template-columns:1.4fr 1.4fr .9fr 1.2fr 1.2fr 1.2fr auto;gap:10px;align-items:center;margin-top:14px}
.check{display:flex;gap:8px;align-items:center;font-size:13px;color:#cbd5e1}
.check input{width:auto}
.matchDesk details{margin-top:14px}
.matchList{display:grid;gap:8px;margin-top:10px}
.matchList>div{display:flex;justify-content:space-between;gap:20px;padding:10px;background:#0e1725;border-radius:10px}
.matchList span{color:#9aa8ba}
.grid{max-width:1500px;margin:auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}
.card{border:1px solid #202c3e;border-radius:17px;background:#0a101a;padding:18px;box-shadow:0 12px 30px #0003}
.person{display:grid;grid-template-columns:58px 1fr auto;align-items:center;gap:13px}
.person img{width:58px;height:58px;border-radius:50%;object-fit:cover;background:#101827}
.person h3{font-size:18px;margin:0 0 3px}
.person p{margin:0;color:#94a3b8}
.status{font-size:11px;padding:6px 9px;border-radius:999px;background:#162033;color:#bcd0ee;text-transform:uppercase}
.status.active{background:#0d3026;color:#8fffcf}
.status.hidden,.status.closed{background:#2b1820;color:#ffb7c3}
.status.paused{background:#34280e;color:#ffd97a}
.quick{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}
.quick a{color:#8dc0ff;text-decoration:none;background:#101b2c;padding:7px 10px;border-radius:9px}
.card details{border-top:1px solid #1c2737;padding:11px 0}
.card summary{cursor:pointer;font-weight:700;color:#cbd7e7}
.dataRows{display:grid;gap:7px;margin-top:9px}
.dataRow{display:grid;grid-template-columns:150px 1fr;gap:12px;font-size:13px}
.dataRow span{color:#8f9caf}
.dataRow b{font-weight:600;word-break:break-word}
.manage{border-top:1px solid #1d2a3b;padding-top:13px;display:grid;gap:10px}
.manage label{display:grid;gap:6px;color:#9aa8ba;font-size:12px;font-weight:700}
.actions{display:flex;flex-wrap:wrap;gap:8px}
.empty{grid-column:1/-1;padding:60px;text-align:center;border:1px dashed #2a3850;border-radius:18px;color:#8fa0b5}
.muted{color:#8f9caf}
.modal{position:fixed;inset:0;z-index:9999;background:#000b;display:grid;place-items:center;padding:24px}
.panel{position:relative;width:min(680px,96vw);max-height:88vh;overflow:auto;background:#0b121e;border:1px solid #2a3a52;border-radius:20px;padding:24px;box-shadow:0 30px 100px #000}
.panel.wide{width:min(960px,96vw)}
.close{position:absolute;right:16px;top:16px}
.list{display:grid;gap:8px}
.listRow{display:flex;gap:12px;align-items:center;padding:10px;border-radius:10px;background:#101927}
.listRow img{width:44px;height:44px;border-radius:50%;object-fit:cover}
.listRow b,.listRow span{display:block}
.listRow span{color:#91a1b5;font-size:13px}
.roomStatus{display:grid;gap:6px;max-width:300px;margin:15px 0}
.messages{display:grid;gap:9px}
.messages>div{background:#101927;padding:11px;border-radius:10px}
.messages p{margin:5px 0}
.messages small{color:#7f8ea3}
@media(max-width:1050px){
  .stats{grid-template-columns:repeat(2,1fr)}
  .grid{grid-template-columns:1fr}
  .matchDesk form{grid-template-columns:1fr 1fr}
  .matchDesk form .primary{grid-column:1/-1}
}
@media(max-width:700px){
  .king{padding:16px}
  .topbar{align-items:flex-start}
  .topbar h1{font-size:30px}
  .stats{grid-template-columns:1fr 1fr;gap:9px}
  .stat{min-height:92px!important;padding:13px!important}
  .stat strong{font-size:27px}
  .toolbar{display:grid}
  .toolbar input{max-width:none}
  .matchDesk form{grid-template-columns:1fr}
  .matchDesk form .primary{grid-column:auto}
  .person{grid-template-columns:50px 1fr}
  .person img{width:50px;height:50px}
  .status{grid-column:2}
  .dataRow{grid-template-columns:1fr}
  .actions button{flex:1 1 130px}
  .modal{padding:10px}
  .panel{padding:20px 15px}
  .headBtns{flex-direction:column}
}
`;

