import { getOwner as getOwnerNative, setOwner } from '@ember/application';
import ApplicationInstance from '@ember/application/instance';
import { capabilities } from '@ember/component';
import { setProperties } from '@ember/object';
import { throttle, cancel } from '@ember/runloop';

export interface ComponentManagerArgs {
  named: object;
  positional: any[];
}

interface IHookedComponentWrapper {
	renderFn: Function,
	renderTimer: any,
	uid: number,
	args: {
		[key: string]: any
	}
	update(): void
}

interface IHookState {
	callId: number,
	createContext: Function,
	getContext: Function,
	deleteContext: Function,
	setContext: Function,
	incrementCallId: Function,
	resetCallId: Function
}


var HOOKS_STORE: {
	[key: string] : WeakMap<object,any>
} = {};
var HOOKS_STATES: {
	[key: string] : IHookState
} = {};
var HOOKS_STACK: IHookState[] = [];
var BEFORE_CALL_TASKS : Function[] = [];
var BEFORE_DESTROY_TASKS : Function[] = [];

export function createHookState(hookName: string, defaultValue: Function | null = null): IHookState {
	HOOKS_STORE[hookName] = new WeakMap();
	const state = {
		createContext(component: IHookedComponentWrapper) {
			let initValue: any = typeof defaultValue === 'function' ? defaultValue(component) : [];
			HOOKS_STORE[hookName].set(component, initValue);
		},
		getContext(component: IHookedComponentWrapper) {
			return  HOOKS_STORE[hookName].get(component);
		},
		deleteContext(component: IHookedComponentWrapper) {
			return HOOKS_STORE[hookName].delete(component);
		},
		setContext(component: IHookedComponentWrapper, value: any) {
			return HOOKS_STORE[hookName].set(component, value);
		},
		incrementCallId() {
			this.callId ++;
		},
		resetCallId() {
			this.callId = 0;
		},
		callId: 0
	}
	HOOKS_STATES[hookName] = state;
	HOOKS_STACK.push(state);
	return state;
}

function getCurrentContext(): null | IHookedComponentWrapper {
	return CURRENT_CONTEXT;
}

export function destroyHookState(hookName: string) {
	HOOKS_STACK = HOOKS_STACK.filter((item)=>item !== HOOKS_STATES[hookName]);
	delete HOOKS_STATES[hookName];
}
export function getHookState(hookName: string): IHookState {
	return HOOKS_STATES[hookName];
}

var CURRENT_CONTEXT: IHookedComponentWrapper | null = null;
var COMPONENTS_COUNTER = 0;
var COMPONENTS_STATES = createHookState('states');
var COMPONENTS_HOOKS = createHookState('hooks');
var COMPONENTS_HOOKS_CACHE_KEYS = createHookState('hooks_cache');
var COMPONENTS_LAYOUT_HOOKS = createHookState('layout_hooks');
var COMPONENTS_LAYOUT_HOOKS_CACHE_KEYS = createHookState('layout_hooks_cache');
var COMPONENTS_TEMPLATES_CONTEXTS = createHookState('templates_context', function() {
	return {};
});
var COMPONENT_HOOKS_CALL_COUNTER = createHookState('call-counter', function() {
	return new WeakMap();
});

function scheduleRerender(compnentContext: IHookedComponentWrapper) {
	compnentContext.renderTimer = throttle(compnentContext, 'update', 16);
}

function compnentSetup(instance: IHookedComponentWrapper) {
	HOOKS_STACK.forEach((hookState)=>{
		hookState.createContext(instance);
	});
}

function componentDestroy(instance: IHookedComponentWrapper) {
	beforeRerenderSetup(instance, false);
	BEFORE_DESTROY_TASKS.forEach((task)=>{
		task();
	});
	const effects = COMPONENTS_HOOKS.getContext(instance);
	effects.forEach((destroyCb: any)=>{
		if (typeof destroyCb === 'function') {
			destroyCb();
		}
	});
	const layoutEffects = COMPONENTS_LAYOUT_HOOKS.getContext(instance);
	layoutEffects.forEach((destroyCb: any)=>{
		if (typeof destroyCb === 'function') {
			destroyCb();
		}
	});
	cancel(instance.renderTimer);
	HOOKS_STACK.forEach((hookState)=>{
		hookState.deleteContext(instance);
	});
	afterRerenderTeardown();
}

