/*!
 * Lightweight date library
 * https://github.com/taylorhakes/fecha
 * 
 * Modified to add date manipulation methods similar to moment.js.
 */
(function (root) {
    'use strict';

    /**
     * Parse or format dates
     * @class fecha
     */
    var fecha = {};
    var token = /d{1,4}|M{1,4}|YY(?:YY)?|S{1,3}|Do|ZZ|([HhMsDm])\1?|[aA]|"[^"]*"|'[^']*'/g;
    var twoDigits = /\d\d?/;
    var threeDigits = /\d{3}/;
    var fourDigits = /\d{4}/;
    var word = /[0-9]*['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+|[\u0600-\u06FF\/]+(\s*?[\u0600-\u06FF]+){1,2}/i;
    var literal = /\[([^]*?)\]/gm;
    var noop = function () { };

    /**
     * Abbreviate a string.
     * @param {string[]} arr - Array of strings to shorten.
     * @param {number} sLen - Max length of new strings.
     * @returns {string[]} New array of strings.
     */
    function shorten(arr, sLen) {
        var newArr = [];
        for (var i = 0, len = arr.length; i < len; i++) {
            newArr.push(arr[i].substr(0, sLen));
        }
        return newArr;
    }

    /**
     * Update months names based on i18n resource.
     * @param {string[]} arrName - Array of month names.
     * @returns {string[]} Updated array of month names.
     */
    function monthUpdate(arrName) {
        return function (d, v, i18n) {
            var index = i18n[arrName].indexOf(v.charAt(0).toUpperCase() + v.substr(1).toLowerCase());
            if (~index) {
                d.month = index;
            }
        };
    }

    /**
     * Left pad a number to length len using zeros.
     * @param {number|string} val - Value to pad.
     * @param {number} len - Length to pad number to.
     * @returns {string} Zero padded string.
     */
    function pad(val, len) {
        val = String(val);
        len = len || 2;
        while (val.length < len) {
            val = '0' + val;
        }
        return val;
    }

    var dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var monthNamesShort = shorten(monthNames, 3);
    var dayNamesShort = shorten(dayNames, 3);
    fecha.i18n = {
        dayNamesShort: dayNamesShort,
        dayNames: dayNames,
        monthNamesShort: monthNamesShort,
        monthNames: monthNames,
        amPm: ['am', 'pm'],
        DoFn: function DoFn(D) {
            return D + ['th', 'st', 'nd', 'rd'][D % 10 > 3 ? 0 : (D - D % 10 !== 10) * D % 10];
        }
    };

    var formatFlags = {
        D: function (dateObj) {
            return dateObj.getDate();
        },
        DD: function (dateObj) {
            return pad(dateObj.getDate());
        },
        Do: function (dateObj, i18n) {
            return i18n.DoFn(dateObj.getDate());
        },
        d: function (dateObj) {
            return dateObj.getDay();
        },
        dd: function (dateObj) {
            return pad(dateObj.getDay());
        },
        ddd: function (dateObj, i18n) {
            return i18n.dayNamesShort[dateObj.getDay()];
        },
        dddd: function (dateObj, i18n) {
            return i18n.dayNames[dateObj.getDay()];
        },
        M: function (dateObj) {
            return dateObj.getMonth() + 1;
        },
        MM: function (dateObj) {
            return pad(dateObj.getMonth() + 1);
        },
        MMM: function (dateObj, i18n) {
            return i18n.monthNamesShort[dateObj.getMonth()];
        },
        MMMM: function (dateObj, i18n) {
            return i18n.monthNames[dateObj.getMonth()];
        },
        YY: function (dateObj) {
            return String(dateObj.getFullYear()).substr(2);
        },
        YYYY: function (dateObj) {
            return dateObj.getFullYear();
        },
        h: function (dateObj) {
            return dateObj.getHours() % 12 || 12;
        },
        hh: function (dateObj) {
            return pad(dateObj.getHours() % 12 || 12);
        },
        H: function (dateObj) {
            return dateObj.getHours();
        },
        HH: function (dateObj) {
            return pad(dateObj.getHours());
        },
        m: function (dateObj) {
            return dateObj.getMinutes();
        },
        mm: function (dateObj) {
            return pad(dateObj.getMinutes());
        },
        s: function (dateObj) {
            return dateObj.getSeconds();
        },
        ss: function (dateObj) {
            return pad(dateObj.getSeconds());
        },
        S: function (dateObj) {
            return Math.round(dateObj.getMilliseconds() / 100);
        },
        SS: function (dateObj) {
            return pad(Math.round(dateObj.getMilliseconds() / 10), 2);
        },
        SSS: function (dateObj) {
            return pad(dateObj.getMilliseconds(), 3);
        },
        a: function (dateObj, i18n) {
            return dateObj.getHours() < 12 ? i18n.amPm[0] : i18n.amPm[1];
        },
        A: function (dateObj, i18n) {
            return dateObj.getHours() < 12 ? i18n.amPm[0].toUpperCase() : i18n.amPm[1].toUpperCase();
        },
        ZZ: function (dateObj) {
            var o = dateObj.getTimezoneOffset();
            return (o > 0 ? '-' : '+') + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4);
        },
        l: function (dateObj) {
            var onejan = new Date(dateObj.getFullYear(), 0, 1);
            return Math.ceil((((dateObj - onejan) / 86400000) + onejan.getDay() + 1) / 7);
        },
        ll: function (dateObj) {
            var onejan = new Date(dateObj.getFullYear(), 0, 1);
            return pad(Math.ceil((((dateObj - onejan) / 86400000) + onejan.getDay() + 1) / 7), 2);
        },
        q: function (dateObj) {
            return (Math.ceil(date.getMonth() + 1 / 3));
        }
    };

    var parseFlags = {
        D: [twoDigits, function (d, v) {
            d.day = v;
        }],
        Do: [new RegExp(twoDigits.source + word.source), function (d, v) {
            d.day = parseInt(v, 10);
        }],
        M: [twoDigits, function (d, v) {
            d.month = v - 1;
        }],
        YY: [twoDigits, function (d, v) {
            var da = new Date(), cent = +('' + da.getFullYear()).substr(0, 2);
            d.year = '' + (v > 68 ? cent - 1 : cent) + v;
        }],
        h: [twoDigits, function (d, v) {
            d.hour = v;
        }],
        m: [twoDigits, function (d, v) {
            d.minute = v;
        }],
        s: [twoDigits, function (d, v) {
            d.second = v;
        }],
        YYYY: [fourDigits, function (d, v) {
            d.year = v;
        }],
        S: [/\d/, function (d, v) {
            d.millisecond = v * 100;
        }],
        SS: [/\d{2}/, function (d, v) {
            d.millisecond = v * 10;
        }],
        SSS: [threeDigits, function (d, v) {
            d.millisecond = v;
        }],
        d: [twoDigits, noop],
        ddd: [word, noop],
        MMM: [word, monthUpdate('monthNamesShort')],
        MMMM: [word, monthUpdate('monthNames')],
        a: [word, function (d, v, i18n) {
            var val = v.toLowerCase();
            if (val === i18n.amPm[0]) {
                d.isPm = false;
            } else if (val === i18n.amPm[1]) {
                d.isPm = true;
            }
        }],
        ZZ: [/[\+\-]\d\d:?\d\d/, function (d, v) {
            var parts = (v + '').match(/([\+\-]|\d\d)/gi), minutes;

            if (parts) {
                minutes = +(parts[1] * 60) + parseInt(parts[2], 10);
                d.timezoneOffset = parts[0] === '+' ? minutes : -minutes;
            }
        }]
    };
    parseFlags.dd = parseFlags.d;
    parseFlags.dddd = parseFlags.ddd;
    parseFlags.DD = parseFlags.D;
    parseFlags.mm = parseFlags.m;
    parseFlags.hh = parseFlags.H = parseFlags.HH = parseFlags.h;
    parseFlags.MM = parseFlags.M;
    parseFlags.ss = parseFlags.s;
    parseFlags.A = parseFlags.a;

    // Some common format strings
    fecha.masks = {
        'default': 'ddd MMM DD YYYY HH:mm:ss',
        shortDate: 'M/D/YY',
        mediumDate: 'MMM D, YYYY',
        longDate: 'MMMM D, YYYY',
        fullDate: 'dddd, MMMM D, YYYY',
        shortTime: 'HH:mm',
        mediumTime: 'HH:mm:ss',
        longTime: 'HH:mm:ss.SSS'
    };

    /***
     * Format a date.
     * @method format
     * @param {Date|number} dateObj - JS date to format.
     * @param {string} mask - New format for the date, i.e. 'mm-dd-yy' or 'shortDate'.
     * @param {Object} i18nSettings - i18n resources.
     * @return {string} Formatted date string.
     */
    fecha.format = function (dateObj, mask, i18nSettings) {
        var i18n = i18nSettings || fecha.i18n;

        if (typeof dateObj === 'number') {
            dateObj = new Date(dateObj);
        }

        if (!dateObj.getMonth || isNaN(dateObj.getTime())) {
            return '';
            // throw new Error('Invalid Date in fecha.format');
        }

        mask = fecha.masks[mask] || mask || fecha.masks['default'];

        var literals = [];

        // Make literals inactive by replacing them with ??
        mask = mask.replace(literal, function ($0, $1) {
            literals.push($1);
            return '??';
        });
        // Apply formatting rules
        mask = mask.replace(token, function ($0) {
            return $0 in formatFlags ? formatFlags[$0](dateObj, i18n) : $0.slice(1, $0.length - 1);
        });
        // Inline literal values back into the formatted value
        return mask.replace(/\?\?/g, function () {
            return literals.shift();
        });
    };

    /**
     * Parse a date string into an object.
     * @method parse
     * @param {string} dateStr - Date string
     * @param {string} format - Date parse format
     * @param {Object} i18nSettings - i18n resources.
     * @returns {Date|boolean} JS date object or false.
     */
    fecha.parse = function (dateStr, format, i18nSettings) {
        var i18n = i18nSettings || fecha.i18n;

        if (typeof format !== 'string') {
            throw new Error('Invalid format in fecha.parse');
        }

        format = fecha.masks[format] || format;

        // Avoid regular expression denial of service, fail early for really long strings
        // https://www.owasp.org/index.php/Regular_expression_Denial_of_Service_-_ReDoS
        if (!dateStr || dateStr.length > 1000) {
            return false;
        }

        var isValid = true;
        var dateInfo = {};
        var isUtc = false;

        // Special handler for UTC. String will end in a Z but with no offset specified (ie '-0400')
        if (dateStr.indexOf('Z') === dateStr.length - 1 && dateStr.indexOf('ZZ') === -1) {
            dateStr = dateStr.substr(0, dateStr.length - 2);
            dateInfo.timezoneOffset = new Date().getTimezoneOffset();
            isUtc = true;
        }

        format.replace(token, function ($0) {
            if (parseFlags[$0]) {
                var info = parseFlags[$0];
                var index = dateStr.search(info[0]);
                if (!~index) {
                    isValid = false;
                } else {
                    dateStr.replace(info[0], function (result) {
                        info[1](dateInfo, result, i18n);
                        dateStr = dateStr.substr(index + result.length);
                        return result;
                    });
                }
            }

            return parseFlags[$0] ? '' : $0.slice(1, $0.length - 1);
        });

        if (!isValid) {
            return false;
        }

        var today = new Date();
        if (dateInfo.isPm === true && typeof dateInfo.hour !== 'undefined' && +dateInfo.hour !== 12) {
            dateInfo.hour = +dateInfo.hour + 12;
        } else if (dateInfo.isPm === false && +dateInfo.hour === 12) {
            dateInfo.hour = 0;
        }

        var date;
        if (typeof dateInfo.timezoneOffset !== 'undefined') {
            if (!isUtc) {
                dateInfo.minute = +(dateInfo.minute || 0) - +dateInfo.timezoneOffset;
            }
            date = new Date(Date.UTC(dateInfo.year || today.getFullYear(), dateInfo.month || 0, dateInfo.day || 1,
              dateInfo.hour || 0, dateInfo.minute || 0, dateInfo.second || 0, dateInfo.millisecond || 0));
        } else {
            date = new Date(dateInfo.year || today.getFullYear(), dateInfo.month || 0, dateInfo.day || 1,
              dateInfo.hour || 0, dateInfo.minute || 0, dateInfo.second || 0, dateInfo.millisecond || 0);
        }
        return date;
    };

    /**
     * Change a date to the start of the unit.
     * @method startOf
     * @param {date} date Date object
     * @param {string} units Unit to change
     * @returns {Date} Updated date object
     */
    fecha.startOf = function (date, units) {
        units = units.toLowerCase();
        // the following switch intentionally omits break keywords to utilize falling through the cases.
        switch (units) {
            case 'year':
                date.setMonth(0);
                /* falls through */
            case 'quarter':
            case 'month':
                date.setDate(1);
                /* falls through */
            case 'week':
            case 'isoWeek':
            case 'day':
                date.setHours(0);
                /* falls through */
            case 'hour':
                date.setMinutes(0);
                /* falls through */
            case 'minute':
                date.setSeconds(0);
                /* falls through */
            case 'second':
                date.setMilliseconds(0);
        }

        // weeks are a special case
        if (units === 'week') {
            date.setDate(date.getDate() - date.getDay());
        }
        if (units === 'isoWeek') {
            var distance = date.getDay();
            distance = distance % 7 ? distance : distance - 7;
            date.setDate(date.getDate() - distance);
        }
        // quarters are also special
        if (units === 'quarter') {
            date.setMonth(Math.floor(date.getMonth() / 3) * 3);
        }

        return date;
    };

    /**
     * Increment a date by value of units.
     * @method add
     * @param {date} date Date object
     * @param {int} value Value to increase date by
     * @param {string} units Unit to change
     * @returns {Date} Updated date object
     */
    fecha.add = function (date, value, units) {
        units = units.toLowerCase();
        switch (units) {
            case 'year':
                date.setYear(date.getYear() + value);
                break;
            case 'quarter':
                date.setMonth(date.getMonth() + value * 3);
                break;
            case 'month':
                date.setMonth(date.getMonth() + value);
                break;
            case 'week':
            case 'isoWeek':
                date.setDate(date.getDate() + value * 7);
                break;
            case 'day':
                date.setDate(date.getDate() + value);
                break;
            case 'hour':
                date.setHours(date.getHours() + value);
                break;
            case 'minute':
                date.setMinute(date.getMinute() + value);
                break;
            case 'second':
                date.setSecond(date.getSecond() + value);
                break;
            case 'millisecond':
                date.setMilliseconds(date.getMilliseconds() + value);
                break;
        }
        return date;
    };

    /**
     * Get the difference between two dates in units.
     * @method diff
     * @param {date} startDate Date object
     * @param {date} endDate Date object
     * @param {string} units Unit to get difference in
     * @param {bool} noRound Return a float instead of rounding
     * @returns {int} Difference in units
     */
    fecha.diff = function (startDate, endDate, units, noRound) {
        units = units.toLowerCase();
        noRound = typeof noRound === 'undefined' ? false : noRound;
        var diff = endDate - startDate;
        switch (units) {
            case 'year':
                diff = diff / 31556952000;
                break;
            case 'quarter':
                diff = diff / 7889238000;
                break;
            case 'month':
                diff = diff / 2629746000;
                break;
            case 'week':
            case 'isoWeek':
                diff = diff / 604800000;
                break;
            case 'day':
                diff = diff / 86400000;
                break;
            case 'hour':
                diff = diff / 3600000;
                break;
            case 'minute':
                diff = diff / 60000;
                break;
            case 'second':
                diff = diff / 1000;
                break;
        }
        return noRound ? diff : Math.floor(diff);
    };

    /**
     * Change a date to the end of the unit.
     * @method endOf
     * @param {date} date Date object
     * @param {string} units Unit to change
     * @returns {Date} Updated date object
     */
    fecha.endOf = function (date, units) {
        units = units.toLowerCase();
        if (typeof units === 'undefined' || units === 'millisecond') {
            return date;
        }
        return add(add(startOf(date, units), 1, units), -1, 'millisecond');
    };

    /**
     * Clone a date.
     * @method clone
     * @param {date} date Date object
     * @returns {Date} New date object
     */
    fecha.clone = function (date) {
        return new Date(date.getTime());
    };

    // Assume a traditional browser.
    root.fecha = fecha;
})(this);