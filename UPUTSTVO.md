# Uputstvo za uređivanje vozila

Sva vozila se uređuju na jednoj stranici: **`/admin`**.
Nema više Google tabele — sve je na jednom mjestu.

## Prijava

1. Otvorite `https://vasa-stranica.ba/admin`
2. Upišite šifru
3. Ostajete prijavljeni 12 sati

Ako triput pogriješite šifru, nije problem — nakon 10 pokušaja sistem čeka 15
minuta prije novog pokušaja.

## Dodavanje vozila

1. Kliknite **+ Novo vozilo**
2. Obavezni su samo **marka** i **model** — sve ostalo možete dopuniti kasnije
3. Kliknite **Sačuvaj i dodaj slike**

Vozilo se pojavljuje na stranici **odmah**, bez čekanja.

## Slike

Na stranici vozila:

- **Prevucite slike** u okvir ili kliknite da ih odaberete
- Možete odabrati **više slika odjednom**
- Slike se automatski smanjuju u vašem pregledniku prije uploada, pa možete
  slobodno koristiti fotografije direktno s telefona
- **Glavna** označava sliku koja se prikazuje na listi i na naslovnoj
- **Obriši** briše sliku zauvijek

Prva slika koju dodate automatski postaje glavna.

## Cijene

Upišite samo broj: `60`.
Radi i `60 KM`, i `1.200,50` — sistem razumije oba načina pisanja.

Depozit `0` se na stranici prikazuje kao **"Bez depozita"**.

## Dvije vrste "isključeno"

Ovo je najvažnija stvar u cijelom uputstvu:

| Postavka | Da li je na stranici? | Kada koristiti |
| --- | --- | --- |
| **Dostupno** isključeno | **Da**, piše "Trenutno izdato" | Vozilo je izdato ili na servisu. Zadržava svoju poziciju na Googleu. |
| **Vidljivo** isključeno | **Ne**, nestaje u potpunosti | Vozilo više nije u ponudi. Podaci ostaju, pa ga možete vratiti. |

**Nikada ne brišite vozilo koje je samo trenutno izdato** — isključite
"Dostupno". Brisanje uklanja i sve slike, zauvijek.

## Istaknuto

Vozila označena kao **Istaknuto** prikazuju se na naslovnoj stranici.
Ako nijedno nije istaknuto, prikazuju se prva vozila s liste.

## Redoslijed

Manji broj = više na listi. Ostavite `0` ako vam redoslijed nije važan.

## URL (slug)

Ostavite prazno i sistem ga napravi sam (`volkswagen-golf-8`).

**Ne mijenjajte ga nakon što je vozilo objavljeno** — Google pamti staru
adresu i posjetioci s pretrage bi dobili grešku.

## Ako nešto ne radi

Otvorite `https://vasa-stranica.ba/healthz`. Ako piše `"ok": true`, sistem je
u redu. Ako ne, pošaljite tu stranicu programeru — tu je i uzrok problema.
