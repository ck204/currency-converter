# Google rate source setup

Both pages are built for GitHub Pages. Google Sheets supplies the **rates**.
The dedicated
[Google BND Exchange Rates sheet](https://docs.google.com/spreadsheets/d/16gxL8EBBi-vSRIuXtCxUcrYJZINfzBw_MUdMgDoZVfY/edit)
is in the user's `GPTMCP` folder. All 18 direct BND quotes returned numeric
values from `GOOGLEFINANCE` during setup. The user enabled anyone-with-link
Viewer access. Anonymous browser loading, all 18 conversions, and manual
refresh were verified.

The local `.env.local` and GitHub Actions build settings point to spreadsheet
`16gxL8EBBi-vSRIuXtCxUcrYJZINfzBw_MUdMgDoZVfY`, Rates tab `1968217`.

The converter only accepts Google quotes. It does not fall back to a
third-party exchange-rate service, an SGD proxy, or fixed sample rates.

## Google Sheets connection

1. Create a dedicated sheet with a tab called `Rates` and only public currency
   data. In A1 put `Currency`; in B1 put `BND per 1 unit`.
2. Put these currency codes in A2:A19 in this order:
   USD, MYR, CNY, TWD, SGD, JPY, AUD, EUR, GBP, PHP, THB, IDR, HKD, KRW,
   VND, INR, CAD, NZD.
3. In B2 enter `=GOOGLEFINANCE("CURRENCY:"&A2&"BND")` and fill down to B19.
   Verify real numeric quotes in Google Sheets before enabling the source.
   A currency Google does not support stays unavailable in the converter.
4. To serve anonymous visitors, the rate-only sheet must be accessible without
   signing in, using public read access or publication. Only enable this after
   approving it. Keep personal data and other sheets out of this source.
5. Set `VITE_GOOGLE_RATES_SHEET_ID` to the spreadsheet ID and
   `VITE_GOOGLE_RATES_SHEET_GID` to the Rates tab ID, then restart Vite.
   For local development these values can go in `.env.local` (gitignored).
   The GitHub Actions build step supplies the same environment values.
   These are public identifiers, not API keys or credentials.
6. Verify anonymous access and conversions in the browser, then deploy.

The browser loads only A1:B19 through Google's documented visualization
query endpoint, using JSONP for cross-origin access. It requests rates only;
entered amounts are calculated on the device. The “Check on Google” link
sends the selected amount and currency to Google only when opened.

Rates are requested on page load and on Refresh. Quotes may be delayed by
up to 20 minutes. The page does not poll periodically while left open.
Google manages quote updates; the sheet's minute recalculation setting does
not guarantee a new market quote every minute.
“Retrieved” is when the page fetched the values, not a
market quote timestamp. If fetching fails, any previously saved Google rates
are explicitly labeled as saved rates with their retrieval time.

## References

- [GOOGLEFINANCE](https://support.google.com/docs/answer/3093281?hl=en)
- [Google Sheets as a browser data source](https://developers.google.com/chart/interactive/docs/spreadsheets)
- [Publishing Google Sheets](https://support.google.com/docs/answer/183965)
