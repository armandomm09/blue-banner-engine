import json
from datetime import datetime, timezone
from typing import Dict, Iterable, Iterator, List, Optional, Sequence, Union, Any

ResultItem = Dict[str, Any]
ResultsSource = Union[str, Dict[str, Any], Sequence[ResultItem], Iterable[ResultItem]]

class SimulationTracker:
    """
    Clase mutable para trackear resultados de simulaciones.
    - Mantiene _alliances y _win_counts como antes.
    - Exposición de `results` (lista de dicts) y soporte para iterar sobre el objeto.
    - Se puede cargar resultados desde JSON/string, dict con clave "results",
      lista/iterable de items, o un generator.
    """
    def __init__(
        self,
        alliances: Optional[List[List[int]]] = None,
        total_simulations: int = 0,
        event_key: str = "",
        results: Optional[ResultsSource] = None,
    ):
        self._total_sims: int = total_simulations
        self.event_key: str = event_key
        self._alliances: List[List[int]] = alliances or []
        self._win_counts: Dict[int, int] = {i + 1: 0 for i in range(len(self._alliances))}
        # Raw results source (could be JSON string, list, iterable, etc.)
        self._raw_results: Optional[ResultsSource] = None
        # Internal cached results list (normalized list[dict])
        self._normalized_results: Optional[List[ResultItem]] = None

        if results is not None:
            self.load_results(results)
        else:
            # Build normalized results from alliances/win_counts if possible
            self._normalized_results = None  # lazy build

    # -----------------------
    # Utility / parsing
    # -----------------------
    def _build_results_from_internal(self) -> List[ResultItem]:
        """Construye la estructura de results a partir de alliances + win_counts."""
        data: List[ResultItem] = []
        for i, teams in enumerate(self._alliances):
            alliance_num = i + 1
            win_count = self._win_counts.get(alliance_num, 0)
            win_probability = (win_count / self._total_sims) if self._total_sims > 0 else 0.0
            data.append({
                "alliance_number": alliance_num,
                "teams": teams,
                "wins": win_count,
                "win_probability": round(win_probability, 4)
            })
        return data

    def _normalize_results_source(self, source: ResultsSource) -> List[ResultItem]:
        """
        Normaliza distintas formas de 'results' a una lista de dicts.
        - Si es str: intenta json.loads
        - Si es dict con clave 'results': usa eso
        - Si es iterable/list-like: consume y convierte a list
        """
        # Si es string, intenta parsear JSON
        if isinstance(source, str):
            try:
                parsed = json.loads(source)
            except json.JSONDecodeError:
                # No es JSON válido: devolver un solo item con raw string
                return [{"raw": source}]
            # si es dict con 'results', extraer
            if isinstance(parsed, dict) and "results" in parsed:
                return list(parsed["results"])
            if isinstance(parsed, list):
                return list(parsed)
            # fallback: envolver dict
            return [parsed] if isinstance(parsed, dict) else [{"raw_parsed": parsed}]

        # Si es dict y tiene 'results' usarlo
        if isinstance(source, dict):
            if "results" in source and isinstance(source["results"], (list, tuple, set, Iterable)):
                return list(source["results"])
            # si es dict de índices: convertir a lista
            # ejemplo: {1: {...}, 2: {...}}
            try:
                # intentar convertir a lista de valores
                return list(source.values())
            except Exception:
                return [{"raw": source}]

        # Si es lista/tupla/generador/iterable
        if isinstance(source, (list, tuple, set)):
            return list(source)

        # último caso: es un iterable (posible generator). Consumirlo a lista.
        try:
            return list(source)  # type: ignore[arg-type]
        except TypeError:
            # no iterable: envuelve en dict
            return [{"raw": source}]

    # -----------------------
    # Public API: cargar / acceder results
    # -----------------------
    def load_results(self, results: ResultsSource) -> None:
        """Carga (y normaliza) una fuente de resultados arbitraria."""
        self._raw_results = results
        self._normalized_results = self._normalize_results_source(results)
        # Intentar sincronizar win_counts / alliances si el resultado contiene esos campos
        self._try_sync_from_normalized()

    def _try_sync_from_normalized(self) -> None:
        """
        Si los items normalizados contienen 'alliance_number' y 'wins' y opcionalmente 'teams',
        sincroniza _win_counts y _alliances.
        """
        if not self._normalized_results:
            return

        rebuilt_counts: Dict[int, int] = {}
        rebuilt_alliances: Dict[int, List[int]] = {}
        any_counts = False

        for item in self._normalized_results:
            if not isinstance(item, dict):
                continue
            an = item.get("alliance_number")
            wins = item.get("wins")
            teams = item.get("teams")
            if isinstance(an, int) and isinstance(wins, int):
                rebuilt_counts[an] = wins
                any_counts = True
                if isinstance(teams, (list, tuple)):
                    # asegurar lista de ints (o strings) tal cual
                    rebuilt_alliances[an] = list(teams)

        if any_counts:
            # Reconstruir estructuras internas para que sean consistentes
            max_idx = max(rebuilt_counts.keys())
            self._alliances = [rebuilt_alliances.get(i + 1, []) for i in range(max_idx)]
            self._win_counts = {i + 1: rebuilt_counts.get(i + 1, 0) for i in range(max_idx)}
            # NOTA: total_sims no lo inferimos automáticamente (puede permanecer igual)
            # invalidar cache de normalized (la dejamos)
            # si quieres inferir total sims podrías sumar wins pero no lo hacemos por defecto

    @property
    def results(self) -> List[ResultItem]:
        """
        Devuelve una lista normalizada de resultados (lista de dicts).
        Si no hay source cargada, se construye a partir de alliances/win_counts.
        """
        if self._normalized_results is None:
            self._normalized_results = self._build_results_from_internal()
        return self._normalized_results

    def __iter__(self) -> Iterator[ResultItem]:
        """
        Permite iterar directamente sobre `SimulationTracker` para obtener items de results.
        Ej: for item in tracker: ...
        """
        for item in self.results:
            yield item

    # -----------------------
    # Resto de API original
    # -----------------------
    def add_win(self, alliance_number: int) -> None:
        """Incrementa el contador de victorias para una alianza dada."""
        if alliance_number in self._win_counts:
            self._win_counts[alliance_number] += 1
        else:
            # Si la alianza no existe, la creamos (comportamiento opcional)
            self._win_counts[alliance_number] = 1
            # asegurar suficiente espacio en alliances (listas vacías para equipos desconocidos)
            while len(self._alliances) < alliance_number:
                self._alliances.append([])
        # invalidar cache de results para que se regenere
        self._normalized_results = None

    def to_json(self, indent: int = 4) -> str:
        """Exporta a JSON (manteniendo el formato anterior)."""
        results_data = self.results  # ya normalizado
        output_dict = {
            "event_key": self.event_key,
            "simulation_metadata": {
                "total_simulations_run": self._total_sims,
                "timestamp_utc": datetime.now(timezone.utc).isoformat()
            },
            "results": results_data
        }
        return json.dumps(output_dict, indent=indent)

    def __str__(self) -> str:
        """Representación legible (tabla) — construida desde alliances/win_counts."""
        header = [
            f"\n--- Simulation Results: {self.event_key} ---",
            "Alliance | Teams                  | Wins | Win Probability",
            "----------------------------------------------------------"
        ]

        rows = []
        for i, teams in enumerate(self._alliances):
            alliance_num = i + 1
            count = self._win_counts.get(alliance_num, 0)
            probability = (count / self._total_sims) if self._total_sims > 0 else 0
            teams_str = ", ".join(map(str, teams))
            rows.append(f"{alliance_num:<8} | {teams_str:<22} | {count:<4} | {probability:.2%}")

        return "\n".join(header + rows)
