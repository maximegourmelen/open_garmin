"""Export public API response contracts for frontend work."""

import json
from pathlib import Path

from pydantic import TypeAdapter

from server.api.schemas import EXPORTED_SCHEMAS


def export() -> None:
    output = Path(__file__).resolve().parents[1] / "docs" / "api-schemas"
    output.mkdir(parents=True, exist_ok=True)
    for name, model in EXPORTED_SCHEMAS.items():
        path = output / f"{name}.json"
        path.write_text(json.dumps(TypeAdapter(model).json_schema(), indent=2, sort_keys=True) + "\n")


if __name__ == "__main__":
    export()
