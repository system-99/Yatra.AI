"""Validate Supabase access tokens used by the frontend."""

import os

from fastapi import Header, HTTPException
from supabase import Client, create_client


def _client() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_PUBLISHABLE_KEY") or os.getenv("SUPABASE_KEY")
    if not url or not key:
        raise HTTPException(status_code=503, detail="Supabase is not configured. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY in backend/.env.local.")
    return create_client(url, key)


def get_current_user(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authentication required")
    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        user = _client().auth.get_user(token).user
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired Supabase session") from exc
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired Supabase session")
    metadata = user.user_metadata or {}
    return {"id": user.id, "email": user.email or "", "name": metadata.get("name") or metadata.get("full_name") or user.email or "Traveler"}
