import { getOwner, setOwner } from '@ember/application';
import ApplicationInstance from '@ember/application/instance';
import { capabilities } from '@ember/component';
import { setProperties } from '@ember/object';
import { throttle, cancel } from '@ember/runloop';

export interface ComponentManagerArgs {
  named: object;
  positional: any[];
}


var currentContext = null;
var currentStateCall = 0;
var currentEffectCall = 0;
var contextStates = new WeakMap();
var contextHooks = new WeakMap();
var contextHooksCache = new WeakMap();
var templateContexts = new WeakMap();


function scheduleRerender(compnentContext) {
	compnentContext.renderTimer = throttle(compnentContext, 'update', 16);
}

export function useState(value: any) {
	let currentStates = contextStates.get(currentContext);
	let callId  = currentStateCall;
	if (currentStates[callId] === undefined) {
		currentStates.push(value);
	}
	currentStateCall++;
	return [ currentStates[callId], function(newValue: any) {
		currentStates[callId] = newValue;
		scheduleRerender(this);
	}.bind(currentContext)];
}

export function useEffect(cb: Function, cacheKeys = false) {
	let cacheKey = cacheKeys !== false ? cacheKeys.toString(): false;
	let currentHooks = contextHooks.get(currentContext);
	let hooksCache = contextHooksCache.get(currentContext);
	let callId  = currentEffectCall;

	if (currentHooks.length - 1 < callId) {
		currentHooks.push(cb());
		hooksCache.push(cacheKey);
	} else {
		let mustIvalidateCache = cacheKey === false || (hooksCache[callId] !== false) && (cacheKey !== hooksCache[callId]);
		if (mustIvalidateCache) {
			if (typeof currentHooks[callId] === 'function') {
				currentHooks[callId]();
			}
			currentHooks[callId] = cb();
			hooksCache[callId] = cacheKey;
		}
	}
	currentEffectCall++;
	return ;
}


export default class ReactHooksComponentManager {
  static create(attrs: any) {
    let owner = getOwner(attrs);
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

  createCompnentContext(Klass: Function, args: any = {}) {
	let context = {
		renderFn: Klass,
		args,
		update() {
			currentContext = this;
			currentStateCall = 0;
			currentEffectCall = 0;
			let currentTemplateObject = templateContexts.get(this);
			let newResult = this.renderFn(this.args);
			setProperties(currentTemplateObject, newResult);
			currentContext = null;
		}
	};
	contextStates.set(context, []);
	contextHooks.set(context, []);
	contextHooksCache.set(context, []);
	templateContexts.set(context, {});
	return context;
  }
  createComponent(Klass: Function, args: ComponentManagerArgs): any {
	let instance = this.createCompnentContext(Klass, args.named);
	setOwner(instance, getOwner(this));
	currentContext = instance;
	currentStateCall = 0;
	currentEffectCall = 0;
	templateContexts.set(instance, instance.renderFn(args.named));
	currentContext = null;
    return instance as any;
  }

  updateComponent(instance: any, args: ComponentManagerArgs) {
	instance.args = args.named;
	instance.update()
  }

  destroyComponent(component: any) {
	cancel(component.renderTimer);
	let effects = contextHooks.get(component);
	effects.forEach((destroyCb: any)=>{
		if (typeof destroyCb === 'function') {
			destroyCb();
		}
	});
	contextHooksCache.delete(component);
	contextStates.delete(component);
	templateContexts.delete(component);
	component.renderFn = null;
  }

  getContext(component: any) {
	return templateContexts.get(component);
  }

  didCreateComponent() {

  }

  didUpdateComponent() {

  }
}