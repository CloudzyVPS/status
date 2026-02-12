# Cloudzy Status Page

## Config (single source of truth)

Edit `config.json` to change API base or status slug. Then run:

```bash
./scripts/sync-config.sh
```

This regenerates `config.js` for index.html, offline.html, and service-worker.js. The smoke test (`lib.sh`) reads `config.json` directly.