export function addBeforeDestroyTask(cb: Function) {
	BEFORE_DESTROY_TASKS.push(cb);
}

export function addBeforeCallTask(cb: Function) {
	BEFORE_CALL_TASKS.push(cb);
}

function beforeRerenderSetup(instance: IHookedComponentWrapper, callHooks: boolean = true) {
	CURRENT_CONTEXT = instance;
	if (callHooks) {
		HOOKS_STACK.forEach((hookState)=>{
			hookState.resetCallId();
		});
		COMPONENT_HOOKS_CALL_COUNTER.setContext(instance, new WeakMap());
		BEFORE_CALL_TASKS.forEach((task)=>{
			task();
		});
	}
}

function afterRerenderTeardown() {
	CURRENT_CONTEXT = null;
}

export function customHook(hookFunction: Function): Function {
	const currentContext = getCurrentContext();
	const callCounter: WeakMap<Function,number> = COMPONENT_HOOKS_CALL_COUNTER.getContext(currentContext);
	if (currentContext === null) {
		throw new Error('Unable to find component context');
	}
	if (!callCounter.has(hookFunction)) {
		callCounter.set(hookFunction, 0);
	}
	const callId = callCounter.get(hookFunction) || 0;
	return function(...args: any[]) {
		const result = hookFunction.apply(null, args);
		callCounter.set(hookFunction, callId + 1);
		return result;
	}
}

export function useState(value: any): [any, Function] {
	const context = getCurrentContext();
	if (context === null) {
		throw new Error('Unable to find component context');
	}
	const currentStates = COMPONENTS_STATES.getContext(context);
	const callId  = COMPONENTS_STATES.callId;
	if (currentStates[callId] === undefined) {
		currentStates.push(value);
	}
	COMPONENTS_STATES.incrementCallId();
	return [ currentStates[callId], function(this: IHookedComponentWrapper, newValue: any) {
		currentStates[callId] = newValue;
		scheduleRerender(this);
	}.bind(context) ];
}

export function getRerender() {
	return scheduleRerender.bind(null, getCurrentContext());
}

export function getService(serviceName: string) {
	return getOwnerNative(getCurrentContext()).lookup('service:' + serviceName);
}

export function getController(controllerName: string) {
	return getOwnerNative(getCurrentContext()).lookup('controller:' + controllerName);
}

export function getRoute(routeName: string) {
	return getOwnerNative(getCurrentContext()).lookup('route:' + routeName);
}

export function getContextId(): number {
	const context = getCurrentContext();
	if (context === null) {
		throw new Error('Unable to get context id - no context');
	}
	return context.uid;
}

function checkValidationKey(cacheKey: false | string, hooksCache: any[], callId: number): boolean {
	return cacheKey === false || (hooksCache[callId] !== false) && (cacheKey !== hooksCache[callId]);
}

function getValidationKey(cacheKeys: any[] | false): string | false  {
	return cacheKeys !== false ? cacheKeys.toString(): false;
}

export function useLayoutEffect(cb: Function,  cacheKeys: false | any[] = false): void {
	const context = getCurrentContext();
	if (context === null) {
		throw new Error('Unable to find component context');
	}
	const cacheKey = getValidationKey(cacheKeys);
	const currentHooks = COMPONENTS_LAYOUT_HOOKS.getContext(context);
	const hooksCache = COMPONENTS_LAYOUT_HOOKS_CACHE_KEYS.getContext(context);
	const callId  = COMPONENTS_LAYOUT_HOOKS.callId;

	if (currentHooks.length - 1 < callId) {
		currentHooks.push(cb);
		hooksCache.push(cacheKey);
	} else {
		const mustIvalidateCache = checkValidationKey(cacheKey, hooksCache, callId);
		if (mustIvalidateCache) {
			if (typeof currentHooks[callId] === 'function') {
				let cachedFunction = currentHooks[callId];
				currentHooks[callId] = function() {
					cachedFunction();
					cb();
				}
			} else {
				currentHooks[callId] = cb;
			}
			
			hooksCache[callId] = cacheKey;
		}
	}
	COMPONENTS_LAYOUT_HOOKS.incrementCallId();
	return;
}

