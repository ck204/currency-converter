# Currency Converter

A simple cross-rate calculator for comparing money changer buying and selling
rates when an exchange goes through an intermediate currency.

For example, it turns a route such as `BND → RM → RMB` into an effective direct
`BND → RMB` quote.

The calculator runs entirely in the browser. Visitors enter the dealer's rates;
no rates or personal data are stored.

## Development

```bash
pnpm install
pnpm dev
```

Pushes to `main` are built and published to GitHub Pages by GitHub Actions.
