
var TableState = {

    /**
     * Initialize table state.
     * @param {Object} opts - Table settings
     */
    init: function (opts) {
        opts = opts || {};
        TableState.opts = $.extend({
            id: null,
            columns: [],
            url: '',
            requestMethod: 'GET',
            searchable: true,
            loadAllData: true,
            columnMinWidth: 50,
            width: 100,
            editable: true,
            pageDropdown: true,
            headerButtons: null,
            storageFunction: null,
            itemsPerPage: null,
            searchQuery: null,
            currentStartItem: null,
            sorting: null,
            dataCallback: null,
            errorCallback: null,
            dataDateFormat: 'YYYY-MM-DD HH:mm:ss',
            displayDateFormat: 'YYYY-MM-DD HH:mm',
            displayCurrencyFormat: { symbol: "$", format: "%s%v" },
            resources: {
                firstPage: 'First Page',
                previousPage: 'Previous Page',
                nextPage: 'Next Page',
                lastPage: 'Last Page',
                noData: 'There are no records to show.',
                showing: 'Showing {0} - {1} of {2}',
                page: 'Page',
                perPage: 'Per Page',
                loadingError: 'There was a problem loading the table.',
                tryAgain: 'Try Again'
            }
        }, opts);

        TableState.container = null;
        TableState.table = null;
        TableState.tableHeaderRow = null;
        TableState.top = null;
        TableState.columnGroup = null;
        TableState.layoutSet = false;
        TableState.data = null;
        TableState.loading = true;
        TableState.loadingError = false;
        TableState.filteredTotal = 0;
        TableState.results = [];
        TableState.pageTotal = 0;
        TableState.totalDistance = 0;
        TableState.lastSeenAt = { x: null, y: null };
        TableState.columnRenderer = {};
        TableState.colGroups = [];
        TableState.intColumns = [];
        TableState.dateColumns = [];
        TableState.currencyColumns = [];

        for (var i = 0; i < TableState.opts.columns.length; i++) {
            var column = TableState.opts.columns[i];
            column.width = $.hasPositiveValue(column.width) ? column.width : TableState.store(column.field + ".width");

            var columnFunction = $.isNull(column.links) || column.links.length === 0 ?
                function (obj, column, index) { return TableState.getDisplayValue(obj[column.field], column.dataType.toLowerCase()); } :
                function (obj, column, index) {
                    return column.links.map(function (link, j) {
                        var label = $.coalesce(link.label, TableState.getDisplayValue(obj[column.field], column.dataType.toLowerCase()));
                        var attr = $.clone(link.attributes) || {};
                        var isBtn = attr.classList && attr.classList.indexOf('btn') > -1;

                        var href = link.href || null;
                        if (href) {
                            for (var prop in obj) {
                                if (href.indexOf('{' + prop + '}') > -1 && obj.hasOwnProperty(prop)) {
                                    href = href.replace(new RegExp('{' + prop + '}', 'g'), obj[prop]);
                                }
                            }
                        }
                        attr[isBtn ? 'data-href' : 'href'] = href;
                        return m(isBtn ? 'button' : 'a', attr, $.isNull(link.icon) ? label : m('i', { class: 'rn rn-' + link.icon.toLowerCase(), title: label }));
                    });
                };

            TableState.columnRenderer[column.field] = columnFunction;
            TableState.colGroups.push(m('col'));

            var type = column.dataType.toLowerCase();
            if (type === 'int') {
                TableState.intColumns.push(column.field);
            } else if (type === 'date') {
                TableState.dateColumns.push(column.field);
            } else if (type === 'currency') {
                TableState.currencyColumns.push(column.field);
            }
        }

        TableState.itemsPerPage = TableState.store('itemsPerPage') * 1 || 10;
        TableState.currentStartItem = TableState.store('currentStartItem') * 1 || 0;
        TableState.searchQuery = TableState.store('searchQuery') || '';
        TableState.width = TableState.store('width') * 1 || 100;
        var sorting = TableState.store('sorting');
        TableState.sorting = (typeof sorting === 'string' ? JSON.parse(sorting) : sorting) || [];

        TableState.loadData();
    },

    /**
     * Get/set persistent values.
     * @param {string} key - Key name of the value to get/set.
     * @param {*} value - Value to set.
     * @returns {string|undefined} Value if getting, else undefined.
     */
    store: function (key, value) {
        var myKey = TableState.opts.id + '.' + key;
        // getter
        if ($.isUndefined(value)) {
            return $.isNull(TableState.opts.storageFunction) ? localStorage[myKey] : $.coalesce(TableState.opts[key], null);
        }

        // setter
        if ($.isNull(TableState.opts.storageFunction)) {
            localStorage[myKey] = value;
        } else {
            // ignore the param actually passed and use the values from the object
            // passing the whole object lets the storage function decide when to actually save using a debounce
            if ($.isFunction(TableState.opts.storageFunction)) {
                TableState.opts.storageFunction({
                    itemsPerPage: TableState.itemsPerPage,
                    currentStartItem: TableState.currentStartItem,
                    searchQuery: TableState.searchQuery,
                    width: TableState.width,
                    sorting: TableState.sorting,
                    columnWidths: TableState.opts.columns.map(function (c) { return { field: c.field, width: c.width * 1.0 }; })
                });
            }
        }
    },

    /**
     * Process the data array result from the ajax request.
     * @param {Object[]} data - Array of records to display.
     */
    processData: function (data) {
        if (TableState.opts.dataCallback) {
            TableState.opts.dataCallback(data);
        }

        var i = 0, len = data.rows.length, j = 0;
        for (; i < len; i++) {
            // add an index to the data so we can reset to the default sort order later if the user wants
            data.rows[i]._index = i;

            var x;
            // convert input to appropriate types
            for (j = 0; j < TableState.intColumns.length; j++) {
                x = TableState.intColumns[j];
                data.rows[i][x] = $.isNull(data.rows[i][x]) ? null : data.rows[i][x] * 1;
            }
            for (j = 0; j < TableState.dateColumns.length; j++) {
                x = TableState.dateColumns[j];
                data.rows[i][x] = $.isNull(data.rows[i][x]) ? null : fecha.parse(data.rows[i][x], TableState.opts.dataDateFormat);
            }
            for (j = 0; j < TableState.currencyColumns.length; j++) {
                x = TableState.currencyColumns[j];
                data.rows[i][x] = $.isNull(data.rows[i][x]) ? null : accounting.unformat(data.rows[i][x]);
            }
        }
        TableState.data = data.rows;
        TableState.filteredTotal = data.filteredTotal;

        TableState.loading = false;
        TableState.sort(false);
        TableState.filterResults();
    },

    /**
     * Load the data to populate the table.
     */
    loadData: function () {
        TableState.loading = true;
        TableState.loadingError = false;

        m.request({
            method: TableState.opts.requestMethod,
            url: TableState.opts.url,
            data: TableState.buildParams()
        }).then(function (data) {
            TableState.processData(data);
        }).catch(function (e) {
            TableState.loading = false;
            TableState.loadingError = true;
            if (TableState.opts.errorCallback) {
                TableState.opts.errorCallback(e);
            }
        });
    },

    /**
     * Force the table to refresh its data.
     */
    refresh: function () {
        // reset to 1st page on refresh
        TableState.currentStartItem = 0;
        TableState.loading = true;
        TableState.loadingError = false;
        TableState.loadData();
    },

    /**
     * Build querystring params to fetch data from the server.
     * @returns {Object} Request parameters.
     */
    buildParams: function () {
        return {
            startItem: TableState.currentStartItem,
            items: TableState.itemsPerPage,
            query: TableState.searchQuery,
            sort: TableState.sorting.length > 0 ? TableState.sorting.map(function (obj, i) { return { field: obj.field, dir: obj.dir, index: i }; }) : null,
            t: Math.random()
        };
    },

    /**
     * Set the first item index to display.
     * @param {type} index - Record index to start on.
     */
    setCurrentStartItem: function (index) {
        TableState.currentStartItem = index;
        TableState.store('currentStartItem', index);
        TableState.filterResults(true);
    },

    /**
     * Set the number of items to display per page.
     * @param {number|Event} e - Number or items per page, or an event that triggered the change.
     */
    setItemsPerPage: function (e) {
        if (TableState.loading) {
            return;
        }

        var items = (isNaN(e) ? e.target.value : e) * 1;
        if (TableState.itemsPerPage !== items) {
            TableState.itemsPerPage = items;
            TableState.store('itemsPerPage', items);
            TableState.setCurrentStartItem(0);
        }
    },

    /**
     * Set the search query for filtering table data.
     * @param {string} val - New search text.
     */
    setSearchQuery: function (val) {
        if (TableState.loading) {
            return;
        }

        var query = val.target ? val.target.value : val;
        if (TableState.searchQuery !== query) {
            TableState.runSearch(query);
        }
    },

    /**
     * Change search query and filter results.
     * @param {string} query - New search text.
     */
    runSearch: function (query) {
        TableState.searchQuery = query;
        TableState.store('searchQuery', query);
        TableState.currentStartItem = 0;
        TableState.filterResults(true);
    },

    /**
     * Filter the data based on the search query, current page, and items per page.
     * @param {bool} refresh - Force it to refresh its data.
     */
    filterResults: function (refresh) {
        if (TableState.loading) {
            return;
        }

        if (refresh && !TableState.opts.loadAllData) {
            // force the data to reload. filterResults will get called again after the data loads
            TableState.loadData();
        } else if (!TableState.opts.loadAllData) {
            // we're not loading all the data to begin with. so whatever data we have should be displayed.
            TableState.results = TableState.data;
            TableState.pageTotal = Math.ceil(TableState.filteredTotal / TableState.itemsPerPage);
        } else {
            // we're loading all the data to begin with. so figure out what data to display.
            var filteredTotal = 0;
            if (TableState.data.constructor !== Array) {
                TableState.loading = true;
                TableState.results = [];
            } else {
                var startItem = TableState.currentStartItem;
                var res = TableState.searchQuery ? TableState.data.filter(TableState.filterArray.bind(TableState.searchQuery.toLowerCase())) : TableState.data;
                filteredTotal = res.length;
                TableState.results = res.slice(startItem, startItem + TableState.itemsPerPage);
            }

            TableState.filteredTotal = filteredTotal;
            TableState.pageTotal = Math.ceil(filteredTotal / TableState.itemsPerPage);
        }
    },

    /**
     * Page forward or backward. 
     * @param {number} d - Direction to move, 1 is forward, -1 is backward.
     * @param {number} m - Move to end (first or last page) if true.
     */
    moveToPage: function (d, m) {
        TableState.changePage(d === 1 ? m ? TableState.pageTotal : TableState.currentStartItem / TableState.itemsPerPage + 2 : m ? 1 : TableState.currentStartItem / TableState.itemsPerPage);
    },

    /**
     * Move to the specified page number.
     * @param {number|Event} e - New page number, or an event that triggered the change.
     */
    changePage: function (e) {
        if (TableState.loading) {
            return;
        }

        var page = (isNaN(e) ? e.target.value : e) * 1;
        if (page <= TableState.pageTotal && page > 0) {
            TableState.setCurrentStartItem((page - 1) * TableState.itemsPerPage);
        }
    },

    /**
     * Change the sorting order.
     * @param {string} fieldName - Name of the field to sort on.
     * @param {string} dataType - Data type of the field.
     * @param {Event} e - Event that triggered the change.
     */
    changeSort: function (fieldName, dataType, e) {
        if (TableState.loading) {
            return;
        }

        var val = $.findByKey(TableState.sorting, 'field', fieldName);
        if (e.shiftKey) {
            document.getSelection().removeAllRanges();
        } else {
            TableState.sorting = [];
        }

        if (val === null) {
            TableState.sorting.push({ field: fieldName, dir: 'ASC', dataType: dataType || 'string' });
        } else if (e.shiftKey) {
            if (val.dir === 'DESC') {
                TableState.sorting.splice(val._i, 1);
            } else {
                val.dir = 'DESC';
                TableState.sorting[val._i] = val;
            }
        } else {
            val.dir = val.dir === 'ASC' ? 'DESC' : 'ASC';
            TableState.sorting.push(val);
        }

        TableState.sort();
        TableState.setCurrentStartItem(0);
    },

    /**
     * Sort the underlying data.
     * @param {bool} refresh - Refresh the data from the server.
     */
    sort: function (refresh) {
        refresh = $.coalesce(refresh, true);
        TableState.data.sort(TableState.sorting.length > 0 ? TableState.compare : TableState.defaultCompare);
        TableState.filterResults(refresh);
        TableState.store('sorting', JSON.stringify(TableState.sorting));
    },

    /**
     * Set up the table and column styles and events.
     */
    setLayout: function () {
        if (TableState.layoutSet) {
            return;
        }

        TableState.layoutSet = true;
        TableState.container = $.get('#' + TableState.opts.id + '-container');
        TableState.table = $.get('#' + TableState.opts.id, TableState.container);
        TableState.tableHeaderRow = TableState.table.tHead.rows[0];
        TableState.top = $.get('.table-scrollable', TableState.container);
        TableState.columnGroup = $.get('.table-column-group', TableState.container);

        if (TableState.table !== null) {
            TableState.clientWidth = TableState.container.clientWidth;
            TableState.table.tHead.style.width = TableState.table.style.width = (TableState.width / 100 * TableState.table.offsetWidth) + "px";

            var hWidth = TableState.table.tHead.offsetWidth;
            var tWidth = TableState.table.offsetWidth;
            for (var i = 0; i < TableState.opts.columns.length; i++) {
                if (!TableState.opts.columns[i].width) {
                    TableState.opts.columns[i].width = TableState.tableHeaderRow.cells[i].offsetWidth / hWidth * 100;
                }
                TableState.columnGroup.children[i].style.width = TableState.tableHeaderRow.cells[i].style.width = TableState.opts.columns[i].width / 100 * tWidth + "px";
            }
            TableState.top.style.paddingTop = TableState.table.tHead.offsetHeight + 'px';

            if (TableState.opts.editable) {
                $.on(window, 'resize', TableState.onResize);
                $.on(window, 'mousemove', TableState.onMouseMove);
                $.on(window, 'mouseup', TableState.onMouseUp);

                var header = $.get('thead', TableState.table);
                if (header) {
                    $.on(header, 'touchstart', TableState.touchHandler);
                    $.on(header, 'touchmove', TableState.touchHandler);
                    $.on(header, 'touchend', TableState.touchHandler);
                    $.on(header, 'touchcancel', TableState.touchHandler);
                }
            }
        }
    },

    /**
     * Clean up our mess.
     */
    destroy: function () {
        if (TableState.opts.editable) {
            $.off(window, 'resize', TableState.onResize);
            $.off(window, 'mousemove', TableState.onMouseMove);
            $.off(window, 'mouseup', TableState.onMouseUp);

            var header = $.get('thead', TableState.table);
            if (header) {
                $.off(header, 'touchstart', TableState.touchHandler);
                $.off(header, 'touchmove', TableState.touchHandler);
                $.off(header, 'touchend', TableState.touchHandler);
                $.off(header, 'touchcancel', TableState.touchHandler);
            }
        }
    },

    /**
     * Update the table and column widths based on a window resize.
     */
    onResize: function () {
        var cWidth = TableState.container.clientWidth;
        if (cWidth === 0) {
            return;
        }
        var scale = cWidth / TableState.clientWidth;
        TableState.clientWidth = cWidth;
        TableState.table.tHead.style.width = TableState.table.style.width = (TableState.pixelToFloat(TableState.table.style.width) * scale) + 'px';
        for (var i = 0; i < TableState.opts.columns.length; i++) {
            TableState.tableHeaderRow.cells[i].style.width = (TableState.pixelToFloat(TableState.tableHeaderRow.cells[i].style.width) * scale) + 'px';
        }
        TableState.updateLayout();
    },

    /**
     * Update the table header style.
     */
    updateLayout: function () {
        if (TableState.table.offsetParent === null) {
            return;
        }
        TableState.top.style.paddingTop = TableState.table.tHead.offsetHeight + 'px';
        for (var i = 0; i < TableState.opts.columns.length; i++) {
            TableState.columnGroup.children[i].style.width = TableState.tableHeaderRow.cells[i].style.width;
        }
        if (TableState.clientWidth > 0 && TableState.container.clientWidth / TableState.clientWidth !== 1) {
            TableState.onResize();
        }
    },

    /**
     * Make the table header scroll horizontally with the table
     * @param {Event} e - Event that triggered the scroll.
     */
    onScroll: function (e) {
        var head = TableState.table.tHead;
        var scroll = e.target;
        if (-head.offsetLeft !== scroll.scrollLeft) {
            head.style.left = "-" + scroll.scrollLeft + "px";
        }
    },

    /**
     * Handle dragging to change column widths.
     * @param {type} e - Event that triggered the change.
     */
    onHeaderMouseDown: function (e) {
        if (e.button !== 0) {
            return;
        }

        var callbackFunc = function (cellEl) {
            e.stopImmediatePropagation();
            e.preventDefault();

            TableState.resizeContext = {
                colIndex: cellEl.cellIndex,
                initX: e.clientX,
                scrWidth: TableState.top.offsetWidth,
                initTblWidth: TableState.table.offsetWidth,
                initColWidth: TableState.pixelToFloat(TableState.columnGroup.children[cellEl.cellIndex].style.width),
                layoutTimer: null
            };
        };
        TableState.inResizeArea(e, callbackFunc);
    },

    /**
     * Handle resizing columns.
     * @param {Event} e - Event that triggered the change.
     */
    onMouseMove: function (e) {
        var newStyle = '';
        var cursorFunc = function () {
            newStyle = 'col-resize';
        };
        TableState.inResizeArea(e, cursorFunc);
        if (TableState.table.tHead.style.cursor !== newStyle) {
            TableState.table.tHead.style.cursor = newStyle;
        }

        var ctx = TableState.resizeContext;
        if ($.isNull(ctx)) {
            return;
        }

        e.stopImmediatePropagation();
        e.preventDefault();

        var newColWidth = Math.max(ctx.initColWidth + e.clientX - ctx.initX, TableState.opts.columnMinWidth);
        TableState.table.tHead.style.width = TableState.table.style.width = (ctx.initTblWidth + (newColWidth - ctx.initColWidth)) + "px";
        TableState.columnGroup.children[ctx.colIndex].style.width = TableState.tableHeaderRow.cells[ctx.colIndex].style.width = newColWidth + "px";

        if (ctx.layoutTimer === null) {
            var timerFunc = function () {
                TableState.resizeContext.layoutTimer = null;
                TableState.updateLayout();
            };
            ctx.layoutTimer = setTimeout(timerFunc, 25);
        }
    },

    /**
     * Update column widths and save them.
     * @param {Event} e - Event that triggered.
     */
    onMouseUp: function (e) {
        var ctx = TableState.resizeContext;
        if ($.isNull(ctx)) {
            return;
        }

        if (ctx.layoutTimer !== null) {
            clearTimeout(ctx.layoutTimer);
        }
        TableState.resizeContext = null;

        var newTblWidth = TableState.table.offsetWidth;
        TableState.width = (newTblWidth / ctx.scrWidth * 100).toFixed(2);
        TableState.store('width', TableState.width);
        for (var i = 0; i < TableState.opts.columns.length; i++) {
            TableState.opts.columns[i].width = (TableState.pixelToFloat(TableState.tableHeaderRow.cells[i].style.width) / newTblWidth * 100).toFixed(2);
            TableState.store(TableState.opts.columns[i].field + ".width", TableState.opts.columns[i].width);
        }

        TableState.updateLayout();
    },

    /**
     * Check if the cursor is in the area where the user can click to drag a column.
     * @param {Event} e - Event that triggered the check.
     * @param {Function} callback - Function to run if in the resize area.
     */
    inResizeArea: function (e, callback) {
        var tblX = e.clientX;
        var el;
        for (el = TableState.table.tHead; el !== null; el = el.offsetParent) {
            tblX -= el.offsetLeft + el.clientLeft - el.scrollLeft;
        }

        var cellEl = e.target;
        while (cellEl !== TableState.table.tHead && cellEl !== null) {
            if (cellEl.nodeName === "TH") {
                break;
            }
            cellEl = cellEl.parentNode;
        }

        if (cellEl === TableState.table.tHead) {
            for (var i = TableState.tableHeaderRow.cells.length - 1; i >= 0; i--) {
                cellEl = TableState.tableHeaderRow.cells[i];
                if (cellEl.offsetLeft <= tblX) {
                    break;
                }
            }
        }

        if (cellEl !== null) {
            var x = tblX;
            for (el = cellEl; el !== TableState.table.tHead; el = el.offsetParent) {
                if (el === null) {
                    break;
                }
                x -= el.offsetLeft - el.scrollLeft + el.clientLeft;
            }
            if (x < 5 && cellEl.cellIndex !== 0) {
                callback.call(TableState, cellEl.previousElementSibling);
            } else if (x > cellEl.clientWidth - 5) {
                callback.call(TableState, cellEl);
            }
        }
    },

    /**
     * Make column resizing play nice with touch. http://stackoverflow.com/questions/28218888/touch-event-handler-overrides-click-handlers
     * @param {Event} e Event that triggered the handler.
     */
    touchHandler: function (e) {
        var mouseEvent = null;
        var simulatedEvent = document.createEvent('MouseEvent');
        var touch = e.changedTouches[0];

        switch (e.type) {
            case 'touchstart':
                mouseEvent = 'mousedown';
                TableState.totalDistance = 0;
                TableState.lastSeenAt.x = touch.clientX;
                TableState.lastSeenAt.y = touch.clientY;
                break;
            case 'touchmove':
                mouseEvent = 'mousemove';
                break;
            case 'touchend':
                if (TableState.lastSeenAt.x) {
                    TableState.totalDistance += Math.sqrt(Math.pow(TableState.lastSeenAt.y - touch.clientY, 2) + Math.pow(TableState.lastSeenAt.x - touch.clientX, 2));
                }
                mouseEvent = TableState.totalDistance > 5 ? 'mouseup' : 'click';
                TableState.lastSeenAt = { x: null, y: null };
                break;
        }

        simulatedEvent.initMouseEvent(mouseEvent, true, true, window, 1, touch.screenX, touch.screenY, touch.clientX, touch.clientY, false, false, false, false, 0, null);
        touch.target.dispatchEvent(simulatedEvent);
        e.preventDefault();
    },

    /**
     * Get the value for the field coverted to the correct data type.
     * @param {string} value - Value to convert.
     * @returns {*} Converted value.
     */
    getFieldValue: function (value) {
        if ($.isNull(value)) {
            return null;
        }
        return value.getMonth ? value : value.toLowerCase ? value.toLowerCase() : value;
    },

    /**
     * Get the formatted value to display for the field.
     * @param {string} value - Value to format.
     * @param {string} dataType - Data type to format to.
     * @returns {*} Converted value.
     */
    getDisplayValue: function (value, dataType) {
        if (!dataType || $.isNull(value)) {
            return value;
        }

        var val = value;
        if (dataType === 'currency') {
            val = accounting.formatMoney(val, TableState.opts.displayCurrencyFormat);
        } else if (dataType === 'date') {
            val = fecha.format(val, TableState.opts.displayDateFormat);
        }
        return val;
    },

    /**
     * Default sorting function for the data - resets to order when data was loaded.
     * @param {Object} a - First object to compare.
     * @param {Object} b - Object to compare to.
     * @returns {number} 1 if a comes first, -1 if b comes first, else 0.
     */
    defaultCompare: function (a, b) {
        return a._index > b._index ? 1 : a._index < b._index ? -1 : 0;
    },

    /**
     * Multi-sorting function for the data.
     * @param {Object} a - First object to compare.
     * @param {Object} b - Object to compare to.
     * @returns {number} 1 if a comes first, -1 if b comes first, else 0.
     */
    compare: function (a, b) {
        var sorting = TableState.sorting;
        var i = 0, len = sorting.length;
        for (; i < len; i++) {
            var sort = sorting[i];
            var aa = TableState.getFieldValue(a[sort.field]);
            var bb = TableState.getFieldValue(b[sort.field]);

            if (aa === null) {
                return 1;
            }
            if (bb === null) {
                return -1;
            }
            if (aa < bb) {
                return sort.dir === 'ASC' ? -1 : 1;
            }
            if (aa > bb) {
                return sort.dir === 'ASC' ? 1 : -1;
            }
        }
        return 0;
    },

    /**
     * Filter an array of objects to find objects where value contains the value of `this`
     * @param {Object} obj - Object to search in.
     * @returns {bool} True if object contains `this`.
     */
    filterArray: function (obj) {
        for (var key in obj) {
            if (key.indexOf('_') < 0 && obj.hasOwnProperty(key) && (obj[key] + '').toLowerCase().indexOf(this) > -1) {
                return true;
            }
        }
        return false;
    },

    /**
     * Convert a style with 'px' to a float.
     * @param {string} val - CSS style to convert.
     * @returns {number} Numeric value.
     */
    pixelToFloat: function (val) {
        return val.replace('px', '').replace('%', '') * 1.0;
    }
};