
- Owner dashboard at /admin reads stats only via admin-checked database functions (admin_sauna_stats, admin_site_totals); roles live in user_roles · keeps raw tables private.
- Each Irish sauna's tideStation is the nearest Marine Institute station present in both ERDDAP tide datasets (≤60km, else ''), with chartDatumOffset measured as continuous LAT minus HighLow OD Malin · get-tides maps modelled stations to their "_MODELLED" continuous ID · keeps heights and times from real data only.
- Official warnings route by Location.warningsSource ('met-office-ni' → Met Office NI RSS, marine null; otherwise Met Éireann for Republic saunas) · avoids string-matching county names.
