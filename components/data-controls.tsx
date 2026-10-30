"use client";

import { useState, useTransition } from "react";
import { deleteEverythingAction, exportAllClient } from "@/app/actions";

export function DataControls() {
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const download = () => {
    startTransition(async () => {
      const json = await exportAllClient();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `shortlist-export-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage("Export downloaded.");
    });
  };

  return (
    <div className="card card-pad">
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn" type="button" onClick={download} disabled={pending}>
          Export everything (JSON)
        </button>
        <form action="/api/export" method="get">
          <button className="btn" type="submit">
            Download as file
          </button>
        </form>
      </div>
      {message ? (
        <p className="mono-xs" style={{ color: "var(--color-accent)", marginTop: 8 }}>
          {message}
        </p>
      ) : null}

      <hr className="rule" style={{ margin: "16px 0" }} />

      <p className="eyebrow" style={{ margin: 0, color: "var(--color-danger)" }}>
        Delete everything
      </p>
      <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "var(--color-ink-soft)" }}>
        This removes your profile, resume, applications, events and pasted messages from this machine. It cannot be
        undone, and there is no copy on a server because there is no server.
      </p>
      <div style={{ display: "flex", gap: 8, alignItems: "end", marginTop: 10, flexWrap: "wrap" }}>
        <div>
          <label className="field" htmlFor="delete-confirm">
            Type DELETE to confirm
          </label>
          <input
            id="delete-confirm"
            className="input"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            style={{ maxWidth: 200 }}
          />
        </div>
        <button
          className="btn btn-danger"
          type="button"
          disabled={confirm !== "DELETE" || pending}
          onClick={() => startTransition(async () => void (await deleteEverythingAction()))}
        >
          Delete my data
        </button>
      </div>
    </div>
  );
}
