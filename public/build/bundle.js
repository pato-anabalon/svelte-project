
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
        const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function set_attributes(node, attributes) {
        // @ts-ignore
        const descriptors = Object.getOwnPropertyDescriptors(node.__proto__);
        for (const key in attributes) {
            if (attributes[key] == null) {
                node.removeAttribute(key);
            }
            else if (key === 'style') {
                node.style.cssText = attributes[key];
            }
            else if (key === '__value') {
                node.value = node[key] = attributes[key];
            }
            else if (descriptors[key] && descriptors[key].set) {
                node[key] = attributes[key];
            }
            else {
                attr(node, key, attributes[key]);
            }
        }
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.35.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    var strictUriEncode = str => encodeURIComponent(str).replace(/[!'()*]/g, x => `%${x.charCodeAt(0).toString(16).toUpperCase()}`);

    var token = '%[a-f0-9]{2}';
    var singleMatcher = new RegExp(token, 'gi');
    var multiMatcher = new RegExp('(' + token + ')+', 'gi');

    function decodeComponents(components, split) {
    	try {
    		// Try to decode the entire string first
    		return decodeURIComponent(components.join(''));
    	} catch (err) {
    		// Do nothing
    	}

    	if (components.length === 1) {
    		return components;
    	}

    	split = split || 1;

    	// Split the array in 2 parts
    	var left = components.slice(0, split);
    	var right = components.slice(split);

    	return Array.prototype.concat.call([], decodeComponents(left), decodeComponents(right));
    }

    function decode(input) {
    	try {
    		return decodeURIComponent(input);
    	} catch (err) {
    		var tokens = input.match(singleMatcher);

    		for (var i = 1; i < tokens.length; i++) {
    			input = decodeComponents(tokens, i).join('');

    			tokens = input.match(singleMatcher);
    		}

    		return input;
    	}
    }

    function customDecodeURIComponent(input) {
    	// Keep track of all the replacements and prefill the map with the `BOM`
    	var replaceMap = {
    		'%FE%FF': '\uFFFD\uFFFD',
    		'%FF%FE': '\uFFFD\uFFFD'
    	};

    	var match = multiMatcher.exec(input);
    	while (match) {
    		try {
    			// Decode as big chunks as possible
    			replaceMap[match[0]] = decodeURIComponent(match[0]);
    		} catch (err) {
    			var result = decode(match[0]);

    			if (result !== match[0]) {
    				replaceMap[match[0]] = result;
    			}
    		}

    		match = multiMatcher.exec(input);
    	}

    	// Add `%C2` at the end of the map to make sure it does not replace the combinator before everything else
    	replaceMap['%C2'] = '\uFFFD';

    	var entries = Object.keys(replaceMap);

    	for (var i = 0; i < entries.length; i++) {
    		// Replace all decoded components
    		var key = entries[i];
    		input = input.replace(new RegExp(key, 'g'), replaceMap[key]);
    	}

    	return input;
    }

    var decodeUriComponent = function (encodedURI) {
    	if (typeof encodedURI !== 'string') {
    		throw new TypeError('Expected `encodedURI` to be of type `string`, got `' + typeof encodedURI + '`');
    	}

    	try {
    		encodedURI = encodedURI.replace(/\+/g, ' ');

    		// Try the built in decoder first
    		return decodeURIComponent(encodedURI);
    	} catch (err) {
    		// Fallback to a more advanced decoder
    		return customDecodeURIComponent(encodedURI);
    	}
    };

    var splitOnFirst = (string, separator) => {
    	if (!(typeof string === 'string' && typeof separator === 'string')) {
    		throw new TypeError('Expected the arguments to be of type `string`');
    	}

    	if (separator === '') {
    		return [string];
    	}

    	const separatorIndex = string.indexOf(separator);

    	if (separatorIndex === -1) {
    		return [string];
    	}

    	return [
    		string.slice(0, separatorIndex),
    		string.slice(separatorIndex + separator.length)
    	];
    };

    function encoderForArrayFormat(options) {
    	switch (options.arrayFormat) {
    		case 'index':
    			return key => (result, value) => {
    				const index = result.length;
    				if (value === undefined) {
    					return result;
    				}

    				if (value === null) {
    					return [...result, [encode$1(key, options), '[', index, ']'].join('')];
    				}

    				return [
    					...result,
    					[encode$1(key, options), '[', encode$1(index, options), ']=', encode$1(value, options)].join('')
    				];
    			};

    		case 'bracket':
    			return key => (result, value) => {
    				if (value === undefined) {
    					return result;
    				}

    				if (value === null) {
    					return [...result, [encode$1(key, options), '[]'].join('')];
    				}

    				return [...result, [encode$1(key, options), '[]=', encode$1(value, options)].join('')];
    			};

    		case 'comma':
    			return key => (result, value, index) => {
    				if (value === null || value === undefined || value.length === 0) {
    					return result;
    				}

    				if (index === 0) {
    					return [[encode$1(key, options), '=', encode$1(value, options)].join('')];
    				}

    				return [[result, encode$1(value, options)].join(',')];
    			};

    		default:
    			return key => (result, value) => {
    				if (value === undefined) {
    					return result;
    				}

    				if (value === null) {
    					return [...result, encode$1(key, options)];
    				}

    				return [...result, [encode$1(key, options), '=', encode$1(value, options)].join('')];
    			};
    	}
    }

    function parserForArrayFormat(options) {
    	let result;

    	switch (options.arrayFormat) {
    		case 'index':
    			return (key, value, accumulator) => {
    				result = /\[(\d*)\]$/.exec(key);

    				key = key.replace(/\[\d*\]$/, '');

    				if (!result) {
    					accumulator[key] = value;
    					return;
    				}

    				if (accumulator[key] === undefined) {
    					accumulator[key] = {};
    				}

    				accumulator[key][result[1]] = value;
    			};

    		case 'bracket':
    			return (key, value, accumulator) => {
    				result = /(\[\])$/.exec(key);
    				key = key.replace(/\[\]$/, '');

    				if (!result) {
    					accumulator[key] = value;
    					return;
    				}

    				if (accumulator[key] === undefined) {
    					accumulator[key] = [value];
    					return;
    				}

    				accumulator[key] = [].concat(accumulator[key], value);
    			};

    		case 'comma':
    			return (key, value, accumulator) => {
    				const isArray = typeof value === 'string' && value.split('').indexOf(',') > -1;
    				const newValue = isArray ? value.split(',') : value;
    				accumulator[key] = newValue;
    			};

    		default:
    			return (key, value, accumulator) => {
    				if (accumulator[key] === undefined) {
    					accumulator[key] = value;
    					return;
    				}

    				accumulator[key] = [].concat(accumulator[key], value);
    			};
    	}
    }

    function encode$1(value, options) {
    	if (options.encode) {
    		return options.strict ? strictUriEncode(value) : encodeURIComponent(value);
    	}

    	return value;
    }

    function decode$1(value, options) {
    	if (options.decode) {
    		return decodeUriComponent(value);
    	}

    	return value;
    }

    function keysSorter(input) {
    	if (Array.isArray(input)) {
    		return input.sort();
    	}

    	if (typeof input === 'object') {
    		return keysSorter(Object.keys(input))
    			.sort((a, b) => Number(a) - Number(b))
    			.map(key => input[key]);
    	}

    	return input;
    }

    function parseValue(value, options) {
    	if (options.parseNumbers && !Number.isNaN(Number(value)) && (typeof value === 'string' && value.trim() !== '')) {
    		value = Number(value);
    	} else if (options.parseBooleans && value !== null && (value.toLowerCase() === 'true' || value.toLowerCase() === 'false')) {
    		value = value.toLowerCase() === 'true';
    	}

    	return value;
    }

    function parse(input, options) {
    	options = Object.assign({
    		decode: true,
    		sort: true,
    		arrayFormat: 'none',
    		parseNumbers: false,
    		parseBooleans: false
    	}, options);

    	const formatter = parserForArrayFormat(options);

    	// Create an object with no prototype
    	const ret = Object.create(null);

    	if (typeof input !== 'string') {
    		return ret;
    	}

    	input = input.trim().replace(/^[?#&]/, '');

    	if (!input) {
    		return ret;
    	}

    	for (const param of input.split('&')) {
    		let [key, value] = splitOnFirst(param.replace(/\+/g, ' '), '=');

    		// Missing `=` should be `null`:
    		// http://w3.org/TR/2012/WD-url-20120524/#collect-url-parameters
    		value = value === undefined ? null : decode$1(value, options);
    		formatter(decode$1(key, options), value, ret);
    	}

    	for (const key of Object.keys(ret)) {
    		const value = ret[key];
    		if (typeof value === 'object' && value !== null) {
    			for (const k of Object.keys(value)) {
    				value[k] = parseValue(value[k], options);
    			}
    		} else {
    			ret[key] = parseValue(value, options);
    		}
    	}

    	if (options.sort === false) {
    		return ret;
    	}

    	return (options.sort === true ? Object.keys(ret).sort() : Object.keys(ret).sort(options.sort)).reduce((result, key) => {
    		const value = ret[key];
    		if (Boolean(value) && typeof value === 'object' && !Array.isArray(value)) {
    			// Sort object keys, not values
    			result[key] = keysSorter(value);
    		} else {
    			result[key] = value;
    		}

    		return result;
    	}, Object.create(null));
    }
    var parse_1 = parse;

    var stringify = (object, options) => {
    	if (!object) {
    		return '';
    	}

    	options = Object.assign({
    		encode: true,
    		strict: true,
    		arrayFormat: 'none'
    	}, options);

    	const formatter = encoderForArrayFormat(options);
    	const keys = Object.keys(object);

    	if (options.sort !== false) {
    		keys.sort(options.sort);
    	}

    	return keys.map(key => {
    		const value = object[key];

    		if (value === undefined) {
    			return '';
    		}

    		if (value === null) {
    			return encode$1(key, options);
    		}

    		if (Array.isArray(value)) {
    			return value
    				.reduce(formatter(key), [])
    				.join('&');
    		}

    		return encode$1(key, options) + '=' + encode$1(value, options);
    	}).filter(x => x.length > 0).join('&');
    };

    var defaultExport = /*@__PURE__*/(function (Error) {
      function defaultExport(route, path) {
        var message = "Unreachable '" + (route !== '/' ? route.replace(/\/$/, '') : route) + "', segment '" + path + "' is not defined";
        Error.call(this, message);
        this.message = message;
        this.route = route;
        this.path = path;
      }

      if ( Error ) defaultExport.__proto__ = Error;
      defaultExport.prototype = Object.create( Error && Error.prototype );
      defaultExport.prototype.constructor = defaultExport;

      return defaultExport;
    }(Error));

    function buildMatcher(path, parent) {
      var regex;

      var _isSplat;

      var _priority = -100;

      var keys = [];
      regex = path.replace(/[-$.]/g, '\\$&').replace(/\(/g, '(?:').replace(/\)/g, ')?').replace(/([:*]\w+)(?:<([^<>]+?)>)?/g, function (_, key, expr) {
        keys.push(key.substr(1));

        if (key.charAt() === ':') {
          _priority += 100;
          return ("((?!#)" + (expr || '[^#/]+?') + ")");
        }

        _isSplat = true;
        _priority += 500;
        return ("((?!#)" + (expr || '[^#]+?') + ")");
      });

      try {
        regex = new RegExp(("^" + regex + "$"));
      } catch (e) {
        throw new TypeError(("Invalid route expression, given '" + parent + "'"));
      }

      var _hashed = path.includes('#') ? 0.5 : 1;

      var _depth = path.length * _priority * _hashed;

      return {
        keys: keys,
        regex: regex,
        _depth: _depth,
        _isSplat: _isSplat
      };
    }
    var PathMatcher = function PathMatcher(path, parent) {
      var ref = buildMatcher(path, parent);
      var keys = ref.keys;
      var regex = ref.regex;
      var _depth = ref._depth;
      var _isSplat = ref._isSplat;
      return {
        _isSplat: _isSplat,
        _depth: _depth,
        match: function (value) {
          var matches = value.match(regex);

          if (matches) {
            return keys.reduce(function (prev, cur, i) {
              prev[cur] = typeof matches[i + 1] === 'string' ? decodeURIComponent(matches[i + 1]) : null;
              return prev;
            }, {});
          }
        }
      };
    };

    PathMatcher.push = function push (key, prev, leaf, parent) {
      var root = prev[key] || (prev[key] = {});

      if (!root.pattern) {
        root.pattern = new PathMatcher(key, parent);
        root.route = (leaf || '').replace(/\/$/, '') || '/';
      }

      prev.keys = prev.keys || [];

      if (!prev.keys.includes(key)) {
        prev.keys.push(key);
        PathMatcher.sort(prev);
      }

      return root;
    };

    PathMatcher.sort = function sort (root) {
      root.keys.sort(function (a, b) {
        return root[a].pattern._depth - root[b].pattern._depth;
      });
    };

    function merge$1(path, parent) {
      return ("" + (parent && parent !== '/' ? parent : '') + (path || ''));
    }
    function walk(path, cb) {
      var matches = path.match(/<[^<>]*\/[^<>]*>/);

      if (matches) {
        throw new TypeError(("RegExp cannot contain slashes, given '" + matches + "'"));
      }

      var parts = path.split(/(?=\/|#)/);
      var root = [];

      if (parts[0] !== '/') {
        parts.unshift('/');
      }

      parts.some(function (x, i) {
        var parent = root.slice(1).concat(x).join('') || null;
        var segment = parts.slice(i + 1).join('') || null;
        var retval = cb(x, parent, segment ? ("" + (x !== '/' ? x : '') + segment) : null);
        root.push(x);
        return retval;
      });
    }
    function reduce(key, root, _seen) {
      var params = {};
      var out = [];
      var splat;
      walk(key, function (x, leaf, extra) {
        var found;

        if (!root.keys) {
          throw new defaultExport(key, x);
        }

        root.keys.some(function (k) {
          if (_seen.includes(k)) { return false; }
          var ref = root[k].pattern;
          var match = ref.match;
          var _isSplat = ref._isSplat;
          var matches = match(_isSplat ? extra || x : x);

          if (matches) {
            Object.assign(params, matches);

            if (root[k].route) {
              var routeInfo = Object.assign({}, root[k].info); // properly handle exact-routes!

              var hasMatch = false;

              if (routeInfo.exact) {
                hasMatch = extra === null;
              } else {
                hasMatch = !(x && leaf === null) || x === leaf || _isSplat || !extra;
              }

              routeInfo.matches = hasMatch;
              routeInfo.params = Object.assign({}, params);
              routeInfo.route = root[k].route;
              routeInfo.path = _isSplat && extra || leaf || x;
              out.push(routeInfo);
            }

            if (extra === null && !root[k].keys) {
              return true;
            }

            if (k !== '/') { _seen.push(k); }
            splat = _isSplat;
            root = root[k];
            found = true;
            return true;
          }

          return false;
        });

        if (!(found || root.keys.some(function (k) { return root[k].pattern.match(x); }))) {
          throw new defaultExport(key, x);
        }

        return splat || !found;
      });
      return out;
    }
    function find(path, routes, retries) {
      var get = reduce.bind(null, path, routes);
      var set = [];

      while (retries > 0) {
        retries -= 1;

        try {
          return get(set);
        } catch (e) {
          if (retries > 0) {
            return get(set);
          }

          throw e;
        }
      }
    }
    function add(path, routes, parent, routeInfo) {
      var fullpath = merge$1(path, parent);
      var root = routes;
      var key;

      if (routeInfo && routeInfo.nested !== true) {
        key = routeInfo.key;
        delete routeInfo.key;
      }

      walk(fullpath, function (x, leaf) {
        root = PathMatcher.push(x, root, leaf, fullpath);

        if (x !== '/') {
          root.info = root.info || Object.assign({}, routeInfo);
        }
      });
      root.info = root.info || Object.assign({}, routeInfo);

      if (key) {
        root.info.key = key;
      }

      return fullpath;
    }
    function rm(path, routes, parent) {
      var fullpath = merge$1(path, parent);
      var root = routes;
      var leaf = null;
      var key = null;
      walk(fullpath, function (x) {
        if (!root) {
          leaf = null;
          return true;
        }

        if (!root.keys) {
          throw new defaultExport(path, x);
        }

        key = x;
        leaf = root;
        root = root[key];
      });

      if (!(leaf && key)) {
        throw new defaultExport(path, key);
      }

      if (leaf === routes) {
        leaf = routes['/'];
      }

      if (leaf.route !== key) {
        var offset = leaf.keys.indexOf(key);

        if (offset === -1) {
          throw new defaultExport(path, key);
        }

        leaf.keys.splice(offset, 1);
        PathMatcher.sort(leaf);
        delete leaf[key];
      } // nested routes are upgradeable, so keep original info...


      if (root.route === leaf.route && (!root.info || root.info.key === leaf.info.key)) { delete leaf.info; }
    }

    var Router$1 = function Router() {
      var routes = {};
      var stack = [];
      return {
        resolve: function (path, cb) {
          var url = path.split('?')[0];
          var seen = [];
          walk(url, function (x, leaf, extra) {
            try {
              cb(null, find(leaf, routes, 1).filter(function (r) {
                if (!seen.includes(r.path)) {
                  seen.push(r.path);
                  return true;
                }

                return false;
              }));
            } catch (e) {
              cb(e, []);
            }
          });
        },
        mount: function (path, cb) {
          if (path !== '/') {
            stack.push(path);
          }

          cb();
          stack.pop();
        },
        find: function (path, retries) { return find(path, routes, retries === true ? 2 : retries || 1); },
        add: function (path, routeInfo) { return add(path, routes, stack.join(''), routeInfo); },
        rm: function (path) { return rm(path, routes, stack.join('')); }
      };
    };

    Router$1.matches = function matches (uri, path) {
      return buildMatcher(uri, path).regex.test(path);
    };

    function objectWithoutProperties (obj, exclude) { var target = {}; for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k) && exclude.indexOf(k) === -1) target[k] = obj[k]; return target; }

    var cache = {};
    var baseTag = document.getElementsByTagName('base');
    var basePrefix = (baseTag[0] && baseTag[0].href) || '/';

    var ROOT_URL = basePrefix.replace(window.location.origin, '');

    var router = writable({
      path: '/',
      query: {},
      params: {},
      initial: true,
    });

    var CTX_ROUTER = {};
    var CTX_ROUTE = {};

    // use location.hash on embedded pages, e.g. Svelte REPL
    var HASHCHANGE = window.location.origin === 'null';

    function hashchangeEnable(value) {
      if (typeof value === 'boolean') {
        HASHCHANGE = !!value;
      }

      return HASHCHANGE;
    }

    function fixedLocation(path, callback, doFinally) {
      var baseUri = HASHCHANGE ? window.location.hash.replace('#', '') : window.location.pathname;

      // this will rebase anchors to avoid location changes
      if (path.charAt() !== '/') {
        path = baseUri + path;
      }

      var currentURL = baseUri + window.location.hash + window.location.search;

      // do not change location et all...
      if (currentURL !== path) {
        callback(path);
      }

      // invoke final guard regardless of previous result
      if (typeof doFinally === 'function') {
        doFinally();
      }
    }

    function cleanPath(uri, fix) {
      return uri !== '/' || fix ? uri.replace(/\/$/, '') : uri;
    }

    function navigateTo(path, options) {
      var ref = options || {};
      var reload = ref.reload;
      var replace = ref.replace;
      var params = ref.params;
      var queryParams = ref.queryParams;

      // If path empty or no string, throws error
      if (!path || typeof path !== 'string' || (path[0] !== '/' && path[0] !== '#')) {
        throw new Error(("Expecting '/" + path + "' or '#" + path + "', given '" + path + "'"));
      }

      if (params) {
        path = path.replace(/:([a-zA-Z][a-zA-Z0-9_-]*)/g, function (_, key) { return params[key]; });
      }

      if (queryParams) {
        var qs = stringify(queryParams);

        if (qs) {
          path += "?" + qs;
        }
      }

      if (HASHCHANGE) {
        var fixedURL = path.replace(/^#|#$/g, '');

        if (ROOT_URL !== '/') {
          fixedURL = fixedURL.replace(cleanPath(ROOT_URL), '');
        }

        window.location.hash = fixedURL !== '/' ? fixedURL : '';
        return;
      }

      // If no History API support, fallbacks to URL redirect
      if (reload || !window.history.pushState || !window.dispatchEvent) {
        window.location.href = path;
        return;
      }

      // If has History API support, uses it
      fixedLocation(path, function (nextURL) {
        window.history[replace ? 'replaceState' : 'pushState'](null, '', nextURL);
        window.dispatchEvent(new Event('popstate'));
      });
    }

    function getProps(given, required) {
      var sub = given.props;
      var rest = objectWithoutProperties( given, ["props"] );
      var others = rest;

      // prune all declared props from this component
      required.forEach(function (k) {
        delete others[k];
      });

      return Object.assign({}, sub,
        others);
    }

    function isActive(uri, path, exact) {
      if (!cache[[uri, path, exact]]) {
        if (exact !== true && path.indexOf(uri) === 0) {
          cache[[uri, path, exact]] = /^[#/?]?$/.test(path.substr(uri.length, 1));
        } else if (uri.includes('*') || uri.includes(':')) {
          cache[[uri, path, exact]] = Router$1.matches(uri, path);
        } else {
          cache[[uri, path, exact]] = cleanPath(path) === uri;
        }
      }

      return cache[[uri, path, exact]];
    }

    function isPromise(object) {
      return object && typeof object.then === 'function';
    }

    function isSvelteComponent(object) {
      return object && object.prototype;
    }

    var baseRouter = new Router$1();
    var routeInfo = writable({});

    // private registries
    var onError = {};
    var shared = {};

    var errors = [];
    var routers = 0;
    var interval;
    var currentURL;

    // take snapshot from current state...
    router.subscribe(function (value) { shared.router = value; });
    routeInfo.subscribe(function (value) { shared.routeInfo = value; });

    function doFallback(failure, fallback) {
      routeInfo.update(function (defaults) {
        var obj;

        return (Object.assign({}, defaults,
        ( obj = {}, obj[fallback] = Object.assign({}, shared.router,
          {failure: failure}), obj )));
      });
    }

    function handleRoutes(map, params) {
      var keys = [];

      map.some(function (x) {
        if (x.key && x.matches && !shared.routeInfo[x.key]) {
          if (x.redirect && (x.condition === null || x.condition(shared.router) !== true)) {
            if (x.exact && shared.router.path !== x.path) { return false; }
            navigateTo(x.redirect);
            return true;
          }

          if (x.exact) {
            keys.push(x.key);
          }

          // extend shared params...
          Object.assign(params, x.params);

          // upgrade matching routes!
          routeInfo.update(function (defaults) {
            var obj;

            return (Object.assign({}, defaults,
            ( obj = {}, obj[x.key] = Object.assign({}, shared.router,
              x), obj )));
          });
        }

        return false;
      });

      return keys;
    }

    function evtHandler() {
      var baseUri = !HASHCHANGE ? window.location.href.replace(window.location.origin, '') : window.location.hash || '/';
      var failure;

      // unprefix active URL
      if (ROOT_URL !== '/') {
        baseUri = baseUri.replace(cleanPath(ROOT_URL), '');
      }

      // skip given anchors if already exists on document, see #43
      if (
        /^#[\w-]+$/.test(window.location.hash)
        && document.querySelector(window.location.hash)
        && currentURL === baseUri.split('#')[0]
      ) { return; }

      // trailing slash is required to keep route-info on nested routes!
      // see: https://github.com/pateketrueke/abstract-nested-router/commit/0f338384bddcfbaee30f3ea2c4eb0c24cf5174cd
      var ref = baseUri.replace('/#', '#').replace(/^#\//, '/').split('?');
      var fixedUri = ref[0];
      var qs = ref[1];
      var fullpath = fixedUri.replace(/\/?$/, '/');
      var query = parse_1(qs);
      var params = {};
      var keys = [];

      // reset current state
      routeInfo.set({});

      if (currentURL !== baseUri) {
        currentURL = baseUri;
        router.set({
          path: cleanPath(fullpath),
          query: query,
          params: params,
        });
      }

      // load all matching routes...
      baseRouter.resolve(fullpath, function (err, result) {
        if (err) {
          failure = err;
          return;
        }

        // save exact-keys for deletion after failures!
        keys.push.apply(keys, handleRoutes(result, params));
      });

      var toDelete = {};

      // it's fine to omit failures for '/' paths
      if (failure && failure.path !== '/') {
        keys.reduce(function (prev, cur) {
          prev[cur] = null;
          return prev;
        }, toDelete);
      } else {
        failure = null;
      }

      // clear previously failed handlers
      errors.forEach(function (cb) { return cb(); });
      errors = [];

      try {
        // clear routes that not longer matches!
        baseRouter.find(cleanPath(fullpath))
          .forEach(function (sub) {
            if (sub.exact && !sub.matches) {
              toDelete[sub.key] = null;
            }
          });
      } catch (e) {
        // this is fine
      }

      // drop unwanted routes...
      routeInfo.update(function (defaults) { return (Object.assign({}, defaults,
        toDelete)); });

      var fallback;

      // invoke error-handlers to clear out previous state!
      Object.keys(onError).forEach(function (root) {
        if (isActive(root, fullpath, false)) {
          var fn = onError[root].callback;

          fn(failure);
          errors.push(fn);
        }

        if (!fallback && onError[root].fallback) {
          fallback = onError[root].fallback;
        }
      });

      // handle unmatched fallbacks
      if (failure && fallback) {
        doFallback(failure, fallback);
      }
    }

    function findRoutes() {
      clearTimeout(interval);
      interval = setTimeout(evtHandler);
    }

    function addRouter(root, fallback, callback) {
      if (!routers) {
        window.addEventListener('popstate', findRoutes, false);
      }

      // register error-handlers
      if (!onError[root] || fallback) {
        onError[root] = { fallback: fallback, callback: callback };
      }

      routers += 1;

      return function () {
        routers -= 1;

        if (!routers) {
          window.removeEventListener('popstate', findRoutes, false);
        }
      };
    }

    /* node_modules/yrv/build/lib/Router.svelte generated by Svelte v3.35.0 */

    // (88:0) {#if !disabled}
    function create_if_block$3(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[7].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[6], null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 64) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[6], dirty, null, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(88:0) {#if !disabled}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$8(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = !/*disabled*/ ctx[0] && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!/*disabled*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*disabled*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$3(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function unassignRoute(route) {
    	try {
    		baseRouter.rm(route);
    	} catch(e) {
    		
    	} // 🔥 this is fine...

    	findRoutes();
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let $basePath;
    	let $router;
    	validate_store(router, "router");
    	component_subscribe($$self, router, $$value => $$invalidate(5, $router = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Router", slots, ['default']);
    	let cleanup;
    	let failure;
    	let fallback;
    	let { path = "/" } = $$props;
    	let { pending = null } = $$props;
    	let { disabled = false } = $$props;
    	let { condition = null } = $$props;
    	const routerContext = getContext(CTX_ROUTER);
    	const basePath = routerContext ? routerContext.basePath : writable(path);
    	validate_store(basePath, "basePath");
    	component_subscribe($$self, basePath, value => $$invalidate(11, $basePath = value));

    	const fixedRoot = $basePath !== path && $basePath !== "/"
    	? `${$basePath}${path !== "/" ? path : ""}`
    	: path;

    	function assignRoute(key, route, detail) {
    		key = key || Math.random().toString(36).substr(2);

    		// consider as nested routes if they does not have any segment
    		const nested = !route.substr(1).includes("/");

    		const handler = { key, nested, ...detail };
    		let fullpath;

    		baseRouter.mount(fixedRoot, () => {
    			fullpath = baseRouter.add(route, handler);
    			fallback = handler.fallback && key || fallback;
    		});

    		findRoutes();
    		return [key, fullpath];
    	}

    	function onError(err) {
    		failure = err;

    		if (failure && fallback) {
    			doFallback(failure, fallback);
    		}
    	}

    	onMount(() => {
    		cleanup = addRouter(fixedRoot, fallback, onError);
    	});

    	onDestroy(() => {
    		if (cleanup) cleanup();
    	});

    	setContext(CTX_ROUTER, {
    		basePath,
    		assignRoute,
    		unassignRoute,
    		pendingComponent: pending
    	});

    	const writable_props = ["path", "pending", "disabled", "condition"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("path" in $$props) $$invalidate(2, path = $$props.path);
    		if ("pending" in $$props) $$invalidate(3, pending = $$props.pending);
    		if ("disabled" in $$props) $$invalidate(0, disabled = $$props.disabled);
    		if ("condition" in $$props) $$invalidate(4, condition = $$props.condition);
    		if ("$$scope" in $$props) $$invalidate(6, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		writable,
    		CTX_ROUTER,
    		router,
    		baseRouter,
    		addRouter,
    		findRoutes,
    		doFallback,
    		onMount,
    		onDestroy,
    		getContext,
    		setContext,
    		cleanup,
    		failure,
    		fallback,
    		path,
    		pending,
    		disabled,
    		condition,
    		routerContext,
    		basePath,
    		fixedRoot,
    		assignRoute,
    		unassignRoute,
    		onError,
    		$basePath,
    		$router
    	});

    	$$self.$inject_state = $$props => {
    		if ("cleanup" in $$props) cleanup = $$props.cleanup;
    		if ("failure" in $$props) failure = $$props.failure;
    		if ("fallback" in $$props) fallback = $$props.fallback;
    		if ("path" in $$props) $$invalidate(2, path = $$props.path);
    		if ("pending" in $$props) $$invalidate(3, pending = $$props.pending);
    		if ("disabled" in $$props) $$invalidate(0, disabled = $$props.disabled);
    		if ("condition" in $$props) $$invalidate(4, condition = $$props.condition);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*condition, $router*/ 48) {
    			if (condition) {
    				$$invalidate(0, disabled = !condition($router));
    			}
    		}
    	};

    	return [disabled, basePath, path, pending, condition, $router, $$scope, slots];
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {
    			path: 2,
    			pending: 3,
    			disabled: 0,
    			condition: 4
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment$8.name
    		});
    	}

    	get path() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set path(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pending() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pending(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disabled() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disabled(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get condition() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set condition(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/yrv/build/lib/Route.svelte generated by Svelte v3.35.0 */

    const get_default_slot_changes = dirty => ({
    	router: dirty & /*activeRouter*/ 4,
    	props: dirty & /*activeProps*/ 8
    });

    const get_default_slot_context = ctx => ({
    	router: /*activeRouter*/ ctx[2],
    	props: /*activeProps*/ ctx[3]
    });

    // (88:0) {#if activeRouter}
    function create_if_block$2(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_1, create_if_block_5, create_else_block_1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (!/*hasLoaded*/ ctx[4]) return 0;
    		if (/*component*/ ctx[0]) return 1;
    		return 2;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(88:0) {#if activeRouter}",
    		ctx
    	});

    	return block;
    }

    // (102:4) {:else}
    function create_else_block_1(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[16].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[15], get_default_slot_context);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope, activeRouter, activeProps*/ 32780) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[15], dirty, get_default_slot_changes, get_default_slot_context);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(102:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (100:4) {#if component}
    function create_if_block_5(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [{ router: /*activeRouter*/ ctx[2] }, /*activeProps*/ ctx[3]];
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*activeRouter, activeProps*/ 12)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*activeRouter*/ 4 && { router: /*activeRouter*/ ctx[2] },
    					dirty & /*activeProps*/ 8 && get_spread_object(/*activeProps*/ ctx[3])
    				])
    			: {};

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(100:4) {#if component}",
    		ctx
    	});

    	return block;
    }

    // (89:2) {#if !hasLoaded}
    function create_if_block_1(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = (/*pending*/ ctx[1] || /*pendingComponent*/ ctx[5]) && create_if_block_2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*pending*/ ctx[1] || /*pendingComponent*/ ctx[5]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*pending*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(89:2) {#if !hasLoaded}",
    		ctx
    	});

    	return block;
    }

    // (90:4) {#if pending || pendingComponent}
    function create_if_block_2(ctx) {
    	let show_if;
    	let show_if_1;
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block_3, create_if_block_4, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type_1(ctx, dirty) {
    		if (dirty & /*pending*/ 2) show_if = !!isSvelteComponent(/*pending*/ ctx[1]);
    		if (show_if) return 0;
    		if (show_if_1 == null) show_if_1 = !!isSvelteComponent(/*pendingComponent*/ ctx[5]);
    		if (show_if_1) return 1;
    		return 2;
    	}

    	current_block_type_index = select_block_type_1(ctx, -1);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_1(ctx, dirty);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(90:4) {#if pending || pendingComponent}",
    		ctx
    	});

    	return block;
    }

    // (95:6) {:else}
    function create_else_block$1(ctx) {
    	let t_value = (/*pending*/ ctx[1] || /*pendingComponent*/ ctx[5]) + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*pending*/ 2 && t_value !== (t_value = (/*pending*/ ctx[1] || /*pendingComponent*/ ctx[5]) + "")) set_data_dev(t, t_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(95:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (93:52) 
    function create_if_block_4(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [{ router: /*activeRouter*/ ctx[2] }, /*activeProps*/ ctx[3]];
    	var switch_value = /*pendingComponent*/ ctx[5];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*activeRouter, activeProps*/ 12)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*activeRouter*/ 4 && { router: /*activeRouter*/ ctx[2] },
    					dirty & /*activeProps*/ 8 && get_spread_object(/*activeProps*/ ctx[3])
    				])
    			: {};

    			if (switch_value !== (switch_value = /*pendingComponent*/ ctx[5])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(93:52) ",
    		ctx
    	});

    	return block;
    }

    // (91:6) {#if isSvelteComponent(pending)}
    function create_if_block_3(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [{ router: /*activeRouter*/ ctx[2] }, /*activeProps*/ ctx[3]];
    	var switch_value = /*pending*/ ctx[1];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*activeRouter, activeProps*/ 12)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*activeRouter*/ 4 && { router: /*activeRouter*/ ctx[2] },
    					dirty & /*activeProps*/ 8 && get_spread_object(/*activeProps*/ ctx[3])
    				])
    			: {};

    			if (switch_value !== (switch_value = /*pending*/ ctx[1])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(91:6) {#if isSvelteComponent(pending)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*activeRouter*/ ctx[2] && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*activeRouter*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*activeRouter*/ 4) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let $routePath;
    	let $routeInfo;
    	validate_store(routeInfo, "routeInfo");
    	component_subscribe($$self, routeInfo, $$value => $$invalidate(14, $routeInfo = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Route", slots, ['default']);
    	let { key = null } = $$props;
    	let { path = "/" } = $$props;
    	let { exact = null } = $$props;
    	let { pending = null } = $$props;
    	let { disabled = false } = $$props;
    	let { fallback = null } = $$props;
    	let { component = null } = $$props;
    	let { condition = null } = $$props;
    	let { redirect = null } = $$props;

    	// replacement for `Object.keys(arguments[0].$$.props)`
    	const thisProps = [
    		"key",
    		"path",
    		"exact",
    		"pending",
    		"disabled",
    		"fallback",
    		"component",
    		"condition",
    		"redirect"
    	];

    	const routeContext = getContext(CTX_ROUTE);
    	const routerContext = getContext(CTX_ROUTER);
    	const { assignRoute, unassignRoute, pendingComponent } = routerContext || {};
    	const routePath = routeContext ? routeContext.routePath : writable(path);
    	validate_store(routePath, "routePath");
    	component_subscribe($$self, routePath, value => $$invalidate(18, $routePath = value));
    	let activeRouter = null;
    	let activeProps = {};
    	let fullpath;
    	let hasLoaded;

    	const fixedRoot = $routePath !== path && $routePath !== "/"
    	? `${$routePath}${path !== "/" ? path : ""}`
    	: path;

    	function resolve() {
    		const fixedRoute = path !== fixedRoot && fixedRoot.substr(-1) !== "/"
    		? `${fixedRoot}/`
    		: fixedRoot;

    		$$invalidate(7, [key, fullpath] = assignRoute(key, fixedRoute, { condition, redirect, fallback, exact }), key);
    	}

    	resolve();

    	onDestroy(() => {
    		if (unassignRoute) {
    			unassignRoute(fullpath);
    		}
    	});

    	setContext(CTX_ROUTE, { routePath });

    	$$self.$$set = $$new_props => {
    		$$invalidate(26, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ("key" in $$new_props) $$invalidate(7, key = $$new_props.key);
    		if ("path" in $$new_props) $$invalidate(8, path = $$new_props.path);
    		if ("exact" in $$new_props) $$invalidate(9, exact = $$new_props.exact);
    		if ("pending" in $$new_props) $$invalidate(1, pending = $$new_props.pending);
    		if ("disabled" in $$new_props) $$invalidate(10, disabled = $$new_props.disabled);
    		if ("fallback" in $$new_props) $$invalidate(11, fallback = $$new_props.fallback);
    		if ("component" in $$new_props) $$invalidate(0, component = $$new_props.component);
    		if ("condition" in $$new_props) $$invalidate(12, condition = $$new_props.condition);
    		if ("redirect" in $$new_props) $$invalidate(13, redirect = $$new_props.redirect);
    		if ("$$scope" in $$new_props) $$invalidate(15, $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		writable,
    		routeInfo,
    		CTX_ROUTER,
    		CTX_ROUTE,
    		getProps,
    		isPromise,
    		isSvelteComponent,
    		onDestroy,
    		getContext,
    		setContext,
    		key,
    		path,
    		exact,
    		pending,
    		disabled,
    		fallback,
    		component,
    		condition,
    		redirect,
    		thisProps,
    		routeContext,
    		routerContext,
    		assignRoute,
    		unassignRoute,
    		pendingComponent,
    		routePath,
    		activeRouter,
    		activeProps,
    		fullpath,
    		hasLoaded,
    		fixedRoot,
    		resolve,
    		$routePath,
    		$routeInfo
    	});

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(26, $$props = assign(assign({}, $$props), $$new_props));
    		if ("key" in $$props) $$invalidate(7, key = $$new_props.key);
    		if ("path" in $$props) $$invalidate(8, path = $$new_props.path);
    		if ("exact" in $$props) $$invalidate(9, exact = $$new_props.exact);
    		if ("pending" in $$props) $$invalidate(1, pending = $$new_props.pending);
    		if ("disabled" in $$props) $$invalidate(10, disabled = $$new_props.disabled);
    		if ("fallback" in $$props) $$invalidate(11, fallback = $$new_props.fallback);
    		if ("component" in $$props) $$invalidate(0, component = $$new_props.component);
    		if ("condition" in $$props) $$invalidate(12, condition = $$new_props.condition);
    		if ("redirect" in $$props) $$invalidate(13, redirect = $$new_props.redirect);
    		if ("activeRouter" in $$props) $$invalidate(2, activeRouter = $$new_props.activeRouter);
    		if ("activeProps" in $$props) $$invalidate(3, activeProps = $$new_props.activeProps);
    		if ("fullpath" in $$props) fullpath = $$new_props.fullpath;
    		if ("hasLoaded" in $$props) $$invalidate(4, hasLoaded = $$new_props.hasLoaded);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if (key) {
    			$$invalidate(2, activeRouter = !disabled && $routeInfo[key]);
    			$$invalidate(3, activeProps = getProps($$props, thisProps));
    		}

    		if ($$self.$$.dirty & /*activeRouter, component*/ 5) {
    			if (activeRouter) {
    				if (!component) {
    					// component passed as slot
    					$$invalidate(4, hasLoaded = true);
    				} else if (isSvelteComponent(component)) {
    					// component passed as Svelte component
    					$$invalidate(4, hasLoaded = true);
    				} else if (isPromise(component)) {
    					// component passed as import()
    					component.then(module => {
    						$$invalidate(0, component = module.default);
    						$$invalidate(4, hasLoaded = true);
    					});
    				} else {
    					// component passed as () => import()
    					component().then(module => {
    						$$invalidate(0, component = module.default);
    						$$invalidate(4, hasLoaded = true);
    					});
    				}
    			}
    		}
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		component,
    		pending,
    		activeRouter,
    		activeProps,
    		hasLoaded,
    		pendingComponent,
    		routePath,
    		key,
    		path,
    		exact,
    		disabled,
    		fallback,
    		condition,
    		redirect,
    		$routeInfo,
    		$$scope,
    		slots
    	];
    }

    class Route extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {
    			key: 7,
    			path: 8,
    			exact: 9,
    			pending: 1,
    			disabled: 10,
    			fallback: 11,
    			component: 0,
    			condition: 12,
    			redirect: 13
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Route",
    			options,
    			id: create_fragment$7.name
    		});
    	}

    	get key() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set key(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get path() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set path(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get exact() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set exact(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pending() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pending(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disabled() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disabled(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get fallback() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set fallback(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get component() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set component(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get condition() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set condition(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get redirect() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set redirect(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/yrv/build/lib/Link.svelte generated by Svelte v3.35.0 */

    const file$6 = "node_modules/yrv/build/lib/Link.svelte";

    // (108:0) {:else}
    function create_else_block(ctx) {
    	let a;
    	let a_href_value;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[17].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[16], null);

    	let a_levels = [
    		/*fixedProps*/ ctx[6],
    		{
    			href: a_href_value = cleanPath(/*fixedHref*/ ctx[5] || /*href*/ ctx[1])
    		},
    		{ class: /*cssClass*/ ctx[0] },
    		{ title: /*title*/ ctx[2] }
    	];

    	let a_data = {};

    	for (let i = 0; i < a_levels.length; i += 1) {
    		a_data = assign(a_data, a_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			a = element("a");
    			if (default_slot) default_slot.c();
    			set_attributes(a, a_data);
    			add_location(a, file$6, 108, 2, 2949);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);

    			if (default_slot) {
    				default_slot.m(a, null);
    			}

    			/*a_binding*/ ctx[19](a);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(a, "click", /*handleAnchorOnClick*/ ctx[8], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 65536) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[16], dirty, null, null);
    				}
    			}

    			set_attributes(a, a_data = get_spread_update(a_levels, [
    				dirty & /*fixedProps*/ 64 && /*fixedProps*/ ctx[6],
    				(!current || dirty & /*fixedHref, href*/ 34 && a_href_value !== (a_href_value = cleanPath(/*fixedHref*/ ctx[5] || /*href*/ ctx[1]))) && { href: a_href_value },
    				(!current || dirty & /*cssClass*/ 1) && { class: /*cssClass*/ ctx[0] },
    				(!current || dirty & /*title*/ 4) && { title: /*title*/ ctx[2] }
    			]));
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			if (default_slot) default_slot.d(detaching);
    			/*a_binding*/ ctx[19](null);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(108:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (104:0) {#if button}
    function create_if_block$1(ctx) {
    	let button_1;
    	let current;
    	let mounted;
    	let dispose;
    	const default_slot_template = /*#slots*/ ctx[17].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[16], null);

    	let button_1_levels = [
    		/*fixedProps*/ ctx[6],
    		{ class: /*cssClass*/ ctx[0] },
    		{ title: /*title*/ ctx[2] }
    	];

    	let button_1_data = {};

    	for (let i = 0; i < button_1_levels.length; i += 1) {
    		button_1_data = assign(button_1_data, button_1_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			button_1 = element("button");
    			if (default_slot) default_slot.c();
    			set_attributes(button_1, button_1_data);
    			add_location(button_1, file$6, 104, 2, 2823);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button_1, anchor);

    			if (default_slot) {
    				default_slot.m(button_1, null);
    			}

    			/*button_1_binding*/ ctx[18](button_1);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button_1, "click", /*handleOnClick*/ ctx[7], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope*/ 65536) {
    					update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[16], dirty, null, null);
    				}
    			}

    			set_attributes(button_1, button_1_data = get_spread_update(button_1_levels, [
    				dirty & /*fixedProps*/ 64 && /*fixedProps*/ ctx[6],
    				(!current || dirty & /*cssClass*/ 1) && { class: /*cssClass*/ ctx[0] },
    				(!current || dirty & /*title*/ 4) && { title: /*title*/ ctx[2] }
    			]));
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button_1);
    			if (default_slot) default_slot.d(detaching);
    			/*button_1_binding*/ ctx[18](null);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(104:0) {#if button}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block$1, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*button*/ ctx[3]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let fixedProps;
    	let $router;
    	validate_store(router, "router");
    	component_subscribe($$self, router, $$value => $$invalidate(15, $router = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Link", slots, ['default']);
    	let ref;
    	let active;
    	let { class: cssClass = "" } = $$props;
    	let fixedHref = null;
    	let { go = null } = $$props;
    	let { open = null } = $$props;
    	let { href = "" } = $$props;
    	let { title = "" } = $$props;
    	let { button = false } = $$props;
    	let { exact = false } = $$props;
    	let { reload = false } = $$props;
    	let { replace = false } = $$props;

    	// replacement for `Object.keys(arguments[0].$$.props)`
    	const thisProps = ["go", "open", "href", "class", "title", "button", "exact", "reload", "replace"];

    	const dispatch = createEventDispatcher();

    	// this will enable `<Link on:click={...} />` calls
    	function handleOnClick(e) {
    		e.preventDefault();

    		if (typeof go === "string" && window.history.length > 1) {
    			if (go === "back") window.history.back(); else if (go === "fwd") window.history.forward(); else window.history.go(parseInt(go, 10));
    			return;
    		}

    		if (!fixedHref && href !== "") {
    			if (open) {
    				let specs = typeof open === "string" ? open : "";
    				const wmatch = specs.match(/width=(\d+)/);
    				const hmatch = specs.match(/height=(\d+)/);
    				if (wmatch) specs += `,left=${(window.screen.width - wmatch[1]) / 2}`;
    				if (hmatch) specs += `,top=${(window.screen.height - hmatch[1]) / 2}`;

    				if (wmatch && !hmatch) {
    					specs += `,height=${wmatch[1]},top=${(window.screen.height - wmatch[1]) / 2}`;
    				}

    				const w = window.open(href, "", specs);

    				const t = setInterval(
    					() => {
    						if (w.closed) {
    							dispatch("close");
    							clearInterval(t);
    						}
    					},
    					120
    				);
    			} else window.location.href = href;

    			return;
    		}

    		fixedLocation(
    			href,
    			() => {
    				navigateTo(fixedHref || "/", { reload, replace });
    			},
    			() => dispatch("click", e)
    		);
    	}

    	function handleAnchorOnClick(e) {
    		// user used a keyboard shortcut to force open link in a new tab
    		if (e.metaKey || e.ctrlKey || e.button !== 0) {
    			return;
    		}

    		handleOnClick(e);
    	}

    	function button_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			ref = $$value;
    			$$invalidate(4, ref);
    		});
    	}

    	function a_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			ref = $$value;
    			$$invalidate(4, ref);
    		});
    	}

    	$$self.$$set = $$new_props => {
    		$$invalidate(22, $$props = assign(assign({}, $$props), exclude_internal_props($$new_props)));
    		if ("class" in $$new_props) $$invalidate(0, cssClass = $$new_props.class);
    		if ("go" in $$new_props) $$invalidate(9, go = $$new_props.go);
    		if ("open" in $$new_props) $$invalidate(10, open = $$new_props.open);
    		if ("href" in $$new_props) $$invalidate(1, href = $$new_props.href);
    		if ("title" in $$new_props) $$invalidate(2, title = $$new_props.title);
    		if ("button" in $$new_props) $$invalidate(3, button = $$new_props.button);
    		if ("exact" in $$new_props) $$invalidate(11, exact = $$new_props.exact);
    		if ("reload" in $$new_props) $$invalidate(12, reload = $$new_props.reload);
    		if ("replace" in $$new_props) $$invalidate(13, replace = $$new_props.replace);
    		if ("$$scope" in $$new_props) $$invalidate(16, $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		ROOT_URL,
    		HASHCHANGE,
    		fixedLocation,
    		navigateTo,
    		cleanPath,
    		isActive,
    		getProps,
    		router,
    		ref,
    		active,
    		cssClass,
    		fixedHref,
    		go,
    		open,
    		href,
    		title,
    		button,
    		exact,
    		reload,
    		replace,
    		thisProps,
    		dispatch,
    		handleOnClick,
    		handleAnchorOnClick,
    		$router,
    		fixedProps
    	});

    	$$self.$inject_state = $$new_props => {
    		$$invalidate(22, $$props = assign(assign({}, $$props), $$new_props));
    		if ("ref" in $$props) $$invalidate(4, ref = $$new_props.ref);
    		if ("active" in $$props) $$invalidate(14, active = $$new_props.active);
    		if ("cssClass" in $$props) $$invalidate(0, cssClass = $$new_props.cssClass);
    		if ("fixedHref" in $$props) $$invalidate(5, fixedHref = $$new_props.fixedHref);
    		if ("go" in $$props) $$invalidate(9, go = $$new_props.go);
    		if ("open" in $$props) $$invalidate(10, open = $$new_props.open);
    		if ("href" in $$props) $$invalidate(1, href = $$new_props.href);
    		if ("title" in $$props) $$invalidate(2, title = $$new_props.title);
    		if ("button" in $$props) $$invalidate(3, button = $$new_props.button);
    		if ("exact" in $$props) $$invalidate(11, exact = $$new_props.exact);
    		if ("reload" in $$props) $$invalidate(12, reload = $$new_props.reload);
    		if ("replace" in $$props) $$invalidate(13, replace = $$new_props.replace);
    		if ("fixedProps" in $$props) $$invalidate(6, fixedProps = $$new_props.fixedProps);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*href*/ 2) {
    			// rebase active URL
    			if (!(/^(\w+:)?\/\//).test(href)) {
    				$$invalidate(5, fixedHref = cleanPath(ROOT_URL, true) + cleanPath(HASHCHANGE ? `#${href}` : href));
    			}
    		}

    		if ($$self.$$.dirty & /*ref, $router, href, exact, active, button*/ 51226) {
    			if (ref && $router.path) {
    				if (isActive(href, $router.path, exact)) {
    					if (!active) {
    						$$invalidate(14, active = true);
    						ref.setAttribute("aria-current", "page");

    						if (button) {
    							ref.setAttribute("disabled", true);
    						}
    					}
    				} else if (active) {
    					$$invalidate(14, active = false);
    					ref.removeAttribute("disabled");
    					ref.removeAttribute("aria-current");
    				}
    			}
    		}

    		// extract additional props
    		$$invalidate(6, fixedProps = getProps($$props, thisProps));
    	};

    	$$props = exclude_internal_props($$props);

    	return [
    		cssClass,
    		href,
    		title,
    		button,
    		ref,
    		fixedHref,
    		fixedProps,
    		handleOnClick,
    		handleAnchorOnClick,
    		go,
    		open,
    		exact,
    		reload,
    		replace,
    		active,
    		$router,
    		$$scope,
    		slots,
    		button_1_binding,
    		a_binding
    	];
    }

    class Link extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {
    			class: 0,
    			go: 9,
    			open: 10,
    			href: 1,
    			title: 2,
    			button: 3,
    			exact: 11,
    			reload: 12,
    			replace: 13
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Link",
    			options,
    			id: create_fragment$6.name
    		});
    	}

    	get class() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get go() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set go(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get open() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set open(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get href() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set href(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get title() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get button() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set button(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get exact() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set exact(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get reload() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set reload(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get replace() {
    		throw new Error("<Link>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set replace(value) {
    		throw new Error("<Link>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    Object.defineProperty(Router, 'hashchange', {
      set: function (value) { return hashchangeEnable(value); },
      get: function () { return hashchangeEnable(); },
      configurable: false,
      enumerable: false,
    });

    /* src/components/Menu.svelte generated by Svelte v3.35.0 */
    const file$5 = "src/components/Menu.svelte";

    // (23:12) <Link class="nav-link" href="/">
    function create_default_slot_2$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Home");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2$1.name,
    		type: "slot",
    		source: "(23:12) <Link class=\\\"nav-link\\\" href=\\\"/\\\">",
    		ctx
    	});

    	return block;
    }

    // (26:12) <Link class="nav-link" href="/users">
    function create_default_slot_1$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Users");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1$1.name,
    		type: "slot",
    		source: "(26:12) <Link class=\\\"nav-link\\\" href=\\\"/users\\\">",
    		ctx
    	});

    	return block;
    }

    // (29:12) <Link class="nav-link" href="/chart">
    function create_default_slot$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Chart");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot$1.name,
    		type: "slot",
    		source: "(29:12) <Link class=\\\"nav-link\\\" href=\\\"/chart\\\">",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let div2;
    	let nav;
    	let div1;
    	let a;
    	let t1;
    	let button;
    	let span;
    	let t2;
    	let div0;
    	let ul;
    	let li0;
    	let link0;
    	let t3;
    	let li1;
    	let link1;
    	let t4;
    	let li2;
    	let link2;
    	let current;

    	link0 = new Link({
    			props: {
    				class: "nav-link",
    				href: "/",
    				$$slots: { default: [create_default_slot_2$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	link1 = new Link({
    			props: {
    				class: "nav-link",
    				href: "/users",
    				$$slots: { default: [create_default_slot_1$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	link2 = new Link({
    			props: {
    				class: "nav-link",
    				href: "/chart",
    				$$slots: { default: [create_default_slot$1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			nav = element("nav");
    			div1 = element("div");
    			a = element("a");
    			a.textContent = "Svelte-App";
    			t1 = space();
    			button = element("button");
    			span = element("span");
    			t2 = space();
    			div0 = element("div");
    			ul = element("ul");
    			li0 = element("li");
    			create_component(link0.$$.fragment);
    			t3 = space();
    			li1 = element("li");
    			create_component(link1.$$.fragment);
    			t4 = space();
    			li2 = element("li");
    			create_component(link2.$$.fragment);
    			attr_dev(a, "class", "navbar-brand");
    			attr_dev(a, "href", "/");
    			add_location(a, file$5, 7, 6, 158);
    			attr_dev(span, "class", "navbar-toggler-icon");
    			add_location(span, file$5, 17, 8, 462);
    			attr_dev(button, "class", "navbar-toggler");
    			attr_dev(button, "type", "button");
    			attr_dev(button, "data-bs-toggle", "collapse");
    			attr_dev(button, "data-bs-target", "#navbarNav");
    			attr_dev(button, "aria-controls", "navbarNav");
    			attr_dev(button, "aria-expanded", "false");
    			attr_dev(button, "aria-label", "Toggle navigation");
    			add_location(button, file$5, 8, 6, 212);
    			attr_dev(li0, "class", "nav-item");
    			add_location(li0, file$5, 21, 10, 617);
    			attr_dev(li1, "class", "nav-item");
    			add_location(li1, file$5, 24, 10, 721);
    			attr_dev(li2, "class", "nav-item");
    			add_location(li2, file$5, 27, 10, 831);
    			attr_dev(ul, "class", "navbar-nav");
    			add_location(ul, file$5, 20, 8, 583);
    			attr_dev(div0, "class", "collapse navbar-collapse");
    			attr_dev(div0, "id", "navbarNav");
    			add_location(div0, file$5, 19, 6, 521);
    			attr_dev(div1, "class", "container-fluid");
    			add_location(div1, file$5, 6, 4, 122);
    			attr_dev(nav, "class", "navbar navbar-expand-lg navbar-light bg-light");
    			add_location(nav, file$5, 5, 2, 58);
    			add_location(div2, file$5, 4, 0, 50);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, nav);
    			append_dev(nav, div1);
    			append_dev(div1, a);
    			append_dev(div1, t1);
    			append_dev(div1, button);
    			append_dev(button, span);
    			append_dev(div1, t2);
    			append_dev(div1, div0);
    			append_dev(div0, ul);
    			append_dev(ul, li0);
    			mount_component(link0, li0, null);
    			append_dev(ul, t3);
    			append_dev(ul, li1);
    			mount_component(link1, li1, null);
    			append_dev(ul, t4);
    			append_dev(ul, li2);
    			mount_component(link2, li2, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const link0_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				link0_changes.$$scope = { dirty, ctx };
    			}

    			link0.$set(link0_changes);
    			const link1_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				link1_changes.$$scope = { dirty, ctx };
    			}

    			link1.$set(link1_changes);
    			const link2_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				link2_changes.$$scope = { dirty, ctx };
    			}

    			link2.$set(link2_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(link0.$$.fragment, local);
    			transition_in(link1.$$.fragment, local);
    			transition_in(link2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(link0.$$.fragment, local);
    			transition_out(link1.$$.fragment, local);
    			transition_out(link2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_component(link0);
    			destroy_component(link1);
    			destroy_component(link2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Menu", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Menu> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Link });
    	return [];
    }

    class Menu extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Menu",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    var bind = function bind(fn, thisArg) {
      return function wrap() {
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; i++) {
          args[i] = arguments[i];
        }
        return fn.apply(thisArg, args);
      };
    };

    /*global toString:true*/

    // utils is a library of generic helper functions non-specific to axios

    var toString = Object.prototype.toString;

    /**
     * Determine if a value is an Array
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an Array, otherwise false
     */
    function isArray(val) {
      return toString.call(val) === '[object Array]';
    }

    /**
     * Determine if a value is undefined
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if the value is undefined, otherwise false
     */
    function isUndefined(val) {
      return typeof val === 'undefined';
    }

    /**
     * Determine if a value is a Buffer
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Buffer, otherwise false
     */
    function isBuffer(val) {
      return val !== null && !isUndefined(val) && val.constructor !== null && !isUndefined(val.constructor)
        && typeof val.constructor.isBuffer === 'function' && val.constructor.isBuffer(val);
    }

    /**
     * Determine if a value is an ArrayBuffer
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an ArrayBuffer, otherwise false
     */
    function isArrayBuffer(val) {
      return toString.call(val) === '[object ArrayBuffer]';
    }

    /**
     * Determine if a value is a FormData
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an FormData, otherwise false
     */
    function isFormData(val) {
      return (typeof FormData !== 'undefined') && (val instanceof FormData);
    }

    /**
     * Determine if a value is a view on an ArrayBuffer
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
     */
    function isArrayBufferView(val) {
      var result;
      if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
        result = ArrayBuffer.isView(val);
      } else {
        result = (val) && (val.buffer) && (val.buffer instanceof ArrayBuffer);
      }
      return result;
    }

    /**
     * Determine if a value is a String
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a String, otherwise false
     */
    function isString(val) {
      return typeof val === 'string';
    }

    /**
     * Determine if a value is a Number
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Number, otherwise false
     */
    function isNumber(val) {
      return typeof val === 'number';
    }

    /**
     * Determine if a value is an Object
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is an Object, otherwise false
     */
    function isObject(val) {
      return val !== null && typeof val === 'object';
    }

    /**
     * Determine if a value is a plain Object
     *
     * @param {Object} val The value to test
     * @return {boolean} True if value is a plain Object, otherwise false
     */
    function isPlainObject(val) {
      if (toString.call(val) !== '[object Object]') {
        return false;
      }

      var prototype = Object.getPrototypeOf(val);
      return prototype === null || prototype === Object.prototype;
    }

    /**
     * Determine if a value is a Date
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Date, otherwise false
     */
    function isDate(val) {
      return toString.call(val) === '[object Date]';
    }

    /**
     * Determine if a value is a File
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a File, otherwise false
     */
    function isFile(val) {
      return toString.call(val) === '[object File]';
    }

    /**
     * Determine if a value is a Blob
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Blob, otherwise false
     */
    function isBlob(val) {
      return toString.call(val) === '[object Blob]';
    }

    /**
     * Determine if a value is a Function
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Function, otherwise false
     */
    function isFunction(val) {
      return toString.call(val) === '[object Function]';
    }

    /**
     * Determine if a value is a Stream
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a Stream, otherwise false
     */
    function isStream(val) {
      return isObject(val) && isFunction(val.pipe);
    }

    /**
     * Determine if a value is a URLSearchParams object
     *
     * @param {Object} val The value to test
     * @returns {boolean} True if value is a URLSearchParams object, otherwise false
     */
    function isURLSearchParams(val) {
      return typeof URLSearchParams !== 'undefined' && val instanceof URLSearchParams;
    }

    /**
     * Trim excess whitespace off the beginning and end of a string
     *
     * @param {String} str The String to trim
     * @returns {String} The String freed of excess whitespace
     */
    function trim(str) {
      return str.replace(/^\s*/, '').replace(/\s*$/, '');
    }

    /**
     * Determine if we're running in a standard browser environment
     *
     * This allows axios to run in a web worker, and react-native.
     * Both environments support XMLHttpRequest, but not fully standard globals.
     *
     * web workers:
     *  typeof window -> undefined
     *  typeof document -> undefined
     *
     * react-native:
     *  navigator.product -> 'ReactNative'
     * nativescript
     *  navigator.product -> 'NativeScript' or 'NS'
     */
    function isStandardBrowserEnv() {
      if (typeof navigator !== 'undefined' && (navigator.product === 'ReactNative' ||
                                               navigator.product === 'NativeScript' ||
                                               navigator.product === 'NS')) {
        return false;
      }
      return (
        typeof window !== 'undefined' &&
        typeof document !== 'undefined'
      );
    }

    /**
     * Iterate over an Array or an Object invoking a function for each item.
     *
     * If `obj` is an Array callback will be called passing
     * the value, index, and complete array for each item.
     *
     * If 'obj' is an Object callback will be called passing
     * the value, key, and complete object for each property.
     *
     * @param {Object|Array} obj The object to iterate
     * @param {Function} fn The callback to invoke for each item
     */
    function forEach(obj, fn) {
      // Don't bother if no value provided
      if (obj === null || typeof obj === 'undefined') {
        return;
      }

      // Force an array if not already something iterable
      if (typeof obj !== 'object') {
        /*eslint no-param-reassign:0*/
        obj = [obj];
      }

      if (isArray(obj)) {
        // Iterate over array values
        for (var i = 0, l = obj.length; i < l; i++) {
          fn.call(null, obj[i], i, obj);
        }
      } else {
        // Iterate over object keys
        for (var key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            fn.call(null, obj[key], key, obj);
          }
        }
      }
    }

    /**
     * Accepts varargs expecting each argument to be an object, then
     * immutably merges the properties of each object and returns result.
     *
     * When multiple objects contain the same key the later object in
     * the arguments list will take precedence.
     *
     * Example:
     *
     * ```js
     * var result = merge({foo: 123}, {foo: 456});
     * console.log(result.foo); // outputs 456
     * ```
     *
     * @param {Object} obj1 Object to merge
     * @returns {Object} Result of all merge properties
     */
    function merge(/* obj1, obj2, obj3, ... */) {
      var result = {};
      function assignValue(val, key) {
        if (isPlainObject(result[key]) && isPlainObject(val)) {
          result[key] = merge(result[key], val);
        } else if (isPlainObject(val)) {
          result[key] = merge({}, val);
        } else if (isArray(val)) {
          result[key] = val.slice();
        } else {
          result[key] = val;
        }
      }

      for (var i = 0, l = arguments.length; i < l; i++) {
        forEach(arguments[i], assignValue);
      }
      return result;
    }

    /**
     * Extends object a by mutably adding to it the properties of object b.
     *
     * @param {Object} a The object to be extended
     * @param {Object} b The object to copy properties from
     * @param {Object} thisArg The object to bind function to
     * @return {Object} The resulting value of object a
     */
    function extend(a, b, thisArg) {
      forEach(b, function assignValue(val, key) {
        if (thisArg && typeof val === 'function') {
          a[key] = bind(val, thisArg);
        } else {
          a[key] = val;
        }
      });
      return a;
    }

    /**
     * Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
     *
     * @param {string} content with BOM
     * @return {string} content value without BOM
     */
    function stripBOM(content) {
      if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
      }
      return content;
    }

    var utils = {
      isArray: isArray,
      isArrayBuffer: isArrayBuffer,
      isBuffer: isBuffer,
      isFormData: isFormData,
      isArrayBufferView: isArrayBufferView,
      isString: isString,
      isNumber: isNumber,
      isObject: isObject,
      isPlainObject: isPlainObject,
      isUndefined: isUndefined,
      isDate: isDate,
      isFile: isFile,
      isBlob: isBlob,
      isFunction: isFunction,
      isStream: isStream,
      isURLSearchParams: isURLSearchParams,
      isStandardBrowserEnv: isStandardBrowserEnv,
      forEach: forEach,
      merge: merge,
      extend: extend,
      trim: trim,
      stripBOM: stripBOM
    };

    function encode(val) {
      return encodeURIComponent(val).
        replace(/%3A/gi, ':').
        replace(/%24/g, '$').
        replace(/%2C/gi, ',').
        replace(/%20/g, '+').
        replace(/%5B/gi, '[').
        replace(/%5D/gi, ']');
    }

    /**
     * Build a URL by appending params to the end
     *
     * @param {string} url The base of the url (e.g., http://www.google.com)
     * @param {object} [params] The params to be appended
     * @returns {string} The formatted url
     */
    var buildURL = function buildURL(url, params, paramsSerializer) {
      /*eslint no-param-reassign:0*/
      if (!params) {
        return url;
      }

      var serializedParams;
      if (paramsSerializer) {
        serializedParams = paramsSerializer(params);
      } else if (utils.isURLSearchParams(params)) {
        serializedParams = params.toString();
      } else {
        var parts = [];

        utils.forEach(params, function serialize(val, key) {
          if (val === null || typeof val === 'undefined') {
            return;
          }

          if (utils.isArray(val)) {
            key = key + '[]';
          } else {
            val = [val];
          }

          utils.forEach(val, function parseValue(v) {
            if (utils.isDate(v)) {
              v = v.toISOString();
            } else if (utils.isObject(v)) {
              v = JSON.stringify(v);
            }
            parts.push(encode(key) + '=' + encode(v));
          });
        });

        serializedParams = parts.join('&');
      }

      if (serializedParams) {
        var hashmarkIndex = url.indexOf('#');
        if (hashmarkIndex !== -1) {
          url = url.slice(0, hashmarkIndex);
        }

        url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
      }

      return url;
    };

    function InterceptorManager() {
      this.handlers = [];
    }

    /**
     * Add a new interceptor to the stack
     *
     * @param {Function} fulfilled The function to handle `then` for a `Promise`
     * @param {Function} rejected The function to handle `reject` for a `Promise`
     *
     * @return {Number} An ID used to remove interceptor later
     */
    InterceptorManager.prototype.use = function use(fulfilled, rejected) {
      this.handlers.push({
        fulfilled: fulfilled,
        rejected: rejected
      });
      return this.handlers.length - 1;
    };

    /**
     * Remove an interceptor from the stack
     *
     * @param {Number} id The ID that was returned by `use`
     */
    InterceptorManager.prototype.eject = function eject(id) {
      if (this.handlers[id]) {
        this.handlers[id] = null;
      }
    };

    /**
     * Iterate over all the registered interceptors
     *
     * This method is particularly useful for skipping over any
     * interceptors that may have become `null` calling `eject`.
     *
     * @param {Function} fn The function to call for each interceptor
     */
    InterceptorManager.prototype.forEach = function forEach(fn) {
      utils.forEach(this.handlers, function forEachHandler(h) {
        if (h !== null) {
          fn(h);
        }
      });
    };

    var InterceptorManager_1 = InterceptorManager;

    /**
     * Transform the data for a request or a response
     *
     * @param {Object|String} data The data to be transformed
     * @param {Array} headers The headers for the request or response
     * @param {Array|Function} fns A single function or Array of functions
     * @returns {*} The resulting transformed data
     */
    var transformData = function transformData(data, headers, fns) {
      /*eslint no-param-reassign:0*/
      utils.forEach(fns, function transform(fn) {
        data = fn(data, headers);
      });

      return data;
    };

    var isCancel = function isCancel(value) {
      return !!(value && value.__CANCEL__);
    };

    var normalizeHeaderName = function normalizeHeaderName(headers, normalizedName) {
      utils.forEach(headers, function processHeader(value, name) {
        if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
          headers[normalizedName] = value;
          delete headers[name];
        }
      });
    };

    /**
     * Update an Error with the specified config, error code, and response.
     *
     * @param {Error} error The error to update.
     * @param {Object} config The config.
     * @param {string} [code] The error code (for example, 'ECONNABORTED').
     * @param {Object} [request] The request.
     * @param {Object} [response] The response.
     * @returns {Error} The error.
     */
    var enhanceError = function enhanceError(error, config, code, request, response) {
      error.config = config;
      if (code) {
        error.code = code;
      }

      error.request = request;
      error.response = response;
      error.isAxiosError = true;

      error.toJSON = function toJSON() {
        return {
          // Standard
          message: this.message,
          name: this.name,
          // Microsoft
          description: this.description,
          number: this.number,
          // Mozilla
          fileName: this.fileName,
          lineNumber: this.lineNumber,
          columnNumber: this.columnNumber,
          stack: this.stack,
          // Axios
          config: this.config,
          code: this.code
        };
      };
      return error;
    };

    /**
     * Create an Error with the specified message, config, error code, request and response.
     *
     * @param {string} message The error message.
     * @param {Object} config The config.
     * @param {string} [code] The error code (for example, 'ECONNABORTED').
     * @param {Object} [request] The request.
     * @param {Object} [response] The response.
     * @returns {Error} The created error.
     */
    var createError = function createError(message, config, code, request, response) {
      var error = new Error(message);
      return enhanceError(error, config, code, request, response);
    };

    /**
     * Resolve or reject a Promise based on response status.
     *
     * @param {Function} resolve A function that resolves the promise.
     * @param {Function} reject A function that rejects the promise.
     * @param {object} response The response.
     */
    var settle = function settle(resolve, reject, response) {
      var validateStatus = response.config.validateStatus;
      if (!response.status || !validateStatus || validateStatus(response.status)) {
        resolve(response);
      } else {
        reject(createError(
          'Request failed with status code ' + response.status,
          response.config,
          null,
          response.request,
          response
        ));
      }
    };

    var cookies = (
      utils.isStandardBrowserEnv() ?

      // Standard browser envs support document.cookie
        (function standardBrowserEnv() {
          return {
            write: function write(name, value, expires, path, domain, secure) {
              var cookie = [];
              cookie.push(name + '=' + encodeURIComponent(value));

              if (utils.isNumber(expires)) {
                cookie.push('expires=' + new Date(expires).toGMTString());
              }

              if (utils.isString(path)) {
                cookie.push('path=' + path);
              }

              if (utils.isString(domain)) {
                cookie.push('domain=' + domain);
              }

              if (secure === true) {
                cookie.push('secure');
              }

              document.cookie = cookie.join('; ');
            },

            read: function read(name) {
              var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
              return (match ? decodeURIComponent(match[3]) : null);
            },

            remove: function remove(name) {
              this.write(name, '', Date.now() - 86400000);
            }
          };
        })() :

      // Non standard browser env (web workers, react-native) lack needed support.
        (function nonStandardBrowserEnv() {
          return {
            write: function write() {},
            read: function read() { return null; },
            remove: function remove() {}
          };
        })()
    );

    /**
     * Determines whether the specified URL is absolute
     *
     * @param {string} url The URL to test
     * @returns {boolean} True if the specified URL is absolute, otherwise false
     */
    var isAbsoluteURL = function isAbsoluteURL(url) {
      // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
      // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
      // by any combination of letters, digits, plus, period, or hyphen.
      return /^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url);
    };

    /**
     * Creates a new URL by combining the specified URLs
     *
     * @param {string} baseURL The base URL
     * @param {string} relativeURL The relative URL
     * @returns {string} The combined URL
     */
    var combineURLs = function combineURLs(baseURL, relativeURL) {
      return relativeURL
        ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
        : baseURL;
    };

    /**
     * Creates a new URL by combining the baseURL with the requestedURL,
     * only when the requestedURL is not already an absolute URL.
     * If the requestURL is absolute, this function returns the requestedURL untouched.
     *
     * @param {string} baseURL The base URL
     * @param {string} requestedURL Absolute or relative URL to combine
     * @returns {string} The combined full path
     */
    var buildFullPath = function buildFullPath(baseURL, requestedURL) {
      if (baseURL && !isAbsoluteURL(requestedURL)) {
        return combineURLs(baseURL, requestedURL);
      }
      return requestedURL;
    };

    // Headers whose duplicates are ignored by node
    // c.f. https://nodejs.org/api/http.html#http_message_headers
    var ignoreDuplicateOf = [
      'age', 'authorization', 'content-length', 'content-type', 'etag',
      'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
      'last-modified', 'location', 'max-forwards', 'proxy-authorization',
      'referer', 'retry-after', 'user-agent'
    ];

    /**
     * Parse headers into an object
     *
     * ```
     * Date: Wed, 27 Aug 2014 08:58:49 GMT
     * Content-Type: application/json
     * Connection: keep-alive
     * Transfer-Encoding: chunked
     * ```
     *
     * @param {String} headers Headers needing to be parsed
     * @returns {Object} Headers parsed into an object
     */
    var parseHeaders = function parseHeaders(headers) {
      var parsed = {};
      var key;
      var val;
      var i;

      if (!headers) { return parsed; }

      utils.forEach(headers.split('\n'), function parser(line) {
        i = line.indexOf(':');
        key = utils.trim(line.substr(0, i)).toLowerCase();
        val = utils.trim(line.substr(i + 1));

        if (key) {
          if (parsed[key] && ignoreDuplicateOf.indexOf(key) >= 0) {
            return;
          }
          if (key === 'set-cookie') {
            parsed[key] = (parsed[key] ? parsed[key] : []).concat([val]);
          } else {
            parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
          }
        }
      });

      return parsed;
    };

    var isURLSameOrigin = (
      utils.isStandardBrowserEnv() ?

      // Standard browser envs have full support of the APIs needed to test
      // whether the request URL is of the same origin as current location.
        (function standardBrowserEnv() {
          var msie = /(msie|trident)/i.test(navigator.userAgent);
          var urlParsingNode = document.createElement('a');
          var originURL;

          /**
        * Parse a URL to discover it's components
        *
        * @param {String} url The URL to be parsed
        * @returns {Object}
        */
          function resolveURL(url) {
            var href = url;

            if (msie) {
            // IE needs attribute set twice to normalize properties
              urlParsingNode.setAttribute('href', href);
              href = urlParsingNode.href;
            }

            urlParsingNode.setAttribute('href', href);

            // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
            return {
              href: urlParsingNode.href,
              protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
              host: urlParsingNode.host,
              search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
              hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
              hostname: urlParsingNode.hostname,
              port: urlParsingNode.port,
              pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
                urlParsingNode.pathname :
                '/' + urlParsingNode.pathname
            };
          }

          originURL = resolveURL(window.location.href);

          /**
        * Determine if a URL shares the same origin as the current location
        *
        * @param {String} requestURL The URL to test
        * @returns {boolean} True if URL shares the same origin, otherwise false
        */
          return function isURLSameOrigin(requestURL) {
            var parsed = (utils.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
            return (parsed.protocol === originURL.protocol &&
                parsed.host === originURL.host);
          };
        })() :

      // Non standard browser envs (web workers, react-native) lack needed support.
        (function nonStandardBrowserEnv() {
          return function isURLSameOrigin() {
            return true;
          };
        })()
    );

    var xhr = function xhrAdapter(config) {
      return new Promise(function dispatchXhrRequest(resolve, reject) {
        var requestData = config.data;
        var requestHeaders = config.headers;

        if (utils.isFormData(requestData)) {
          delete requestHeaders['Content-Type']; // Let the browser set it
        }

        var request = new XMLHttpRequest();

        // HTTP basic authentication
        if (config.auth) {
          var username = config.auth.username || '';
          var password = config.auth.password ? unescape(encodeURIComponent(config.auth.password)) : '';
          requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
        }

        var fullPath = buildFullPath(config.baseURL, config.url);
        request.open(config.method.toUpperCase(), buildURL(fullPath, config.params, config.paramsSerializer), true);

        // Set the request timeout in MS
        request.timeout = config.timeout;

        // Listen for ready state
        request.onreadystatechange = function handleLoad() {
          if (!request || request.readyState !== 4) {
            return;
          }

          // The request errored out and we didn't get a response, this will be
          // handled by onerror instead
          // With one exception: request that using file: protocol, most browsers
          // will return status as 0 even though it's a successful request
          if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
            return;
          }

          // Prepare the response
          var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
          var responseData = !config.responseType || config.responseType === 'text' ? request.responseText : request.response;
          var response = {
            data: responseData,
            status: request.status,
            statusText: request.statusText,
            headers: responseHeaders,
            config: config,
            request: request
          };

          settle(resolve, reject, response);

          // Clean up request
          request = null;
        };

        // Handle browser request cancellation (as opposed to a manual cancellation)
        request.onabort = function handleAbort() {
          if (!request) {
            return;
          }

          reject(createError('Request aborted', config, 'ECONNABORTED', request));

          // Clean up request
          request = null;
        };

        // Handle low level network errors
        request.onerror = function handleError() {
          // Real errors are hidden from us by the browser
          // onerror should only fire if it's a network error
          reject(createError('Network Error', config, null, request));

          // Clean up request
          request = null;
        };

        // Handle timeout
        request.ontimeout = function handleTimeout() {
          var timeoutErrorMessage = 'timeout of ' + config.timeout + 'ms exceeded';
          if (config.timeoutErrorMessage) {
            timeoutErrorMessage = config.timeoutErrorMessage;
          }
          reject(createError(timeoutErrorMessage, config, 'ECONNABORTED',
            request));

          // Clean up request
          request = null;
        };

        // Add xsrf header
        // This is only done if running in a standard browser environment.
        // Specifically not if we're in a web worker, or react-native.
        if (utils.isStandardBrowserEnv()) {
          // Add xsrf header
          var xsrfValue = (config.withCredentials || isURLSameOrigin(fullPath)) && config.xsrfCookieName ?
            cookies.read(config.xsrfCookieName) :
            undefined;

          if (xsrfValue) {
            requestHeaders[config.xsrfHeaderName] = xsrfValue;
          }
        }

        // Add headers to the request
        if ('setRequestHeader' in request) {
          utils.forEach(requestHeaders, function setRequestHeader(val, key) {
            if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
              // Remove Content-Type if data is undefined
              delete requestHeaders[key];
            } else {
              // Otherwise add header to the request
              request.setRequestHeader(key, val);
            }
          });
        }

        // Add withCredentials to request if needed
        if (!utils.isUndefined(config.withCredentials)) {
          request.withCredentials = !!config.withCredentials;
        }

        // Add responseType to request if needed
        if (config.responseType) {
          try {
            request.responseType = config.responseType;
          } catch (e) {
            // Expected DOMException thrown by browsers not compatible XMLHttpRequest Level 2.
            // But, this can be suppressed for 'json' type as it can be parsed by default 'transformResponse' function.
            if (config.responseType !== 'json') {
              throw e;
            }
          }
        }

        // Handle progress if needed
        if (typeof config.onDownloadProgress === 'function') {
          request.addEventListener('progress', config.onDownloadProgress);
        }

        // Not all browsers support upload events
        if (typeof config.onUploadProgress === 'function' && request.upload) {
          request.upload.addEventListener('progress', config.onUploadProgress);
        }

        if (config.cancelToken) {
          // Handle cancellation
          config.cancelToken.promise.then(function onCanceled(cancel) {
            if (!request) {
              return;
            }

            request.abort();
            reject(cancel);
            // Clean up request
            request = null;
          });
        }

        if (!requestData) {
          requestData = null;
        }

        // Send the request
        request.send(requestData);
      });
    };

    var DEFAULT_CONTENT_TYPE = {
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    function setContentTypeIfUnset(headers, value) {
      if (!utils.isUndefined(headers) && utils.isUndefined(headers['Content-Type'])) {
        headers['Content-Type'] = value;
      }
    }

    function getDefaultAdapter() {
      var adapter;
      if (typeof XMLHttpRequest !== 'undefined') {
        // For browsers use XHR adapter
        adapter = xhr;
      } else if (typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]') {
        // For node use HTTP adapter
        adapter = xhr;
      }
      return adapter;
    }

    var defaults = {
      adapter: getDefaultAdapter(),

      transformRequest: [function transformRequest(data, headers) {
        normalizeHeaderName(headers, 'Accept');
        normalizeHeaderName(headers, 'Content-Type');
        if (utils.isFormData(data) ||
          utils.isArrayBuffer(data) ||
          utils.isBuffer(data) ||
          utils.isStream(data) ||
          utils.isFile(data) ||
          utils.isBlob(data)
        ) {
          return data;
        }
        if (utils.isArrayBufferView(data)) {
          return data.buffer;
        }
        if (utils.isURLSearchParams(data)) {
          setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded;charset=utf-8');
          return data.toString();
        }
        if (utils.isObject(data)) {
          setContentTypeIfUnset(headers, 'application/json;charset=utf-8');
          return JSON.stringify(data);
        }
        return data;
      }],

      transformResponse: [function transformResponse(data) {
        /*eslint no-param-reassign:0*/
        if (typeof data === 'string') {
          try {
            data = JSON.parse(data);
          } catch (e) { /* Ignore */ }
        }
        return data;
      }],

      /**
       * A timeout in milliseconds to abort a request. If set to 0 (default) a
       * timeout is not created.
       */
      timeout: 0,

      xsrfCookieName: 'XSRF-TOKEN',
      xsrfHeaderName: 'X-XSRF-TOKEN',

      maxContentLength: -1,
      maxBodyLength: -1,

      validateStatus: function validateStatus(status) {
        return status >= 200 && status < 300;
      }
    };

    defaults.headers = {
      common: {
        'Accept': 'application/json, text/plain, */*'
      }
    };

    utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
      defaults.headers[method] = {};
    });

    utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
      defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
    });

    var defaults_1 = defaults;

    /**
     * Throws a `Cancel` if cancellation has been requested.
     */
    function throwIfCancellationRequested(config) {
      if (config.cancelToken) {
        config.cancelToken.throwIfRequested();
      }
    }

    /**
     * Dispatch a request to the server using the configured adapter.
     *
     * @param {object} config The config that is to be used for the request
     * @returns {Promise} The Promise to be fulfilled
     */
    var dispatchRequest = function dispatchRequest(config) {
      throwIfCancellationRequested(config);

      // Ensure headers exist
      config.headers = config.headers || {};

      // Transform request data
      config.data = transformData(
        config.data,
        config.headers,
        config.transformRequest
      );

      // Flatten headers
      config.headers = utils.merge(
        config.headers.common || {},
        config.headers[config.method] || {},
        config.headers
      );

      utils.forEach(
        ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
        function cleanHeaderConfig(method) {
          delete config.headers[method];
        }
      );

      var adapter = config.adapter || defaults_1.adapter;

      return adapter(config).then(function onAdapterResolution(response) {
        throwIfCancellationRequested(config);

        // Transform response data
        response.data = transformData(
          response.data,
          response.headers,
          config.transformResponse
        );

        return response;
      }, function onAdapterRejection(reason) {
        if (!isCancel(reason)) {
          throwIfCancellationRequested(config);

          // Transform response data
          if (reason && reason.response) {
            reason.response.data = transformData(
              reason.response.data,
              reason.response.headers,
              config.transformResponse
            );
          }
        }

        return Promise.reject(reason);
      });
    };

    /**
     * Config-specific merge-function which creates a new config-object
     * by merging two configuration objects together.
     *
     * @param {Object} config1
     * @param {Object} config2
     * @returns {Object} New object resulting from merging config2 to config1
     */
    var mergeConfig = function mergeConfig(config1, config2) {
      // eslint-disable-next-line no-param-reassign
      config2 = config2 || {};
      var config = {};

      var valueFromConfig2Keys = ['url', 'method', 'data'];
      var mergeDeepPropertiesKeys = ['headers', 'auth', 'proxy', 'params'];
      var defaultToConfig2Keys = [
        'baseURL', 'transformRequest', 'transformResponse', 'paramsSerializer',
        'timeout', 'timeoutMessage', 'withCredentials', 'adapter', 'responseType', 'xsrfCookieName',
        'xsrfHeaderName', 'onUploadProgress', 'onDownloadProgress', 'decompress',
        'maxContentLength', 'maxBodyLength', 'maxRedirects', 'transport', 'httpAgent',
        'httpsAgent', 'cancelToken', 'socketPath', 'responseEncoding'
      ];
      var directMergeKeys = ['validateStatus'];

      function getMergedValue(target, source) {
        if (utils.isPlainObject(target) && utils.isPlainObject(source)) {
          return utils.merge(target, source);
        } else if (utils.isPlainObject(source)) {
          return utils.merge({}, source);
        } else if (utils.isArray(source)) {
          return source.slice();
        }
        return source;
      }

      function mergeDeepProperties(prop) {
        if (!utils.isUndefined(config2[prop])) {
          config[prop] = getMergedValue(config1[prop], config2[prop]);
        } else if (!utils.isUndefined(config1[prop])) {
          config[prop] = getMergedValue(undefined, config1[prop]);
        }
      }

      utils.forEach(valueFromConfig2Keys, function valueFromConfig2(prop) {
        if (!utils.isUndefined(config2[prop])) {
          config[prop] = getMergedValue(undefined, config2[prop]);
        }
      });

      utils.forEach(mergeDeepPropertiesKeys, mergeDeepProperties);

      utils.forEach(defaultToConfig2Keys, function defaultToConfig2(prop) {
        if (!utils.isUndefined(config2[prop])) {
          config[prop] = getMergedValue(undefined, config2[prop]);
        } else if (!utils.isUndefined(config1[prop])) {
          config[prop] = getMergedValue(undefined, config1[prop]);
        }
      });

      utils.forEach(directMergeKeys, function merge(prop) {
        if (prop in config2) {
          config[prop] = getMergedValue(config1[prop], config2[prop]);
        } else if (prop in config1) {
          config[prop] = getMergedValue(undefined, config1[prop]);
        }
      });

      var axiosKeys = valueFromConfig2Keys
        .concat(mergeDeepPropertiesKeys)
        .concat(defaultToConfig2Keys)
        .concat(directMergeKeys);

      var otherKeys = Object
        .keys(config1)
        .concat(Object.keys(config2))
        .filter(function filterAxiosKeys(key) {
          return axiosKeys.indexOf(key) === -1;
        });

      utils.forEach(otherKeys, mergeDeepProperties);

      return config;
    };

    /**
     * Create a new instance of Axios
     *
     * @param {Object} instanceConfig The default config for the instance
     */
    function Axios(instanceConfig) {
      this.defaults = instanceConfig;
      this.interceptors = {
        request: new InterceptorManager_1(),
        response: new InterceptorManager_1()
      };
    }

    /**
     * Dispatch a request
     *
     * @param {Object} config The config specific for this request (merged with this.defaults)
     */
    Axios.prototype.request = function request(config) {
      /*eslint no-param-reassign:0*/
      // Allow for axios('example/url'[, config]) a la fetch API
      if (typeof config === 'string') {
        config = arguments[1] || {};
        config.url = arguments[0];
      } else {
        config = config || {};
      }

      config = mergeConfig(this.defaults, config);

      // Set config.method
      if (config.method) {
        config.method = config.method.toLowerCase();
      } else if (this.defaults.method) {
        config.method = this.defaults.method.toLowerCase();
      } else {
        config.method = 'get';
      }

      // Hook up interceptors middleware
      var chain = [dispatchRequest, undefined];
      var promise = Promise.resolve(config);

      this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
        chain.unshift(interceptor.fulfilled, interceptor.rejected);
      });

      this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
        chain.push(interceptor.fulfilled, interceptor.rejected);
      });

      while (chain.length) {
        promise = promise.then(chain.shift(), chain.shift());
      }

      return promise;
    };

    Axios.prototype.getUri = function getUri(config) {
      config = mergeConfig(this.defaults, config);
      return buildURL(config.url, config.params, config.paramsSerializer).replace(/^\?/, '');
    };

    // Provide aliases for supported request methods
    utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
      /*eslint func-names:0*/
      Axios.prototype[method] = function(url, config) {
        return this.request(mergeConfig(config || {}, {
          method: method,
          url: url,
          data: (config || {}).data
        }));
      };
    });

    utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
      /*eslint func-names:0*/
      Axios.prototype[method] = function(url, data, config) {
        return this.request(mergeConfig(config || {}, {
          method: method,
          url: url,
          data: data
        }));
      };
    });

    var Axios_1 = Axios;

    /**
     * A `Cancel` is an object that is thrown when an operation is canceled.
     *
     * @class
     * @param {string=} message The message.
     */
    function Cancel(message) {
      this.message = message;
    }

    Cancel.prototype.toString = function toString() {
      return 'Cancel' + (this.message ? ': ' + this.message : '');
    };

    Cancel.prototype.__CANCEL__ = true;

    var Cancel_1 = Cancel;

    /**
     * A `CancelToken` is an object that can be used to request cancellation of an operation.
     *
     * @class
     * @param {Function} executor The executor function.
     */
    function CancelToken(executor) {
      if (typeof executor !== 'function') {
        throw new TypeError('executor must be a function.');
      }

      var resolvePromise;
      this.promise = new Promise(function promiseExecutor(resolve) {
        resolvePromise = resolve;
      });

      var token = this;
      executor(function cancel(message) {
        if (token.reason) {
          // Cancellation has already been requested
          return;
        }

        token.reason = new Cancel_1(message);
        resolvePromise(token.reason);
      });
    }

    /**
     * Throws a `Cancel` if cancellation has been requested.
     */
    CancelToken.prototype.throwIfRequested = function throwIfRequested() {
      if (this.reason) {
        throw this.reason;
      }
    };

    /**
     * Returns an object that contains a new `CancelToken` and a function that, when called,
     * cancels the `CancelToken`.
     */
    CancelToken.source = function source() {
      var cancel;
      var token = new CancelToken(function executor(c) {
        cancel = c;
      });
      return {
        token: token,
        cancel: cancel
      };
    };

    var CancelToken_1 = CancelToken;

    /**
     * Syntactic sugar for invoking a function and expanding an array for arguments.
     *
     * Common use case would be to use `Function.prototype.apply`.
     *
     *  ```js
     *  function f(x, y, z) {}
     *  var args = [1, 2, 3];
     *  f.apply(null, args);
     *  ```
     *
     * With `spread` this example can be re-written.
     *
     *  ```js
     *  spread(function(x, y, z) {})([1, 2, 3]);
     *  ```
     *
     * @param {Function} callback
     * @returns {Function}
     */
    var spread = function spread(callback) {
      return function wrap(arr) {
        return callback.apply(null, arr);
      };
    };

    /**
     * Determines whether the payload is an error thrown by Axios
     *
     * @param {*} payload The value to test
     * @returns {boolean} True if the payload is an error thrown by Axios, otherwise false
     */
    var isAxiosError = function isAxiosError(payload) {
      return (typeof payload === 'object') && (payload.isAxiosError === true);
    };

    /**
     * Create an instance of Axios
     *
     * @param {Object} defaultConfig The default config for the instance
     * @return {Axios} A new instance of Axios
     */
    function createInstance(defaultConfig) {
      var context = new Axios_1(defaultConfig);
      var instance = bind(Axios_1.prototype.request, context);

      // Copy axios.prototype to instance
      utils.extend(instance, Axios_1.prototype, context);

      // Copy context to instance
      utils.extend(instance, context);

      return instance;
    }

    // Create the default instance to be exported
    var axios$1 = createInstance(defaults_1);

    // Expose Axios class to allow class inheritance
    axios$1.Axios = Axios_1;

    // Factory for creating new instances
    axios$1.create = function create(instanceConfig) {
      return createInstance(mergeConfig(axios$1.defaults, instanceConfig));
    };

    // Expose Cancel & CancelToken
    axios$1.Cancel = Cancel_1;
    axios$1.CancelToken = CancelToken_1;
    axios$1.isCancel = isCancel;

    // Expose all/spread
    axios$1.all = function all(promises) {
      return Promise.all(promises);
    };
    axios$1.spread = spread;

    // Expose isAxiosError
    axios$1.isAxiosError = isAxiosError;

    var axios_1 = axios$1;

    // Allow use of default import syntax in TypeScript
    var _default = axios$1;
    axios_1.default = _default;

    var axios = axios_1;

    const showSpinner = writable(true);

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn) {
      var module = { exports: {} };
    	return fn(module, module.exports), module.exports;
    }

    var chartist = createCommonjsModule(function (module) {
    (function (root, factory) {
      if (module.exports) {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory();
      } else {
        root['Chartist'] = factory();
      }
    }(commonjsGlobal, function () {

    /* Chartist.js 0.11.4
     * Copyright © 2019 Gion Kunz
     * Free to use under either the WTFPL license or the MIT license.
     * https://raw.githubusercontent.com/gionkunz/chartist-js/master/LICENSE-WTFPL
     * https://raw.githubusercontent.com/gionkunz/chartist-js/master/LICENSE-MIT
     */
    /**
     * The core module of Chartist that is mainly providing static functions and higher level functions for chart modules.
     *
     * @module Chartist.Core
     */
    var Chartist = {
      version: '0.11.4'
    };

    (function (globalRoot, Chartist) {

      var window = globalRoot.window;
      var document = globalRoot.document;

      /**
       * This object contains all namespaces used within Chartist.
       *
       * @memberof Chartist.Core
       * @type {{svg: string, xmlns: string, xhtml: string, xlink: string, ct: string}}
       */
      Chartist.namespaces = {
        svg: 'http://www.w3.org/2000/svg',
        xmlns: 'http://www.w3.org/2000/xmlns/',
        xhtml: 'http://www.w3.org/1999/xhtml',
        xlink: 'http://www.w3.org/1999/xlink',
        ct: 'http://gionkunz.github.com/chartist-js/ct'
      };

      /**
       * Helps to simplify functional style code
       *
       * @memberof Chartist.Core
       * @param {*} n This exact value will be returned by the noop function
       * @return {*} The same value that was provided to the n parameter
       */
      Chartist.noop = function (n) {
        return n;
      };

      /**
       * Generates a-z from a number 0 to 26
       *
       * @memberof Chartist.Core
       * @param {Number} n A number from 0 to 26 that will result in a letter a-z
       * @return {String} A character from a-z based on the input number n
       */
      Chartist.alphaNumerate = function (n) {
        // Limit to a-z
        return String.fromCharCode(97 + n % 26);
      };

      /**
       * Simple recursive object extend
       *
       * @memberof Chartist.Core
       * @param {Object} target Target object where the source will be merged into
       * @param {Object...} sources This object (objects) will be merged into target and then target is returned
       * @return {Object} An object that has the same reference as target but is extended and merged with the properties of source
       */
      Chartist.extend = function (target) {
        var i, source, sourceProp;
        target = target || {};

        for (i = 1; i < arguments.length; i++) {
          source = arguments[i];
          for (var prop in source) {
            sourceProp = source[prop];
            if (typeof sourceProp === 'object' && sourceProp !== null && !(sourceProp instanceof Array)) {
              target[prop] = Chartist.extend(target[prop], sourceProp);
            } else {
              target[prop] = sourceProp;
            }
          }
        }

        return target;
      };

      /**
       * Replaces all occurrences of subStr in str with newSubStr and returns a new string.
       *
       * @memberof Chartist.Core
       * @param {String} str
       * @param {String} subStr
       * @param {String} newSubStr
       * @return {String}
       */
      Chartist.replaceAll = function(str, subStr, newSubStr) {
        return str.replace(new RegExp(subStr, 'g'), newSubStr);
      };

      /**
       * Converts a number to a string with a unit. If a string is passed then this will be returned unmodified.
       *
       * @memberof Chartist.Core
       * @param {Number} value
       * @param {String} unit
       * @return {String} Returns the passed number value with unit.
       */
      Chartist.ensureUnit = function(value, unit) {
        if(typeof value === 'number') {
          value = value + unit;
        }

        return value;
      };

      /**
       * Converts a number or string to a quantity object.
       *
       * @memberof Chartist.Core
       * @param {String|Number} input
       * @return {Object} Returns an object containing the value as number and the unit as string.
       */
      Chartist.quantity = function(input) {
        if (typeof input === 'string') {
          var match = (/^(\d+)\s*(.*)$/g).exec(input);
          return {
            value : +match[1],
            unit: match[2] || undefined
          };
        }
        return { value: input };
      };

      /**
       * This is a wrapper around document.querySelector that will return the query if it's already of type Node
       *
       * @memberof Chartist.Core
       * @param {String|Node} query The query to use for selecting a Node or a DOM node that will be returned directly
       * @return {Node}
       */
      Chartist.querySelector = function(query) {
        return query instanceof Node ? query : document.querySelector(query);
      };

      /**
       * Functional style helper to produce array with given length initialized with undefined values
       *
       * @memberof Chartist.Core
       * @param length
       * @return {Array}
       */
      Chartist.times = function(length) {
        return Array.apply(null, new Array(length));
      };

      /**
       * Sum helper to be used in reduce functions
       *
       * @memberof Chartist.Core
       * @param previous
       * @param current
       * @return {*}
       */
      Chartist.sum = function(previous, current) {
        return previous + (current ? current : 0);
      };

      /**
       * Multiply helper to be used in `Array.map` for multiplying each value of an array with a factor.
       *
       * @memberof Chartist.Core
       * @param {Number} factor
       * @returns {Function} Function that can be used in `Array.map` to multiply each value in an array
       */
      Chartist.mapMultiply = function(factor) {
        return function(num) {
          return num * factor;
        };
      };

      /**
       * Add helper to be used in `Array.map` for adding a addend to each value of an array.
       *
       * @memberof Chartist.Core
       * @param {Number} addend
       * @returns {Function} Function that can be used in `Array.map` to add a addend to each value in an array
       */
      Chartist.mapAdd = function(addend) {
        return function(num) {
          return num + addend;
        };
      };

      /**
       * Map for multi dimensional arrays where their nested arrays will be mapped in serial. The output array will have the length of the largest nested array. The callback function is called with variable arguments where each argument is the nested array value (or undefined if there are no more values).
       *
       * @memberof Chartist.Core
       * @param arr
       * @param cb
       * @return {Array}
       */
      Chartist.serialMap = function(arr, cb) {
        var result = [],
            length = Math.max.apply(null, arr.map(function(e) {
              return e.length;
            }));

        Chartist.times(length).forEach(function(e, index) {
          var args = arr.map(function(e) {
            return e[index];
          });

          result[index] = cb.apply(null, args);
        });

        return result;
      };

      /**
       * This helper function can be used to round values with certain precision level after decimal. This is used to prevent rounding errors near float point precision limit.
       *
       * @memberof Chartist.Core
       * @param {Number} value The value that should be rounded with precision
       * @param {Number} [digits] The number of digits after decimal used to do the rounding
       * @returns {number} Rounded value
       */
      Chartist.roundWithPrecision = function(value, digits) {
        var precision = Math.pow(10, digits || Chartist.precision);
        return Math.round(value * precision) / precision;
      };

      /**
       * Precision level used internally in Chartist for rounding. If you require more decimal places you can increase this number.
       *
       * @memberof Chartist.Core
       * @type {number}
       */
      Chartist.precision = 8;

      /**
       * A map with characters to escape for strings to be safely used as attribute values.
       *
       * @memberof Chartist.Core
       * @type {Object}
       */
      Chartist.escapingMap = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        '\'': '&#039;'
      };

      /**
       * This function serializes arbitrary data to a string. In case of data that can't be easily converted to a string, this function will create a wrapper object and serialize the data using JSON.stringify. The outcoming string will always be escaped using Chartist.escapingMap.
       * If called with null or undefined the function will return immediately with null or undefined.
       *
       * @memberof Chartist.Core
       * @param {Number|String|Object} data
       * @return {String}
       */
      Chartist.serialize = function(data) {
        if(data === null || data === undefined) {
          return data;
        } else if(typeof data === 'number') {
          data = ''+data;
        } else if(typeof data === 'object') {
          data = JSON.stringify({data: data});
        }

        return Object.keys(Chartist.escapingMap).reduce(function(result, key) {
          return Chartist.replaceAll(result, key, Chartist.escapingMap[key]);
        }, data);
      };

      /**
       * This function de-serializes a string previously serialized with Chartist.serialize. The string will always be unescaped using Chartist.escapingMap before it's returned. Based on the input value the return type can be Number, String or Object. JSON.parse is used with try / catch to see if the unescaped string can be parsed into an Object and this Object will be returned on success.
       *
       * @memberof Chartist.Core
       * @param {String} data
       * @return {String|Number|Object}
       */
      Chartist.deserialize = function(data) {
        if(typeof data !== 'string') {
          return data;
        }

        data = Object.keys(Chartist.escapingMap).reduce(function(result, key) {
          return Chartist.replaceAll(result, Chartist.escapingMap[key], key);
        }, data);

        try {
          data = JSON.parse(data);
          data = data.data !== undefined ? data.data : data;
        } catch(e) {}

        return data;
      };

      /**
       * Create or reinitialize the SVG element for the chart
       *
       * @memberof Chartist.Core
       * @param {Node} container The containing DOM Node object that will be used to plant the SVG element
       * @param {String} width Set the width of the SVG element. Default is 100%
       * @param {String} height Set the height of the SVG element. Default is 100%
       * @param {String} className Specify a class to be added to the SVG element
       * @return {Object} The created/reinitialized SVG element
       */
      Chartist.createSvg = function (container, width, height, className) {
        var svg;

        width = width || '100%';
        height = height || '100%';

        // Check if there is a previous SVG element in the container that contains the Chartist XML namespace and remove it
        // Since the DOM API does not support namespaces we need to manually search the returned list http://www.w3.org/TR/selectors-api/
        Array.prototype.slice.call(container.querySelectorAll('svg')).filter(function filterChartistSvgObjects(svg) {
          return svg.getAttributeNS(Chartist.namespaces.xmlns, 'ct');
        }).forEach(function removePreviousElement(svg) {
          container.removeChild(svg);
        });

        // Create svg object with width and height or use 100% as default
        svg = new Chartist.Svg('svg').attr({
          width: width,
          height: height
        }).addClass(className);

        svg._node.style.width = width;
        svg._node.style.height = height;

        // Add the DOM node to our container
        container.appendChild(svg._node);

        return svg;
      };

      /**
       * Ensures that the data object passed as second argument to the charts is present and correctly initialized.
       *
       * @param  {Object} data The data object that is passed as second argument to the charts
       * @return {Object} The normalized data object
       */
      Chartist.normalizeData = function(data, reverse, multi) {
        var labelCount;
        var output = {
          raw: data,
          normalized: {}
        };

        // Check if we should generate some labels based on existing series data
        output.normalized.series = Chartist.getDataArray({
          series: data.series || []
        }, reverse, multi);

        // If all elements of the normalized data array are arrays we're dealing with
        // multi series data and we need to find the largest series if they are un-even
        if (output.normalized.series.every(function(value) {
            return value instanceof Array;
          })) {
          // Getting the series with the the most elements
          labelCount = Math.max.apply(null, output.normalized.series.map(function(series) {
            return series.length;
          }));
        } else {
          // We're dealing with Pie data so we just take the normalized array length
          labelCount = output.normalized.series.length;
        }

        output.normalized.labels = (data.labels || []).slice();
        // Padding the labels to labelCount with empty strings
        Array.prototype.push.apply(
          output.normalized.labels,
          Chartist.times(Math.max(0, labelCount - output.normalized.labels.length)).map(function() {
            return '';
          })
        );

        if(reverse) {
          Chartist.reverseData(output.normalized);
        }

        return output;
      };

      /**
       * This function safely checks if an objects has an owned property.
       *
       * @param {Object} object The object where to check for a property
       * @param {string} property The property name
       * @returns {boolean} Returns true if the object owns the specified property
       */
      Chartist.safeHasProperty = function(object, property) {
        return object !== null &&
          typeof object === 'object' &&
          object.hasOwnProperty(property);
      };

      /**
       * Checks if a value is considered a hole in the data series.
       *
       * @param {*} value
       * @returns {boolean} True if the value is considered a data hole
       */
      Chartist.isDataHoleValue = function(value) {
        return value === null ||
          value === undefined ||
          (typeof value === 'number' && isNaN(value));
      };

      /**
       * Reverses the series, labels and series data arrays.
       *
       * @memberof Chartist.Core
       * @param data
       */
      Chartist.reverseData = function(data) {
        data.labels.reverse();
        data.series.reverse();
        for (var i = 0; i < data.series.length; i++) {
          if(typeof(data.series[i]) === 'object' && data.series[i].data !== undefined) {
            data.series[i].data.reverse();
          } else if(data.series[i] instanceof Array) {
            data.series[i].reverse();
          }
        }
      };

      /**
       * Convert data series into plain array
       *
       * @memberof Chartist.Core
       * @param {Object} data The series object that contains the data to be visualized in the chart
       * @param {Boolean} [reverse] If true the whole data is reversed by the getDataArray call. This will modify the data object passed as first parameter. The labels as well as the series order is reversed. The whole series data arrays are reversed too.
       * @param {Boolean} [multi] Create a multi dimensional array from a series data array where a value object with `x` and `y` values will be created.
       * @return {Array} A plain array that contains the data to be visualized in the chart
       */
      Chartist.getDataArray = function(data, reverse, multi) {
        // Recursively walks through nested arrays and convert string values to numbers and objects with value properties
        // to values. Check the tests in data core -> data normalization for a detailed specification of expected values
        function recursiveConvert(value) {
          if(Chartist.safeHasProperty(value, 'value')) {
            // We are dealing with value object notation so we need to recurse on value property
            return recursiveConvert(value.value);
          } else if(Chartist.safeHasProperty(value, 'data')) {
            // We are dealing with series object notation so we need to recurse on data property
            return recursiveConvert(value.data);
          } else if(value instanceof Array) {
            // Data is of type array so we need to recurse on the series
            return value.map(recursiveConvert);
          } else if(Chartist.isDataHoleValue(value)) {
            // We're dealing with a hole in the data and therefore need to return undefined
            // We're also returning undefined for multi value output
            return undefined;
          } else {
            // We need to prepare multi value output (x and y data)
            if(multi) {
              var multiValue = {};

              // Single series value arrays are assumed to specify the Y-Axis value
              // For example: [1, 2] => [{x: undefined, y: 1}, {x: undefined, y: 2}]
              // If multi is a string then it's assumed that it specified which dimension should be filled as default
              if(typeof multi === 'string') {
                multiValue[multi] = Chartist.getNumberOrUndefined(value);
              } else {
                multiValue.y = Chartist.getNumberOrUndefined(value);
              }

              multiValue.x = value.hasOwnProperty('x') ? Chartist.getNumberOrUndefined(value.x) : multiValue.x;
              multiValue.y = value.hasOwnProperty('y') ? Chartist.getNumberOrUndefined(value.y) : multiValue.y;

              return multiValue;

            } else {
              // We can return simple data
              return Chartist.getNumberOrUndefined(value);
            }
          }
        }

        return data.series.map(recursiveConvert);
      };

      /**
       * Converts a number into a padding object.
       *
       * @memberof Chartist.Core
       * @param {Object|Number} padding
       * @param {Number} [fallback] This value is used to fill missing values if a incomplete padding object was passed
       * @returns {Object} Returns a padding object containing top, right, bottom, left properties filled with the padding number passed in as argument. If the argument is something else than a number (presumably already a correct padding object) then this argument is directly returned.
       */
      Chartist.normalizePadding = function(padding, fallback) {
        fallback = fallback || 0;

        return typeof padding === 'number' ? {
          top: padding,
          right: padding,
          bottom: padding,
          left: padding
        } : {
          top: typeof padding.top === 'number' ? padding.top : fallback,
          right: typeof padding.right === 'number' ? padding.right : fallback,
          bottom: typeof padding.bottom === 'number' ? padding.bottom : fallback,
          left: typeof padding.left === 'number' ? padding.left : fallback
        };
      };

      Chartist.getMetaData = function(series, index) {
        var value = series.data ? series.data[index] : series[index];
        return value ? value.meta : undefined;
      };

      /**
       * Calculate the order of magnitude for the chart scale
       *
       * @memberof Chartist.Core
       * @param {Number} value The value Range of the chart
       * @return {Number} The order of magnitude
       */
      Chartist.orderOfMagnitude = function (value) {
        return Math.floor(Math.log(Math.abs(value)) / Math.LN10);
      };

      /**
       * Project a data length into screen coordinates (pixels)
       *
       * @memberof Chartist.Core
       * @param {Object} axisLength The svg element for the chart
       * @param {Number} length Single data value from a series array
       * @param {Object} bounds All the values to set the bounds of the chart
       * @return {Number} The projected data length in pixels
       */
      Chartist.projectLength = function (axisLength, length, bounds) {
        return length / bounds.range * axisLength;
      };

      /**
       * Get the height of the area in the chart for the data series
       *
       * @memberof Chartist.Core
       * @param {Object} svg The svg element for the chart
       * @param {Object} options The Object that contains all the optional values for the chart
       * @return {Number} The height of the area in the chart for the data series
       */
      Chartist.getAvailableHeight = function (svg, options) {
        return Math.max((Chartist.quantity(options.height).value || svg.height()) - (options.chartPadding.top +  options.chartPadding.bottom) - options.axisX.offset, 0);
      };

      /**
       * Get highest and lowest value of data array. This Array contains the data that will be visualized in the chart.
       *
       * @memberof Chartist.Core
       * @param {Array} data The array that contains the data to be visualized in the chart
       * @param {Object} options The Object that contains the chart options
       * @param {String} dimension Axis dimension 'x' or 'y' used to access the correct value and high / low configuration
       * @return {Object} An object that contains the highest and lowest value that will be visualized on the chart.
       */
      Chartist.getHighLow = function (data, options, dimension) {
        // TODO: Remove workaround for deprecated global high / low config. Axis high / low configuration is preferred
        options = Chartist.extend({}, options, dimension ? options['axis' + dimension.toUpperCase()] : {});

        var highLow = {
            high: options.high === undefined ? -Number.MAX_VALUE : +options.high,
            low: options.low === undefined ? Number.MAX_VALUE : +options.low
          };
        var findHigh = options.high === undefined;
        var findLow = options.low === undefined;

        // Function to recursively walk through arrays and find highest and lowest number
        function recursiveHighLow(data) {
          if(data === undefined) {
            return undefined;
          } else if(data instanceof Array) {
            for (var i = 0; i < data.length; i++) {
              recursiveHighLow(data[i]);
            }
          } else {
            var value = dimension ? +data[dimension] : +data;

            if (findHigh && value > highLow.high) {
              highLow.high = value;
            }

            if (findLow && value < highLow.low) {
              highLow.low = value;
            }
          }
        }

        // Start to find highest and lowest number recursively
        if(findHigh || findLow) {
          recursiveHighLow(data);
        }

        // Overrides of high / low based on reference value, it will make sure that the invisible reference value is
        // used to generate the chart. This is useful when the chart always needs to contain the position of the
        // invisible reference value in the view i.e. for bipolar scales.
        if (options.referenceValue || options.referenceValue === 0) {
          highLow.high = Math.max(options.referenceValue, highLow.high);
          highLow.low = Math.min(options.referenceValue, highLow.low);
        }

        // If high and low are the same because of misconfiguration or flat data (only the same value) we need
        // to set the high or low to 0 depending on the polarity
        if (highLow.high <= highLow.low) {
          // If both values are 0 we set high to 1
          if (highLow.low === 0) {
            highLow.high = 1;
          } else if (highLow.low < 0) {
            // If we have the same negative value for the bounds we set bounds.high to 0
            highLow.high = 0;
          } else if (highLow.high > 0) {
            // If we have the same positive value for the bounds we set bounds.low to 0
            highLow.low = 0;
          } else {
            // If data array was empty, values are Number.MAX_VALUE and -Number.MAX_VALUE. Set bounds to prevent errors
            highLow.high = 1;
            highLow.low = 0;
          }
        }

        return highLow;
      };

      /**
       * Checks if a value can be safely coerced to a number. This includes all values except null which result in finite numbers when coerced. This excludes NaN, since it's not finite.
       *
       * @memberof Chartist.Core
       * @param value
       * @returns {Boolean}
       */
      Chartist.isNumeric = function(value) {
        return value === null ? false : isFinite(value);
      };

      /**
       * Returns true on all falsey values except the numeric value 0.
       *
       * @memberof Chartist.Core
       * @param value
       * @returns {boolean}
       */
      Chartist.isFalseyButZero = function(value) {
        return !value && value !== 0;
      };

      /**
       * Returns a number if the passed parameter is a valid number or the function will return undefined. On all other values than a valid number, this function will return undefined.
       *
       * @memberof Chartist.Core
       * @param value
       * @returns {*}
       */
      Chartist.getNumberOrUndefined = function(value) {
        return Chartist.isNumeric(value) ? +value : undefined;
      };

      /**
       * Checks if provided value object is multi value (contains x or y properties)
       *
       * @memberof Chartist.Core
       * @param value
       */
      Chartist.isMultiValue = function(value) {
        return typeof value === 'object' && ('x' in value || 'y' in value);
      };

      /**
       * Gets a value from a dimension `value.x` or `value.y` while returning value directly if it's a valid numeric value. If the value is not numeric and it's falsey this function will return `defaultValue`.
       *
       * @memberof Chartist.Core
       * @param value
       * @param dimension
       * @param defaultValue
       * @returns {*}
       */
      Chartist.getMultiValue = function(value, dimension) {
        if(Chartist.isMultiValue(value)) {
          return Chartist.getNumberOrUndefined(value[dimension || 'y']);
        } else {
          return Chartist.getNumberOrUndefined(value);
        }
      };

      /**
       * Pollard Rho Algorithm to find smallest factor of an integer value. There are more efficient algorithms for factorization, but this one is quite efficient and not so complex.
       *
       * @memberof Chartist.Core
       * @param {Number} num An integer number where the smallest factor should be searched for
       * @returns {Number} The smallest integer factor of the parameter num.
       */
      Chartist.rho = function(num) {
        if(num === 1) {
          return num;
        }

        function gcd(p, q) {
          if (p % q === 0) {
            return q;
          } else {
            return gcd(q, p % q);
          }
        }

        function f(x) {
          return x * x + 1;
        }

        var x1 = 2, x2 = 2, divisor;
        if (num % 2 === 0) {
          return 2;
        }

        do {
          x1 = f(x1) % num;
          x2 = f(f(x2)) % num;
          divisor = gcd(Math.abs(x1 - x2), num);
        } while (divisor === 1);

        return divisor;
      };

      /**
       * Calculate and retrieve all the bounds for the chart and return them in one array
       *
       * @memberof Chartist.Core
       * @param {Number} axisLength The length of the Axis used for
       * @param {Object} highLow An object containing a high and low property indicating the value range of the chart.
       * @param {Number} scaleMinSpace The minimum projected length a step should result in
       * @param {Boolean} onlyInteger
       * @return {Object} All the values to set the bounds of the chart
       */
      Chartist.getBounds = function (axisLength, highLow, scaleMinSpace, onlyInteger) {
        var i,
          optimizationCounter = 0,
          newMin,
          newMax,
          bounds = {
            high: highLow.high,
            low: highLow.low
          };

        bounds.valueRange = bounds.high - bounds.low;
        bounds.oom = Chartist.orderOfMagnitude(bounds.valueRange);
        bounds.step = Math.pow(10, bounds.oom);
        bounds.min = Math.floor(bounds.low / bounds.step) * bounds.step;
        bounds.max = Math.ceil(bounds.high / bounds.step) * bounds.step;
        bounds.range = bounds.max - bounds.min;
        bounds.numberOfSteps = Math.round(bounds.range / bounds.step);

        // Optimize scale step by checking if subdivision is possible based on horizontalGridMinSpace
        // If we are already below the scaleMinSpace value we will scale up
        var length = Chartist.projectLength(axisLength, bounds.step, bounds);
        var scaleUp = length < scaleMinSpace;
        var smallestFactor = onlyInteger ? Chartist.rho(bounds.range) : 0;

        // First check if we should only use integer steps and if step 1 is still larger than scaleMinSpace so we can use 1
        if(onlyInteger && Chartist.projectLength(axisLength, 1, bounds) >= scaleMinSpace) {
          bounds.step = 1;
        } else if(onlyInteger && smallestFactor < bounds.step && Chartist.projectLength(axisLength, smallestFactor, bounds) >= scaleMinSpace) {
          // If step 1 was too small, we can try the smallest factor of range
          // If the smallest factor is smaller than the current bounds.step and the projected length of smallest factor
          // is larger than the scaleMinSpace we should go for it.
          bounds.step = smallestFactor;
        } else {
          // Trying to divide or multiply by 2 and find the best step value
          while (true) {
            if (scaleUp && Chartist.projectLength(axisLength, bounds.step, bounds) <= scaleMinSpace) {
              bounds.step *= 2;
            } else if (!scaleUp && Chartist.projectLength(axisLength, bounds.step / 2, bounds) >= scaleMinSpace) {
              bounds.step /= 2;
              if(onlyInteger && bounds.step % 1 !== 0) {
                bounds.step *= 2;
                break;
              }
            } else {
              break;
            }

            if(optimizationCounter++ > 1000) {
              throw new Error('Exceeded maximum number of iterations while optimizing scale step!');
            }
          }
        }

        var EPSILON = 2.221E-16;
        bounds.step = Math.max(bounds.step, EPSILON);
        function safeIncrement(value, increment) {
          // If increment is too small use *= (1+EPSILON) as a simple nextafter
          if (value === (value += increment)) {
          	value *= (1 + (increment > 0 ? EPSILON : -EPSILON));
          }
          return value;
        }

        // Narrow min and max based on new step
        newMin = bounds.min;
        newMax = bounds.max;
        while (newMin + bounds.step <= bounds.low) {
        	newMin = safeIncrement(newMin, bounds.step);
        }
        while (newMax - bounds.step >= bounds.high) {
        	newMax = safeIncrement(newMax, -bounds.step);
        }
        bounds.min = newMin;
        bounds.max = newMax;
        bounds.range = bounds.max - bounds.min;

        var values = [];
        for (i = bounds.min; i <= bounds.max; i = safeIncrement(i, bounds.step)) {
          var value = Chartist.roundWithPrecision(i);
          if (value !== values[values.length - 1]) {
            values.push(value);
          }
        }
        bounds.values = values;
        return bounds;
      };

      /**
       * Calculate cartesian coordinates of polar coordinates
       *
       * @memberof Chartist.Core
       * @param {Number} centerX X-axis coordinates of center point of circle segment
       * @param {Number} centerY X-axis coordinates of center point of circle segment
       * @param {Number} radius Radius of circle segment
       * @param {Number} angleInDegrees Angle of circle segment in degrees
       * @return {{x:Number, y:Number}} Coordinates of point on circumference
       */
      Chartist.polarToCartesian = function (centerX, centerY, radius, angleInDegrees) {
        var angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;

        return {
          x: centerX + (radius * Math.cos(angleInRadians)),
          y: centerY + (radius * Math.sin(angleInRadians))
        };
      };

      /**
       * Initialize chart drawing rectangle (area where chart is drawn) x1,y1 = bottom left / x2,y2 = top right
       *
       * @memberof Chartist.Core
       * @param {Object} svg The svg element for the chart
       * @param {Object} options The Object that contains all the optional values for the chart
       * @param {Number} [fallbackPadding] The fallback padding if partial padding objects are used
       * @return {Object} The chart rectangles coordinates inside the svg element plus the rectangles measurements
       */
      Chartist.createChartRect = function (svg, options, fallbackPadding) {
        var hasAxis = !!(options.axisX || options.axisY);
        var yAxisOffset = hasAxis ? options.axisY.offset : 0;
        var xAxisOffset = hasAxis ? options.axisX.offset : 0;
        // If width or height results in invalid value (including 0) we fallback to the unitless settings or even 0
        var width = svg.width() || Chartist.quantity(options.width).value || 0;
        var height = svg.height() || Chartist.quantity(options.height).value || 0;
        var normalizedPadding = Chartist.normalizePadding(options.chartPadding, fallbackPadding);

        // If settings were to small to cope with offset (legacy) and padding, we'll adjust
        width = Math.max(width, yAxisOffset + normalizedPadding.left + normalizedPadding.right);
        height = Math.max(height, xAxisOffset + normalizedPadding.top + normalizedPadding.bottom);

        var chartRect = {
          padding: normalizedPadding,
          width: function () {
            return this.x2 - this.x1;
          },
          height: function () {
            return this.y1 - this.y2;
          }
        };

        if(hasAxis) {
          if (options.axisX.position === 'start') {
            chartRect.y2 = normalizedPadding.top + xAxisOffset;
            chartRect.y1 = Math.max(height - normalizedPadding.bottom, chartRect.y2 + 1);
          } else {
            chartRect.y2 = normalizedPadding.top;
            chartRect.y1 = Math.max(height - normalizedPadding.bottom - xAxisOffset, chartRect.y2 + 1);
          }

          if (options.axisY.position === 'start') {
            chartRect.x1 = normalizedPadding.left + yAxisOffset;
            chartRect.x2 = Math.max(width - normalizedPadding.right, chartRect.x1 + 1);
          } else {
            chartRect.x1 = normalizedPadding.left;
            chartRect.x2 = Math.max(width - normalizedPadding.right - yAxisOffset, chartRect.x1 + 1);
          }
        } else {
          chartRect.x1 = normalizedPadding.left;
          chartRect.x2 = Math.max(width - normalizedPadding.right, chartRect.x1 + 1);
          chartRect.y2 = normalizedPadding.top;
          chartRect.y1 = Math.max(height - normalizedPadding.bottom, chartRect.y2 + 1);
        }

        return chartRect;
      };

      /**
       * Creates a grid line based on a projected value.
       *
       * @memberof Chartist.Core
       * @param position
       * @param index
       * @param axis
       * @param offset
       * @param length
       * @param group
       * @param classes
       * @param eventEmitter
       */
      Chartist.createGrid = function(position, index, axis, offset, length, group, classes, eventEmitter) {
        var positionalData = {};
        positionalData[axis.units.pos + '1'] = position;
        positionalData[axis.units.pos + '2'] = position;
        positionalData[axis.counterUnits.pos + '1'] = offset;
        positionalData[axis.counterUnits.pos + '2'] = offset + length;

        var gridElement = group.elem('line', positionalData, classes.join(' '));

        // Event for grid draw
        eventEmitter.emit('draw',
          Chartist.extend({
            type: 'grid',
            axis: axis,
            index: index,
            group: group,
            element: gridElement
          }, positionalData)
        );
      };

      /**
       * Creates a grid background rect and emits the draw event.
       *
       * @memberof Chartist.Core
       * @param gridGroup
       * @param chartRect
       * @param className
       * @param eventEmitter
       */
      Chartist.createGridBackground = function (gridGroup, chartRect, className, eventEmitter) {
        var gridBackground = gridGroup.elem('rect', {
            x: chartRect.x1,
            y: chartRect.y2,
            width: chartRect.width(),
            height: chartRect.height(),
          }, className, true);

          // Event for grid background draw
          eventEmitter.emit('draw', {
            type: 'gridBackground',
            group: gridGroup,
            element: gridBackground
          });
      };

      /**
       * Creates a label based on a projected value and an axis.
       *
       * @memberof Chartist.Core
       * @param position
       * @param length
       * @param index
       * @param labels
       * @param axis
       * @param axisOffset
       * @param labelOffset
       * @param group
       * @param classes
       * @param useForeignObject
       * @param eventEmitter
       */
      Chartist.createLabel = function(position, length, index, labels, axis, axisOffset, labelOffset, group, classes, useForeignObject, eventEmitter) {
        var labelElement;
        var positionalData = {};

        positionalData[axis.units.pos] = position + labelOffset[axis.units.pos];
        positionalData[axis.counterUnits.pos] = labelOffset[axis.counterUnits.pos];
        positionalData[axis.units.len] = length;
        positionalData[axis.counterUnits.len] = Math.max(0, axisOffset - 10);

        if(useForeignObject) {
          // We need to set width and height explicitly to px as span will not expand with width and height being
          // 100% in all browsers
          var content = document.createElement('span');
          content.className = classes.join(' ');
          content.setAttribute('xmlns', Chartist.namespaces.xhtml);
          content.innerText = labels[index];
          content.style[axis.units.len] = Math.round(positionalData[axis.units.len]) + 'px';
          content.style[axis.counterUnits.len] = Math.round(positionalData[axis.counterUnits.len]) + 'px';

          labelElement = group.foreignObject(content, Chartist.extend({
            style: 'overflow: visible;'
          }, positionalData));
        } else {
          labelElement = group.elem('text', positionalData, classes.join(' ')).text(labels[index]);
        }

        eventEmitter.emit('draw', Chartist.extend({
          type: 'label',
          axis: axis,
          index: index,
          group: group,
          element: labelElement,
          text: labels[index]
        }, positionalData));
      };

      /**
       * Helper to read series specific options from options object. It automatically falls back to the global option if
       * there is no option in the series options.
       *
       * @param {Object} series Series object
       * @param {Object} options Chartist options object
       * @param {string} key The options key that should be used to obtain the options
       * @returns {*}
       */
      Chartist.getSeriesOption = function(series, options, key) {
        if(series.name && options.series && options.series[series.name]) {
          var seriesOptions = options.series[series.name];
          return seriesOptions.hasOwnProperty(key) ? seriesOptions[key] : options[key];
        } else {
          return options[key];
        }
      };

      /**
       * Provides options handling functionality with callback for options changes triggered by responsive options and media query matches
       *
       * @memberof Chartist.Core
       * @param {Object} options Options set by user
       * @param {Array} responsiveOptions Optional functions to add responsive behavior to chart
       * @param {Object} eventEmitter The event emitter that will be used to emit the options changed events
       * @return {Object} The consolidated options object from the defaults, base and matching responsive options
       */
      Chartist.optionsProvider = function (options, responsiveOptions, eventEmitter) {
        var baseOptions = Chartist.extend({}, options),
          currentOptions,
          mediaQueryListeners = [],
          i;

        function updateCurrentOptions(mediaEvent) {
          var previousOptions = currentOptions;
          currentOptions = Chartist.extend({}, baseOptions);

          if (responsiveOptions) {
            for (i = 0; i < responsiveOptions.length; i++) {
              var mql = window.matchMedia(responsiveOptions[i][0]);
              if (mql.matches) {
                currentOptions = Chartist.extend(currentOptions, responsiveOptions[i][1]);
              }
            }
          }

          if(eventEmitter && mediaEvent) {
            eventEmitter.emit('optionsChanged', {
              previousOptions: previousOptions,
              currentOptions: currentOptions
            });
          }
        }

        function removeMediaQueryListeners() {
          mediaQueryListeners.forEach(function(mql) {
            mql.removeListener(updateCurrentOptions);
          });
        }

        if (!window.matchMedia) {
          throw 'window.matchMedia not found! Make sure you\'re using a polyfill.';
        } else if (responsiveOptions) {

          for (i = 0; i < responsiveOptions.length; i++) {
            var mql = window.matchMedia(responsiveOptions[i][0]);
            mql.addListener(updateCurrentOptions);
            mediaQueryListeners.push(mql);
          }
        }
        // Execute initially without an event argument so we get the correct options
        updateCurrentOptions();

        return {
          removeMediaQueryListeners: removeMediaQueryListeners,
          getCurrentOptions: function getCurrentOptions() {
            return Chartist.extend({}, currentOptions);
          }
        };
      };


      /**
       * Splits a list of coordinates and associated values into segments. Each returned segment contains a pathCoordinates
       * valueData property describing the segment.
       *
       * With the default options, segments consist of contiguous sets of points that do not have an undefined value. Any
       * points with undefined values are discarded.
       *
       * **Options**
       * The following options are used to determine how segments are formed
       * ```javascript
       * var options = {
       *   // If fillHoles is true, undefined values are simply discarded without creating a new segment. Assuming other options are default, this returns single segment.
       *   fillHoles: false,
       *   // If increasingX is true, the coordinates in all segments have strictly increasing x-values.
       *   increasingX: false
       * };
       * ```
       *
       * @memberof Chartist.Core
       * @param {Array} pathCoordinates List of point coordinates to be split in the form [x1, y1, x2, y2 ... xn, yn]
       * @param {Array} values List of associated point values in the form [v1, v2 .. vn]
       * @param {Object} options Options set by user
       * @return {Array} List of segments, each containing a pathCoordinates and valueData property.
       */
      Chartist.splitIntoSegments = function(pathCoordinates, valueData, options) {
        var defaultOptions = {
          increasingX: false,
          fillHoles: false
        };

        options = Chartist.extend({}, defaultOptions, options);

        var segments = [];
        var hole = true;

        for(var i = 0; i < pathCoordinates.length; i += 2) {
          // If this value is a "hole" we set the hole flag
          if(Chartist.getMultiValue(valueData[i / 2].value) === undefined) {
          // if(valueData[i / 2].value === undefined) {
            if(!options.fillHoles) {
              hole = true;
            }
          } else {
            if(options.increasingX && i >= 2 && pathCoordinates[i] <= pathCoordinates[i-2]) {
              // X is not increasing, so we need to make sure we start a new segment
              hole = true;
            }


            // If it's a valid value we need to check if we're coming out of a hole and create a new empty segment
            if(hole) {
              segments.push({
                pathCoordinates: [],
                valueData: []
              });
              // As we have a valid value now, we are not in a "hole" anymore
              hole = false;
            }

            // Add to the segment pathCoordinates and valueData
            segments[segments.length - 1].pathCoordinates.push(pathCoordinates[i], pathCoordinates[i + 1]);
            segments[segments.length - 1].valueData.push(valueData[i / 2]);
          }
        }

        return segments;
      };
    }(this || commonjsGlobal, Chartist));
    /* global Chartist */
    (function(globalRoot, Chartist) {

      Chartist.Interpolation = {};

      /**
       * This interpolation function does not smooth the path and the result is only containing lines and no curves.
       *
       * @example
       * var chart = new Chartist.Line('.ct-chart', {
       *   labels: [1, 2, 3, 4, 5],
       *   series: [[1, 2, 8, 1, 7]]
       * }, {
       *   lineSmooth: Chartist.Interpolation.none({
       *     fillHoles: false
       *   })
       * });
       *
       *
       * @memberof Chartist.Interpolation
       * @return {Function}
       */
      Chartist.Interpolation.none = function(options) {
        var defaultOptions = {
          fillHoles: false
        };
        options = Chartist.extend({}, defaultOptions, options);
        return function none(pathCoordinates, valueData) {
          var path = new Chartist.Svg.Path();
          var hole = true;

          for(var i = 0; i < pathCoordinates.length; i += 2) {
            var currX = pathCoordinates[i];
            var currY = pathCoordinates[i + 1];
            var currData = valueData[i / 2];

            if(Chartist.getMultiValue(currData.value) !== undefined) {

              if(hole) {
                path.move(currX, currY, false, currData);
              } else {
                path.line(currX, currY, false, currData);
              }

              hole = false;
            } else if(!options.fillHoles) {
              hole = true;
            }
          }

          return path;
        };
      };

      /**
       * Simple smoothing creates horizontal handles that are positioned with a fraction of the length between two data points. You can use the divisor option to specify the amount of smoothing.
       *
       * Simple smoothing can be used instead of `Chartist.Smoothing.cardinal` if you'd like to get rid of the artifacts it produces sometimes. Simple smoothing produces less flowing lines but is accurate by hitting the points and it also doesn't swing below or above the given data point.
       *
       * All smoothing functions within Chartist are factory functions that accept an options parameter. The simple interpolation function accepts one configuration parameter `divisor`, between 1 and ∞, which controls the smoothing characteristics.
       *
       * @example
       * var chart = new Chartist.Line('.ct-chart', {
       *   labels: [1, 2, 3, 4, 5],
       *   series: [[1, 2, 8, 1, 7]]
       * }, {
       *   lineSmooth: Chartist.Interpolation.simple({
       *     divisor: 2,
       *     fillHoles: false
       *   })
       * });
       *
       *
       * @memberof Chartist.Interpolation
       * @param {Object} options The options of the simple interpolation factory function.
       * @return {Function}
       */
      Chartist.Interpolation.simple = function(options) {
        var defaultOptions = {
          divisor: 2,
          fillHoles: false
        };
        options = Chartist.extend({}, defaultOptions, options);

        var d = 1 / Math.max(1, options.divisor);

        return function simple(pathCoordinates, valueData) {
          var path = new Chartist.Svg.Path();
          var prevX, prevY, prevData;

          for(var i = 0; i < pathCoordinates.length; i += 2) {
            var currX = pathCoordinates[i];
            var currY = pathCoordinates[i + 1];
            var length = (currX - prevX) * d;
            var currData = valueData[i / 2];

            if(currData.value !== undefined) {

              if(prevData === undefined) {
                path.move(currX, currY, false, currData);
              } else {
                path.curve(
                  prevX + length,
                  prevY,
                  currX - length,
                  currY,
                  currX,
                  currY,
                  false,
                  currData
                );
              }

              prevX = currX;
              prevY = currY;
              prevData = currData;
            } else if(!options.fillHoles) {
              prevX = currX = prevData = undefined;
            }
          }

          return path;
        };
      };

      /**
       * Cardinal / Catmull-Rome spline interpolation is the default smoothing function in Chartist. It produces nice results where the splines will always meet the points. It produces some artifacts though when data values are increased or decreased rapidly. The line may not follow a very accurate path and if the line should be accurate this smoothing function does not produce the best results.
       *
       * Cardinal splines can only be created if there are more than two data points. If this is not the case this smoothing will fallback to `Chartist.Smoothing.none`.
       *
       * All smoothing functions within Chartist are factory functions that accept an options parameter. The cardinal interpolation function accepts one configuration parameter `tension`, between 0 and 1, which controls the smoothing intensity.
       *
       * @example
       * var chart = new Chartist.Line('.ct-chart', {
       *   labels: [1, 2, 3, 4, 5],
       *   series: [[1, 2, 8, 1, 7]]
       * }, {
       *   lineSmooth: Chartist.Interpolation.cardinal({
       *     tension: 1,
       *     fillHoles: false
       *   })
       * });
       *
       * @memberof Chartist.Interpolation
       * @param {Object} options The options of the cardinal factory function.
       * @return {Function}
       */
      Chartist.Interpolation.cardinal = function(options) {
        var defaultOptions = {
          tension: 1,
          fillHoles: false
        };

        options = Chartist.extend({}, defaultOptions, options);

        var t = Math.min(1, Math.max(0, options.tension)),
          c = 1 - t;

        return function cardinal(pathCoordinates, valueData) {
          // First we try to split the coordinates into segments
          // This is necessary to treat "holes" in line charts
          var segments = Chartist.splitIntoSegments(pathCoordinates, valueData, {
            fillHoles: options.fillHoles
          });

          if(!segments.length) {
            // If there were no segments return 'Chartist.Interpolation.none'
            return Chartist.Interpolation.none()([]);
          } else if(segments.length > 1) {
            // If the split resulted in more that one segment we need to interpolate each segment individually and join them
            // afterwards together into a single path.
              var paths = [];
            // For each segment we will recurse the cardinal function
            segments.forEach(function(segment) {
              paths.push(cardinal(segment.pathCoordinates, segment.valueData));
            });
            // Join the segment path data into a single path and return
            return Chartist.Svg.Path.join(paths);
          } else {
            // If there was only one segment we can proceed regularly by using pathCoordinates and valueData from the first
            // segment
            pathCoordinates = segments[0].pathCoordinates;
            valueData = segments[0].valueData;

            // If less than two points we need to fallback to no smoothing
            if(pathCoordinates.length <= 4) {
              return Chartist.Interpolation.none()(pathCoordinates, valueData);
            }

            var path = new Chartist.Svg.Path().move(pathCoordinates[0], pathCoordinates[1], false, valueData[0]),
              z;

            for (var i = 0, iLen = pathCoordinates.length; iLen - 2 * !z > i; i += 2) {
              var p = [
                {x: +pathCoordinates[i - 2], y: +pathCoordinates[i - 1]},
                {x: +pathCoordinates[i], y: +pathCoordinates[i + 1]},
                {x: +pathCoordinates[i + 2], y: +pathCoordinates[i + 3]},
                {x: +pathCoordinates[i + 4], y: +pathCoordinates[i + 5]}
              ];
              if (z) {
                if (!i) {
                  p[0] = {x: +pathCoordinates[iLen - 2], y: +pathCoordinates[iLen - 1]};
                } else if (iLen - 4 === i) {
                  p[3] = {x: +pathCoordinates[0], y: +pathCoordinates[1]};
                } else if (iLen - 2 === i) {
                  p[2] = {x: +pathCoordinates[0], y: +pathCoordinates[1]};
                  p[3] = {x: +pathCoordinates[2], y: +pathCoordinates[3]};
                }
              } else {
                if (iLen - 4 === i) {
                  p[3] = p[2];
                } else if (!i) {
                  p[0] = {x: +pathCoordinates[i], y: +pathCoordinates[i + 1]};
                }
              }

              path.curve(
                (t * (-p[0].x + 6 * p[1].x + p[2].x) / 6) + (c * p[2].x),
                (t * (-p[0].y + 6 * p[1].y + p[2].y) / 6) + (c * p[2].y),
                (t * (p[1].x + 6 * p[2].x - p[3].x) / 6) + (c * p[2].x),
                (t * (p[1].y + 6 * p[2].y - p[3].y) / 6) + (c * p[2].y),
                p[2].x,
                p[2].y,
                false,
                valueData[(i + 2) / 2]
              );
            }

            return path;
          }
        };
      };

      /**
       * Monotone Cubic spline interpolation produces a smooth curve which preserves monotonicity. Unlike cardinal splines, the curve will not extend beyond the range of y-values of the original data points.
       *
       * Monotone Cubic splines can only be created if there are more than two data points. If this is not the case this smoothing will fallback to `Chartist.Smoothing.none`.
       *
       * The x-values of subsequent points must be increasing to fit a Monotone Cubic spline. If this condition is not met for a pair of adjacent points, then there will be a break in the curve between those data points.
       *
       * All smoothing functions within Chartist are factory functions that accept an options parameter.
       *
       * @example
       * var chart = new Chartist.Line('.ct-chart', {
       *   labels: [1, 2, 3, 4, 5],
       *   series: [[1, 2, 8, 1, 7]]
       * }, {
       *   lineSmooth: Chartist.Interpolation.monotoneCubic({
       *     fillHoles: false
       *   })
       * });
       *
       * @memberof Chartist.Interpolation
       * @param {Object} options The options of the monotoneCubic factory function.
       * @return {Function}
       */
      Chartist.Interpolation.monotoneCubic = function(options) {
        var defaultOptions = {
          fillHoles: false
        };

        options = Chartist.extend({}, defaultOptions, options);

        return function monotoneCubic(pathCoordinates, valueData) {
          // First we try to split the coordinates into segments
          // This is necessary to treat "holes" in line charts
          var segments = Chartist.splitIntoSegments(pathCoordinates, valueData, {
            fillHoles: options.fillHoles,
            increasingX: true
          });

          if(!segments.length) {
            // If there were no segments return 'Chartist.Interpolation.none'
            return Chartist.Interpolation.none()([]);
          } else if(segments.length > 1) {
            // If the split resulted in more that one segment we need to interpolate each segment individually and join them
            // afterwards together into a single path.
              var paths = [];
            // For each segment we will recurse the monotoneCubic fn function
            segments.forEach(function(segment) {
              paths.push(monotoneCubic(segment.pathCoordinates, segment.valueData));
            });
            // Join the segment path data into a single path and return
            return Chartist.Svg.Path.join(paths);
          } else {
            // If there was only one segment we can proceed regularly by using pathCoordinates and valueData from the first
            // segment
            pathCoordinates = segments[0].pathCoordinates;
            valueData = segments[0].valueData;

            // If less than three points we need to fallback to no smoothing
            if(pathCoordinates.length <= 4) {
              return Chartist.Interpolation.none()(pathCoordinates, valueData);
            }

            var xs = [],
              ys = [],
              i,
              n = pathCoordinates.length / 2,
              ms = [],
              ds = [], dys = [], dxs = [],
              path;

            // Populate x and y coordinates into separate arrays, for readability

            for(i = 0; i < n; i++) {
              xs[i] = pathCoordinates[i * 2];
              ys[i] = pathCoordinates[i * 2 + 1];
            }

            // Calculate deltas and derivative

            for(i = 0; i < n - 1; i++) {
              dys[i] = ys[i + 1] - ys[i];
              dxs[i] = xs[i + 1] - xs[i];
              ds[i] = dys[i] / dxs[i];
            }

            // Determine desired slope (m) at each point using Fritsch-Carlson method
            // See: http://math.stackexchange.com/questions/45218/implementation-of-monotone-cubic-interpolation

            ms[0] = ds[0];
            ms[n - 1] = ds[n - 2];

            for(i = 1; i < n - 1; i++) {
              if(ds[i] === 0 || ds[i - 1] === 0 || (ds[i - 1] > 0) !== (ds[i] > 0)) {
                ms[i] = 0;
              } else {
                ms[i] = 3 * (dxs[i - 1] + dxs[i]) / (
                  (2 * dxs[i] + dxs[i - 1]) / ds[i - 1] +
                  (dxs[i] + 2 * dxs[i - 1]) / ds[i]);

                if(!isFinite(ms[i])) {
                  ms[i] = 0;
                }
              }
            }

            // Now build a path from the slopes

            path = new Chartist.Svg.Path().move(xs[0], ys[0], false, valueData[0]);

            for(i = 0; i < n - 1; i++) {
              path.curve(
                // First control point
                xs[i] + dxs[i] / 3,
                ys[i] + ms[i] * dxs[i] / 3,
                // Second control point
                xs[i + 1] - dxs[i] / 3,
                ys[i + 1] - ms[i + 1] * dxs[i] / 3,
                // End point
                xs[i + 1],
                ys[i + 1],

                false,
                valueData[i + 1]
              );
            }

            return path;
          }
        };
      };

      /**
       * Step interpolation will cause the line chart to move in steps rather than diagonal or smoothed lines. This interpolation will create additional points that will also be drawn when the `showPoint` option is enabled.
       *
       * All smoothing functions within Chartist are factory functions that accept an options parameter. The step interpolation function accepts one configuration parameter `postpone`, that can be `true` or `false`. The default value is `true` and will cause the step to occur where the value actually changes. If a different behaviour is needed where the step is shifted to the left and happens before the actual value, this option can be set to `false`.
       *
       * @example
       * var chart = new Chartist.Line('.ct-chart', {
       *   labels: [1, 2, 3, 4, 5],
       *   series: [[1, 2, 8, 1, 7]]
       * }, {
       *   lineSmooth: Chartist.Interpolation.step({
       *     postpone: true,
       *     fillHoles: false
       *   })
       * });
       *
       * @memberof Chartist.Interpolation
       * @param options
       * @returns {Function}
       */
      Chartist.Interpolation.step = function(options) {
        var defaultOptions = {
          postpone: true,
          fillHoles: false
        };

        options = Chartist.extend({}, defaultOptions, options);

        return function step(pathCoordinates, valueData) {
          var path = new Chartist.Svg.Path();

          var prevX, prevY, prevData;

          for (var i = 0; i < pathCoordinates.length; i += 2) {
            var currX = pathCoordinates[i];
            var currY = pathCoordinates[i + 1];
            var currData = valueData[i / 2];

            // If the current point is also not a hole we can draw the step lines
            if(currData.value !== undefined) {
              if(prevData === undefined) {
                path.move(currX, currY, false, currData);
              } else {
                if(options.postpone) {
                  // If postponed we should draw the step line with the value of the previous value
                  path.line(currX, prevY, false, prevData);
                } else {
                  // If not postponed we should draw the step line with the value of the current value
                  path.line(prevX, currY, false, currData);
                }
                // Line to the actual point (this should only be a Y-Axis movement
                path.line(currX, currY, false, currData);
              }

              prevX = currX;
              prevY = currY;
              prevData = currData;
            } else if(!options.fillHoles) {
              prevX = prevY = prevData = undefined;
            }
          }

          return path;
        };
      };

    }(this || commonjsGlobal, Chartist));
    /* global Chartist */
    (function (globalRoot, Chartist) {

      Chartist.EventEmitter = function () {
        var handlers = [];

        /**
         * Add an event handler for a specific event
         *
         * @memberof Chartist.Event
         * @param {String} event The event name
         * @param {Function} handler A event handler function
         */
        function addEventHandler(event, handler) {
          handlers[event] = handlers[event] || [];
          handlers[event].push(handler);
        }

        /**
         * Remove an event handler of a specific event name or remove all event handlers for a specific event.
         *
         * @memberof Chartist.Event
         * @param {String} event The event name where a specific or all handlers should be removed
         * @param {Function} [handler] An optional event handler function. If specified only this specific handler will be removed and otherwise all handlers are removed.
         */
        function removeEventHandler(event, handler) {
          // Only do something if there are event handlers with this name existing
          if(handlers[event]) {
            // If handler is set we will look for a specific handler and only remove this
            if(handler) {
              handlers[event].splice(handlers[event].indexOf(handler), 1);
              if(handlers[event].length === 0) {
                delete handlers[event];
              }
            } else {
              // If no handler is specified we remove all handlers for this event
              delete handlers[event];
            }
          }
        }

        /**
         * Use this function to emit an event. All handlers that are listening for this event will be triggered with the data parameter.
         *
         * @memberof Chartist.Event
         * @param {String} event The event name that should be triggered
         * @param {*} data Arbitrary data that will be passed to the event handler callback functions
         */
        function emit(event, data) {
          // Only do something if there are event handlers with this name existing
          if(handlers[event]) {
            handlers[event].forEach(function(handler) {
              handler(data);
            });
          }

          // Emit event to star event handlers
          if(handlers['*']) {
            handlers['*'].forEach(function(starHandler) {
              starHandler(event, data);
            });
          }
        }

        return {
          addEventHandler: addEventHandler,
          removeEventHandler: removeEventHandler,
          emit: emit
        };
      };

    }(this || commonjsGlobal, Chartist));
    /* global Chartist */
    (function(globalRoot, Chartist) {

      function listToArray(list) {
        var arr = [];
        if (list.length) {
          for (var i = 0; i < list.length; i++) {
            arr.push(list[i]);
          }
        }
        return arr;
      }

      /**
       * Method to extend from current prototype.
       *
       * @memberof Chartist.Class
       * @param {Object} properties The object that serves as definition for the prototype that gets created for the new class. This object should always contain a constructor property that is the desired constructor for the newly created class.
       * @param {Object} [superProtoOverride] By default extens will use the current class prototype or Chartist.class. With this parameter you can specify any super prototype that will be used.
       * @return {Function} Constructor function of the new class
       *
       * @example
       * var Fruit = Class.extend({
         * color: undefined,
         *   sugar: undefined,
         *
         *   constructor: function(color, sugar) {
         *     this.color = color;
         *     this.sugar = sugar;
         *   },
         *
         *   eat: function() {
         *     this.sugar = 0;
         *     return this;
         *   }
         * });
       *
       * var Banana = Fruit.extend({
         *   length: undefined,
         *
         *   constructor: function(length, sugar) {
         *     Banana.super.constructor.call(this, 'Yellow', sugar);
         *     this.length = length;
         *   }
         * });
       *
       * var banana = new Banana(20, 40);
       * console.log('banana instanceof Fruit', banana instanceof Fruit);
       * console.log('Fruit is prototype of banana', Fruit.prototype.isPrototypeOf(banana));
       * console.log('bananas prototype is Fruit', Object.getPrototypeOf(banana) === Fruit.prototype);
       * console.log(banana.sugar);
       * console.log(banana.eat().sugar);
       * console.log(banana.color);
       */
      function extend(properties, superProtoOverride) {
        var superProto = superProtoOverride || this.prototype || Chartist.Class;
        var proto = Object.create(superProto);

        Chartist.Class.cloneDefinitions(proto, properties);

        var constr = function() {
          var fn = proto.constructor || function () {},
            instance;

          // If this is linked to the Chartist namespace the constructor was not called with new
          // To provide a fallback we will instantiate here and return the instance
          instance = this === Chartist ? Object.create(proto) : this;
          fn.apply(instance, Array.prototype.slice.call(arguments, 0));

          // If this constructor was not called with new we need to return the instance
          // This will not harm when the constructor has been called with new as the returned value is ignored
          return instance;
        };

        constr.prototype = proto;
        constr.super = superProto;
        constr.extend = this.extend;

        return constr;
      }

      // Variable argument list clones args > 0 into args[0] and retruns modified args[0]
      function cloneDefinitions() {
        var args = listToArray(arguments);
        var target = args[0];

        args.splice(1, args.length - 1).forEach(function (source) {
          Object.getOwnPropertyNames(source).forEach(function (propName) {
            // If this property already exist in target we delete it first
            delete target[propName];
            // Define the property with the descriptor from source
            Object.defineProperty(target, propName,
              Object.getOwnPropertyDescriptor(source, propName));
          });
        });

        return target;
      }

      Chartist.Class = {
        extend: extend,
        cloneDefinitions: cloneDefinitions
      };

    }(this || commonjsGlobal, Chartist));
    /* global Chartist */
    (function(globalRoot, Chartist) {

      var window = globalRoot.window;

      // TODO: Currently we need to re-draw the chart on window resize. This is usually very bad and will affect performance.
      // This is done because we can't work with relative coordinates when drawing the chart because SVG Path does not
      // work with relative positions yet. We need to check if we can do a viewBox hack to switch to percentage.
      // See http://mozilla.6506.n7.nabble.com/Specyfing-paths-with-percentages-unit-td247474.html
      // Update: can be done using the above method tested here: http://codepen.io/gionkunz/pen/KDvLj
      // The problem is with the label offsets that can't be converted into percentage and affecting the chart container
      /**
       * Updates the chart which currently does a full reconstruction of the SVG DOM
       *
       * @param {Object} [data] Optional data you'd like to set for the chart before it will update. If not specified the update method will use the data that is already configured with the chart.
       * @param {Object} [options] Optional options you'd like to add to the previous options for the chart before it will update. If not specified the update method will use the options that have been already configured with the chart.
       * @param {Boolean} [override] If set to true, the passed options will be used to extend the options that have been configured already. Otherwise the chart default options will be used as the base
       * @memberof Chartist.Base
       */
      function update(data, options, override) {
        if(data) {
          this.data = data || {};
          this.data.labels = this.data.labels || [];
          this.data.series = this.data.series || [];
          // Event for data transformation that allows to manipulate the data before it gets rendered in the charts
          this.eventEmitter.emit('data', {
            type: 'update',
            data: this.data
          });
        }

        if(options) {
          this.options = Chartist.extend({}, override ? this.options : this.defaultOptions, options);

          // If chartist was not initialized yet, we just set the options and leave the rest to the initialization
          // Otherwise we re-create the optionsProvider at this point
          if(!this.initializeTimeoutId) {
            this.optionsProvider.removeMediaQueryListeners();
            this.optionsProvider = Chartist.optionsProvider(this.options, this.responsiveOptions, this.eventEmitter);
          }
        }

        // Only re-created the chart if it has been initialized yet
        if(!this.initializeTimeoutId) {
          this.createChart(this.optionsProvider.getCurrentOptions());
        }

        // Return a reference to the chart object to chain up calls
        return this;
      }

      /**
       * This method can be called on the API object of each chart and will un-register all event listeners that were added to other components. This currently includes a window.resize listener as well as media query listeners if any responsive options have been provided. Use this function if you need to destroy and recreate Chartist charts dynamically.
       *
       * @memberof Chartist.Base
       */
      function detach() {
        // Only detach if initialization already occurred on this chart. If this chart still hasn't initialized (therefore
        // the initializationTimeoutId is still a valid timeout reference, we will clear the timeout
        if(!this.initializeTimeoutId) {
          window.removeEventListener('resize', this.resizeListener);
          this.optionsProvider.removeMediaQueryListeners();
        } else {
          window.clearTimeout(this.initializeTimeoutId);
        }

        return this;
      }

      /**
       * Use this function to register event handlers. The handler callbacks are synchronous and will run in the main thread rather than the event loop.
       *
       * @memberof Chartist.Base
       * @param {String} event Name of the event. Check the examples for supported events.
       * @param {Function} handler The handler function that will be called when an event with the given name was emitted. This function will receive a data argument which contains event data. See the example for more details.
       */
      function on(event, handler) {
        this.eventEmitter.addEventHandler(event, handler);
        return this;
      }

      /**
       * Use this function to un-register event handlers. If the handler function parameter is omitted all handlers for the given event will be un-registered.
       *
       * @memberof Chartist.Base
       * @param {String} event Name of the event for which a handler should be removed
       * @param {Function} [handler] The handler function that that was previously used to register a new event handler. This handler will be removed from the event handler list. If this parameter is omitted then all event handlers for the given event are removed from the list.
       */
      function off(event, handler) {
        this.eventEmitter.removeEventHandler(event, handler);
        return this;
      }

      function initialize() {
        // Add window resize listener that re-creates the chart
        window.addEventListener('resize', this.resizeListener);

        // Obtain current options based on matching media queries (if responsive options are given)
        // This will also register a listener that is re-creating the chart based on media changes
        this.optionsProvider = Chartist.optionsProvider(this.options, this.responsiveOptions, this.eventEmitter);
        // Register options change listener that will trigger a chart update
        this.eventEmitter.addEventHandler('optionsChanged', function() {
          this.update();
        }.bind(this));

        // Before the first chart creation we need to register us with all plugins that are configured
        // Initialize all relevant plugins with our chart object and the plugin options specified in the config
        if(this.options.plugins) {
          this.options.plugins.forEach(function(plugin) {
            if(plugin instanceof Array) {
              plugin[0](this, plugin[1]);
            } else {
              plugin(this);
            }
          }.bind(this));
        }

        // Event for data transformation that allows to manipulate the data before it gets rendered in the charts
        this.eventEmitter.emit('data', {
          type: 'initial',
          data: this.data
        });

        // Create the first chart
        this.createChart(this.optionsProvider.getCurrentOptions());

        // As chart is initialized from the event loop now we can reset our timeout reference
        // This is important if the chart gets initialized on the same element twice
        this.initializeTimeoutId = undefined;
      }

      /**
       * Constructor of chart base class.
       *
       * @param query
       * @param data
       * @param defaultOptions
       * @param options
       * @param responsiveOptions
       * @constructor
       */
      function Base(query, data, defaultOptions, options, responsiveOptions) {
        this.container = Chartist.querySelector(query);
        this.data = data || {};
        this.data.labels = this.data.labels || [];
        this.data.series = this.data.series || [];
        this.defaultOptions = defaultOptions;
        this.options = options;
        this.responsiveOptions = responsiveOptions;
        this.eventEmitter = Chartist.EventEmitter();
        this.supportsForeignObject = Chartist.Svg.isSupported('Extensibility');
        this.supportsAnimations = Chartist.Svg.isSupported('AnimationEventsAttribute');
        this.resizeListener = function resizeListener(){
          this.update();
        }.bind(this);

        if(this.container) {
          // If chartist was already initialized in this container we are detaching all event listeners first
          if(this.container.__chartist__) {
            this.container.__chartist__.detach();
          }

          this.container.__chartist__ = this;
        }

        // Using event loop for first draw to make it possible to register event listeners in the same call stack where
        // the chart was created.
        this.initializeTimeoutId = setTimeout(initialize.bind(this), 0);
      }

      // Creating the chart base class
      Chartist.Base = Chartist.Class.extend({
        constructor: Base,
        optionsProvider: undefined,
        container: undefined,
        svg: undefined,
        eventEmitter: undefined,
        createChart: function() {
          throw new Error('Base chart type can\'t be instantiated!');
        },
        update: update,
        detach: detach,
        on: on,
        off: off,
        version: Chartist.version,
        supportsForeignObject: false
      });

    }(this || commonjsGlobal, Chartist));
    /* global Chartist */
    (function(globalRoot, Chartist) {

      var document = globalRoot.document;

      /**
       * Chartist.Svg creates a new SVG object wrapper with a starting element. You can use the wrapper to fluently create sub-elements and modify them.
       *
       * @memberof Chartist.Svg
       * @constructor
       * @param {String|Element} name The name of the SVG element to create or an SVG dom element which should be wrapped into Chartist.Svg
       * @param {Object} attributes An object with properties that will be added as attributes to the SVG element that is created. Attributes with undefined values will not be added.
       * @param {String} className This class or class list will be added to the SVG element
       * @param {Object} parent The parent SVG wrapper object where this newly created wrapper and it's element will be attached to as child
       * @param {Boolean} insertFirst If this param is set to true in conjunction with a parent element the newly created element will be added as first child element in the parent element
       */
      function Svg(name, attributes, className, parent, insertFirst) {
        // If Svg is getting called with an SVG element we just return the wrapper
        if(name instanceof Element) {
          this._node = name;
        } else {
          this._node = document.createElementNS(Chartist.namespaces.svg, name);

          // If this is an SVG element created then custom namespace
          if(name === 'svg') {
            this.attr({
              'xmlns:ct': Chartist.namespaces.ct
            });
          }
        }

        if(attributes) {
          this.attr(attributes);
        }

        if(className) {
          this.addClass(className);
        }

        if(parent) {
          if (insertFirst && parent._node.firstChild) {
            parent._node.insertBefore(this._node, parent._node.firstChild);
          } else {
            parent._node.appendChild(this._node);
          }
        }
      }

      /**
       * Set attributes on the current SVG element of the wrapper you're currently working on.
       *
       * @memberof Chartist.Svg
       * @param {Object|String} attributes An object with properties that will be added as attributes to the SVG element that is created. Attributes with undefined values will not be added. If this parameter is a String then the function is used as a getter and will return the attribute value.
       * @param {String} [ns] If specified, the attribute will be obtained using getAttributeNs. In order to write namepsaced attributes you can use the namespace:attribute notation within the attributes object.
       * @return {Object|String} The current wrapper object will be returned so it can be used for chaining or the attribute value if used as getter function.
       */
      function attr(attributes, ns) {
        if(typeof attributes === 'string') {
          if(ns) {
            return this._node.getAttributeNS(ns, attributes);
          } else {
            return this._node.getAttribute(attributes);
          }
        }

        Object.keys(attributes).forEach(function(key) {
          // If the attribute value is undefined we can skip this one
          if(attributes[key] === undefined) {
            return;
          }

          if (key.indexOf(':') !== -1) {
            var namespacedAttribute = key.split(':');
            this._node.setAttributeNS(Chartist.namespaces[namespacedAttribute[0]], key, attributes[key]);
          } else {
            this._node.setAttribute(key, attributes[key]);
          }
        }.bind(this));

        return this;
      }

      /**
       * Create a new SVG element whose wrapper object will be selected for further operations. This way you can also create nested groups easily.
       *
       * @memberof Chartist.Svg
       * @param {String} name The name of the SVG element that should be created as child element of the currently selected element wrapper
       * @param {Object} [attributes] An object with properties that will be added as attributes to the SVG element that is created. Attributes with undefined values will not be added.
       * @param {String} [className] This class or class list will be added to the SVG element
       * @param {Boolean} [insertFirst] If this param is set to true in conjunction with a parent element the newly created element will be added as first child element in the parent element
       * @return {Chartist.Svg} Returns a Chartist.Svg wrapper object that can be used to modify the containing SVG data
       */
      function elem(name, attributes, className, insertFirst) {
        return new Chartist.Svg(name, attributes, className, this, insertFirst);
      }

      /**
       * Returns the parent Chartist.SVG wrapper object
       *
       * @memberof Chartist.Svg
       * @return {Chartist.Svg} Returns a Chartist.Svg wrapper around the parent node of the current node. If the parent node is not existing or it's not an SVG node then this function will return null.
       */
      function parent() {
        return this._node.parentNode instanceof SVGElement ? new Chartist.Svg(this._node.parentNode) : null;
      }

      /**
       * This method returns a Chartist.Svg wrapper around the root SVG element of the current tree.
       *
       * @memberof Chartist.Svg
       * @return {Chartist.Svg} The root SVG element wrapped in a Chartist.Svg element
       */
      function root() {
        var node = this._node;
        while(node.nodeName !== 'svg') {
          node = node.parentNode;
        }
        return new Chartist.Svg(node);
      }

      /**
       * Find the first child SVG element of the current element that matches a CSS selector. The returned object is a Chartist.Svg wrapper.
       *
       * @memberof Chartist.Svg
       * @param {String} selector A CSS selector that is used to query for child SVG elements
       * @return {Chartist.Svg} The SVG wrapper for the element found or null if no element was found
       */
      function querySelector(selector) {
        var foundNode = this._node.querySelector(selector);
        return foundNode ? new Chartist.Svg(foundNode) : null;
      }

      /**
       * Find the all child SVG elements of the current element that match a CSS selector. The returned object is a Chartist.Svg.List wrapper.
       *
       * @memberof Chartist.Svg
       * @param {String} selector A CSS selector that is used to query for child SVG elements
       * @return {Chartist.Svg.List} The SVG wrapper list for the element found or null if no element was found
       */
      function querySelectorAll(selector) {
        var foundNodes = this._node.querySelectorAll(selector);
        return foundNodes.length ? new Chartist.Svg.List(foundNodes) : null;
      }

      /**
       * Returns the underlying SVG node for the current element.
       *
       * @memberof Chartist.Svg
       * @returns {Node}
       */
      function getNode() {
        return this._node;
      }

      /**
       * This method creates a foreignObject (see https://developer.mozilla.org/en-US/docs/Web/SVG/Element/foreignObject) that allows to embed HTML content into a SVG graphic. With the help of foreignObjects you can enable the usage of regular HTML elements inside of SVG where they are subject for SVG positioning and transformation but the Browser will use the HTML rendering capabilities for the containing DOM.
       *
       * @memberof Chartist.Svg
       * @param {Node|String} content The DOM Node, or HTML string that will be converted to a DOM Node, that is then placed into and wrapped by the foreignObject
       * @param {String} [attributes] An object with properties that will be added as attributes to the foreignObject element that is created. Attributes with undefined values will not be added.
       * @param {String} [className] This class or class list will be added to the SVG element
       * @param {Boolean} [insertFirst] Specifies if the foreignObject should be inserted as first child
       * @return {Chartist.Svg} New wrapper object that wraps the foreignObject element
       */
      function foreignObject(content, attributes, className, insertFirst) {
        // If content is string then we convert it to DOM
        // TODO: Handle case where content is not a string nor a DOM Node
        if(typeof content === 'string') {
          var container = document.createElement('div');
          container.innerHTML = content;
          content = container.firstChild;
        }

        // Adding namespace to content element
        content.setAttribute('xmlns', Chartist.namespaces.xmlns);

        // Creating the foreignObject without required extension attribute (as described here
        // http://www.w3.org/TR/SVG/extend.html#ForeignObjectElement)
        var fnObj = this.elem('foreignObject', attributes, className, insertFirst);

        // Add content to foreignObjectElement
        fnObj._node.appendChild(content);

        return fnObj;
      }

      /**
       * This method adds a new text element to the current Chartist.Svg wrapper.
       *
       * @memberof Chartist.Svg
       * @param {String} t The text that should be added to the text element that is created
       * @return {Chartist.Svg} The same wrapper object that was used to add the newly created element
       */
      function text(t) {
        this._node.appendChild(document.createTextNode(t));
        return this;
      }

      /**
       * This method will clear all child nodes of the current wrapper object.
       *
       * @memberof Chartist.Svg
       * @return {Chartist.Svg} The same wrapper object that got emptied
       */
      function empty() {
        while (this._node.firstChild) {
          this._node.removeChild(this._node.firstChild);
        }

        return this;
      }

      /**
       * This method will cause the current wrapper to remove itself from its parent wrapper. Use this method if you'd like to get rid of an element in a given DOM structure.
       *
       * @memberof Chartist.Svg
       * @return {Chartist.Svg} The parent wrapper object of the element that got removed
       */
      function remove() {
        this._node.parentNode.removeChild(this._node);
        return this.parent();
      }

      /**
       * This method will replace the element with a new element that can be created outside of the current DOM.
       *
       * @memberof Chartist.Svg
       * @param {Chartist.Svg} newElement The new Chartist.Svg object that will be used to replace the current wrapper object
       * @return {Chartist.Svg} The wrapper of the new element
       */
      function replace(newElement) {
        this._node.parentNode.replaceChild(newElement._node, this._node);
        return newElement;
      }

      /**
       * This method will append an element to the current element as a child.
       *
       * @memberof Chartist.Svg
       * @param {Chartist.Svg} element The Chartist.Svg element that should be added as a child
       * @param {Boolean} [insertFirst] Specifies if the element should be inserted as first child
       * @return {Chartist.Svg} The wrapper of the appended object
       */
      function append(element, insertFirst) {
        if(insertFirst && this._node.firstChild) {
          this._node.insertBefore(element._node, this._node.firstChild);
        } else {
          this._node.appendChild(element._node);
        }

        return this;
      }

      /**
       * Returns an array of class names that are attached to the current wrapper element. This method can not be chained further.
       *
       * @memberof Chartist.Svg
       * @return {Array} A list of classes or an empty array if there are no classes on the current element
       */
      function classes() {
        return this._node.getAttribute('class') ? this._node.getAttribute('class').trim().split(/\s+/) : [];
      }

      /**
       * Adds one or a space separated list of classes to the current element and ensures the classes are only existing once.
       *
       * @memberof Chartist.Svg
       * @param {String} names A white space separated list of class names
       * @return {Chartist.Svg} The wrapper of the current element
       */
      function addClass(names) {
        this._node.setAttribute('class',
          this.classes(this._node)
            .concat(names.trim().split(/\s+/))
            .filter(function(elem, pos, self) {
              return self.indexOf(elem) === pos;
            }).join(' ')
        );

        return this;
      }

      /**
       * Removes one or a space separated list of classes from the current element.
       *
       * @memberof Chartist.Svg
       * @param {String} names A white space separated list of class names
       * @return {Chartist.Svg} The wrapper of the current element
       */
      function removeClass(names) {
        var removedClasses = names.trim().split(/\s+/);

        this._node.setAttribute('class', this.classes(this._node).filter(function(name) {
          return removedClasses.indexOf(name) === -1;
        }).join(' '));

        return this;
      }

      /**
       * Removes all classes from the current element.
       *
       * @memberof Chartist.Svg
       * @return {Chartist.Svg} The wrapper of the current element
       */
      function removeAllClasses() {
        this._node.setAttribute('class', '');

        return this;
      }

      /**
       * Get element height using `getBoundingClientRect`
       *
       * @memberof Chartist.Svg
       * @return {Number} The elements height in pixels
       */
      function height() {
        return this._node.getBoundingClientRect().height;
      }

      /**
       * Get element width using `getBoundingClientRect`
       *
       * @memberof Chartist.Core
       * @return {Number} The elements width in pixels
       */
      function width() {
        return this._node.getBoundingClientRect().width;
      }

      /**
       * The animate function lets you animate the current element with SMIL animations. You can add animations for multiple attributes at the same time by using an animation definition object. This object should contain SMIL animation attributes. Please refer to http://www.w3.org/TR/SVG/animate.html for a detailed specification about the available animation attributes. Additionally an easing property can be passed in the animation definition object. This can be a string with a name of an easing function in `Chartist.Svg.Easing` or an array with four numbers specifying a cubic Bézier curve.
       * **An animations object could look like this:**
       * ```javascript
       * element.animate({
       *   opacity: {
       *     dur: 1000,
       *     from: 0,
       *     to: 1
       *   },
       *   x1: {
       *     dur: '1000ms',
       *     from: 100,
       *     to: 200,
       *     easing: 'easeOutQuart'
       *   },
       *   y1: {
       *     dur: '2s',
       *     from: 0,
       *     to: 100
       *   }
       * });
       * ```
       * **Automatic unit conversion**
       * For the `dur` and the `begin` animate attribute you can also omit a unit by passing a number. The number will automatically be converted to milli seconds.
       * **Guided mode**
       * The default behavior of SMIL animations with offset using the `begin` attribute is that the attribute will keep it's original value until the animation starts. Mostly this behavior is not desired as you'd like to have your element attributes already initialized with the animation `from` value even before the animation starts. Also if you don't specify `fill="freeze"` on an animate element or if you delete the animation after it's done (which is done in guided mode) the attribute will switch back to the initial value. This behavior is also not desired when performing simple one-time animations. For one-time animations you'd want to trigger animations immediately instead of relative to the document begin time. That's why in guided mode Chartist.Svg will also use the `begin` property to schedule a timeout and manually start the animation after the timeout. If you're using multiple SMIL definition objects for an attribute (in an array), guided mode will be disabled for this attribute, even if you explicitly enabled it.
       * If guided mode is enabled the following behavior is added:
       * - Before the animation starts (even when delayed with `begin`) the animated attribute will be set already to the `from` value of the animation
       * - `begin` is explicitly set to `indefinite` so it can be started manually without relying on document begin time (creation)
       * - The animate element will be forced to use `fill="freeze"`
       * - The animation will be triggered with `beginElement()` in a timeout where `begin` of the definition object is interpreted in milli seconds. If no `begin` was specified the timeout is triggered immediately.
       * - After the animation the element attribute value will be set to the `to` value of the animation
       * - The animate element is deleted from the DOM
       *
       * @memberof Chartist.Svg
       * @param {Object} animations An animations object where the property keys are the attributes you'd like to animate. The properties should be objects again that contain the SMIL animation attributes (usually begin, dur, from, and to). The property begin and dur is auto converted (see Automatic unit conversion). You can also schedule multiple animations for the same attribute by passing an Array of SMIL definition objects. Attributes that contain an array of SMIL definition objects will not be executed in guided mode.
       * @param {Boolean} guided Specify if guided mode should be activated for this animation (see Guided mode). If not otherwise specified, guided mode will be activated.
       * @param {Object} eventEmitter If specified, this event emitter will be notified when an animation starts or ends.
       * @return {Chartist.Svg} The current element where the animation was added
       */
      function animate(animations, guided, eventEmitter) {
        if(guided === undefined) {
          guided = true;
        }

        Object.keys(animations).forEach(function createAnimateForAttributes(attribute) {

          function createAnimate(animationDefinition, guided) {
            var attributeProperties = {},
              animate,
              timeout,
              easing;

            // Check if an easing is specified in the definition object and delete it from the object as it will not
            // be part of the animate element attributes.
            if(animationDefinition.easing) {
              // If already an easing Bézier curve array we take it or we lookup a easing array in the Easing object
              easing = animationDefinition.easing instanceof Array ?
                animationDefinition.easing :
                Chartist.Svg.Easing[animationDefinition.easing];
              delete animationDefinition.easing;
            }

            // If numeric dur or begin was provided we assume milli seconds
            animationDefinition.begin = Chartist.ensureUnit(animationDefinition.begin, 'ms');
            animationDefinition.dur = Chartist.ensureUnit(animationDefinition.dur, 'ms');

            if(easing) {
              animationDefinition.calcMode = 'spline';
              animationDefinition.keySplines = easing.join(' ');
              animationDefinition.keyTimes = '0;1';
            }

            // Adding "fill: freeze" if we are in guided mode and set initial attribute values
            if(guided) {
              animationDefinition.fill = 'freeze';
              // Animated property on our element should already be set to the animation from value in guided mode
              attributeProperties[attribute] = animationDefinition.from;
              this.attr(attributeProperties);

              // In guided mode we also set begin to indefinite so we can trigger the start manually and put the begin
              // which needs to be in ms aside
              timeout = Chartist.quantity(animationDefinition.begin || 0).value;
              animationDefinition.begin = 'indefinite';
            }

            animate = this.elem('animate', Chartist.extend({
              attributeName: attribute
            }, animationDefinition));

            if(guided) {
              // If guided we take the value that was put aside in timeout and trigger the animation manually with a timeout
              setTimeout(function() {
                // If beginElement fails we set the animated attribute to the end position and remove the animate element
                // This happens if the SMIL ElementTimeControl interface is not supported or any other problems occured in
                // the browser. (Currently FF 34 does not support animate elements in foreignObjects)
                try {
                  animate._node.beginElement();
                } catch(err) {
                  // Set animated attribute to current animated value
                  attributeProperties[attribute] = animationDefinition.to;
                  this.attr(attributeProperties);
                  // Remove the animate element as it's no longer required
                  animate.remove();
                }
              }.bind(this), timeout);
            }

            if(eventEmitter) {
              animate._node.addEventListener('beginEvent', function handleBeginEvent() {
                eventEmitter.emit('animationBegin', {
                  element: this,
                  animate: animate._node,
                  params: animationDefinition
                });
              }.bind(this));
            }

            animate._node.addEventListener('endEvent', function handleEndEvent() {
              if(eventEmitter) {
                eventEmitter.emit('animationEnd', {
                  element: this,
                  animate: animate._node,
                  params: animationDefinition
                });
              }

              if(guided) {
                // Set animated attribute to current animated value
                attributeProperties[attribute] = animationDefinition.to;
                this.attr(attributeProperties);
                // Remove the animate element as it's no longer required
                animate.remove();
              }
            }.bind(this));
          }

          // If current attribute is an array of definition objects we create an animate for each and disable guided mode
          if(animations[attribute] instanceof Array) {
            animations[attribute].forEach(function(animationDefinition) {
              createAnimate.bind(this)(animationDefinition, false);
            }.bind(this));
          } else {
            createAnimate.bind(this)(animations[attribute], guided);
          }

        }.bind(this));

        return this;
      }

      Chartist.Svg = Chartist.Class.extend({
        constructor: Svg,
        attr: attr,
        elem: elem,
        parent: parent,
        root: root,
        querySelector: querySelector,
        querySelectorAll: querySelectorAll,
        getNode: getNode,
        foreignObject: foreignObject,
        text: text,
        empty: empty,
        remove: remove,
        replace: replace,
        append: append,
        classes: classes,
        addClass: addClass,
        removeClass: removeClass,
        removeAllClasses: removeAllClasses,
        height: height,
        width: width,
        animate: animate
      });

      /**
       * This method checks for support of a given SVG feature like Extensibility, SVG-animation or the like. Check http://www.w3.org/TR/SVG11/feature for a detailed list.
       *
       * @memberof Chartist.Svg
       * @param {String} feature The SVG 1.1 feature that should be checked for support.
       * @return {Boolean} True of false if the feature is supported or not
       */
      Chartist.Svg.isSupported = function(feature) {
        return document.implementation.hasFeature('http://www.w3.org/TR/SVG11/feature#' + feature, '1.1');
      };

      /**
       * This Object contains some standard easing cubic bezier curves. Then can be used with their name in the `Chartist.Svg.animate`. You can also extend the list and use your own name in the `animate` function. Click the show code button to see the available bezier functions.
       *
       * @memberof Chartist.Svg
       */
      var easingCubicBeziers = {
        easeInSine: [0.47, 0, 0.745, 0.715],
        easeOutSine: [0.39, 0.575, 0.565, 1],
        easeInOutSine: [0.445, 0.05, 0.55, 0.95],
        easeInQuad: [0.55, 0.085, 0.68, 0.53],
        easeOutQuad: [0.25, 0.46, 0.45, 0.94],
        easeInOutQuad: [0.455, 0.03, 0.515, 0.955],
        easeInCubic: [0.55, 0.055, 0.675, 0.19],
        easeOutCubic: [0.215, 0.61, 0.355, 1],
        easeInOutCubic: [0.645, 0.045, 0.355, 1],
        easeInQuart: [0.895, 0.03, 0.685, 0.22],
        easeOutQuart: [0.165, 0.84, 0.44, 1],
        easeInOutQuart: [0.77, 0, 0.175, 1],
        easeInQuint: [0.755, 0.05, 0.855, 0.06],
        easeOutQuint: [0.23, 1, 0.32, 1],
        easeInOutQuint: [0.86, 0, 0.07, 1],
        easeInExpo: [0.95, 0.05, 0.795, 0.035],
        easeOutExpo: [0.19, 1, 0.22, 1],
        easeInOutExpo: [1, 0, 0, 1],
        easeInCirc: [0.6, 0.04, 0.98, 0.335],
        easeOutCirc: [0.075, 0.82, 0.165, 1],
        easeInOutCirc: [0.785, 0.135, 0.15, 0.86],
        easeInBack: [0.6, -0.28, 0.735, 0.045],
        easeOutBack: [0.175, 0.885, 0.32, 1.275],
        easeInOutBack: [0.68, -0.55, 0.265, 1.55]
      };

      Chartist.Svg.Easing = easingCubicBeziers;

      /**
       * This helper class is to wrap multiple `Chartist.Svg` elements into a list where you can call the `Chartist.Svg` functions on all elements in the list with one call. This is helpful when you'd like to perform calls with `Chartist.Svg` on multiple elements.
       * An instance of this class is also returned by `Chartist.Svg.querySelectorAll`.
       *
       * @memberof Chartist.Svg
       * @param {Array<Node>|NodeList} nodeList An Array of SVG DOM nodes or a SVG DOM NodeList (as returned by document.querySelectorAll)
       * @constructor
       */
      function SvgList(nodeList) {
        var list = this;

        this.svgElements = [];
        for(var i = 0; i < nodeList.length; i++) {
          this.svgElements.push(new Chartist.Svg(nodeList[i]));
        }

        // Add delegation methods for Chartist.Svg
        Object.keys(Chartist.Svg.prototype).filter(function(prototypeProperty) {
          return ['constructor',
              'parent',
              'querySelector',
              'querySelectorAll',
              'replace',
              'append',
              'classes',
              'height',
              'width'].indexOf(prototypeProperty) === -1;
        }).forEach(function(prototypeProperty) {
          list[prototypeProperty] = function() {
            var args = Array.prototype.slice.call(arguments, 0);
            list.svgElements.forEach(function(element) {
              Chartist.Svg.prototype[prototypeProperty].apply(element, args);
            });
            return list;
          };
        });
      }

      Chartist.Svg.List = Chartist.Class.extend({
        constructor: SvgList
      });
    }(this || commonjsGlobal, Chartist));
    /* global Chartist */
    (function(globalRoot, Chartist) {

      /**
       * Contains the descriptors of supported element types in a SVG path. Currently only move, line and curve are supported.
       *
       * @memberof Chartist.Svg.Path
       * @type {Object}
       */
      var elementDescriptions = {
        m: ['x', 'y'],
        l: ['x', 'y'],
        c: ['x1', 'y1', 'x2', 'y2', 'x', 'y'],
        a: ['rx', 'ry', 'xAr', 'lAf', 'sf', 'x', 'y']
      };

      /**
       * Default options for newly created SVG path objects.
       *
       * @memberof Chartist.Svg.Path
       * @type {Object}
       */
      var defaultOptions = {
        // The accuracy in digit count after the decimal point. This will be used to round numbers in the SVG path. If this option is set to false then no rounding will be performed.
        accuracy: 3
      };

      function element(command, params, pathElements, pos, relative, data) {
        var pathElement = Chartist.extend({
          command: relative ? command.toLowerCase() : command.toUpperCase()
        }, params, data ? { data: data } : {} );

        pathElements.splice(pos, 0, pathElement);
      }

      function forEachParam(pathElements, cb) {
        pathElements.forEach(function(pathElement, pathElementIndex) {
          elementDescriptions[pathElement.command.toLowerCase()].forEach(function(paramName, paramIndex) {
            cb(pathElement, paramName, pathElementIndex, paramIndex, pathElements);
          });
        });
      }

      /**
       * Used to construct a new path object.
       *
       * @memberof Chartist.Svg.Path
       * @param {Boolean} close If set to true then this path will be closed when stringified (with a Z at the end)
       * @param {Object} options Options object that overrides the default objects. See default options for more details.
       * @constructor
       */
      function SvgPath(close, options) {
        this.pathElements = [];
        this.pos = 0;
        this.close = close;
        this.options = Chartist.extend({}, defaultOptions, options);
      }

      /**
       * Gets or sets the current position (cursor) inside of the path. You can move around the cursor freely but limited to 0 or the count of existing elements. All modifications with element functions will insert new elements at the position of this cursor.
       *
       * @memberof Chartist.Svg.Path
       * @param {Number} [pos] If a number is passed then the cursor is set to this position in the path element array.
       * @return {Chartist.Svg.Path|Number} If the position parameter was passed then the return value will be the path object for easy call chaining. If no position parameter was passed then the current position is returned.
       */
      function position(pos) {
        if(pos !== undefined) {
          this.pos = Math.max(0, Math.min(this.pathElements.length, pos));
          return this;
        } else {
          return this.pos;
        }
      }

      /**
       * Removes elements from the path starting at the current position.
       *
       * @memberof Chartist.Svg.Path
       * @param {Number} count Number of path elements that should be removed from the current position.
       * @return {Chartist.Svg.Path} The current path object for easy call chaining.
       */
      function remove(count) {
        this.pathElements.splice(this.pos, count);
        return this;
      }

      /**
       * Use this function to add a new move SVG path element.
       *
       * @memberof Chartist.Svg.Path
       * @param {Number} x The x coordinate for the move element.
       * @param {Number} y The y coordinate for the move element.
       * @param {Boolean} [relative] If set to true the move element will be created with relative coordinates (lowercase letter)
       * @param {*} [data] Any data that should be stored with the element object that will be accessible in pathElement
       * @return {Chartist.Svg.Path} The current path object for easy call chaining.
       */
      function move(x, y, relative, data) {
        element('M', {
          x: +x,
          y: +y
        }, this.pathElements, this.pos++, relative, data);
        return this;
      }

      /**
       * Use this function to add a new line SVG path element.
       *
       * @memberof Chartist.Svg.Path
       * @param {Number} x The x coordinate for the line element.
       * @param {Number} y The y coordinate for the line element.
       * @param {Boolean} [relative] If set to true the line element will be created with relative coordinates (lowercase letter)
       * @param {*} [data] Any data that should be stored with the element object that will be accessible in pathElement
       * @return {Chartist.Svg.Path} The current path object for easy call chaining.
       */
      function line(x, y, relative, data) {
        element('L', {
          x: +x,
          y: +y
        }, this.pathElements, this.pos++, relative, data);
        return this;
      }

      /**
       * Use this function to add a new curve SVG path element.
       *
       * @memberof Chartist.Svg.Path
       * @param {Number} x1 The x coordinate for the first control point of the bezier curve.
       * @param {Number} y1 The y coordinate for the first control point of the bezier curve.
       * @param {Number} x2 The x coordinate for the second control point of the bezier curve.
       * @param {Number} y2 The y coordinate for the second control point of the bezier curve.
       * @param {Number} x The x coordinate for the target point of the curve element.
       * @param {Number} y The y coordinate for the target point of the curve element.
       * @param {Boolean} [relative] If set to true the curve element will be created with relative coordinates (lowercase letter)
       * @param {*} [data] Any data that should be stored with the element object that will be accessible in pathElement
       * @return {Chartist.Svg.Path} The current path object for easy call chaining.
       */
      function curve(x1, y1, x2, y2, x, y, relative, data) {
        element('C', {
          x1: +x1,
          y1: +y1,
          x2: +x2,
          y2: +y2,
          x: +x,
          y: +y
        }, this.pathElements, this.pos++, relative, data);
        return this;
      }

      /**
       * Use this function to add a new non-bezier curve SVG path element.
       *
       * @memberof Chartist.Svg.Path
       * @param {Number} rx The radius to be used for the x-axis of the arc.
       * @param {Number} ry The radius to be used for the y-axis of the arc.
       * @param {Number} xAr Defines the orientation of the arc
       * @param {Number} lAf Large arc flag
       * @param {Number} sf Sweep flag
       * @param {Number} x The x coordinate for the target point of the curve element.
       * @param {Number} y The y coordinate for the target point of the curve element.
       * @param {Boolean} [relative] If set to true the curve element will be created with relative coordinates (lowercase letter)
       * @param {*} [data] Any data that should be stored with the element object that will be accessible in pathElement
       * @return {Chartist.Svg.Path} The current path object for easy call chaining.
       */
      function arc(rx, ry, xAr, lAf, sf, x, y, relative, data) {
        element('A', {
          rx: +rx,
          ry: +ry,
          xAr: +xAr,
          lAf: +lAf,
          sf: +sf,
          x: +x,
          y: +y
        }, this.pathElements, this.pos++, relative, data);
        return this;
      }

      /**
       * Parses an SVG path seen in the d attribute of path elements, and inserts the parsed elements into the existing path object at the current cursor position. Any closing path indicators (Z at the end of the path) will be ignored by the parser as this is provided by the close option in the options of the path object.
       *
       * @memberof Chartist.Svg.Path
       * @param {String} path Any SVG path that contains move (m), line (l) or curve (c) components.
       * @return {Chartist.Svg.Path} The current path object for easy call chaining.
       */
      function parse(path) {
        // Parsing the SVG path string into an array of arrays [['M', '10', '10'], ['L', '100', '100']]
        var chunks = path.replace(/([A-Za-z])([0-9])/g, '$1 $2')
          .replace(/([0-9])([A-Za-z])/g, '$1 $2')
          .split(/[\s,]+/)
          .reduce(function(result, element) {
            if(element.match(/[A-Za-z]/)) {
              result.push([]);
            }

            result[result.length - 1].push(element);
            return result;
          }, []);

        // If this is a closed path we remove the Z at the end because this is determined by the close option
        if(chunks[chunks.length - 1][0].toUpperCase() === 'Z') {
          chunks.pop();
        }

        // Using svgPathElementDescriptions to map raw path arrays into objects that contain the command and the parameters
        // For example {command: 'M', x: '10', y: '10'}
        var elements = chunks.map(function(chunk) {
            var command = chunk.shift(),
              description = elementDescriptions[command.toLowerCase()];

            return Chartist.extend({
              command: command
            }, description.reduce(function(result, paramName, index) {
              result[paramName] = +chunk[index];
              return result;
            }, {}));
          });

        // Preparing a splice call with the elements array as var arg params and insert the parsed elements at the current position
        var spliceArgs = [this.pos, 0];
        Array.prototype.push.apply(spliceArgs, elements);
        Array.prototype.splice.apply(this.pathElements, spliceArgs);
        // Increase the internal position by the element count
        this.pos += elements.length;

        return this;
      }

      /**
       * This function renders to current SVG path object into a final SVG string that can be used in the d attribute of SVG path elements. It uses the accuracy option to round big decimals. If the close parameter was set in the constructor of this path object then a path closing Z will be appended to the output string.
       *
       * @memberof Chartist.Svg.Path
       * @return {String}
       */
      function stringify() {
        var accuracyMultiplier = Math.pow(10, this.options.accuracy);

        return this.pathElements.reduce(function(path, pathElement) {
            var params = elementDescriptions[pathElement.command.toLowerCase()].map(function(paramName) {
              return this.options.accuracy ?
                (Math.round(pathElement[paramName] * accuracyMultiplier) / accuracyMultiplier) :
                pathElement[paramName];
            }.bind(this));

            return path + pathElement.command + params.join(',');
          }.bind(this), '') + (this.close ? 'Z' : '');
      }

      /**
       * Scales all elements in the current SVG path object. There is an individual parameter for each coordinate. Scaling will also be done for control points of curves, affecting the given coordinate.
       *
       * @memberof Chartist.Svg.Path
       * @param {Number} x The number which will be used to scale the x, x1 and x2 of all path elements.
       * @param {Number} y The number which will be used to scale the y, y1 and y2 of all path elements.
       * @return {Chartist.Svg.Path} The current path object for easy call chaining.
       */
      function scale(x, y) {
        forEachParam(this.pathElements, function(pathElement, paramName) {
          pathElement[paramName] *= paramName[0] === 'x' ? x : y;
        });
        return this;
      }

      /**
       * Translates all elements in the current SVG path object. The translation is relative and there is an individual parameter for each coordinate. Translation will also be done for control points of curves, affecting the given coordinate.
       *
       * @memberof Chartist.Svg.Path
       * @param {Number} x The number which will be used to translate the x, x1 and x2 of all path elements.
       * @param {Number} y The number which will be used to translate the y, y1 and y2 of all path elements.
       * @return {Chartist.Svg.Path} The current path object for easy call chaining.
       */
      function translate(x, y) {
        forEachParam(this.pathElements, function(pathElement, paramName) {
          pathElement[paramName] += paramName[0] === 'x' ? x : y;
        });
        return this;
      }

      /**
       * This function will run over all existing path elements and then loop over their attributes. The callback function will be called for every path element attribute that exists in the current path.
       * The method signature of the callback function looks like this:
       * ```javascript
       * function(pathElement, paramName, pathElementIndex, paramIndex, pathElements)
       * ```
       * If something else than undefined is returned by the callback function, this value will be used to replace the old value. This allows you to build custom transformations of path objects that can't be achieved using the basic transformation functions scale and translate.
       *
       * @memberof Chartist.Svg.Path
       * @param {Function} transformFnc The callback function for the transformation. Check the signature in the function description.
       * @return {Chartist.Svg.Path} The current path object for easy call chaining.
       */
      function transform(transformFnc) {
        forEachParam(this.pathElements, function(pathElement, paramName, pathElementIndex, paramIndex, pathElements) {
          var transformed = transformFnc(pathElement, paramName, pathElementIndex, paramIndex, pathElements);
          if(transformed || transformed === 0) {
            pathElement[paramName] = transformed;
          }
        });
        return this;
      }

      /**
       * This function clones a whole path object with all its properties. This is a deep clone and path element objects will also be cloned.
       *
       * @memberof Chartist.Svg.Path
       * @param {Boolean} [close] Optional option to set the new cloned path to closed. If not specified or false, the original path close option will be used.
       * @return {Chartist.Svg.Path}
       */
      function clone(close) {
        var c = new Chartist.Svg.Path(close || this.close);
        c.pos = this.pos;
        c.pathElements = this.pathElements.slice().map(function cloneElements(pathElement) {
          return Chartist.extend({}, pathElement);
        });
        c.options = Chartist.extend({}, this.options);
        return c;
      }

      /**
       * Split a Svg.Path object by a specific command in the path chain. The path chain will be split and an array of newly created paths objects will be returned. This is useful if you'd like to split an SVG path by it's move commands, for example, in order to isolate chunks of drawings.
       *
       * @memberof Chartist.Svg.Path
       * @param {String} command The command you'd like to use to split the path
       * @return {Array<Chartist.Svg.Path>}
       */
      function splitByCommand(command) {
        var split = [
          new Chartist.Svg.Path()
        ];

        this.pathElements.forEach(function(pathElement) {
          if(pathElement.command === command.toUpperCase() && split[split.length - 1].pathElements.length !== 0) {
            split.push(new Chartist.Svg.Path());
          }

          split[split.length - 1].pathElements.push(pathElement);
        });

        return split;
      }

      /**
       * This static function on `Chartist.Svg.Path` is joining multiple paths together into one paths.
       *
       * @memberof Chartist.Svg.Path
       * @param {Array<Chartist.Svg.Path>} paths A list of paths to be joined together. The order is important.
       * @param {boolean} close If the newly created path should be a closed path
       * @param {Object} options Path options for the newly created path.
       * @return {Chartist.Svg.Path}
       */

      function join(paths, close, options) {
        var joinedPath = new Chartist.Svg.Path(close, options);
        for(var i = 0; i < paths.length; i++) {
          var path = paths[i];
          for(var j = 0; j < path.pathElements.length; j++) {
            joinedPath.pathElements.push(path.pathElements[j]);
          }
        }
        return joinedPath;
      }

      Chartist.Svg.Path = Chartist.Class.extend({
        constructor: SvgPath,
        position: position,
        remove: remove,
        move: move,
        line: line,
        curve: curve,
        arc: arc,
        scale: scale,
        translate: translate,
        transform: transform,
        parse: parse,
        stringify: stringify,
        clone: clone,
        splitByCommand: splitByCommand
      });

      Chartist.Svg.Path.elementDescriptions = elementDescriptions;
      Chartist.Svg.Path.join = join;
    }(this || commonjsGlobal, Chartist));
    (function (globalRoot, Chartist) {

      globalRoot.window;
      globalRoot.document;

      var axisUnits = {
        x: {
          pos: 'x',
          len: 'width',
          dir: 'horizontal',
          rectStart: 'x1',
          rectEnd: 'x2',
          rectOffset: 'y2'
        },
        y: {
          pos: 'y',
          len: 'height',
          dir: 'vertical',
          rectStart: 'y2',
          rectEnd: 'y1',
          rectOffset: 'x1'
        }
      };

      function Axis(units, chartRect, ticks, options) {
        this.units = units;
        this.counterUnits = units === axisUnits.x ? axisUnits.y : axisUnits.x;
        this.chartRect = chartRect;
        this.axisLength = chartRect[units.rectEnd] - chartRect[units.rectStart];
        this.gridOffset = chartRect[units.rectOffset];
        this.ticks = ticks;
        this.options = options;
      }

      function createGridAndLabels(gridGroup, labelGroup, useForeignObject, chartOptions, eventEmitter) {
        var axisOptions = chartOptions['axis' + this.units.pos.toUpperCase()];
        var projectedValues = this.ticks.map(this.projectValue.bind(this));
        var labelValues = this.ticks.map(axisOptions.labelInterpolationFnc);

        projectedValues.forEach(function(projectedValue, index) {
          var labelOffset = {
            x: 0,
            y: 0
          };

          // TODO: Find better solution for solving this problem
          // Calculate how much space we have available for the label
          var labelLength;
          if(projectedValues[index + 1]) {
            // If we still have one label ahead, we can calculate the distance to the next tick / label
            labelLength = projectedValues[index + 1] - projectedValue;
          } else {
            // If we don't have a label ahead and we have only two labels in total, we just take the remaining distance to
            // on the whole axis length. We limit that to a minimum of 30 pixel, so that labels close to the border will
            // still be visible inside of the chart padding.
            labelLength = Math.max(this.axisLength - projectedValue, 30);
          }

          // Skip grid lines and labels where interpolated label values are falsey (execpt for 0)
          if(Chartist.isFalseyButZero(labelValues[index]) && labelValues[index] !== '') {
            return;
          }

          // Transform to global coordinates using the chartRect
          // We also need to set the label offset for the createLabel function
          if(this.units.pos === 'x') {
            projectedValue = this.chartRect.x1 + projectedValue;
            labelOffset.x = chartOptions.axisX.labelOffset.x;

            // If the labels should be positioned in start position (top side for vertical axis) we need to set a
            // different offset as for positioned with end (bottom)
            if(chartOptions.axisX.position === 'start') {
              labelOffset.y = this.chartRect.padding.top + chartOptions.axisX.labelOffset.y + (useForeignObject ? 5 : 20);
            } else {
              labelOffset.y = this.chartRect.y1 + chartOptions.axisX.labelOffset.y + (useForeignObject ? 5 : 20);
            }
          } else {
            projectedValue = this.chartRect.y1 - projectedValue;
            labelOffset.y = chartOptions.axisY.labelOffset.y - (useForeignObject ? labelLength : 0);

            // If the labels should be positioned in start position (left side for horizontal axis) we need to set a
            // different offset as for positioned with end (right side)
            if(chartOptions.axisY.position === 'start') {
              labelOffset.x = useForeignObject ? this.chartRect.padding.left + chartOptions.axisY.labelOffset.x : this.chartRect.x1 - 10;
            } else {
              labelOffset.x = this.chartRect.x2 + chartOptions.axisY.labelOffset.x + 10;
            }
          }

          if(axisOptions.showGrid) {
            Chartist.createGrid(projectedValue, index, this, this.gridOffset, this.chartRect[this.counterUnits.len](), gridGroup, [
              chartOptions.classNames.grid,
              chartOptions.classNames[this.units.dir]
            ], eventEmitter);
          }

          if(axisOptions.showLabel) {
            Chartist.createLabel(projectedValue, labelLength, index, labelValues, this, axisOptions.offset, labelOffset, labelGroup, [
              chartOptions.classNames.label,
              chartOptions.classNames[this.units.dir],
              (axisOptions.position === 'start' ? chartOptions.classNames[axisOptions.position] : chartOptions.classNames['end'])
            ], useForeignObject, eventEmitter);
          }
        }.bind(this));
      }

      Chartist.Axis = Chartist.Class.extend({
        constructor: Axis,
        createGridAndLabels: createGridAndLabels,
        projectValue: function(value, index, data) {
          throw new Error('Base axis can\'t be instantiated!');
        }
      });

      Chartist.Axis.units = axisUnits;

    }(this || commonjsGlobal, Chartist));
    /* global Chartist */
    (function (globalRoot, Chartist) {

      globalRoot.window;
      globalRoot.document;

      function AutoScaleAxis(axisUnit, data, chartRect, options) {
        // Usually we calculate highLow based on the data but this can be overriden by a highLow object in the options
        var highLow = options.highLow || Chartist.getHighLow(data, options, axisUnit.pos);
        this.bounds = Chartist.getBounds(chartRect[axisUnit.rectEnd] - chartRect[axisUnit.rectStart], highLow, options.scaleMinSpace || 20, options.onlyInteger);
        this.range = {
          min: this.bounds.min,
          max: this.bounds.max
        };

        Chartist.AutoScaleAxis.super.constructor.call(this,
          axisUnit,
          chartRect,
          this.bounds.values,
          options);
      }

      function projectValue(value) {
        return this.axisLength * (+Chartist.getMultiValue(value, this.units.pos) - this.bounds.min) / this.bounds.range;
      }

      Chartist.AutoScaleAxis = Chartist.Axis.extend({
        constructor: AutoScaleAxis,
        projectValue: projectValue
      });

    }(this || commonjsGlobal, Chartist));
    /* global Chartist */
    (function (globalRoot, Chartist) {

      globalRoot.window;
      globalRoot.document;

      function FixedScaleAxis(axisUnit, data, chartRect, options) {
        var highLow = options.highLow || Chartist.getHighLow(data, options, axisUnit.pos);
        this.divisor = options.divisor || 1;
        this.ticks = options.ticks || Chartist.times(this.divisor).map(function(value, index) {
          return highLow.low + (highLow.high - highLow.low) / this.divisor * index;
        }.bind(this));
        this.ticks.sort(function(a, b) {
          return a - b;
        });
        this.range = {
          min: highLow.low,
          max: highLow.high
        };

        Chartist.FixedScaleAxis.super.constructor.call(this,
          axisUnit,
          chartRect,
          this.ticks,
          options);

        this.stepLength = this.axisLength / this.divisor;
      }

      function projectValue(value) {
        return this.axisLength * (+Chartist.getMultiValue(value, this.units.pos) - this.range.min) / (this.range.max - this.range.min);
      }

      Chartist.FixedScaleAxis = Chartist.Axis.extend({
        constructor: FixedScaleAxis,
        projectValue: projectValue
      });

    }(this || commonjsGlobal, Chartist));
    /* global Chartist */
    (function (globalRoot, Chartist) {

      globalRoot.window;
      globalRoot.document;

      function StepAxis(axisUnit, data, chartRect, options) {
        Chartist.StepAxis.super.constructor.call(this,
          axisUnit,
          chartRect,
          options.ticks,
          options);

        var calc = Math.max(1, options.ticks.length - (options.stretch ? 1 : 0));
        this.stepLength = this.axisLength / calc;
      }

      function projectValue(value, index) {
        return this.stepLength * index;
      }

      Chartist.StepAxis = Chartist.Axis.extend({
        constructor: StepAxis,
        projectValue: projectValue
      });

    }(this || commonjsGlobal, Chartist));
    /* global Chartist */
    (function(globalRoot, Chartist){

      globalRoot.window;
      globalRoot.document;

      /**
       * Default options in line charts. Expand the code view to see a detailed list of options with comments.
       *
       * @memberof Chartist.Line
       */
      var defaultOptions = {
        // Options for X-Axis
        axisX: {
          // The offset of the labels to the chart area
          offset: 30,
          // Position where labels are placed. Can be set to `start` or `end` where `start` is equivalent to left or top on vertical axis and `end` is equivalent to right or bottom on horizontal axis.
          position: 'end',
          // Allows you to correct label positioning on this axis by positive or negative x and y offset.
          labelOffset: {
            x: 0,
            y: 0
          },
          // If labels should be shown or not
          showLabel: true,
          // If the axis grid should be drawn or not
          showGrid: true,
          // Interpolation function that allows you to intercept the value from the axis label
          labelInterpolationFnc: Chartist.noop,
          // Set the axis type to be used to project values on this axis. If not defined, Chartist.StepAxis will be used for the X-Axis, where the ticks option will be set to the labels in the data and the stretch option will be set to the global fullWidth option. This type can be changed to any axis constructor available (e.g. Chartist.FixedScaleAxis), where all axis options should be present here.
          type: undefined
        },
        // Options for Y-Axis
        axisY: {
          // The offset of the labels to the chart area
          offset: 40,
          // Position where labels are placed. Can be set to `start` or `end` where `start` is equivalent to left or top on vertical axis and `end` is equivalent to right or bottom on horizontal axis.
          position: 'start',
          // Allows you to correct label positioning on this axis by positive or negative x and y offset.
          labelOffset: {
            x: 0,
            y: 0
          },
          // If labels should be shown or not
          showLabel: true,
          // If the axis grid should be drawn or not
          showGrid: true,
          // Interpolation function that allows you to intercept the value from the axis label
          labelInterpolationFnc: Chartist.noop,
          // Set the axis type to be used to project values on this axis. If not defined, Chartist.AutoScaleAxis will be used for the Y-Axis, where the high and low options will be set to the global high and low options. This type can be changed to any axis constructor available (e.g. Chartist.FixedScaleAxis), where all axis options should be present here.
          type: undefined,
          // This value specifies the minimum height in pixel of the scale steps
          scaleMinSpace: 20,
          // Use only integer values (whole numbers) for the scale steps
          onlyInteger: false
        },
        // Specify a fixed width for the chart as a string (i.e. '100px' or '50%')
        width: undefined,
        // Specify a fixed height for the chart as a string (i.e. '100px' or '50%')
        height: undefined,
        // If the line should be drawn or not
        showLine: true,
        // If dots should be drawn or not
        showPoint: true,
        // If the line chart should draw an area
        showArea: false,
        // The base for the area chart that will be used to close the area shape (is normally 0)
        areaBase: 0,
        // Specify if the lines should be smoothed. This value can be true or false where true will result in smoothing using the default smoothing interpolation function Chartist.Interpolation.cardinal and false results in Chartist.Interpolation.none. You can also choose other smoothing / interpolation functions available in the Chartist.Interpolation module, or write your own interpolation function. Check the examples for a brief description.
        lineSmooth: true,
        // If the line chart should add a background fill to the .ct-grids group.
        showGridBackground: false,
        // Overriding the natural low of the chart allows you to zoom in or limit the charts lowest displayed value
        low: undefined,
        // Overriding the natural high of the chart allows you to zoom in or limit the charts highest displayed value
        high: undefined,
        // Padding of the chart drawing area to the container element and labels as a number or padding object {top: 5, right: 5, bottom: 5, left: 5}
        chartPadding: {
          top: 15,
          right: 15,
          bottom: 5,
          left: 10
        },
        // When set to true, the last grid line on the x-axis is not drawn and the chart elements will expand to the full available width of the chart. For the last label to be drawn correctly you might need to add chart padding or offset the last label with a draw event handler.
        fullWidth: false,
        // If true the whole data is reversed including labels, the series order as well as the whole series data arrays.
        reverseData: false,
        // Override the class names that get used to generate the SVG structure of the chart
        classNames: {
          chart: 'ct-chart-line',
          label: 'ct-label',
          labelGroup: 'ct-labels',
          series: 'ct-series',
          line: 'ct-line',
          point: 'ct-point',
          area: 'ct-area',
          grid: 'ct-grid',
          gridGroup: 'ct-grids',
          gridBackground: 'ct-grid-background',
          vertical: 'ct-vertical',
          horizontal: 'ct-horizontal',
          start: 'ct-start',
          end: 'ct-end'
        }
      };

      /**
       * Creates a new chart
       *
       */
      function createChart(options) {
        var data = Chartist.normalizeData(this.data, options.reverseData, true);

        // Create new svg object
        this.svg = Chartist.createSvg(this.container, options.width, options.height, options.classNames.chart);
        // Create groups for labels, grid and series
        var gridGroup = this.svg.elem('g').addClass(options.classNames.gridGroup);
        var seriesGroup = this.svg.elem('g');
        var labelGroup = this.svg.elem('g').addClass(options.classNames.labelGroup);

        var chartRect = Chartist.createChartRect(this.svg, options, defaultOptions.padding);
        var axisX, axisY;

        if(options.axisX.type === undefined) {
          axisX = new Chartist.StepAxis(Chartist.Axis.units.x, data.normalized.series, chartRect, Chartist.extend({}, options.axisX, {
            ticks: data.normalized.labels,
            stretch: options.fullWidth
          }));
        } else {
          axisX = options.axisX.type.call(Chartist, Chartist.Axis.units.x, data.normalized.series, chartRect, options.axisX);
        }

        if(options.axisY.type === undefined) {
          axisY = new Chartist.AutoScaleAxis(Chartist.Axis.units.y, data.normalized.series, chartRect, Chartist.extend({}, options.axisY, {
            high: Chartist.isNumeric(options.high) ? options.high : options.axisY.high,
            low: Chartist.isNumeric(options.low) ? options.low : options.axisY.low
          }));
        } else {
          axisY = options.axisY.type.call(Chartist, Chartist.Axis.units.y, data.normalized.series, chartRect, options.axisY);
        }

        axisX.createGridAndLabels(gridGroup, labelGroup, this.supportsForeignObject, options, this.eventEmitter);
        axisY.createGridAndLabels(gridGroup, labelGroup, this.supportsForeignObject, options, this.eventEmitter);

        if (options.showGridBackground) {
          Chartist.createGridBackground(gridGroup, chartRect, options.classNames.gridBackground, this.eventEmitter);
        }

        // Draw the series
        data.raw.series.forEach(function(series, seriesIndex) {
          var seriesElement = seriesGroup.elem('g');

          // Write attributes to series group element. If series name or meta is undefined the attributes will not be written
          seriesElement.attr({
            'ct:series-name': series.name,
            'ct:meta': Chartist.serialize(series.meta)
          });

          // Use series class from series data or if not set generate one
          seriesElement.addClass([
            options.classNames.series,
            (series.className || options.classNames.series + '-' + Chartist.alphaNumerate(seriesIndex))
          ].join(' '));

          var pathCoordinates = [],
            pathData = [];

          data.normalized.series[seriesIndex].forEach(function(value, valueIndex) {
            var p = {
              x: chartRect.x1 + axisX.projectValue(value, valueIndex, data.normalized.series[seriesIndex]),
              y: chartRect.y1 - axisY.projectValue(value, valueIndex, data.normalized.series[seriesIndex])
            };
            pathCoordinates.push(p.x, p.y);
            pathData.push({
              value: value,
              valueIndex: valueIndex,
              meta: Chartist.getMetaData(series, valueIndex)
            });
          }.bind(this));

          var seriesOptions = {
            lineSmooth: Chartist.getSeriesOption(series, options, 'lineSmooth'),
            showPoint: Chartist.getSeriesOption(series, options, 'showPoint'),
            showLine: Chartist.getSeriesOption(series, options, 'showLine'),
            showArea: Chartist.getSeriesOption(series, options, 'showArea'),
            areaBase: Chartist.getSeriesOption(series, options, 'areaBase')
          };

          var smoothing = typeof seriesOptions.lineSmooth === 'function' ?
            seriesOptions.lineSmooth : (seriesOptions.lineSmooth ? Chartist.Interpolation.monotoneCubic() : Chartist.Interpolation.none());
          // Interpolating path where pathData will be used to annotate each path element so we can trace back the original
          // index, value and meta data
          var path = smoothing(pathCoordinates, pathData);

          // If we should show points we need to create them now to avoid secondary loop
          // Points are drawn from the pathElements returned by the interpolation function
          // Small offset for Firefox to render squares correctly
          if (seriesOptions.showPoint) {

            path.pathElements.forEach(function(pathElement) {
              var point = seriesElement.elem('line', {
                x1: pathElement.x,
                y1: pathElement.y,
                x2: pathElement.x + 0.01,
                y2: pathElement.y
              }, options.classNames.point).attr({
                'ct:value': [pathElement.data.value.x, pathElement.data.value.y].filter(Chartist.isNumeric).join(','),
                'ct:meta': Chartist.serialize(pathElement.data.meta)
              });

              this.eventEmitter.emit('draw', {
                type: 'point',
                value: pathElement.data.value,
                index: pathElement.data.valueIndex,
                meta: pathElement.data.meta,
                series: series,
                seriesIndex: seriesIndex,
                axisX: axisX,
                axisY: axisY,
                group: seriesElement,
                element: point,
                x: pathElement.x,
                y: pathElement.y
              });
            }.bind(this));
          }

          if(seriesOptions.showLine) {
            var line = seriesElement.elem('path', {
              d: path.stringify()
            }, options.classNames.line, true);

            this.eventEmitter.emit('draw', {
              type: 'line',
              values: data.normalized.series[seriesIndex],
              path: path.clone(),
              chartRect: chartRect,
              index: seriesIndex,
              series: series,
              seriesIndex: seriesIndex,
              seriesMeta: series.meta,
              axisX: axisX,
              axisY: axisY,
              group: seriesElement,
              element: line
            });
          }

          // Area currently only works with axes that support a range!
          if(seriesOptions.showArea && axisY.range) {
            // If areaBase is outside the chart area (< min or > max) we need to set it respectively so that
            // the area is not drawn outside the chart area.
            var areaBase = Math.max(Math.min(seriesOptions.areaBase, axisY.range.max), axisY.range.min);

            // We project the areaBase value into screen coordinates
            var areaBaseProjected = chartRect.y1 - axisY.projectValue(areaBase);

            // In order to form the area we'll first split the path by move commands so we can chunk it up into segments
            path.splitByCommand('M').filter(function onlySolidSegments(pathSegment) {
              // We filter only "solid" segments that contain more than one point. Otherwise there's no need for an area
              return pathSegment.pathElements.length > 1;
            }).map(function convertToArea(solidPathSegments) {
              // Receiving the filtered solid path segments we can now convert those segments into fill areas
              var firstElement = solidPathSegments.pathElements[0];
              var lastElement = solidPathSegments.pathElements[solidPathSegments.pathElements.length - 1];

              // Cloning the solid path segment with closing option and removing the first move command from the clone
              // We then insert a new move that should start at the area base and draw a straight line up or down
              // at the end of the path we add an additional straight line to the projected area base value
              // As the closing option is set our path will be automatically closed
              return solidPathSegments.clone(true)
                .position(0)
                .remove(1)
                .move(firstElement.x, areaBaseProjected)
                .line(firstElement.x, firstElement.y)
                .position(solidPathSegments.pathElements.length + 1)
                .line(lastElement.x, areaBaseProjected);

            }).forEach(function createArea(areaPath) {
              // For each of our newly created area paths, we'll now create path elements by stringifying our path objects
              // and adding the created DOM elements to the correct series group
              var area = seriesElement.elem('path', {
                d: areaPath.stringify()
              }, options.classNames.area, true);

              // Emit an event for each area that was drawn
              this.eventEmitter.emit('draw', {
                type: 'area',
                values: data.normalized.series[seriesIndex],
                path: areaPath.clone(),
                series: series,
                seriesIndex: seriesIndex,
                axisX: axisX,
                axisY: axisY,
                chartRect: chartRect,
                index: seriesIndex,
                group: seriesElement,
                element: area
              });
            }.bind(this));
          }
        }.bind(this));

        this.eventEmitter.emit('created', {
          bounds: axisY.bounds,
          chartRect: chartRect,
          axisX: axisX,
          axisY: axisY,
          svg: this.svg,
          options: options
        });
      }

      /**
       * This method creates a new line chart.
       *
       * @memberof Chartist.Line
       * @param {String|Node} query A selector query string or directly a DOM element
       * @param {Object} data The data object that needs to consist of a labels and a series array
       * @param {Object} [options] The options object with options that override the default options. Check the examples for a detailed list.
       * @param {Array} [responsiveOptions] Specify an array of responsive option arrays which are a media query and options object pair => [[mediaQueryString, optionsObject],[more...]]
       * @return {Object} An object which exposes the API for the created chart
       *
       * @example
       * // Create a simple line chart
       * var data = {
       *   // A labels array that can contain any sort of values
       *   labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
       *   // Our series array that contains series objects or in this case series data arrays
       *   series: [
       *     [5, 2, 4, 2, 0]
       *   ]
       * };
       *
       * // As options we currently only set a static size of 300x200 px
       * var options = {
       *   width: '300px',
       *   height: '200px'
       * };
       *
       * // In the global name space Chartist we call the Line function to initialize a line chart. As a first parameter we pass in a selector where we would like to get our chart created. Second parameter is the actual data object and as a third parameter we pass in our options
       * new Chartist.Line('.ct-chart', data, options);
       *
       * @example
       * // Use specific interpolation function with configuration from the Chartist.Interpolation module
       *
       * var chart = new Chartist.Line('.ct-chart', {
       *   labels: [1, 2, 3, 4, 5],
       *   series: [
       *     [1, 1, 8, 1, 7]
       *   ]
       * }, {
       *   lineSmooth: Chartist.Interpolation.cardinal({
       *     tension: 0.2
       *   })
       * });
       *
       * @example
       * // Create a line chart with responsive options
       *
       * var data = {
       *   // A labels array that can contain any sort of values
       *   labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
       *   // Our series array that contains series objects or in this case series data arrays
       *   series: [
       *     [5, 2, 4, 2, 0]
       *   ]
       * };
       *
       * // In addition to the regular options we specify responsive option overrides that will override the default configutation based on the matching media queries.
       * var responsiveOptions = [
       *   ['screen and (min-width: 641px) and (max-width: 1024px)', {
       *     showPoint: false,
       *     axisX: {
       *       labelInterpolationFnc: function(value) {
       *         // Will return Mon, Tue, Wed etc. on medium screens
       *         return value.slice(0, 3);
       *       }
       *     }
       *   }],
       *   ['screen and (max-width: 640px)', {
       *     showLine: false,
       *     axisX: {
       *       labelInterpolationFnc: function(value) {
       *         // Will return M, T, W etc. on small screens
       *         return value[0];
       *       }
       *     }
       *   }]
       * ];
       *
       * new Chartist.Line('.ct-chart', data, null, responsiveOptions);
       *
       */
      function Line(query, data, options, responsiveOptions) {
        Chartist.Line.super.constructor.call(this,
          query,
          data,
          defaultOptions,
          Chartist.extend({}, defaultOptions, options),
          responsiveOptions);
      }

      // Creating line chart type in Chartist namespace
      Chartist.Line = Chartist.Base.extend({
        constructor: Line,
        createChart: createChart
      });

    }(this || commonjsGlobal, Chartist));
    /* global Chartist */
    (function(globalRoot, Chartist){

      globalRoot.window;
      globalRoot.document;

      /**
       * Default options in bar charts. Expand the code view to see a detailed list of options with comments.
       *
       * @memberof Chartist.Bar
       */
      var defaultOptions = {
        // Options for X-Axis
        axisX: {
          // The offset of the chart drawing area to the border of the container
          offset: 30,
          // Position where labels are placed. Can be set to `start` or `end` where `start` is equivalent to left or top on vertical axis and `end` is equivalent to right or bottom on horizontal axis.
          position: 'end',
          // Allows you to correct label positioning on this axis by positive or negative x and y offset.
          labelOffset: {
            x: 0,
            y: 0
          },
          // If labels should be shown or not
          showLabel: true,
          // If the axis grid should be drawn or not
          showGrid: true,
          // Interpolation function that allows you to intercept the value from the axis label
          labelInterpolationFnc: Chartist.noop,
          // This value specifies the minimum width in pixel of the scale steps
          scaleMinSpace: 30,
          // Use only integer values (whole numbers) for the scale steps
          onlyInteger: false
        },
        // Options for Y-Axis
        axisY: {
          // The offset of the chart drawing area to the border of the container
          offset: 40,
          // Position where labels are placed. Can be set to `start` or `end` where `start` is equivalent to left or top on vertical axis and `end` is equivalent to right or bottom on horizontal axis.
          position: 'start',
          // Allows you to correct label positioning on this axis by positive or negative x and y offset.
          labelOffset: {
            x: 0,
            y: 0
          },
          // If labels should be shown or not
          showLabel: true,
          // If the axis grid should be drawn or not
          showGrid: true,
          // Interpolation function that allows you to intercept the value from the axis label
          labelInterpolationFnc: Chartist.noop,
          // This value specifies the minimum height in pixel of the scale steps
          scaleMinSpace: 20,
          // Use only integer values (whole numbers) for the scale steps
          onlyInteger: false
        },
        // Specify a fixed width for the chart as a string (i.e. '100px' or '50%')
        width: undefined,
        // Specify a fixed height for the chart as a string (i.e. '100px' or '50%')
        height: undefined,
        // Overriding the natural high of the chart allows you to zoom in or limit the charts highest displayed value
        high: undefined,
        // Overriding the natural low of the chart allows you to zoom in or limit the charts lowest displayed value
        low: undefined,
        // Unless low/high are explicitly set, bar chart will be centered at zero by default. Set referenceValue to null to auto scale.
        referenceValue: 0,
        // Padding of the chart drawing area to the container element and labels as a number or padding object {top: 5, right: 5, bottom: 5, left: 5}
        chartPadding: {
          top: 15,
          right: 15,
          bottom: 5,
          left: 10
        },
        // Specify the distance in pixel of bars in a group
        seriesBarDistance: 15,
        // If set to true this property will cause the series bars to be stacked. Check the `stackMode` option for further stacking options.
        stackBars: false,
        // If set to 'overlap' this property will force the stacked bars to draw from the zero line.
        // If set to 'accumulate' this property will form a total for each series point. This will also influence the y-axis and the overall bounds of the chart. In stacked mode the seriesBarDistance property will have no effect.
        stackMode: 'accumulate',
        // Inverts the axes of the bar chart in order to draw a horizontal bar chart. Be aware that you also need to invert your axis settings as the Y Axis will now display the labels and the X Axis the values.
        horizontalBars: false,
        // If set to true then each bar will represent a series and the data array is expected to be a one dimensional array of data values rather than a series array of series. This is useful if the bar chart should represent a profile rather than some data over time.
        distributeSeries: false,
        // If true the whole data is reversed including labels, the series order as well as the whole series data arrays.
        reverseData: false,
        // If the bar chart should add a background fill to the .ct-grids group.
        showGridBackground: false,
        // Override the class names that get used to generate the SVG structure of the chart
        classNames: {
          chart: 'ct-chart-bar',
          horizontalBars: 'ct-horizontal-bars',
          label: 'ct-label',
          labelGroup: 'ct-labels',
          series: 'ct-series',
          bar: 'ct-bar',
          grid: 'ct-grid',
          gridGroup: 'ct-grids',
          gridBackground: 'ct-grid-background',
          vertical: 'ct-vertical',
          horizontal: 'ct-horizontal',
          start: 'ct-start',
          end: 'ct-end'
        }
      };

      /**
       * Creates a new chart
       *
       */
      function createChart(options) {
        var data;
        var highLow;

        if(options.distributeSeries) {
          data = Chartist.normalizeData(this.data, options.reverseData, options.horizontalBars ? 'x' : 'y');
          data.normalized.series = data.normalized.series.map(function(value) {
            return [value];
          });
        } else {
          data = Chartist.normalizeData(this.data, options.reverseData, options.horizontalBars ? 'x' : 'y');
        }

        // Create new svg element
        this.svg = Chartist.createSvg(
          this.container,
          options.width,
          options.height,
          options.classNames.chart + (options.horizontalBars ? ' ' + options.classNames.horizontalBars : '')
        );

        // Drawing groups in correct order
        var gridGroup = this.svg.elem('g').addClass(options.classNames.gridGroup);
        var seriesGroup = this.svg.elem('g');
        var labelGroup = this.svg.elem('g').addClass(options.classNames.labelGroup);

        if(options.stackBars && data.normalized.series.length !== 0) {

          // If stacked bars we need to calculate the high low from stacked values from each series
          var serialSums = Chartist.serialMap(data.normalized.series, function serialSums() {
            return Array.prototype.slice.call(arguments).map(function(value) {
              return value;
            }).reduce(function(prev, curr) {
              return {
                x: prev.x + (curr && curr.x) || 0,
                y: prev.y + (curr && curr.y) || 0
              };
            }, {x: 0, y: 0});
          });

          highLow = Chartist.getHighLow([serialSums], options, options.horizontalBars ? 'x' : 'y');

        } else {

          highLow = Chartist.getHighLow(data.normalized.series, options, options.horizontalBars ? 'x' : 'y');
        }

        // Overrides of high / low from settings
        highLow.high = +options.high || (options.high === 0 ? 0 : highLow.high);
        highLow.low = +options.low || (options.low === 0 ? 0 : highLow.low);

        var chartRect = Chartist.createChartRect(this.svg, options, defaultOptions.padding);

        var valueAxis,
          labelAxisTicks,
          labelAxis,
          axisX,
          axisY;

        // We need to set step count based on some options combinations
        if(options.distributeSeries && options.stackBars) {
          // If distributed series are enabled and bars need to be stacked, we'll only have one bar and therefore should
          // use only the first label for the step axis
          labelAxisTicks = data.normalized.labels.slice(0, 1);
        } else {
          // If distributed series are enabled but stacked bars aren't, we should use the series labels
          // If we are drawing a regular bar chart with two dimensional series data, we just use the labels array
          // as the bars are normalized
          labelAxisTicks = data.normalized.labels;
        }

        // Set labelAxis and valueAxis based on the horizontalBars setting. This setting will flip the axes if necessary.
        if(options.horizontalBars) {
          if(options.axisX.type === undefined) {
            valueAxis = axisX = new Chartist.AutoScaleAxis(Chartist.Axis.units.x, data.normalized.series, chartRect, Chartist.extend({}, options.axisX, {
              highLow: highLow,
              referenceValue: 0
            }));
          } else {
            valueAxis = axisX = options.axisX.type.call(Chartist, Chartist.Axis.units.x, data.normalized.series, chartRect, Chartist.extend({}, options.axisX, {
              highLow: highLow,
              referenceValue: 0
            }));
          }

          if(options.axisY.type === undefined) {
            labelAxis = axisY = new Chartist.StepAxis(Chartist.Axis.units.y, data.normalized.series, chartRect, {
              ticks: labelAxisTicks
            });
          } else {
            labelAxis = axisY = options.axisY.type.call(Chartist, Chartist.Axis.units.y, data.normalized.series, chartRect, options.axisY);
          }
        } else {
          if(options.axisX.type === undefined) {
            labelAxis = axisX = new Chartist.StepAxis(Chartist.Axis.units.x, data.normalized.series, chartRect, {
              ticks: labelAxisTicks
            });
          } else {
            labelAxis = axisX = options.axisX.type.call(Chartist, Chartist.Axis.units.x, data.normalized.series, chartRect, options.axisX);
          }

          if(options.axisY.type === undefined) {
            valueAxis = axisY = new Chartist.AutoScaleAxis(Chartist.Axis.units.y, data.normalized.series, chartRect, Chartist.extend({}, options.axisY, {
              highLow: highLow,
              referenceValue: 0
            }));
          } else {
            valueAxis = axisY = options.axisY.type.call(Chartist, Chartist.Axis.units.y, data.normalized.series, chartRect, Chartist.extend({}, options.axisY, {
              highLow: highLow,
              referenceValue: 0
            }));
          }
        }

        // Projected 0 point
        var zeroPoint = options.horizontalBars ? (chartRect.x1 + valueAxis.projectValue(0)) : (chartRect.y1 - valueAxis.projectValue(0));
        // Used to track the screen coordinates of stacked bars
        var stackedBarValues = [];

        labelAxis.createGridAndLabels(gridGroup, labelGroup, this.supportsForeignObject, options, this.eventEmitter);
        valueAxis.createGridAndLabels(gridGroup, labelGroup, this.supportsForeignObject, options, this.eventEmitter);

        if (options.showGridBackground) {
          Chartist.createGridBackground(gridGroup, chartRect, options.classNames.gridBackground, this.eventEmitter);
        }

        // Draw the series
        data.raw.series.forEach(function(series, seriesIndex) {
          // Calculating bi-polar value of index for seriesOffset. For i = 0..4 biPol will be -1.5, -0.5, 0.5, 1.5 etc.
          var biPol = seriesIndex - (data.raw.series.length - 1) / 2;
          // Half of the period width between vertical grid lines used to position bars
          var periodHalfLength;
          // Current series SVG element
          var seriesElement;

          // We need to set periodHalfLength based on some options combinations
          if(options.distributeSeries && !options.stackBars) {
            // If distributed series are enabled but stacked bars aren't, we need to use the length of the normaizedData array
            // which is the series count and divide by 2
            periodHalfLength = labelAxis.axisLength / data.normalized.series.length / 2;
          } else if(options.distributeSeries && options.stackBars) {
            // If distributed series and stacked bars are enabled we'll only get one bar so we should just divide the axis
            // length by 2
            periodHalfLength = labelAxis.axisLength / 2;
          } else {
            // On regular bar charts we should just use the series length
            periodHalfLength = labelAxis.axisLength / data.normalized.series[seriesIndex].length / 2;
          }

          // Adding the series group to the series element
          seriesElement = seriesGroup.elem('g');

          // Write attributes to series group element. If series name or meta is undefined the attributes will not be written
          seriesElement.attr({
            'ct:series-name': series.name,
            'ct:meta': Chartist.serialize(series.meta)
          });

          // Use series class from series data or if not set generate one
          seriesElement.addClass([
            options.classNames.series,
            (series.className || options.classNames.series + '-' + Chartist.alphaNumerate(seriesIndex))
          ].join(' '));

          data.normalized.series[seriesIndex].forEach(function(value, valueIndex) {
            var projected,
              bar,
              previousStack,
              labelAxisValueIndex;

            // We need to set labelAxisValueIndex based on some options combinations
            if(options.distributeSeries && !options.stackBars) {
              // If distributed series are enabled but stacked bars aren't, we can use the seriesIndex for later projection
              // on the step axis for label positioning
              labelAxisValueIndex = seriesIndex;
            } else if(options.distributeSeries && options.stackBars) {
              // If distributed series and stacked bars are enabled, we will only get one bar and therefore always use
              // 0 for projection on the label step axis
              labelAxisValueIndex = 0;
            } else {
              // On regular bar charts we just use the value index to project on the label step axis
              labelAxisValueIndex = valueIndex;
            }

            // We need to transform coordinates differently based on the chart layout
            if(options.horizontalBars) {
              projected = {
                x: chartRect.x1 + valueAxis.projectValue(value && value.x ? value.x : 0, valueIndex, data.normalized.series[seriesIndex]),
                y: chartRect.y1 - labelAxis.projectValue(value && value.y ? value.y : 0, labelAxisValueIndex, data.normalized.series[seriesIndex])
              };
            } else {
              projected = {
                x: chartRect.x1 + labelAxis.projectValue(value && value.x ? value.x : 0, labelAxisValueIndex, data.normalized.series[seriesIndex]),
                y: chartRect.y1 - valueAxis.projectValue(value && value.y ? value.y : 0, valueIndex, data.normalized.series[seriesIndex])
              };
            }

            // If the label axis is a step based axis we will offset the bar into the middle of between two steps using
            // the periodHalfLength value. Also we do arrange the different series so that they align up to each other using
            // the seriesBarDistance. If we don't have a step axis, the bar positions can be chosen freely so we should not
            // add any automated positioning.
            if(labelAxis instanceof Chartist.StepAxis) {
              // Offset to center bar between grid lines, but only if the step axis is not stretched
              if(!labelAxis.options.stretch) {
                projected[labelAxis.units.pos] += periodHalfLength * (options.horizontalBars ? -1 : 1);
              }
              // Using bi-polar offset for multiple series if no stacked bars or series distribution is used
              projected[labelAxis.units.pos] += (options.stackBars || options.distributeSeries) ? 0 : biPol * options.seriesBarDistance * (options.horizontalBars ? -1 : 1);
            }

            // Enter value in stacked bar values used to remember previous screen value for stacking up bars
            previousStack = stackedBarValues[valueIndex] || zeroPoint;
            stackedBarValues[valueIndex] = previousStack - (zeroPoint - projected[labelAxis.counterUnits.pos]);

            // Skip if value is undefined
            if(value === undefined) {
              return;
            }

            var positions = {};
            positions[labelAxis.units.pos + '1'] = projected[labelAxis.units.pos];
            positions[labelAxis.units.pos + '2'] = projected[labelAxis.units.pos];

            if(options.stackBars && (options.stackMode === 'accumulate' || !options.stackMode)) {
              // Stack mode: accumulate (default)
              // If bars are stacked we use the stackedBarValues reference and otherwise base all bars off the zero line
              // We want backwards compatibility, so the expected fallback without the 'stackMode' option
              // to be the original behaviour (accumulate)
              positions[labelAxis.counterUnits.pos + '1'] = previousStack;
              positions[labelAxis.counterUnits.pos + '2'] = stackedBarValues[valueIndex];
            } else {
              // Draw from the zero line normally
              // This is also the same code for Stack mode: overlap
              positions[labelAxis.counterUnits.pos + '1'] = zeroPoint;
              positions[labelAxis.counterUnits.pos + '2'] = projected[labelAxis.counterUnits.pos];
            }

            // Limit x and y so that they are within the chart rect
            positions.x1 = Math.min(Math.max(positions.x1, chartRect.x1), chartRect.x2);
            positions.x2 = Math.min(Math.max(positions.x2, chartRect.x1), chartRect.x2);
            positions.y1 = Math.min(Math.max(positions.y1, chartRect.y2), chartRect.y1);
            positions.y2 = Math.min(Math.max(positions.y2, chartRect.y2), chartRect.y1);

            var metaData = Chartist.getMetaData(series, valueIndex);

            // Create bar element
            bar = seriesElement.elem('line', positions, options.classNames.bar).attr({
              'ct:value': [value.x, value.y].filter(Chartist.isNumeric).join(','),
              'ct:meta': Chartist.serialize(metaData)
            });

            this.eventEmitter.emit('draw', Chartist.extend({
              type: 'bar',
              value: value,
              index: valueIndex,
              meta: metaData,
              series: series,
              seriesIndex: seriesIndex,
              axisX: axisX,
              axisY: axisY,
              chartRect: chartRect,
              group: seriesElement,
              element: bar
            }, positions));
          }.bind(this));
        }.bind(this));

        this.eventEmitter.emit('created', {
          bounds: valueAxis.bounds,
          chartRect: chartRect,
          axisX: axisX,
          axisY: axisY,
          svg: this.svg,
          options: options
        });
      }

      /**
       * This method creates a new bar chart and returns API object that you can use for later changes.
       *
       * @memberof Chartist.Bar
       * @param {String|Node} query A selector query string or directly a DOM element
       * @param {Object} data The data object that needs to consist of a labels and a series array
       * @param {Object} [options] The options object with options that override the default options. Check the examples for a detailed list.
       * @param {Array} [responsiveOptions] Specify an array of responsive option arrays which are a media query and options object pair => [[mediaQueryString, optionsObject],[more...]]
       * @return {Object} An object which exposes the API for the created chart
       *
       * @example
       * // Create a simple bar chart
       * var data = {
       *   labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
       *   series: [
       *     [5, 2, 4, 2, 0]
       *   ]
       * };
       *
       * // In the global name space Chartist we call the Bar function to initialize a bar chart. As a first parameter we pass in a selector where we would like to get our chart created and as a second parameter we pass our data object.
       * new Chartist.Bar('.ct-chart', data);
       *
       * @example
       * // This example creates a bipolar grouped bar chart where the boundaries are limitted to -10 and 10
       * new Chartist.Bar('.ct-chart', {
       *   labels: [1, 2, 3, 4, 5, 6, 7],
       *   series: [
       *     [1, 3, 2, -5, -3, 1, -6],
       *     [-5, -2, -4, -1, 2, -3, 1]
       *   ]
       * }, {
       *   seriesBarDistance: 12,
       *   low: -10,
       *   high: 10
       * });
       *
       */
      function Bar(query, data, options, responsiveOptions) {
        Chartist.Bar.super.constructor.call(this,
          query,
          data,
          defaultOptions,
          Chartist.extend({}, defaultOptions, options),
          responsiveOptions);
      }

      // Creating bar chart type in Chartist namespace
      Chartist.Bar = Chartist.Base.extend({
        constructor: Bar,
        createChart: createChart
      });

    }(this || commonjsGlobal, Chartist));
    /* global Chartist */
    (function(globalRoot, Chartist) {

      globalRoot.window;
      globalRoot.document;

      /**
       * Default options in line charts. Expand the code view to see a detailed list of options with comments.
       *
       * @memberof Chartist.Pie
       */
      var defaultOptions = {
        // Specify a fixed width for the chart as a string (i.e. '100px' or '50%')
        width: undefined,
        // Specify a fixed height for the chart as a string (i.e. '100px' or '50%')
        height: undefined,
        // Padding of the chart drawing area to the container element and labels as a number or padding object {top: 5, right: 5, bottom: 5, left: 5}
        chartPadding: 5,
        // Override the class names that are used to generate the SVG structure of the chart
        classNames: {
          chartPie: 'ct-chart-pie',
          chartDonut: 'ct-chart-donut',
          series: 'ct-series',
          slicePie: 'ct-slice-pie',
          sliceDonut: 'ct-slice-donut',
          sliceDonutSolid: 'ct-slice-donut-solid',
          label: 'ct-label'
        },
        // The start angle of the pie chart in degrees where 0 points north. A higher value offsets the start angle clockwise.
        startAngle: 0,
        // An optional total you can specify. By specifying a total value, the sum of the values in the series must be this total in order to draw a full pie. You can use this parameter to draw only parts of a pie or gauge charts.
        total: undefined,
        // If specified the donut CSS classes will be used and strokes will be drawn instead of pie slices.
        donut: false,
        // If specified the donut segments will be drawn as shapes instead of strokes.
        donutSolid: false,
        // Specify the donut stroke width, currently done in javascript for convenience. May move to CSS styles in the future.
        // This option can be set as number or string to specify a relative width (i.e. 100 or '30%').
        donutWidth: 60,
        // If a label should be shown or not
        showLabel: true,
        // Label position offset from the standard position which is half distance of the radius. This value can be either positive or negative. Positive values will position the label away from the center.
        labelOffset: 0,
        // This option can be set to 'inside', 'outside' or 'center'. Positioned with 'inside' the labels will be placed on half the distance of the radius to the border of the Pie by respecting the 'labelOffset'. The 'outside' option will place the labels at the border of the pie and 'center' will place the labels in the absolute center point of the chart. The 'center' option only makes sense in conjunction with the 'labelOffset' option.
        labelPosition: 'inside',
        // An interpolation function for the label value
        labelInterpolationFnc: Chartist.noop,
        // Label direction can be 'neutral', 'explode' or 'implode'. The labels anchor will be positioned based on those settings as well as the fact if the labels are on the right or left side of the center of the chart. Usually explode is useful when labels are positioned far away from the center.
        labelDirection: 'neutral',
        // If true the whole data is reversed including labels, the series order as well as the whole series data arrays.
        reverseData: false,
        // If true empty values will be ignored to avoid drawing unncessary slices and labels
        ignoreEmptyValues: false
      };

      /**
       * Determines SVG anchor position based on direction and center parameter
       *
       * @param center
       * @param label
       * @param direction
       * @return {string}
       */
      function determineAnchorPosition(center, label, direction) {
        var toTheRight = label.x > center.x;

        if(toTheRight && direction === 'explode' ||
          !toTheRight && direction === 'implode') {
          return 'start';
        } else if(toTheRight && direction === 'implode' ||
          !toTheRight && direction === 'explode') {
          return 'end';
        } else {
          return 'middle';
        }
      }

      /**
       * Creates the pie chart
       *
       * @param options
       */
      function createChart(options) {
        var data = Chartist.normalizeData(this.data);
        var seriesGroups = [],
          labelsGroup,
          chartRect,
          radius,
          labelRadius,
          totalDataSum,
          startAngle = options.startAngle;

        // Create SVG.js draw
        this.svg = Chartist.createSvg(this.container, options.width, options.height,options.donut ? options.classNames.chartDonut : options.classNames.chartPie);
        // Calculate charting rect
        chartRect = Chartist.createChartRect(this.svg, options, defaultOptions.padding);
        // Get biggest circle radius possible within chartRect
        radius = Math.min(chartRect.width() / 2, chartRect.height() / 2);
        // Calculate total of all series to get reference value or use total reference from optional options
        totalDataSum = options.total || data.normalized.series.reduce(function(previousValue, currentValue) {
          return previousValue + currentValue;
        }, 0);

        var donutWidth = Chartist.quantity(options.donutWidth);
        if (donutWidth.unit === '%') {
          donutWidth.value *= radius / 100;
        }

        // If this is a donut chart we need to adjust our radius to enable strokes to be drawn inside
        // Unfortunately this is not possible with the current SVG Spec
        // See this proposal for more details: http://lists.w3.org/Archives/Public/www-svg/2003Oct/0000.html
        radius -= options.donut && !options.donutSolid ? donutWidth.value / 2  : 0;

        // If labelPosition is set to `outside` or a donut chart is drawn then the label position is at the radius,
        // if regular pie chart it's half of the radius
        if(options.labelPosition === 'outside' || options.donut && !options.donutSolid) {
          labelRadius = radius;
        } else if(options.labelPosition === 'center') {
          // If labelPosition is center we start with 0 and will later wait for the labelOffset
          labelRadius = 0;
        } else if(options.donutSolid) {
          labelRadius = radius - donutWidth.value / 2;
        } else {
          // Default option is 'inside' where we use half the radius so the label will be placed in the center of the pie
          // slice
          labelRadius = radius / 2;
        }
        // Add the offset to the labelRadius where a negative offset means closed to the center of the chart
        labelRadius += options.labelOffset;

        // Calculate end angle based on total sum and current data value and offset with padding
        var center = {
          x: chartRect.x1 + chartRect.width() / 2,
          y: chartRect.y2 + chartRect.height() / 2
        };

        // Check if there is only one non-zero value in the series array.
        var hasSingleValInSeries = data.raw.series.filter(function(val) {
          return val.hasOwnProperty('value') ? val.value !== 0 : val !== 0;
        }).length === 1;

        // Creating the series groups
        data.raw.series.forEach(function(series, index) {
          seriesGroups[index] = this.svg.elem('g', null, null);
        }.bind(this));
        //if we need to show labels we create the label group now
        if(options.showLabel) {
          labelsGroup = this.svg.elem('g', null, null);
        }

        // Draw the series
        // initialize series groups
        data.raw.series.forEach(function(series, index) {
          // If current value is zero and we are ignoring empty values then skip to next value
          if (data.normalized.series[index] === 0 && options.ignoreEmptyValues) return;

          // If the series is an object and contains a name or meta data we add a custom attribute
          seriesGroups[index].attr({
            'ct:series-name': series.name
          });

          // Use series class from series data or if not set generate one
          seriesGroups[index].addClass([
            options.classNames.series,
            (series.className || options.classNames.series + '-' + Chartist.alphaNumerate(index))
          ].join(' '));

          // If the whole dataset is 0 endAngle should be zero. Can't divide by 0.
          var endAngle = (totalDataSum > 0 ? startAngle + data.normalized.series[index] / totalDataSum * 360 : 0);

          // Use slight offset so there are no transparent hairline issues
          var overlappigStartAngle = Math.max(0, startAngle - (index === 0 || hasSingleValInSeries ? 0 : 0.2));

          // If we need to draw the arc for all 360 degrees we need to add a hack where we close the circle
          // with Z and use 359.99 degrees
          if(endAngle - overlappigStartAngle >= 359.99) {
            endAngle = overlappigStartAngle + 359.99;
          }

          var start = Chartist.polarToCartesian(center.x, center.y, radius, overlappigStartAngle),
            end = Chartist.polarToCartesian(center.x, center.y, radius, endAngle);

          var innerStart,
            innerEnd,
            donutSolidRadius;

          // Create a new path element for the pie chart. If this isn't a donut chart we should close the path for a correct stroke
          var path = new Chartist.Svg.Path(!options.donut || options.donutSolid)
            .move(end.x, end.y)
            .arc(radius, radius, 0, endAngle - startAngle > 180, 0, start.x, start.y);

          // If regular pie chart (no donut) we add a line to the center of the circle for completing the pie
          if(!options.donut) {
            path.line(center.x, center.y);
          } else if (options.donutSolid) {
            donutSolidRadius = radius - donutWidth.value;
            innerStart = Chartist.polarToCartesian(center.x, center.y, donutSolidRadius, startAngle - (index === 0 || hasSingleValInSeries ? 0 : 0.2));
            innerEnd = Chartist.polarToCartesian(center.x, center.y, donutSolidRadius, endAngle);
            path.line(innerStart.x, innerStart.y);
            path.arc(donutSolidRadius, donutSolidRadius, 0, endAngle - startAngle  > 180, 1, innerEnd.x, innerEnd.y);
          }

          // Create the SVG path
          // If this is a donut chart we add the donut class, otherwise just a regular slice
          var pathClassName = options.classNames.slicePie;
          if (options.donut) {
            pathClassName = options.classNames.sliceDonut;
            if (options.donutSolid) {
              pathClassName = options.classNames.sliceDonutSolid;
            }
          }
          var pathElement = seriesGroups[index].elem('path', {
            d: path.stringify()
          }, pathClassName);

          // Adding the pie series value to the path
          pathElement.attr({
            'ct:value': data.normalized.series[index],
            'ct:meta': Chartist.serialize(series.meta)
          });

          // If this is a donut, we add the stroke-width as style attribute
          if(options.donut && !options.donutSolid) {
            pathElement._node.style.strokeWidth = donutWidth.value + 'px';
          }

          // Fire off draw event
          this.eventEmitter.emit('draw', {
            type: 'slice',
            value: data.normalized.series[index],
            totalDataSum: totalDataSum,
            index: index,
            meta: series.meta,
            series: series,
            group: seriesGroups[index],
            element: pathElement,
            path: path.clone(),
            center: center,
            radius: radius,
            startAngle: startAngle,
            endAngle: endAngle
          });

          // If we need to show labels we need to add the label for this slice now
          if(options.showLabel) {
            var labelPosition;
            if(data.raw.series.length === 1) {
              // If we have only 1 series, we can position the label in the center of the pie
              labelPosition = {
                x: center.x,
                y: center.y
              };
            } else {
              // Position at the labelRadius distance from center and between start and end angle
              labelPosition = Chartist.polarToCartesian(
                center.x,
                center.y,
                labelRadius,
                startAngle + (endAngle - startAngle) / 2
              );
            }

            var rawValue;
            if(data.normalized.labels && !Chartist.isFalseyButZero(data.normalized.labels[index])) {
              rawValue = data.normalized.labels[index];
            } else {
              rawValue = data.normalized.series[index];
            }

            var interpolatedValue = options.labelInterpolationFnc(rawValue, index);

            if(interpolatedValue || interpolatedValue === 0) {
              var labelElement = labelsGroup.elem('text', {
                dx: labelPosition.x,
                dy: labelPosition.y,
                'text-anchor': determineAnchorPosition(center, labelPosition, options.labelDirection)
              }, options.classNames.label).text('' + interpolatedValue);

              // Fire off draw event
              this.eventEmitter.emit('draw', {
                type: 'label',
                index: index,
                group: labelsGroup,
                element: labelElement,
                text: '' + interpolatedValue,
                x: labelPosition.x,
                y: labelPosition.y
              });
            }
          }

          // Set next startAngle to current endAngle.
          // (except for last slice)
          startAngle = endAngle;
        }.bind(this));

        this.eventEmitter.emit('created', {
          chartRect: chartRect,
          svg: this.svg,
          options: options
        });
      }

      /**
       * This method creates a new pie chart and returns an object that can be used to redraw the chart.
       *
       * @memberof Chartist.Pie
       * @param {String|Node} query A selector query string or directly a DOM element
       * @param {Object} data The data object in the pie chart needs to have a series property with a one dimensional data array. The values will be normalized against each other and don't necessarily need to be in percentage. The series property can also be an array of value objects that contain a value property and a className property to override the CSS class name for the series group.
       * @param {Object} [options] The options object with options that override the default options. Check the examples for a detailed list.
       * @param {Array} [responsiveOptions] Specify an array of responsive option arrays which are a media query and options object pair => [[mediaQueryString, optionsObject],[more...]]
       * @return {Object} An object with a version and an update method to manually redraw the chart
       *
       * @example
       * // Simple pie chart example with four series
       * new Chartist.Pie('.ct-chart', {
       *   series: [10, 2, 4, 3]
       * });
       *
       * @example
       * // Drawing a donut chart
       * new Chartist.Pie('.ct-chart', {
       *   series: [10, 2, 4, 3]
       * }, {
       *   donut: true
       * });
       *
       * @example
       * // Using donut, startAngle and total to draw a gauge chart
       * new Chartist.Pie('.ct-chart', {
       *   series: [20, 10, 30, 40]
       * }, {
       *   donut: true,
       *   donutWidth: 20,
       *   startAngle: 270,
       *   total: 200
       * });
       *
       * @example
       * // Drawing a pie chart with padding and labels that are outside the pie
       * new Chartist.Pie('.ct-chart', {
       *   series: [20, 10, 30, 40]
       * }, {
       *   chartPadding: 30,
       *   labelOffset: 50,
       *   labelDirection: 'explode'
       * });
       *
       * @example
       * // Overriding the class names for individual series as well as a name and meta data.
       * // The name will be written as ct:series-name attribute and the meta data will be serialized and written
       * // to a ct:meta attribute.
       * new Chartist.Pie('.ct-chart', {
       *   series: [{
       *     value: 20,
       *     name: 'Series 1',
       *     className: 'my-custom-class-one',
       *     meta: 'Meta One'
       *   }, {
       *     value: 10,
       *     name: 'Series 2',
       *     className: 'my-custom-class-two',
       *     meta: 'Meta Two'
       *   }, {
       *     value: 70,
       *     name: 'Series 3',
       *     className: 'my-custom-class-three',
       *     meta: 'Meta Three'
       *   }]
       * });
       */
      function Pie(query, data, options, responsiveOptions) {
        Chartist.Pie.super.constructor.call(this,
          query,
          data,
          defaultOptions,
          Chartist.extend({}, defaultOptions, options),
          responsiveOptions);
      }

      // Creating pie chart type in Chartist namespace
      Chartist.Pie = Chartist.Base.extend({
        constructor: Pie,
        createChart: createChart,
        determineAnchorPosition: determineAnchorPosition
      });

    }(this || commonjsGlobal, Chartist));

    return Chartist;

    }));
    });

    /* src/components/PieChart.svelte generated by Svelte v3.35.0 */

    const { console: console_1$2 } = globals;
    const file$4 = "src/components/PieChart.svelte";

    function create_fragment$4(ctx) {
    	let div6;
    	let div5;
    	let div2;
    	let div0;
    	let t0;
    	let div1;
    	let t1;
    	let div3;
    	let t2;
    	let div4;

    	const block = {
    		c: function create() {
    			div6 = element("div");
    			div5 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			t1 = space();
    			div3 = element("div");
    			t2 = space();
    			div4 = element("div");
    			attr_dev(div0, "class", "ct-chart ct-double-octave");
    			add_location(div0, file$4, 153, 6, 5117);
    			attr_dev(div1, "id", "ct-chart-animated");
    			attr_dev(div1, "class", "ct-double-octave");
    			add_location(div1, file$4, 154, 6, 5165);
    			attr_dev(div2, "class", "row");
    			add_location(div2, file$4, 152, 4, 5093);
    			attr_dev(div3, "class", "ct-chart-2");
    			add_location(div3, file$4, 156, 4, 5236);
    			attr_dev(div4, "id", "my-chart");
    			add_location(div4, file$4, 157, 4, 5267);
    			attr_dev(div5, "class", "UserList container");
    			add_location(div5, file$4, 151, 2, 5056);
    			attr_dev(div6, "class", "PieChart");
    			add_location(div6, file$4, 150, 0, 5031);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div6, anchor);
    			append_dev(div6, div5);
    			append_dev(div5, div2);
    			append_dev(div2, div0);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			append_dev(div5, t1);
    			append_dev(div5, div3);
    			append_dev(div5, t2);
    			append_dev(div5, div4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div6);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("PieChart", slots, []);
    	let response;
    	let chartData = [];

    	onMount(async () => {
    		try {
    			response = await axios({
    				method: "post",
    				url: "https://run.mocky.io/v3/73413c07-1a1c-4d34-991b-2dcebb226589",
    				headers: { "Content-Type": "application/json" }
    			});

    			if (response.status === 200) {
    				chartData = {
    					labels: response.data.data.map(item => item.asset),
    					series: response.data.data.map(item => item.percentage)
    				};

    				showSpinner.update(() => false);
    				new chartist.Pie(".ct-chart", chartData);
    			}

    			/* Add a basic data series with six labels and values */
    			var data = {
    				labels: ["1", "2", "3", "4", "5", "6"],
    				series: [{ data: [1, 32, 3, 5, 8, 13] }]
    			};

    			/* Set some base options (settings will override the default settings in Chartist.js *see default settings*). We are adding a basic label interpolation function for the xAxis labels. */
    			var options = {
    				axisX: {
    					labelInterpolationFnc(value) {
    						return "Calendar Week " + value;
    					}
    				}
    			};

    			/* Now we can specify multiple responsive settings that will override the base settings based on order and if the media queries match. In this example we are changing the visibility of dots and lines as well as use different label interpolations for space reasons. */
    			var responsiveOptions = [
    				[
    					"screen and (min-width: 641px) and (max-width: 1024px)",
    					{
    						showPoint: false,
    						axisX: {
    							labelInterpolationFnc(value) {
    								return "Week " + value;
    							}
    						}
    					}
    				],
    				[
    					"screen and (max-width: 640px)",
    					{
    						showLine: false,
    						axisX: {
    							labelInterpolationFnc(value) {
    								return "W" + value;
    							}
    						}
    					}
    				]
    			];

    			/* Initialize the chart with the above settings */
    			new chartist.Line("#my-chart", data, options, responsiveOptions);

    			new chartist.Line(".ct-chart-2",
    			{
    					labels: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    					series: [[12, 9, 7, 8, 5], [2, 1, 3.5, 7, 3], [1, 3, 4, 5, 6]]
    				},
    			{
    					fullWidth: true,
    					chartPadding: { right: 40 }
    				});

    			var chart = new chartist.Pie("#ct-chart-animated", chartData, { donut: true, showLabel: true });

    			chart.on("draw", function (data) {
    				console.log("🚀 - file: PieChart.svelte - line 104 - data", data);

    				if (data.type === "slice") {
    					// Get the total path length in order to use for dash array animation
    					var pathLength = data.element._node.getTotalLength();

    					// Set a dasharray that matches the path length as prerequisite to animate dashoffset
    					data.element.attr({
    						"stroke-dasharray": pathLength + "px " + pathLength + "px"
    					});

    					// Create animation definition while also assigning an ID to the animation for later sync usage
    					var animationDefinition = {
    						"stroke-dashoffset": {
    							id: "anim" + data.index,
    							dur: 1000,
    							from: -pathLength + "px",
    							to: "0px",
    							easing: chartist.Svg.Easing.easeOutQuint,
    							// We need to use `fill: 'freeze'` otherwise our animation will fall back to initial (not visible)
    							fill: "freeze"
    						}
    					};

    					// If this was not the first slice, we need to time the animation so that it uses the end sync event of the previous animation
    					if (data.index !== 0) {
    						animationDefinition["stroke-dashoffset"].begin = "anim" + (data.index - 1) + ".end";
    					}

    					// We need to set an initial value before the animation starts as we are not in guided mode which would do that for us
    					data.element.attr({ "stroke-dashoffset": -pathLength + "px" });

    					// We can't use guided mode as the animations need to rely on setting begin manually
    					// See http://gionkunz.github.io/chartist-js/api-documentation.html#chartistsvg-function-animate
    					data.element.animate(animationDefinition, false);
    				}
    			});

    			// For the sake of the example we update the chart every time it's created with a delay of 8 seconds
    			chart.on("created", function () {
    				window.animation = chart.update.bind(chart);
    			});
    		} catch(error) {
    			console.warn("file: PieChart.svelte - onMount", error.message);
    		}
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$2.warn(`<PieChart> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		axios,
    		showSpinner,
    		onMount,
    		Chartist: chartist,
    		response,
    		chartData
    	});

    	$$self.$inject_state = $$props => {
    		if ("response" in $$props) response = $$props.response;
    		if ("chartData" in $$props) chartData = $$props.chartData;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [];
    }

    class PieChart extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PieChart",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/components/Spinner.svelte generated by Svelte v3.35.0 */
    const file$3 = "src/components/Spinner.svelte";

    // (6:2) {#if $showSpinner}
    function create_if_block(ctx) {
    	let div1;
    	let div0;
    	let span;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			span = element("span");
    			attr_dev(span, "class", "visually-hidden");
    			add_location(span, file$3, 8, 8, 232);
    			attr_dev(div0, "class", "spinner-border text-primary");
    			attr_dev(div0, "role", "status");
    			add_location(div0, file$3, 7, 6, 168);
    			attr_dev(div1, "class", "d-flex justify-content-center");
    			add_location(div1, file$3, 6, 4, 118);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, span);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(6:2) {#if $showSpinner}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div;
    	let if_block = /*$showSpinner*/ ctx[0] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if (if_block) if_block.c();
    			attr_dev(div, "class", "Spinner");
    			add_location(div, file$3, 4, 0, 71);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if (if_block) if_block.m(div, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*$showSpinner*/ ctx[0]) {
    				if (if_block) ; else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(div, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $showSpinner;
    	validate_store(showSpinner, "showSpinner");
    	component_subscribe($$self, showSpinner, $$value => $$invalidate(0, $showSpinner = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Spinner", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Spinner> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ showSpinner, $showSpinner });
    	return [$showSpinner];
    }

    class Spinner extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Spinner",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/components/Card.svelte generated by Svelte v3.35.0 */

    const { console: console_1$1 } = globals;
    const file$2 = "src/components/Card.svelte";

    function create_fragment$2(ctx) {
    	let div2;
    	let div1;
    	let img;
    	let img_src_value;
    	let img_alt_value;
    	let t0;
    	let div0;
    	let h5;
    	let t1;
    	let t2;
    	let t3;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			img = element("img");
    			t0 = space();
    			div0 = element("div");
    			h5 = element("h5");
    			t1 = text(/*name*/ ctx[0]);
    			t2 = space();
    			t3 = text(/*lastName*/ ctx[1]);
    			if (img.src !== (img_src_value = /*photo*/ ctx[2])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "class", "card-img-top svelte-ntaycw");
    			attr_dev(img, "alt", img_alt_value = "" + (/*name*/ ctx[0] + " photo"));
    			add_location(img, file$2, 12, 4, 247);
    			attr_dev(h5, "class", "card-title");
    			add_location(h5, file$2, 14, 6, 372);
    			attr_dev(div0, "class", "card-body");
    			add_location(div0, file$2, 13, 4, 342);
    			attr_dev(div1, "class", "Card card svelte-ntaycw");
    			add_location(div1, file$2, 11, 2, 219);
    			attr_dev(div2, "class", "col-sm");
    			add_location(div2, file$2, 10, 0, 196);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, img);
    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			append_dev(div0, h5);
    			append_dev(h5, t1);
    			append_dev(h5, t2);
    			append_dev(h5, t3);

    			if (!mounted) {
    				dispose = listen_dev(
    					img,
    					"mouseover",
    					function () {
    						if (is_function(mouseOver(/*name*/ ctx[0]))) mouseOver(/*name*/ ctx[0]).apply(this, arguments);
    					},
    					false,
    					false,
    					false
    				);

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			if (dirty & /*photo*/ 4 && img.src !== (img_src_value = /*photo*/ ctx[2])) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*name*/ 1 && img_alt_value !== (img_alt_value = "" + (/*name*/ ctx[0] + " photo"))) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if (dirty & /*name*/ 1) set_data_dev(t1, /*name*/ ctx[0]);
    			if (dirty & /*lastName*/ 2) set_data_dev(t3, /*lastName*/ ctx[1]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function mouseOver(name) {
    	console.log("🚀 - file: Card.svelte - line 7 - name", name);
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Card", slots, []);
    	let { name = "" } = $$props;
    	let { lastName = "" } = $$props;
    	let { photo = "" } = $$props;
    	const writable_props = ["name", "lastName", "photo"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<Card> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    		if ("lastName" in $$props) $$invalidate(1, lastName = $$props.lastName);
    		if ("photo" in $$props) $$invalidate(2, photo = $$props.photo);
    	};

    	$$self.$capture_state = () => ({ name, lastName, photo, mouseOver });

    	$$self.$inject_state = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    		if ("lastName" in $$props) $$invalidate(1, lastName = $$props.lastName);
    		if ("photo" in $$props) $$invalidate(2, photo = $$props.photo);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [name, lastName, photo];
    }

    class Card extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { name: 0, lastName: 1, photo: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Card",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get name() {
    		throw new Error("<Card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<Card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get lastName() {
    		throw new Error("<Card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set lastName(value) {
    		throw new Error("<Card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get photo() {
    		throw new Error("<Card>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set photo(value) {
    		throw new Error("<Card>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/UserList.svelte generated by Svelte v3.35.0 */

    const { console: console_1 } = globals;
    const file$1 = "src/components/UserList.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[2] = list[i].name;
    	child_ctx[3] = list[i].lastName;
    	child_ctx[4] = list[i].photo;
    	return child_ctx;
    }

    // (32:4) {#each userList as { name, lastName, photo }}
    function create_each_block(ctx) {
    	let card;
    	let current;

    	card = new Card({
    			props: {
    				name: /*name*/ ctx[2],
    				lastName: /*lastName*/ ctx[3],
    				photo: /*photo*/ ctx[4]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(card.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(card, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const card_changes = {};
    			if (dirty & /*userList*/ 1) card_changes.name = /*name*/ ctx[2];
    			if (dirty & /*userList*/ 1) card_changes.lastName = /*lastName*/ ctx[3];
    			if (dirty & /*userList*/ 1) card_changes.photo = /*photo*/ ctx[4];
    			card.$set(card_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(card.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(card.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(card, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(32:4) {#each userList as { name, lastName, photo }}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div1;
    	let div0;
    	let current;
    	let each_value = /*userList*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div0, "class", "row");
    			add_location(div0, file$1, 30, 2, 728);
    			attr_dev(div1, "class", "UserList container svelte-1387hfo");
    			add_location(div1, file$1, 29, 0, 693);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*userList*/ 1) {
    				each_value = /*userList*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div0, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("UserList", slots, []);
    	let response;
    	let userList = [];

    	onMount(async () => {
    		try {
    			response = await axios({
    				method: "post",
    				url: "https://run.mocky.io/v3/3ab3f5cc-ca26-460a-9c23-9897f49d167b",
    				headers: { "Content-Type": "application/json" }
    			});

    			if (response.status === 200) {
    				$$invalidate(0, userList = response.data.data);
    				showSpinner.update(() => false);
    			}
    		} catch(error) {
    			console.warn("file: UserList.svelte - onMount", error.message);
    		}
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<UserList> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		axios,
    		showSpinner,
    		onMount,
    		Card,
    		response,
    		userList
    	});

    	$$self.$inject_state = $$props => {
    		if ("response" in $$props) response = $$props.response;
    		if ("userList" in $$props) $$invalidate(0, userList = $$props.userList);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [userList];
    }

    class UserList extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "UserList",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.35.0 */
    const file = "src/App.svelte";

    // (13:4) <Route exact>
    function create_default_slot_4(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Hello World!");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_4.name,
    		type: "slot",
    		source: "(13:4) <Route exact>",
    		ctx
    	});

    	return block;
    }

    // (14:4) <Route fallback>
    function create_default_slot_3(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Not found");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_3.name,
    		type: "slot",
    		source: "(14:4) <Route fallback>",
    		ctx
    	});

    	return block;
    }

    // (15:4) <Route path="/users">
    function create_default_slot_2(ctx) {
    	let spinner;
    	let t;
    	let userlist;
    	let current;
    	spinner = new Spinner({ $$inline: true });
    	userlist = new UserList({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(spinner.$$.fragment);
    			t = space();
    			create_component(userlist.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(spinner, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(userlist, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(spinner.$$.fragment, local);
    			transition_in(userlist.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(spinner.$$.fragment, local);
    			transition_out(userlist.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(spinner, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(userlist, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(15:4) <Route path=\\\"/users\\\">",
    		ctx
    	});

    	return block;
    }

    // (19:4) <Route path="/chart">
    function create_default_slot_1(ctx) {
    	let spinner;
    	let t;
    	let piechart;
    	let current;
    	spinner = new Spinner({ $$inline: true });
    	piechart = new PieChart({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(spinner.$$.fragment);
    			t = space();
    			create_component(piechart.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(spinner, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(piechart, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(spinner.$$.fragment, local);
    			transition_in(piechart.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(spinner.$$.fragment, local);
    			transition_out(piechart.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(spinner, detaching);
    			if (detaching) detach_dev(t);
    			destroy_component(piechart, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(19:4) <Route path=\\\"/chart\\\">",
    		ctx
    	});

    	return block;
    }

    // (12:2) <Router>
    function create_default_slot(ctx) {
    	let route0;
    	let t0;
    	let route1;
    	let t1;
    	let route2;
    	let t2;
    	let route3;
    	let current;

    	route0 = new Route({
    			props: {
    				exact: true,
    				$$slots: { default: [create_default_slot_4] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	route1 = new Route({
    			props: {
    				fallback: true,
    				$$slots: { default: [create_default_slot_3] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	route2 = new Route({
    			props: {
    				path: "/users",
    				$$slots: { default: [create_default_slot_2] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	route3 = new Route({
    			props: {
    				path: "/chart",
    				$$slots: { default: [create_default_slot_1] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(route0.$$.fragment);
    			t0 = space();
    			create_component(route1.$$.fragment);
    			t1 = space();
    			create_component(route2.$$.fragment);
    			t2 = space();
    			create_component(route3.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(route0, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(route1, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(route2, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(route3, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const route0_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				route0_changes.$$scope = { dirty, ctx };
    			}

    			route0.$set(route0_changes);
    			const route1_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				route1_changes.$$scope = { dirty, ctx };
    			}

    			route1.$set(route1_changes);
    			const route2_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				route2_changes.$$scope = { dirty, ctx };
    			}

    			route2.$set(route2_changes);
    			const route3_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				route3_changes.$$scope = { dirty, ctx };
    			}

    			route3.$set(route3_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(route0.$$.fragment, local);
    			transition_in(route1.$$.fragment, local);
    			transition_in(route2.$$.fragment, local);
    			transition_in(route3.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(route0.$$.fragment, local);
    			transition_out(route1.$$.fragment, local);
    			transition_out(route2.$$.fragment, local);
    			transition_out(route3.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(route0, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(route1, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(route2, detaching);
    			if (detaching) detach_dev(t2);
    			destroy_component(route3, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(12:2) <Router>",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let menu;
    	let t;
    	let router;
    	let current;
    	menu = new Menu({ $$inline: true });

    	router = new Router({
    			props: {
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(menu.$$.fragment);
    			t = space();
    			create_component(router.$$.fragment);
    			attr_dev(main, "class", "container");
    			add_location(main, file, 8, 0, 269);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(menu, main, null);
    			append_dev(main, t);
    			mount_component(router, main, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const router_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				router_changes.$$scope = { dirty, ctx };
    			}

    			router.$set(router_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(menu.$$.fragment, local);
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(menu.$$.fragment, local);
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(menu);
    			destroy_component(router);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Router,
    		Route,
    		Menu,
    		PieChart,
    		Spinner,
    		UserList
    	});

    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
      target: document.body,
      props: {},
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
