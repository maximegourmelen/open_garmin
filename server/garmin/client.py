"""Documented Personal API transport."""

from __future__ import annotations

import base64
import json
import time

import httpx

TOKEN_PATH = "/personalapitoken-service/personal-api/personal-api-key/token"


class GarminError(Exception):
    def __init__(self, message: str, status: int = 502, retry_after: int | None = None):
        super().__init__(message)
        self.status = status
        self.retry_after = retry_after


class GarminClient:
    def __init__(self, key: str, region: str = "com", transport=None):
        if region not in ("com", "cn"):
            raise ValueError("Unknown Garmin region")
        self.key = key
        self.token: str | None = None
        self.expires = 0.0
        self.http = httpx.Client(
            base_url=f"https://personal.connectapi.garmin.{region}",
            timeout=30,
            transport=transport,
            follow_redirects=False,
        )

    def close(self):
        self.http.close()

    def _check(self, response: httpx.Response):
        if response.is_success:
            return
        status = response.status_code
        if status == 429:
            value = response.headers.get("Retry-After", "")
            delay = int(value) if value.isdigit() else 60
            raise GarminError(
                "Garmin is limiting requests. Your imported data is still available; try syncing later.",
                429,
                delay,
            )
        if status == 401:
            raise GarminError(
                "Garmin did not accept the key. It may have expired or been revoked. Replace it in Settings.",
                401,
            )
        if status == 403:
            raise GarminError(
                "Garmin refused access to this resource. Your saved data is still available.", 403
            )
        if status == 404:
            raise GarminError("This data is not available from Garmin.", 404)
        raise GarminError(
            f"Garmin returned HTTP {status}. Try again later.", status if status in (400, 422) else 502
        )

    def authenticate(self):
        try:
            response = self.http.post(TOKEN_PATH, headers={"Authorization": f"ApiKey {self.key}"})
            self._check(response)
            token = response.text.strip().strip('"')
            if response.headers.get("content-type", "").startswith("application/json"):
                try:
                    body = response.json()
                    if isinstance(body, dict):
                        token = body.get("access_token") or body.get("accessToken") or ""
                except ValueError:
                    pass
            if not token or len(token) > 20000:
                raise GarminError("Garmin returned an invalid access token.")
            try:
                payload = token.split(".")[1]
                expiry = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))["exp"]
                self.expires = float(expiry)
            except (ValueError, KeyError, IndexError, TypeError):
                raise GarminError("Garmin returned an invalid access token.") from None
            self.token = token
        except httpx.RequestError:
            raise GarminError(
                "Could not reach Garmin. Check your internet connection and try again."
            ) from None

    def get(self, path: str, params: dict | None = None, binary: bool = False):
        if not self.token or self.expires < time.time() + 60:
            self.authenticate()
        try:
            for attempt in range(2):
                with self.http.stream(
                    "GET",
                    path,
                    params=params,
                    headers={
                        "Authorization": f"Bearer {self.token}",
                        "Accept": "application/zip, application/x-zip-compressed, application/octet-stream"
                        if binary
                        else "application/json",
                    },
                ) as response:
                    if response.status_code == 401 and attempt == 0:
                        self.authenticate()
                        continue
                    self._check(response)
                    limit = (60 if binary else 20) * 1024 * 1024
                    pieces, size = [], 0
                    for piece in response.iter_bytes():
                        size += len(piece)
                        if size > limit:
                            raise GarminError("The Garmin response exceeds this import's size limit.")
                        pieces.append(piece)
                    content = b"".join(pieces)
                if binary:
                    return content
                if not content:
                    return None
                try:
                    return json.loads(content)
                except ValueError:
                    raise GarminError(
                        "Garmin returned an unexpected response. No data was replaced."
                    ) from None
        except httpx.RequestError:
            raise GarminError("Could not reach Garmin. Your imported data is still available.") from None
