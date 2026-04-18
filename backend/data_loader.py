"""
Data loader: reads the Excel file and exposes all 11 sheets as pandas DataFrames.
All date columns are normalised to ISO strings; NaN values become None for JSON safety.
"""
import os
from pathlib import Path
import pandas as pd

_DATA_PATH = Path(os.getenv("DATA_PATH", "../data/banking_customers.xlsx"))
_SHEET_NAMES = {
    "profil": "01_Profil_Client",
    "foyer": "02_Foyer",
    "projets": "03_Projets_Objectifs",
    "contrats": "04_Contrats_Produits",
    "caracteristiques": "05_Caracteristiques",
    "supports": "06_Supports_Detenus",
    "histo_valo": "07_Histo_Valo_Contrats",
    "histo_vl": "08_Histo_VL_Supports",
    "indices": "09_Indices_Marche",
    "flux": "10_Flux_Financiers",
    "evenements": "11_Evenements_Interact",
}


class DataStore:
    """Singleton holding all DataFrames loaded from the Excel file."""

    _instance: "DataStore | None" = None

    def __init__(self, path: Path = _DATA_PATH) -> None:
        self._path = path
        self._frames: dict[str, pd.DataFrame] = {}
        self._load()

    # ------------------------------------------------------------------
    # Loading
    # ------------------------------------------------------------------

    def _load(self) -> None:
        xl = pd.ExcelFile(self._path, engine="openpyxl")
        for key, sheet in _SHEET_NAMES.items():
            df = xl.parse(sheet)
            df = self._clean(df)
            self._frames[key] = df

    @staticmethod
    def _clean(df: pd.DataFrame) -> pd.DataFrame:
        """Convert datetime columns to ISO strings and replace NaN with None."""
        for col in df.columns:
            if pd.api.types.is_datetime64_any_dtype(df[col]):
                df[col] = df[col].dt.strftime("%Y-%m-%d").where(df[col].notna(), None)
        df = df.where(pd.notna(df), None)
        return df

    # ------------------------------------------------------------------
    # Accessors
    # ------------------------------------------------------------------

    def __getitem__(self, key: str) -> pd.DataFrame:
        return self._frames[key]

    def get(self, key: str) -> pd.DataFrame:
        return self._frames[key]

    # ------------------------------------------------------------------
    # Singleton
    # ------------------------------------------------------------------

    @classmethod
    def instance(cls) -> "DataStore":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    @classmethod
    def reload(cls, path: Path | None = None) -> "DataStore":
        """Force a reload (useful for testing)."""
        cls._instance = cls(path or _DATA_PATH)
        return cls._instance

    # ------------------------------------------------------------------
    # Helpers used by tools
    # ------------------------------------------------------------------

    def client_ids(self) -> list[str]:
        return sorted(self._frames["profil"]["client_id"].unique().tolist())

    def clients_summary(self) -> list[dict]:
        df = self._frames["profil"][
            ["client_id", "prenom", "nom", "archetype", "conseiller_attitre", "agence"]
        ]
        return df.to_dict(orient="records")
