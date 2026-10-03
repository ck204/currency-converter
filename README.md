# Currency Converter

A simple cross-rate calculator for comparing money changer buying and selling
rates when an exchange goes through an intermediate currency.

For example, it turns a route such as `BND → RM → RMB` into an effective direct
`BND → RMB` quote.

The dealer calculator runs entirely in the browser. Visitors enter the dealer's rates;
no rates or personal data are stored.

## Development

```bash
pnpm install
pnpm dev
```

Pushes to `main` are built and published to GitHub Pages by GitHub Actions.

## Convert to BND

The separate `/quick-bnd/` page converts foreign currency amounts into BND.
It has its own HTML entry and styles; the dealer calculator stays at `/`.

Start the development server and visit `http://localhost:5173/quick-bnd/`.
Both pages are included in the production build.

The public URL for the second page is
[ck204.github.io/currency-converter/quick-bnd/](https://ck204.github.io/currency-converter/quick-bnd/).

The page reads the dedicated Google rate sheet through anonymous Viewer access.
All 18 BND quotes, browser conversions, and manual refresh were verified.
Rates are fetched on page load and Refresh, then saved in the browser cache.
Entered amounts are calculated on the device.
If rates cannot be loaded, the page shows an unavailable state or uses
previously saved Google rates with their retrieval time.

See [Google rate source setup](docs/google-rates.md) for the data
connection.
