"""Catálogo simulado de endereços de Barueri - SP.

Atendimento ao RF10 (geolocalização). Em produção este módulo seria
substituído por uma chamada à API do Google Maps Geocoding. Os endereços
e coordenadas abaixo são reais, da região de Barueri (Alphaville, Tamboré,
Centro, Aldeia da Serra, Vila Boa Vista, Jardim Silveira), e servem como
"banco" de geolocalização para o MVP.
"""

# Bounds aproximados da cidade de Barueri (usados pelo mapa do frontend)
BARUERI_BOUNDS = {
    "min_lat": -23.5300,
    "max_lat": -23.4750,
    "min_lng": -46.9100,
    "max_lng": -46.8200,
}

ADDRESSES = [
    # Alphaville
    {
        "id": "alpha-rio-negro",
        "label": "Alameda Rio Negro, 503 - Alphaville Industrial",
        "neighborhood": "Alphaville",
        "lat": -23.4961,
        "lng": -46.8585,
    },
    {
        "id": "alpha-cauaxi",
        "label": "Av. Cauaxi, 100 - Alphaville",
        "neighborhood": "Alphaville",
        "lat": -23.4970,
        "lng": -46.8567,
    },
    {
        "id": "alpha-mamore",
        "label": "Alameda Mamoré, 911 - Alphaville",
        "neighborhood": "Alphaville",
        "lat": -23.4930,
        "lng": -46.8478,
    },
    {
        "id": "alpha-andromeda",
        "label": "Av. Andrômeda, 1000 - Alphaville Empresarial",
        "neighborhood": "Alphaville",
        "lat": -23.4995,
        "lng": -46.8634,
    },
    {
        "id": "alpha-madeira",
        "label": "Alameda Madeira, 222 - Alphaville",
        "neighborhood": "Alphaville",
        "lat": -23.4950,
        "lng": -46.8513,
    },
    # Tamboré
    {
        "id": "tambore-tambore",
        "label": "Av. Tamboré, 952 - Tamboré",
        "neighborhood": "Tamboré",
        "lat": -23.5051,
        "lng": -46.8478,
    },
    {
        "id": "tambore-honorio",
        "label": "Av. Honório Álvares Penteado, 543 - Tamboré",
        "neighborhood": "Tamboré",
        "lat": -23.5055,
        "lng": -46.8420,
    },
    {
        "id": "tambore-marcos",
        "label": "Av. Marcos Penteado de Ulhôa Rodrigues, 1500 - Tamboré",
        "neighborhood": "Tamboré",
        "lat": -23.4910,
        "lng": -46.8395,
    },
    # Aldeia da Serra
    {
        "id": "aldeia-yojiro",
        "label": "Av. Yojiro Takaoka, 1455 - Aldeia da Serra",
        "neighborhood": "Aldeia da Serra",
        "lat": -23.4836,
        "lng": -46.8812,
    },
    # Centro de Barueri
    {
        "id": "centro-henriqueta",
        "label": "Av. Henriqueta Mendes Guerra, 1000 - Centro",
        "neighborhood": "Centro",
        "lat": -23.5104,
        "lng": -46.8761,
    },
    {
        "id": "centro-silvestre",
        "label": "R. Silvestre Vasconcelos Calmon, 100 - Centro",
        "neighborhood": "Centro",
        "lat": -23.5128,
        "lng": -46.8755,
    },
    # Engenho Novo
    {
        "id": "engenho-mirella",
        "label": "R. Angela Mirella, 354 - Engenho Novo",
        "neighborhood": "Engenho Novo",
        "lat": -23.5082,
        "lng": -46.8847,
    },
    # Jardim Silveira
    {
        "id": "silveira-portinari",
        "label": "R. Cândido Portinari, 100 - Jardim Silveira",
        "neighborhood": "Jardim Silveira",
        "lat": -23.5145,
        "lng": -46.8924,
    },
    # Vila Boa Vista
    {
        "id": "boavista-lebret",
        "label": "R. Padre Lebret, 200 - Vila Boa Vista",
        "neighborhood": "Vila Boa Vista",
        "lat": -23.5172,
        "lng": -46.8798,
    },
    {
        "id": "boavista-oscar",
        "label": "R. Oscar de Almeida Gama, 50 - Vila Boa Vista",
        "neighborhood": "Vila Boa Vista",
        "lat": -23.5165,
        "lng": -46.8809,
    },
]


def find_address(address_id: str) -> dict | None:
    """Busca um endereço pelo seu identificador."""
    for a in ADDRESSES:
        if a["id"] == address_id:
            return a
    return None


def find_by_label(label: str) -> dict | None:
    """Busca um endereço pelo texto (fallback caso o frontend envie o label)."""
    for a in ADDRESSES:
        if a["label"].strip().lower() == (label or "").strip().lower():
            return a
    return None
