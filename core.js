/*!
 * Contains all the common JS functions Rengn needs.
 */
(function (root) {
    'use strict';
    
    /**
     * Add a class to an element.
     * @param {Node} element - Element to add the class to.
     * @param {string} className - Name of class to add.
     */
    var addClass = function (element, className) {
        var node = get(element);
        if (node) {
            node.classList.add(className);
        }
    };
    
    /**
     * Deep copy of an object, by value not by ref.
     * @param {Object} src - Object to copy
     * @returns {Object} New copy of the object
     */
    var clone = function (src) {
        if (isNull(src)) {
            return src;
        }
        
        var cpy;
        if (isArray(src)) {
            return src.map(function (x) { return clone(x); });
        }
        if (isDate(src)) {
            return new Date(src.getTime());
        }
        if (src instanceof RegExp) {
            cpy = new RegExp(src.source);
            cpy.global = src.global;
            cpy.ignoreCase = src.ignoreCase;
            cpy.multiline = src.multiline;
            cpy.lastIndex = src.lastIndex;
            return cpy;
        }
        if ($.isObject(src)) {
            cpy = {};
            // copy dialog pototype over definition.
            for (var prop in src) {
                if (src.hasOwnProperty(prop)) {
                    cpy[prop] = clone(src[prop]);
                }
            }
            return cpy;
        }
        return src;
    };
    
    /**
     * Get closest parent that matches the selector.
     * @param {string} selector - ID, class name, tag name, or data attribute to find.
     * @param {Node} node - Node to start search from.
     * @returns {Node} Matched node or null.
     */
    var closest = function (selector, node) {
        var firstChar = selector.charAt(0);
        var tSelector = selector.substr(1);
        var lowerSelector = selector.toLowerCase();
        
        while (node !== document) {
            node = node.parentNode;
            if (!node) {
                return null;
            }
            
            // If selector is a class
            if (firstChar === '.' && node.classList && node.classList.contains(tSelector)) {
                return node;
            }
            // If selector is an ID
            if (firstChar === '#' && node.id === tSelector) {
                return node;
            }
            // If selector is a data attribute
            if (firstChar === '[' && node.hasAttribute(selector.substr(1, selector.length - 2))) {
                return node;
            }
            // If selector is a tag
            if (node.tagName && node.tagName.toLowerCase() === lowerSelector) {
                return node;
            }
        }
        return null;
    };
    
    /**
     * Coalesce value and defValue.
     * @param {*} value - First value to check.
     * @param {*} defValue - Default value.
     * @returns {*} Value if it is not null, else defValue.
     */
    var coalesce = function (value, defValue) {
        return isNull(value) ? defValue : value;
    };
    
    /**
     * Create a dom node from an html string. Expects a single root element.
     * @param {string} html - HTML content for the node.
     * @returns {Node} New DOM node.
     */
    var createNode = function (html) {
        var node = document.createElement('div');
        node.innerHTML = html;
        return node.children[0];
    };
    
    /**
     * Create a debounce handler to prevent a function from being called too frequently.
     * @param {Function} fn - Function to debounce.
     * @param {number} wait - Milliseconds to wait between running the function.
     * @returns {Function} A closure wrapping the passed in function.
     */
    var debounce = function (fn, wait) {
        var timeout, args, context, timestamp;
        
        return function () {
            context = this;
            args = [].slice.call(arguments, 0);
            timestamp = new Date();
            
            var later = function () {
                var last = new Date() - timestamp;
                if (last < wait) {
                    // if the latest call was less that the wait period ago then we reset the timeout to wait for the difference
                    timeout = setTimeout(later, wait - last);
                } else {
                    // if not we can null out the timer and run the latest
                    timeout = null;
                    fn.apply(context, args);
                }
            };
            
            // we only need to set the timer now if one isn't already running
            if (!timeout) {
                timeout = setTimeout(later, wait);
            }
        };
    };
    
    /**
     * Destroy an object.
     * @param {Object} obj - Object to destroy.
     */
    var destroy = function (obj) {
        if (isNull(obj)) {
            return;
        }
        if (obj.destroy) {
            obj.destroy();
        }
        obj = null;
    };
    
    /**
     * Deep equality comparer for objects.
     * @param {Object} x - First object to compare.
     * @param {Object} y - Object to compare to x.
     * @returns {bool} True if objects are equal.
     */
    var equals = function (x, y) {
        var p;
        for (p in y) {
            if (isUndefined(x[p])) {
                return false;
            }
        }
        
        for (p in y) {
            if (y[p]) {
                switch (typeof y[p]) {
                    case 'object':
                        if (!equals(y[p], x[p])) {
                            return false;
                        } break;
                    case 'function':
                        if (isUndefined(x[p]) || (p !== 'equals' && y[p].toString() !== x[p].toString())) {
                            return false;
                        }
                        break;
                    default:
                        if (y[p] !== x[p]) {
                            return false;
                        }
                }
            } else if (x[p]) {
                return false;
            }
        }
        
        for (p in x) {
            if (isUndefined(y[p])) {
                return false;
            }
        }
        
        return true;
    };
    
    /**
     * Recursively merge multiple objects, combining values of arguments into first argument. Rightmost values take precedence.
     * @returns {*} Updated first argument.
     */
    var extend = function () {
        var l = arguments.length, key, i;
        var result = l > 0 ? arguments[0] : {};
        if (isNull(result)) {
            result = {};
        }
        for (i = 1; i < l; i++) {
            for (key in arguments[i]) {
                if (arguments[i].hasOwnProperty(key)) {
                    if (isNull(arguments[i][key])) {
                        result[key] = null;
                    } else if (isArray(arguments[i][key])) {
                        result[key] = arguments[i][key].map(function (x) { return extend({}, x); });
                    } else if (isDate(arguments[i][key])) {
                        result[key] = new Date(arguments[i][key].getTime());
                    } else if (isNode(arguments[i][key])) {
                        result[key] = arguments[i][key].cloneNode();
                    } else if (isObject(arguments[i][key])) {
                        result[key] = extend(result[key] || {}, arguments[i][key]);
                    } else {
                        result[key] = arguments[i][key];
                    }
                }
            }
        }
        return result;
    };
    
    /**
     * Get an object from an array where the obj[key]===value.
     * @param {*[]} arr - Array to search in.
     * @param {string} key - Property name to check.
     * @param {*} value - Value to find.
     * @returns {*} Array value that matches or null.
     */
    var findByKey = function (arr, key, value) {
        if (!arr || isNull(key)) {
            return;
        }
        var i = arr.length - 1;
        while (i > -1) {
            if (arr[i][key] === value) {
                arr[i]._i = i;
                return arr[i];
            }
            i--;
        }
        return null;
    };
    
    /**
     * Get an element matching selector.
     * @param {string} selector - ID, class name, or any valid query selector.
     * @param {Node} container - Only search within this node.
     * @returns {Node} Matched node.
     */
    var get = function (selector, container) {
        if (typeof selector !== 'string') {
            return selector;
        }
        if (container) {
            return container.querySelector(selector);
        }
        var sel = selector.charAt(0);
        var simple = selector.indexOf(' ', 1) === -1 && selector.indexOf('.', 1) === -1;
        if (sel === '#' && simple) {
            return document.getElementById(selector.substr(1));
        } else if (sel === '.' && simple) {
            return document.getElementsByClassName(selector.substr(1));
        } else {
            return document.querySelector(selector);
        }
    };
    
    /**
     * Get all elements matching selector.
     * @param {string} selector - ID, class name, or any valid query selector.
     * @param {Node} container - Only search within this node.
     * @returns {Node[]} Non-live array of matched nodes.
     */
    var getAll = function (selector, container) {
        var list;
        if (selector.charAt(0) === '.' && selector.indexOf(',') === -1) {
            list = (container || document).getElementsByClassName(selector.substr(1));
        } else {
            list = (container || document).querySelectorAll(selector);
        }
        return Array.prototype.slice.call(list);
    };
    
    /**
     * Check if an element has a class assigned to it.
     * @param {Node} element - Element to check.
     * @param {string} className - Name of class to look for.
     * @returns {bool} True if the element has the class.
     */
    var hasClass = function (element, className) {
        var node = get(element);
        return node && node.classList && node.classList.contains(className);
    };
    
    /**
     * Check if variable has a value.
     * @param {*} val - Value to check.
     * @returns {bool} True if the object has a value greater than zero.
     */
    var hasPositiveValue = function (val) {
        return hasValue(val) && val > 0;
    };
    
    /**
     * Check if variable has a value.
     * @param {*} val - Value to check.
     * @returns {bool} True if the object is not null, undefined, or zero length.
     */
    var hasValue = function (val) {
        return !(isNull(val) || val.length === 0);
    };
    
    /**
     * Hide an element.
     * @param {Node} element - Element to hide.
     * @param {bool} maintainLayout - Maintain the spacing of the element if true, default to false.
     */
    var hide = function (element, maintainLayout) {
        var node = get(element);
        if (node) {
            if (coalesce(maintainLayout, false)) {
                addClass(node, 'invisible');
            } else {
                addClass(node, 'hidden');
            }
        }
    };
    
    /**
     * Check if a variable is an array.
     * @param {*} x - Variable to check the type of.
     * @returns {bool} True if x is an array.
     */
    var isArray = function (x) {
        return !isNull(x) && x.constructor === Array;
    };
    
    /**
     * Check if a variable is a date.
     * @param {*} x - Variable to check the type of.
     * @returns {bool} True if x is a date.
     */
    var isDate = function (x) {
        return !isNull(x) && x.getMonth && !isNaN(x.getTime());
    };
    
    /**
     * Check if a variable is a function.
     * @param {*} x - Variable to check the type of.
     * @returns {bool} True if x is a function.
     */
    var isFunction = function (x) {
        return typeof x === 'function';
    };
    
    /**
     * Check if a variable is a DOM node.
     * @param {*} x - Variable to check the type of.
     * @returns {bool} True if x is a node.
     */
    var isNode = function (x) {
        return !isNull(x) && x.nodeType === 1 && x.nodeName;
    };
    
    /**
     * Check if a variable is undefined or null.
     * @param {*} x - Variable to check the value of.
     * @returns {bool} True if x is undefined or null.
     */
    var isNull = function (x) {
        return isUndefined(x) || x === null;
    };
    
    /**
     * Check if a variable is a number.
     * @param {*} x - Variable to check the value of.
     * @returns {bool} True if x is a number.
     */
    var isNumber = function (x) {
        return typeof x === 'number' && !isNaN(x);
    };
    
    /**
     * Check if a variable is an object.
     * @param {*} x - Variable to check the type of.
     * @returns {bool} True if x is an object.
     */
    var isObject = function (x) {
        return typeof x === 'object';
    };
    
    /**
     * Check if a variable is a string.
     * @param {*} x - Variable to check the type of.
     * @returns {bool} True if x is a string.
     */
    var isString = function (x) {
        return typeof x === 'string';
    };
    
    /**
     * Check if a variable is undefined.
     * @param {*} x - Variable to check the value of.
     * @returns {bool} True if x is undefined.
     */
    var isUndefined = function (x) {
        return typeof x === 'undefined';
    };
    
    /**
     * Verify if an element would be matched by a selector.
     * @param {Node} element - Node to compare the selector to.
     * @param {string} selector - Valid CSS selector.
     * @returns {bool} True if the element matches the selector.
     */
    var matches = function (element, selector) {
        var p = Element.prototype;
        var f = p.matches || p.webkitMatchesSelector || p.mozMatchesSelector || p.msMatchesSelector || function (s) {
            return [].indexOf.call(getAll(s), this) !== -1;
        };
        return f.call(element, selector);
    };
    
    /**
     * Do nothing.
     */
    var noop = function () { };
    
    /**
     * Remove an event from an element.
     * @param {Node} element - Element to remove the event from.
     * @param {string} event - Event name to remove.
     * @param {Function} fn - Function to remove.
     * @param {bool} useCapture - Dispatch to this listener before any before it.
     */
    var off = function (element, event, fn, useCapture) {
        var node = get(element);
        if (node) {
            node.removeEventListener(event, fn, useCapture);
        }
    };
    
    /**
     * Attach an event to an element.
     * @param {Node} element - Element to attach the event to.
     * @param {string} event - Event name to attach.
     * @param {Function} fn - Function to run when the event fires.
     * @param {bool} useCapture - Dispatch to this listener before any before it.
     */
    var on = function (element, event, fn, useCapture) {
        var node = get(element);
        if (node) {
            node.addEventListener(event, fn, useCapture);
        }
    };
    
    /**
    * Set a function to run onChange, and run it immediately if needed.
     * @param {Node} element - Element to attach the event to.
    * @param {Function} changeFn - Function to run.
    * @param {bool} immediate - Run function immediately.
    */
    var onChange = function (element, changeFn, immediate) {
        var node = get(element);
        if (node) {
            on(node, 'change', changeFn);
            if (coalesce(immediate, true)) {
                changeFn.call(node);
            }
        }
    };
    
    /**
     * Run afunction when page is loaded
     * @param {Function} fn - Function to run.
     */
    var ready = function (fn) {
        // Sanity check
        if (!isFunction(fn)) {
            return;
        }
        // If document is already loaded, run method
        if (document.readyState === 'complete') {
            fn();
        }
        // Otherwise, wait until document is loaded
        document.addEventListener('DOMContentLoaded', fn, false);
    };
    
    /**
     * Remove a class from an element.
     * @param {Node} element - Element to remove the class from.
     * @param {string} className - Name of class to remove.
     */
    var removeClass = function (element, className) {
        var node = get(element);
        if (node) {
            node.classList.remove(className);
        }
    };
    
    /**
     * Set the text content of a node.
     * @param {Node} element - Element to update.
     * @param {string} text - New text content.
     */
    var setText = function (element, text) {
        var node = get(element);
        if (node) {
            node.textContent = text;
        }
    };
    
    /**
     * Show a hidden element.
     * @param {Node} element - Element to show.
     */
    var show = function (element) {
        var node = get(element);
        if (node) {
            removeClass(node, 'invisible');
            removeClass(node, 'hidden');
        }
    };
    
    /**
     * Get element style, or set multiple styles for an element at once.
     * @param {Node} element - Element to get/set styles for.
     * @param {Object|undefined} styles - Object with styleName:value, or undefined if getting.
     * @param {bool} overwrite - Overwrite existing styles if true, else merge.
     * @returns {string|undefined} Returns the element style if styles param is empty, else undefined. 
     */
    var style = function (element, styles, overwrite) {
        var node = get(element);
        if (node) {
            if (!isNull(styles)) {
                node.style.cssText = _toCSS($.coalesce(overwrite, false) ? extend(_parseCss(node.style.cssText), _toLowerKeys(styles)) : styles);
            } else {
                return node.style.cssText;
            }
        }
        return;
    };
    
    /**
     * Change the property names of an object to lowercase.
     * @param {Object} obj - Object to change properties of.
     * @returns {Object} New object with all lowercase property names.
     */
    var _toLowerKeys = function (obj) {
        if (isNull(obj)) {
            return {};
        }
        var key, keys = Object.keys(obj), i = keys.length, newObj = {};
        while (i--) {
            key = keys[i];
            newObj[key.toLowerCase()] = obj[key];
        }
        return newObj;
    };
    
    /**
     * Convert a string of CSS settings into an object.
     * @param {string} cssText - CSS list.
     * @returns {Object} Object with styleName:value. 
     */
    var _parseCss = function (cssText) {
        var regex = /([\w-]*)\s*:\s*([^;]*)/g;
        var match, properties = {};
        while ((match = regex.exec(cssText))) {
            properties[match[1].toLowerCase()] = match[2];
        }
        return properties;
    };
    
    /**
     * Convert an object to a string of CSS settings.
     * @param {Object} obj - Object with styleName:value. 
     * @returns {string} CSS list.
     */
    var _toCSS = function (obj) {
        if (isNull(obj)) {
            return '';
        }
        var key, keys = Object.keys(obj), i = keys.length, css = '';
        while (i--) {
            key = keys[i];
            if (!isNull(obj[key])) {
                css += key + ': ' + obj[key] + '; ';
            }
        }
        return css;
    };
    
    root.$ = {
        addClass: addClass,
        clone: clone,
        closest: closest,
        coalesce: coalesce,
        createNode: createNode,
        debounce: debounce,
        destroy: destroy,
        equals: equals,
        extend: extend,
        get: get,
        getAll: getAll,
        findByKey: findByKey,
        hasClass: hasClass,
        hasPositiveValue: hasPositiveValue,
        hasValue: hasValue,
        hide: hide,
        isArray: isArray,
        isDate: isDate,
        isFunction: isFunction,
        isNode: isNode,
        isNull: isNull,
        isNumber: isNumber,
        isObject: isObject,
        isString: isString,
        isUndefined: isUndefined,
        matches: matches,
        noop: noop,
        off: off,
        on: on,
        onChange: onChange,
        ready: ready,
        removeClass: removeClass,
        setText: setText,
        show: show,
        style: style
    };
}(this));
