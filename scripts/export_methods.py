"""Export the API calculation registry as readable, versioned documentation."""

from pathlib import Path

from server.api.methods import METHODS


def main() -> None:
    output = Path(__file__).resolve().parents[1] / "docs" / "METHODS.md"
    lines = [
        "# How Open Garmin calculates its numbers",
        "",
        "Open Garmin separates Garmin readings, your notes and check-ins, and calculations made in this app. "
        "A missing reading stays missing. Each calculated view names a method and version so its meaning can be checked.",
        "",
        "This reference is generated from the `/api/methods` registry by `python scripts/export_methods.py`. "
        "The in-app **How it works** page provides the same explanations beside research notes.",
        "",
    ]
    for method in METHODS:
        lines += [
            f"## {method['title']}",
            "",
            f"**Method:** `{method['id']}@{method['version']}`",
            "",
            method["plain"],
            "",
            f"**Calculation:** {method['formula']}",
            "",
            f"**Inputs:** {', '.join(method['inputs'])}.",
            "",
            f"**Minimum data:** {method['minimum_data']}.",
            "",
        ]
    output.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    main()