export function useEffect(cb: Function, cacheKeys: false | any[] = false) {
	const context = getCurrentContext();
	if (context === null) {
		throw new Error('Unable to find component context');
	}
	const cacheKey = getValidationKey(cacheKeys)
	const currentHooks = COMPONENTS_HOOKS.getContext(context);
	const hooksCache = COMPONENTS_HOOKS_CACHE_KEYS.getContext(context);
	const callId  = COMPONENTS_HOOKS.callId;

	if (currentHooks.length - 1 < callId) {
		currentHooks.push(cb());
		hooksCache.push(cacheKey);
	} else {
		const mustIvalidateCache = checkValidationKey(cacheKey, hooksCache, callId);
		if (mustIvalidateCache) {
			if (typeof currentHooks[callId] === 'function') {
				currentHooks[callId]();
			}
			currentHooks[callId] = cb();
			hooksCache[callId] = cacheKey;
		}
	}
	COMPONENTS_HOOKS.incrementCallId();
	return ;
}

function executeLayoutHooks(instance: IHookedComponentWrapper) {
	beforeRerenderSetup(instance);
	const hooks = COMPONENTS_LAYOUT_HOOKS.getContext(instance);
	for (let i = 0; i < hooks.length; i++) {
		if (typeof hooks[i] === 'function') {
			hooks[i] = hooks[i]();
		}
	}
	afterRerenderTeardown();
}

export function getOwner() {
	return getOwnerNative(getCurrentContext());
}

export default class ReactHooksComponentManager {
  static create(attrs: any) {
    const owner = getOwnerNative(attrs);
    return new this(owner);
  }
  capabilities: any;
  constructor(owner: ApplicationInstance) {
	setOwner(this, owner);
    this.capabilities = capabilities('3.4', {
      destructor: true,
      asyncLifecycleCallbacks: true,
    });
  }

  createCompnentContext(Klass: Function, args: any = {}): IHookedComponentWrapper {
	const context: IHookedComponentWrapper = {
		renderFn: Klass,
		uid: COMPONENTS_COUNTER++,
		args,
		renderTimer: null,
		update() {
			beforeRerenderSetup(this);
			setProperties(COMPONENTS_TEMPLATES_CONTEXTS.getContext(this), this.renderFn.call(null, this.args));
			afterRerenderTeardown();
		}
	};
	return context;
  }

  createComponent(Klass: Function, args: ComponentManagerArgs): IHookedComponentWrapper {
	let instance = this.createCompnentContext(Klass, args.named);
	setOwner(instance, getOwnerNative(this));
	compnentSetup(instance);
	instance.update();
    return instance as IHookedComponentWrapper;
  }

  updateComponent(instance: IHookedComponentWrapper, args: ComponentManagerArgs) {
	let currentKeys: string[] = Object.keys(instance.args);
	let newKeys: string[] = Object.keys(args.named);
	let keys: string[] = [].concat((currentKeys as any), (newKeys as any));
	let unique = [...new Set(keys)]; 
	let shouldUpdate = false;
	unique.forEach((keyName: string)=>{
		if (instance.args[keyName] !== (args.named as any)[keyName]) {
			shouldUpdate = true;
		}
	})
	instance.args = args.named;
	if (shouldUpdate) {
		instance.update()
	}
  }

  destroyComponent(component: IHookedComponentWrapper) {
	componentDestroy(component);
  }

  getContext(component: any) {
	return COMPONENTS_TEMPLATES_CONTEXTS.getContext(component);
  }

  didCreateComponent(component: IHookedComponentWrapper) {
	executeLayoutHooks(component);
  }

  didUpdateComponent(component: IHookedComponentWrapper) {
	executeLayoutHooks(component);
  }
}