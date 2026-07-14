import { useEffect, useRef, useState } from "react";
import "./Forms.css";

const API_BASE = "https://user-profile-creation-backend.onrender.com/api/users";
// When you deploy, swap to your Render URL, e.g.:
// const API_BASE = "https://user-creation-backend.onrender.com/api/users";

function Form() {
  const [userId, setUserId] = useState(localStorage.getItem("profileUserId") || null);
  const [form, setForm] = useState({ name: "", email: "", age: "", username: "", bio: "" });
  const [avatarUrl, setAvatarUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      if (userId) {
        try {
          const res = await fetch(`${API_BASE}/${userId}`);
          if (res.ok) {
            applyUser(await res.json());
            return;
          }
        } catch (err) {
          console.error(err);
        }
      }
      try {
        const res = await fetch(API_BASE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "", email: "", age: "", username: "", bio: "" }),
        });
        const user = await res.json();
        if (res.ok) {
          localStorage.setItem("profileUserId", user._id);
          setUserId(user._id);
          applyUser(user);
        }
      } catch (err) {
        console.error(err);
        setStatus("Could not connect to server. Is the backend running?");
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyUser = (user) => {
    setForm({
      name: user.name || "",
      email: user.email || "",
      age: user.age ?? "",
      username: user.username || "",
      bio: user.bio || "",
    });
    setAvatarUrl(user.avatarUrl || "");
    setCoverUrl(user.coverUrl || "");
  };

  const resolveUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${API_BASE.replace("/api/users", "")}${url}`;
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const flashStatus = (msg) => {
    setStatus(msg);
    setTimeout(() => setStatus(""), 3000);
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        age: form.age === "" ? undefined : Number(form.age),
      };
      const res = await fetch(`${API_BASE}/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        flashStatus(data.error || "Something went wrong");
      } else {
        applyUser(data);
        flashStatus("Profile saved");
      }
    } catch (err) {
      console.error(err);
      flashStatus("Could not connect to server.");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (file, kind) => {
    if (!file || !userId) return;
    const formData = new FormData();
    formData.append(kind, file);
    flashStatus(`Uploading ${kind}...`);
    try {
      const res = await fetch(`${API_BASE}/${userId}/${kind}`, { method: "PUT", body: formData });
      const data = await res.json();
      if (!res.ok) return flashStatus(data.error || "Upload failed");
      applyUser(data);
      flashStatus(`${kind === "avatar" ? "Photo" : "Cover"} updated`);
    } catch (err) {
      console.error(err);
      flashStatus("Could not connect to server.");
    }
  };

  const handleDeleteAvatar = async () => {
    if (!userId) return;
    try {
      const res = await fetch(`${API_BASE}/${userId}/avatar`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        applyUser(data);
        flashStatus("Photo removed");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return setResults([]);
    setSearching(true);
    try {
      const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      setResults(res.ok ? data : []);
    } catch (err) {
      console.error(err);
      flashStatus("Search failed.");
    } finally {
      setSearching(false);
    }
  };

  const handleLoadProfile = (id) => {
    localStorage.setItem("profileUserId", id);
    setUserId(id);
    setResults([]);
    setQuery("");
    fetch(`${API_BASE}/${id}`)
      .then((res) => res.json())
      .then(applyUser)
      .catch(console.error);
  };

  const handleDeleteProfile = async (id) => {
    if (!window.confirm("Delete this profile permanently?")) return;
    try {
      const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
      if (res.ok) {
        setResults(results.filter((u) => u._id !== id));
        flashStatus("Profile deleted");
        if (id === userId) {
          localStorage.removeItem("profileUserId");
          setUserId(null);
          setForm({ name: "", email: "", age: "", username: "", bio: "" });
          setAvatarUrl("");
          setCoverUrl("");
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="profile-page">
      <div className="search-card">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search profiles by name, username, or email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" disabled={searching}>
            {searching ? "Searching..." : "Search"}
          </button>
        </form>
        {results.length > 0 && (
          <ul className="search-results">
            {results.map((u) => (
              <li key={u._id}>
                <span>{u.username || u.name || u.email || "Unnamed profile"}</span>
                <div className="search-actions">
                  <button type="button" onClick={() => handleLoadProfile(u._id)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => handleDeleteProfile(u._id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="profile-card">
        <div
          className="profile-cover"
          style={coverUrl ? { backgroundImage: `url(${resolveUrl(coverUrl)})` } : undefined}
        >
          <button
            type="button"
            className="icon-btn cover-btn"
            onClick={() => coverInputRef.current?.click()}
            aria-label="Change cover photo"
          >
            <CameraIcon />
          </button>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => handleFileUpload(e.target.files[0], "cover")}
          />

          <div className="profile-avatar-wrap">
            <div className="profile-avatar">
              {avatarUrl ? (
                <img src={resolveUrl(avatarUrl)} alt="Avatar" />
              ) : (
                <div className="avatar-placeholder" />
              )}
            </div>
            <button
              type="button"
              className="icon-btn avatar-btn"
              onClick={() => avatarInputRef.current?.click()}
              aria-label="Change avatar"
            >
              <CameraIcon small />
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => handleFileUpload(e.target.files[0], "avatar")}
            />
          </div>
        </div>

        <div className="profile-body">
          <div className="profile-header">
            <div>
              <h2>Profile</h2>
              <p className="profile-subtitle">Update your photo and personal details</p>
            </div>
            <button type="button" className="save-btn" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>

          {status && <div className="profile-status">{status}</div>}

          <div className="profile-row">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Full name"
              value={form.name}
              onChange={handleChange}
            />
          </div>

          <div className="profile-row">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="your.email@domain.com"
              value={form.email}
              onChange={handleChange}
            />
          </div>

          <div className="profile-row">
            <label htmlFor="age">Age</label>
            <input
              id="age"
              name="age"
              type="number"
              min="0"
              max="120"
              placeholder="Age"
              value={form.age}
              onChange={handleChange}
            />
          </div>

          <div className="profile-row">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="Name"
              value={form.username}
              onChange={handleChange}
            />
          </div>

          <div className="profile-row">
            <div>
              <label>Your Photo</label>
              <p className="profile-hint">Update your photo and personal details.</p>
            </div>
            <div className="photo-field">
              <div className="photo-thumb" onClick={() => avatarInputRef.current?.click()}>
                {avatarUrl ? <img src={resolveUrl(avatarUrl)} alt="Your avatar" /> : <CameraIcon />}
              </div>
              <div className="photo-actions">
                <button type="button" className="link-btn" onClick={handleDeleteAvatar}>
                  Delete
                </button>
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  Update
                </button>
              </div>
            </div>
          </div>

          <div className="profile-row profile-row-bio">
            <div>
              <label htmlFor="bio">Your Bio</label>
              <p className="profile-hint">Write a short introduction.</p>
            </div>
            <textarea
              id="bio"
              name="bio"
              placeholder="Add a short bio..."
              maxLength={280}
              value={form.bio}
              onChange={handleChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function CameraIcon({ small }) {
  const size = small ? 14 : 18;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="14" r="3.2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export default Form;
