import { getOwner, setOwner } from '@ember/application';
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
	args: {
		[key: string]: any
	}
	update(): void
}

var CURRENT_CONTEXT: IHookedComponentWrapper | null = null;
var CURRENT_STATE_CALL = 0;
var CURRENT_EFFECT_CALL = 0;
var COMPONENTS_STATES = new WeakMap();
var COMPONENTS_HOOKS = new WeakMap();
var COMPONENTS_HOOKS_CACHE_KEYS = new WeakMap();
var COMPONENTS_TEMPLATES_CONTEXTS = new WeakMap();

function scheduleRerender(compnentContext: IHookedComponentWrapper) {
	compnentContext.renderTimer = throttle(compnentContext, 'update', 16);
}

function compnentSetup(instance: IHookedComponentWrapper) {
	COMPONENTS_STATES.set(instance, []);
	COMPONENTS_HOOKS.set(instance, []);
	COMPONENTS_HOOKS_CACHE_KEYS.set(instance, []);
	COMPONENTS_TEMPLATES_CONTEXTS.set(instance, {});
}

function componentDestroy(instance: IHookedComponentWrapper) {
	const effects = COMPONENTS_HOOKS.get(instance);
	effects.forEach((destroyCb: any)=>{
		if (typeof destroyCb === 'function') {
			destroyCb();
		}
	});
	cancel(instance.renderTimer);
	COMPONENTS_HOOKS_CACHE_KEYS.delete(instance);
	COMPONENTS_STATES.delete(instance);
	COMPONENTS_HOOKS.delete(instance);
	COMPONENTS_TEMPLATES_CONTEXTS.delete(instance);
}

function beforeRerenderSetup(instance: IHookedComponentWrapper) {
	CURRENT_CONTEXT = instance;
	CURRENT_STATE_CALL = 0;
	CURRENT_EFFECT_CALL = 0;
}
function afterRerenderTeardown() {
	CURRENT_CONTEXT = null;
}

export function useState(value: any): [any, Function] {
	if (CURRENT_CONTEXT === null) {
		throw new Error('Unable to find component context');
	}
	const currentStates = COMPONENTS_STATES.get(CURRENT_CONTEXT);
	const callId  = CURRENT_STATE_CALL;
	if (currentStates[callId] === undefined) {
		currentStates.push(value);
	}
	CURRENT_STATE_CALL++;
	return [ currentStates[callId], function(this: IHookedComponentWrapper, newValue: any) {
		currentStates[callId] = newValue;
		scheduleRerender(this);
	}.bind(CURRENT_CONTEXT) ];
}

export function useEffect(cb: Function, cacheKeys = false) {
	if (CURRENT_CONTEXT === null) {
		throw new Error('Unable to find component context');
	}
	const cacheKey = cacheKeys !== false ? cacheKeys.toString(): false;
	const currentHooks = COMPONENTS_HOOKS.get(CURRENT_CONTEXT);
	const hooksCache = COMPONENTS_HOOKS_CACHE_KEYS.get(CURRENT_CONTEXT);
	const callId  = CURRENT_EFFECT_CALL;

	if (currentHooks.length - 1 < callId) {
		currentHooks.push(cb());
		hooksCache.push(cacheKey);
	} else {
		const mustIvalidateCache = cacheKey === false || (hooksCache[callId] !== false) && (cacheKey !== hooksCache[callId]);
		if (mustIvalidateCache) {
			if (typeof currentHooks[callId] === 'function') {
				currentHooks[callId]();
			}
			currentHooks[callId] = cb();
			hooksCache[callId] = cacheKey;
		}
	}
	CURRENT_EFFECT_CALL++;
	return ;
}


export default class ReactHooksComponentManager {
  static create(attrs: any) {
    const owner = getOwner(attrs);
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
		args,
		renderTimer: null,
		update() {
			beforeRerenderSetup(this);
			setProperties(COMPONENTS_TEMPLATES_CONTEXTS.get(this), this.renderFn(this.args));
			afterRerenderTeardown();
		}
	};
	compnentSetup(context);
	return context;
  }

  createComponent(Klass: Function, args: ComponentManagerArgs): IHookedComponentWrapper {
	let instance = this.createCompnentContext(Klass, args.named);
	setOwner(instance, getOwner(this));
	beforeRerenderSetup(instance);
	COMPONENTS_TEMPLATES_CONTEXTS.set(instance, instance.renderFn(args.named));
	afterRerenderTeardown();
    return instance as IHookedComponentWrapper;
  }

  updateComponent(instance: IHookedComponentWrapper, args: ComponentManagerArgs) {
	instance.args = args.named;
	instance.update()
  }

  destroyComponent(component: IHookedComponentWrapper) {
	componentDestroy(component);
  }

  getContext(component: any) {
	return COMPONENTS_TEMPLATES_CONTEXTS.get(component);
  }

  didCreateComponent() {

  }

  didUpdateComponent() {

  }
}