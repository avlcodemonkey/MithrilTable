## MithrilTable

MithrilTable is a component for presenting ajax data in a table format. It uses the mithril.js virtual DOM engine to render content with exception performance.

### Demo
Demo available [here](./index.html).

### Features
* Loads JSON data from a remote URL to populate the table. Load the entire dataset at once, or request data in pages.
* Case insensitive search using the search box in the top right corner.
* Sort on multiple columns. Clicking on a column header sorts it ascending, second click sorts descending. Hold control while clicking on a column header to include multiple columns.
* Resize columns by dragging on the dotted line between column headers.
* Set the number of items to display per page.
* Set the datatype for columns to string, int, date, or currency.
* Set the display format for date and currency columns.
* Remembers all settings using localStorage, or provide callbacks to save settings to a server.

### Libraries
This demo uses a few other libraries.
* **[Mithril](https://github.com/lhorie/mithril.js)** Virtual DOM engine.
* **[Bootstrap](http://v4-alpha.getbootstrap.com)** Using alpha.5 of version 4 for styling.
* **[Font-Awesome](http://fontawesome.io/)** Font Awesome icons.
* **[Core.js](./core.js)** Provides shortcuts to commonly used JS functionality. Its not intended as a replacement for jquery, more of a helper for writing native JS.
* **[Fecha](https://github.com/taylorhakes/fecha)** Lightweight date parsing/formatting library that lets you control the format of dates in the table.
* **[Accounting.js](https://github.com/openexchangerates/accounting.js/)** Lightweight currency parsing/formatting library that lets you control the format of currency in the table.

