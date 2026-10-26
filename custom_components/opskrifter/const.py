"""Konstanter for Opskrifter."""

DOMAIN = "opskrifter"
VERSION = "1.2.1"

STORAGE_KEY = "opskrifter.data"
STORAGE_VERSION = 1

SIGNAL_UPDATED = "opskrifter_updated"
URL_BASE = "/opskrifter_static"
CARD_FILE = "opskrift-card.js"
DATA_REGISTERED = "opskrifter_registered"

# Lægges ind første gang integrationen sættes op
EKSEMPLER = [
    {
        "navn": "Nem smørkylling",
        "kategori": "Aftensmad",
        "ikon": "mdi:food-drumstick",
        "farve": "deep-orange",
        "tid": "20 min",
        "personer": 4,
        "krydderistyrke": 50,
        "ingredienser": [
            {"navn": "olie", "maengde": 0.5, "enhed": "spsk."},
            {"navn": "smør", "maengde": 0.5, "enhed": "spsk."},
            {"navn": "mellemstort løg", "maengde": 0.5, "note": "i fine tern"},
            {"navn": "frisk ingefær", "maengde": 0.5, "enhed": "tsk.", "note": "fintrevet"},
            {"navn": "hvidløg", "maengde": 2, "enhed": "fed", "note": "presset"},
            {
                "navn": "kyllingebryst",
                "maengde": 500,
                "enhed": "g",
                "note": "uden skind og ben, skåret i 2×2 cm",
                "noegle": True,
                "kort": "Kylling",
                "trin": 100,
            },
            {"navn": "tomatpasta", "maengde": 4, "enhed": "spsk."},
            {"navn": "garam masala", "maengde": 1, "enhed": "tsk.", "krydderi": True},
            {"navn": "chilipulver eller paprika", "maengde": 0.5, "enhed": "tsk.", "krydderi": True},
            {"navn": "spidskommen", "maengde": 0.5, "enhed": "tsk.", "krydderi": True},
            {"navn": "salt", "maengde": 0.5, "enhed": "tsk.", "krydderi": True, "note": "smag til"},
            {"navn": "sort peber", "maengde": 1, "enhed": "nip", "krydderi": True},
            {"navn": "piskefløde", "maengde": 1.5, "enhed": "dl"},
            {
                "navn": "ris",
                "maengde": 3,
                "enhed": "dl",
                "gruppe": "Serveres med",
                "note": "kogt efter anvisningen på pakken",
            },
            {"navn": "naanbrød", "gruppe": "Serveres med"},
        ],
        "fremgang": [
            "Varm en stor stegepande eller gryde op til medium-høj varme.",
            "Tilsæt olie, smør og løg, og steg løget, indtil det er let gyldent, ca. 3–4 minutter.",
            "Tilsæt ingefær og hvidløg, og lad det stege i 30 sekunder under omrøring, så det ikke brænder på.",
            "Tilsæt kylling, tomatpasta og krydderier. Kog i 5–6 minutter, eller indtil kyllingen er gennemstegt.",
            "Tilsæt piskefløde, og lad det simre i 8–10 minutter under omrøring af og til.",
            "Smag til med salt, og server med ris og naan.",
        ],
        "noter": "Bukkehornsfrø er udeladt.\nVed store portioner: steg kyllingen i omgange, og regn med lidt længere tid i trin 2, 4 og 5.",
    }
]

IMAGE_DIR = "opskrifter/billeder"
IMAGE_ID_PATTERN = r"[0-9a-f]{32}"
IMAGE_MAX_UPLOAD = 25 * 1024 * 1024
