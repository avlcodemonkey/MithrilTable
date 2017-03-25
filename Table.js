/*!
 * Mithril based table component. Supports ajax data, searching, sorting, paging, & resizing columns.
 */
var Table = {
    /**
     * Build a single table cell.
     * @param {Object} obj - Table record to build cell for.
     * @param {number} index - Row index of this row.
     * @param {Object} column - Column to build cell for.
     * @returns {Object} Mithril TD node.
     */
    tableCell: function (obj, index, column) {
        return m('td', TableState.columnRenderer[column.field](obj, column, index));
    },

    /**
     * Build a table row.
     * @param {Object} obj - Table record to build row for.
     * @param {number} index - Row index of this row.
     * @returns {Object} Mithril TR node.
     */
    tableRow: function (obj, index) {
        return m('tr', { key: obj._index }, TableState.opts.columns.map(Table.tableCell.bind(this, obj, index)));
    },

    /**
     * Build the table footer nodes
     * @returns {Object} Mithril TR node(s).
     */
    tableBody: function () {
        if (TableState.loading) {
            return m('tr', m('td', { colspan: TableState.opts.columns.length, className: null }, m('div', { className: 'table-spinner' }, [
                m('div', { className: 'rect1' }, ''), m('div', { className: 'rect2' }, ''), m('div', { className: 'rect3' }, ''),
                m('div', { className: 'rect4' }, ''), m('div', { className: 'rect5' }, '')
            ])));
        }
        if (TableState.loadingError) {
            return m('tr', m('td', { colspan: TableState.opts.columns.length, className: 'table-loading-error' }, [
                m('div', { className: 'table-loading-error-message' }, TableState.opts.resources.loadingError),
                m('div', { className: 'btn btn-info btn-sm', onclick: TableState.refresh }, TableState.opts.resources.tryAgain)
            ]));
        }
        if (TableState.filteredTotal === 0) {
            return m('tr', [m('td', { colspan: TableState.opts.columns.length }, TableState.opts.resources.noData)]);
        }
        return TableState.results.map(Table.tableRow);
    },

    /**
     * Build the table footer nodes.
     * @returns {Object} Mithril DIV node.
     */
    tableFooter: function () {
        if (TableState.loading || TableState.loadingError) {
            return null;
        }

        var currentPage = (TableState.currentStartItem + TableState.itemsPerPage) / TableState.itemsPerPage;
        if (TableState.opts.pageDropdown) {
            // limit page dropdown to 10000 options
            var max = Math.min(TableState.pageTotal, 10000);
            var optionList = [max], i = max;
            while (i > 0) {
                optionList[i] = m('option', { value: i }, i);
                --i;
            }
        }

        var res = TableState.opts.resources;
        return m('div', { className: 'row text-center pt-1 pb-1' }, [
            m('div', { className: 'col-sm-4 col-xs-12 ' + (TableState.filteredTotal > TableState.itemsPerPage ? '' : 'hide invisible') }, [
                m('i', { className: 'fa fa-lg fa-pad fa-fast-backward btn', alt: res.firstPage, title: res.firstPage, onclick: TableState.moveToPage.bind(this, -1, true) }),
                m('i', { className: 'fa fa-lg fa-pad fa-backward btn', alt: res.previousPage, title: res.previousPage, onclick: TableState.moveToPage.bind(this, -1, false) }),
                m('i', { className: 'fa fa-lg fa-pad fa-forward btn', alt: res.nextPage, title: res.nextPage, onclick: TableState.moveToPage.bind(this, 1, false) }),
                m('i', { className: 'fa fa-lg fa-pad fa-fast-forward btn', alt: res.lastPage, title: res.lastPage, onclick: TableState.moveToPage.bind(this, 1, true) })
            ]),
            m('div', { className: 'col-sm-4 form-inline hidden-xs ' + (TableState.filteredTotal > TableState.itemsPerPage ? '' : 'hide invisible') },
                !TableState.opts.pageDropdown ? null : [
                    m('div', { className: 'input-group' }, [
                        m('span', { className: 'input-group-addon' }, res.page),
                        m('select', { className: 'form-control custom-select', onchange: TableState.changePage, value: currentPage }, optionList)
                    ])
                ]
            ),
            m('div', { className: 'col-sm-4 col-xs-12 text-right float-xs-right' }, res.showing
                .replace('{0}', Math.min(TableState.currentStartItem + 1, TableState.filteredTotal))
                .replace('{1}', Math.min(TableState.currentStartItem + TableState.itemsPerPage, TableState.filteredTotal))
                .replace('{2}', TableState.filteredTotal)
            )
        ]);
    },

    /**
     * Build the page option dropdown list.
     * @returns {Object[]} Mithril option nodes.
     */
    pageOptions: function () {
        return [m('option', { value: '10' }, '10'), m('option', { value: '20' }, '20'), m('option', { value: '50' }, '50'), m('option', { value: '100' }, '100')];
    },
    
    /**
     * Build the table header tags.
     * @param {Object} obj - Column to build the tag for.
     * @returns {Object} Mithril TH node.
     */
    tableHeaders: function (obj) {
        var field = obj.field;
        var thAttrs = {}, divAttrs = {};

        var divContent = [obj.label || field];
        if ($.isUndefined(obj.sortable) || obj.sortable === true) {
            var val = $.findByKey(TableState.sorting, 'field', field);
            divContent.push(m('i', { className: 'float-xs-right fa ' + (val ? (val.dir === 'ASC' ? 'fa-sort-up' : 'fa-sort-down') : TableState.opts.editable ? 'fa-sort' : '') }));
            if (TableState.opts.editable) {
                thAttrs.onmousedown = TableState.onHeaderMouseDown;
                divAttrs = { onclick: TableState.changeSort.bind(this, field, obj.dataType.toLowerCase()) };
            }
        } else {
            thAttrs.className = 'disabled';
        }

        return m('th', thAttrs, [m('div', divAttrs, divContent)]);
    },

    /**
     * Build the view that actually shows the table.
     * @returns {Object}  Mithril DIV node.
     */
    view: function () {
        return m('div', { className: 'container-fluid mithril-table-container', id: TableState.opts.id + '-container' }, [
            !TableState.opts.editable ? m('span', { id: 'table-items-per-page' }) :
                m('div', { className: 'row form-inline' }, [
                    m('div', { className: 'col-xs-12 p-1' },
                        m('div', { className: 'float-xs-right' }, TableState.opts.headerButtons)
                    ),
                    m('div', { className: 'col-sm-6 col-xs-12 pb-1' }, [
                        m('div', { className: 'float-xs-left btn-toolbar' }, [
                            TableState.opts.searchable ? m('div', { className: 'input-group' }, [
                                m('span', { className: 'input-group-addon' }, m('i', { className: 'fa fa-search' })),
                                m('input', { type: 'text', className: 'form-control', oninput: TableState.setSearchQuery, value: TableState.searchQuery, disabled: TableState.loading })
                            ]) : ''
                        ])
                    ]),
                    m('div', { className: 'col-sm-6 col-xs-12 float-xs-right pb-1' }, [
                        m('div', { className: 'float-xs-right btn-toolbar' }, [
                            m('div', { className: 'input-group' }, [
                                m('span', { className: 'input-group-addon' }, TableState.opts.resources.perPage),
                                m('select', {
                                    className: 'form-control custom-select', id: 'table-items-per-page', onchange: TableState.setItemsPerPage,
                                    value: TableState.itemsPerPage, disabled: TableState.loading
                                }, Table.pageOptions())
                            ])
                        ])
                    ])
                ]),
            m('.row', [
                m('div', { className: 'table-scrollable' + (TableState.opts.editable ? '' : ' table-no-edit') }, [
                    m('div', { className: 'table-area', onscroll: TableState.onScroll }, [
                        m('table', { className: 'table table-hover table-sm table-striped table-data', id: TableState.opts.id }, [
                            m('colgroup', { className: 'table-column-group' }, TableState.colGroups),
                            m('thead', [m('tr', TableState.opts.columns.map(Table.tableHeaders))]),
                            m('tbody', Table.tableBody())
                        ])
                    ])
                ])
            ]),
            Table.tableFooter()
        ]);
    },

    /**
     * Set up the layout for the table after mithril adds it to the DOM.
     * @param {VNode} vnode - Virtual node containing the view.
     */
    oncreate: function (vnode) {
        TableState.setLayout();
    },

    /**
     * Destroy the table before mithril removes it from the DOM.
     * @param {VNode} vnode - Virtual node containing the view.
     */
    onbeforeremove: function (vnode) {
        TableState.destroy();
    }
};